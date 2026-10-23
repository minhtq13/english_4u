<script setup lang="ts">
import type { DraftItem, DraftSection } from "~/utils/lessonDraft"

// One section of the lesson editor. The draft is edited in place (the page owns it).
const props = defineProps<{ section: DraftSection; index: number; count: number; courseId?: string }>()
const emit = defineEmits<{ move: [delta: number]; remove: []; preview: [] }>()
const s = props.section

const removeArmed = ref(false)
function remove() {
  if (!removeArmed.value) {
    removeArmed.value = true
    setTimeout(() => { removeArmed.value = false }, 4000)
    return
  }
  emit("remove")
}
// Questions copied from the bank replace a still-empty first question, otherwise go at the end.
const bankOpen = ref(false)
function addFromBank(items: DraftItem[]) {
  const blank = s.items.length === 1 && !s.items[0]!.prompt && !s.items[0]!.words && !s.items[0]!.answers
  if (blank) s.items.splice(0, 1)
  s.items.push(...items)
  bankOpen.value = false
}
const moveItem = (i: number, delta: number) => {
  const [it] = s.items.splice(i, 1)
  s.items.splice(i + delta, 0, it!)
}
</script>

<template>
  <section class="card editor-section">
    <div class="head">
      <span class="type">{{ index + 1 }}. {{ SECTION_TYPES[s.type].label }}</span>
      <span class="row tools">
        <button class="btn small" :title="$t('sectionEd.previewTitle')" @click="emit('preview')">👁 {{ $t("sectionEd.preview") }}</button>
        <button class="btn ghost small" :disabled="index === 0" :title="$t('sectionEd.up')" @click="emit('move', -1)">↑</button>
        <button class="btn ghost small" :disabled="index === count - 1" :title="$t('sectionEd.down')" @click="emit('move', 1)">↓</button>
        <button class="btn small" :class="removeArmed ? 'danger' : 'ghost'" @click="remove">{{ removeArmed ? $t("sectionEd.removeConfirm") : $t("sectionEd.remove") }}</button>
      </span>
    </div>

    <div class="grid2">
      <label>{{ $t("sectionEd.title") }}<input v-model="s.title" type="text" :placeholder="$t('sectionEd.titleEx')"></label>
      <label>{{ $t("sectionEd.time") }}<input v-model="s.time" type="text" :placeholder="$t('sectionEd.timeEx')"></label>
    </div>
    <div class="field">
      <span>{{ $t("sectionEd.hint") }} <span class="muted">{{ $t("sectionEd.optional") }}</span></span>
      <RichEditor v-model="s.hint" inline :placeholder="$t('sectionEd.hintEx')" />
    </div>

    <div v-if="s.type === 'explain'" class="field">
      <span>{{ $t("sectionEd.body") }} <span class="muted">{{ $t("sectionEd.bodyHelp") }}</span></span>
      <RichEditor v-model="s.body" :placeholder="$t('sectionEd.bodyEx')" />
    </div>
    <label v-else-if="s.type === 'writing'">
      {{ $t("sectionEd.placeholder") }} <span class="muted">{{ $t("sectionEd.optional") }}</span>
      <textarea v-model="s.placeholder" placeholder="1. Every morning, I ..." />
    </label>
    <details v-if="hasPassage(s.type)" class="passage-field" :open="!!s.body">
      <summary>{{ $t("sectionEd.passage") }} <span class="muted">{{ $t("sectionEd.passageHelp") }}</span></summary>
      <RichEditor v-model="s.body" :placeholder="$t('sectionEd.passageEx')" />
    </details>
    <label v-if="s.type === 'typed'" class="row inline"><input v-model="s.short" type="checkbox"> {{ $t("sectionEd.short") }}</label>
    <p v-if="s.type === 'mcq' || s.type === 'error'" class="hint small" v-html="$t('sectionEd.underlineHelp')" />

    <div v-for="(it, i) in s.items" :key="i" class="item">
      <div class="item-head">
        <b class="small">{{ $t("sectionEd.item", { n: i + 1 }) }}</b>
        <span class="row tools">
          <button class="btn ghost small" :disabled="i === 0" @click="moveItem(i, -1)">↑</button>
          <button class="btn ghost small" :disabled="i === s.items.length - 1" @click="moveItem(i, 1)">↓</button>
          <button class="btn ghost small" :disabled="s.items.length === 1" @click="s.items.splice(i, 1)">{{ $t("sectionEd.removeItem") }}</button>
        </span>
      </div>

      <template v-if="s.type === 'cards'">
        <div class="grid2">
          <div class="field"><span>{{ $t("sectionEd.front") }}</span><RichEditor v-model="it.prompt" inline placeholder="who" /></div>
          <div class="field"><span>{{ $t("sectionEd.back") }}</span><RichEditor v-model="it.back" inline :placeholder="$t('sectionEd.backEx')" /></div>
        </div>
      </template>

      <template v-else-if="s.type === 'match'">
        <div class="grid2">
          <div class="field"><span>{{ $t("sectionEd.left") }}</span><RichEditor v-model="it.prompt" inline placeholder="What do you usually do at weekends?" /></div>
          <label>{{ $t("sectionEd.right") }} <span class="muted">{{ $t("sectionEd.rightHelp") }}</span>
            <input v-model="it.back" type="text" placeholder="I often play football with my friends.">
          </label>
        </div>
        <label>{{ $t("sectionEd.tag") }} <span class="muted">{{ $t("sectionEd.tagHelp") }}</span><input v-model="it.tag" type="text"></label>
      </template>

      <template v-else-if="s.type === 'error'">
        <label>{{ $t("sectionEd.errorChunks") }} <span class="muted">{{ $t("sectionEd.errorChunksHelp") }}</span>
          <input v-model="it.words" type="text" placeholder="My sister / go / to school / by bus every day.">
        </label>
        <div v-if="splitList(it.words, '/').length >= 2" class="chunks">
          <span class="small muted">{{ $t("sectionEd.pickWrong") }}</span>
          <label v-for="(c, j) in splitList(it.words, '/')" :key="j" class="chunk" :class="{ on: it.correct === j + 1 }">
            <input v-model="it.correct" type="radio" :name="`wrong-${s.uid}-${i}`" :value="j + 1">
            <b>{{ "ABCDEF"[j] }}</b> <span v-html="markUnderline(c)" />
          </label>
        </div>
        <div class="grid2">
          <div class="field">
            <span>{{ $t("sectionEd.fix") }} <span class="muted">{{ $t("sectionEd.whyHelp") }}</span></span>
            <RichEditor v-model="it.explanation" inline placeholder="go → goes" />
          </div>
          <label>{{ $t("sectionEd.tag") }} <span class="muted">{{ $t("sectionEd.tagHelp") }}</span><input v-model="it.tag" type="text" placeholder="present simple"></label>
        </div>
      </template>

      <template v-else>
        <div v-if="s.type !== 'order'" class="field">
          <span>{{ $t("sectionEd.question") }} <span class="muted">{{ $t("sectionEd.questionHelp") }}</span></span>
          <RichEditor v-model="it.prompt" inline placeholder="My brother ___ to school by bike every day." />
        </div>
        <label v-else>{{ $t("sectionEd.instruction") }} <span class="muted">{{ $t("sectionEd.optional") }}</span><input v-model="it.prompt" type="text" :placeholder="$t('lesson.orderPrompt')"></label>

        <div v-if="s.type === 'mcq'" class="options">
          <span class="small muted">{{ $t("sectionEd.options") }}</span>
          <div v-for="(_, j) in it.options" :key="j" class="row option">
            <input v-model="it.correct" type="radio" :name="`correct-${s.uid}-${i}`" :value="j + 1" :title="$t('sectionEd.correct')">
            <input v-model="it.options[j]" type="text" :placeholder="$t('sectionEd.option', { n: j + 1 })">
            <button class="btn ghost small" :disabled="it.options.length <= 2" @click="it.options.splice(j, 1); if (it.correct > it.options.length) it.correct = 1">×</button>
          </div>
          <button class="btn ghost small" :disabled="it.options.length >= 6" @click="it.options.push('')">{{ $t("sectionEd.addOption") }}</button>
        </div>

        <label v-if="s.type === 'typed'">{{ $t("sectionEd.answers") }} <span class="muted">{{ $t("sectionEd.answersHelp") }}</span>
          <input v-model="it.answers" type="text" placeholder="don't wear | do not wear">
        </label>

        <template v-if="s.type === 'order'">
          <label><span v-html="$t('sectionEd.chunks')" /> <span class="muted">{{ $t("sectionEd.chunksHelp") }}</span>
            <input v-model="it.words" type="text" placeholder="My school / has / a big library">
          </label>
          <label>{{ $t("sectionEd.alt") }} <span class="muted">{{ $t("sectionEd.altHelp") }}</span>
            <input v-model="it.answers" type="text">
          </label>
        </template>

        <div class="grid2">
          <div class="field">
            <span>{{ $t("sectionEd.why") }} <span class="muted">{{ $t("sectionEd.whyHelp") }}</span></span>
            <RichEditor v-model="it.explanation" inline :placeholder="$t('sectionEd.whyEx')" />
          </div>
          <label>{{ $t("sectionEd.tag") }} <span class="muted">{{ $t("sectionEd.tagHelp") }}</span><input v-model="it.tag" type="text" placeholder="present simple"></label>
        </div>
      </template>
    </div>
    <div v-if="hasItems(s.type)" class="row">
      <button class="btn ghost" @click="s.items.push(emptyItem())">{{ $t("sectionEd.addItem") }}</button>
      <button v-if="SECTION_TYPES[s.type].scored" class="btn ghost" @click="bankOpen = true">{{ $t("sectionEd.fromBank") }}</button>
    </div>
    <LessonEditorQuestionBank v-if="bankOpen" :type="s.type" :course-id="courseId ?? ''" @pick="addFromBank" @close="bankOpen = false" />
  </section>
</template>

<style scoped>
.editor-section { display: flex; flex-direction: column; gap: 10px; }
.head, .item-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.type { font-weight: 700; }
.tools { gap: 4px; }
.tools .btn { padding: 2px 10px; }
label, .field { display: flex; flex-direction: column; gap: 4px; font-size: .88rem; font-weight: 500; }
label .muted, .field .muted { font-weight: 400; }
.field :deep(.rich), .field :deep(.preview) { font-size: 1rem; }
label.inline { flex-direction: row; align-items: center; gap: 8px; font-weight: 400; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.item { border-top: 1px dashed var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.options { display: flex; flex-direction: column; gap: 6px; }
.option { flex-wrap: nowrap; }
.option input[type=text] { flex: 1; min-width: 0; }
.passage-field { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
.passage-field summary { cursor: pointer; font-size: .88rem; font-weight: 500; }
.passage-field[open] summary { margin-bottom: 8px; }
.chunks { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chunks .small { width: 100%; }
.chunk { flex-direction: row; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; font-weight: 400; }
.chunk.on { border-color: var(--bad); background: color-mix(in srgb, var(--bad) 10%, transparent); }
@media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
</style>
