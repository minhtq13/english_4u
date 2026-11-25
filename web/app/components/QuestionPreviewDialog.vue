<script setup lang="ts">
import type { ExamQuestion } from "~/utils/examGenerator"
import { LETTERS, plainMarked } from "~/utils/examGenerator"

// One question in full, as a teacher needs it to decide: its reading passage, the question with every choice, which
// answer is right and why. The button at the bottom adds it to the exam or takes it out.
const props = defineProps<{ question: ExamQuestion; inExam: boolean; source?: string; busy?: boolean }>()
const emit = defineEmits<{ close: []; toggle: [] }>()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => emit("close"))
const titleId = useId()

const q = computed(() => props.question)
const sentence = computed(() => q.value.words.join(" "))
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div ref="dialog" class="dialog wide" role="dialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId">
      <header class="bar">
        <b :id="titleId">{{ $t("qPreview.title") }} <span class="badge">{{ SECTION_TYPES[q.type].label }}</span></b>
        <button class="btn small" @click="emit('close')">{{ $t("common.close") }} <Icon name="x" /></button>
      </header>

      <div class="body">
        <p class="small muted meta">
          <span v-if="source">{{ $t("qPreview.from") }}: {{ source }}</span>
          <span v-if="q.sectionTitle"> · {{ q.sectionTitle }}</span>
          <span v-if="q.tag"> · [{{ q.tag }}]</span>
        </p>

        <div v-if="q.passage" class="passage">
          <b class="small muted">{{ $t("qPreview.passage") }}</b>
          <div v-html="safeHtml(q.passage)" />
        </div>

        <div v-if="q.prompt" class="prompt" v-html="safeHtml(q.prompt)" />

        <ol v-if="q.type === 'mcq'" class="choices">
          <li v-for="(o, i) in q.options" :key="i" :class="{ right: i === q.correct }">
            <b>{{ LETTERS[i] }}.</b> <span v-html="markUnderline(o)" />
            <Icon v-if="i === q.correct" name="check" />
          </li>
        </ol>

        <p v-else-if="q.type === 'error'" class="chunks">
          <span v-for="(c, i) in q.options" :key="i" class="chunk" :class="{ right: i === q.correct }">
            <u>{{ plainMarked(c) }}</u> <small>({{ LETTERS[i] }})</small>
          </span>
        </p>

        <p v-else-if="q.type === 'order'" class="chunks"><i>{{ q.words.join(" / ") }}</i></p>

        <div class="fb key">
          <b>{{ $t("examDoc.answer") }}:</b>{{ " " }}
          <template v-if="q.type === 'mcq'">{{ LETTERS[q.correct] }}. {{ plainMarked(q.options[q.correct] ?? "") }}</template>
          <template v-else-if="q.type === 'error'">{{ LETTERS[q.correct] }}. {{ plainMarked(q.options[q.correct] ?? "") }}</template>
          <template v-else-if="q.type === 'order'">{{ sentence }}</template>
          <template v-else-if="q.type === 'match'">{{ q.back }}</template>
          <template v-else>{{ q.answers.join(" / ") }}</template>
        </div>

        <div v-if="q.explanation" class="why">
          <b>{{ $t("examDoc.why") }}:</b>
          <div v-html="safeHtml(q.explanation)" />
        </div>
      </div>

      <footer class="foot">
        <button class="btn" @click="emit('close')">{{ $t("common.close") }}</button>
        <button class="btn" :class="inExam ? 'danger' : 'primary'" :disabled="busy" @click="emit('toggle')">
          {{ inExam ? $t("qPreview.remove") : $t("qPreview.add") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.dialog { width: min(640px, 100%); overflow: hidden; }
.body { overflow-y: auto; overflow-wrap: anywhere; }
.meta { margin: 0 0 10px; }
.passage { border: 1px solid var(--line); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: var(--space-md); background: var(--bg); max-height: 40dvh; overflow-y: auto; }
.passage :deep(p) { margin: 0 0 6px; }
.prompt { font-size: 1.05rem; margin-bottom: var(--space-sm); }
.prompt :deep(p) { margin: 0 0 6px; }
.choices { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 6px; }
.choices li { display: flex; align-items: center; gap: var(--space-sm); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 6px 10px; }
.choices li.right, .chunk.right { border-color: var(--ok); background: var(--ok-soft); color: var(--ok); font-weight: 600; }
.chunks { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.chunk { border: 1px solid var(--line); border-radius: var(--radius-md); padding: 4px 10px; }
.key { margin-top: var(--space-xs); }
.why { margin-top: 10px; font-size: .95rem; }
.why :deep(p) { margin: 4px 0 0; }
</style>
