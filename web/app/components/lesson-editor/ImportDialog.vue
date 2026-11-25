<script setup lang="ts">
import type { DraftSection } from "~/utils/lessonDraft"
import { parseQuestions, questionProblems, type ImportMode, type ParsedQuestion } from "~/utils/importQuestions"

// "Paste questions from text": the teacher pastes an exam, picks how to read it, checks and edits what was found,
// and adds it as one section of the lesson (nothing is added before the last button).
const emit = defineEmits<{ close: []; add: [section: DraftSection] }>()
const { t } = useI18n()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => emit("close"))
const titleId = useId()

const mode = ref<ImportMode>("mcq")
const text = ref("")
const found = ref<ParsedQuestion[] | null>(null)
const checked = computed(() => (found.value ?? []).map(q => questionProblems(q, mode.value)))
const bad = computed(() => checked.value.filter(p => p.length).length)

const letter = (i: number) => String.fromCharCode(65 + i)
const example = computed(() => t(`importer.example.${mode.value}`))

function parse() {
  found.value = parseQuestions(text.value, mode.value)
}
function remove(i: number) { found.value = (found.value ?? []).filter((_, j) => j !== i) }
function setCorrect(q: ParsedQuestion, v: string) { q.correct = Number(v) }

function add() {
  const qs = found.value ?? []
  if (!qs.length || bad.value) return
  const type = mode.value === "error" ? "error" : "mcq"
  const title = mode.value === "tf" ? t("importer.tfTitle") : SECTION_TYPES[type].label
  emit("add", emptySection(type, {
    title,
    items: qs.map(q => mode.value === "error"
      ? emptyItem({ words: q.options.map(o => o.trim()).join(" / "), correct: q.correct, explanation: q.explanation })
      : emptyItem({ prompt: q.prompt.trim(), options: q.options.map(o => o.trim()), correct: q.correct, explanation: q.explanation })),
  }))
  emit("close")
}
</script>

<template>
  <div class="overlay scroll" @click.self="emit('close')">
    <div ref="dialog" class="dialog wide" role="dialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId">
      <header class="bar">
        <b :id="titleId">{{ $t("importer.title") }}</b>
        <button class="btn small" @click="emit('close')">{{ $t("common.close") }} <Icon name="x" /></button>
      </header>
      <div class="body">
        <label class="small"><b>{{ $t("importer.mode") }}</b>
          <select v-model="mode" @change="found = null">
            <option value="mcq">{{ $t("importer.modeMcq") }}</option>
            <option value="tf">{{ $t("importer.modeTf") }}</option>
            <option value="error">{{ $t("importer.modeError") }}</option>
          </select>
        </label>
        <p class="hint">{{ $t(`importer.hint.${mode}`) }}</p>
        <label class="small"><b>{{ $t("importer.paste") }}</b>
          <textarea v-model="text" rows="8" :placeholder="example" spellcheck="false" />
        </label>
        <div class="row">
          <button class="btn primary" :disabled="!text.trim()" @click="parse">{{ $t("importer.parse") }}</button>
        </div>

        <template v-if="found">
          <p v-if="!found.length" class="fb no">{{ $t("importer.none") }}</p>
          <template v-else>
            <p class="small"><b>{{ $t("importer.found", found.length) }}</b>
              <span v-if="bad" class="bad"> · {{ $t("importer.needFix", bad) }}</span></p>
            <ol class="list">
              <li v-for="(q, i) in found" :key="i" class="item" :class="{ problem: checked[i]!.length }">
                <div class="row top">
                  <textarea v-if="mode !== 'error'" v-model="q.prompt" rows="2" :aria-label="$t('importer.prompt')" />
                  <button class="btn small ghost" :aria-label="$t('importer.remove')" @click="remove(i)"><Icon name="x" /></button>
                </div>
                <div v-for="(_, k) in q.options" :key="k" class="row opt">
                  <b class="ltr">{{ letter(k) }}</b>
                  <input v-model="q.options[k]" type="text" :readonly="mode === 'tf'" :aria-label="`${$t('importer.option')} ${letter(k)}`">
                </div>
                <label class="small row">{{ mode === "error" ? $t("importer.wrongPart") : $t("importer.rightOption") }}
                  <select :value="q.correct" class="key" @change="setCorrect(q, ($event.target as HTMLSelectElement).value)">
                    <option :value="0">-</option>
                    <option v-for="(_, k) in q.options" :key="k" :value="k + 1">{{ letter(k) }}</option>
                  </select>
                </label>
                <p v-for="p in checked[i]" :key="p" class="small bad">{{ $t(`importer.problem.${p}`) }}</p>
              </li>
            </ol>
            <div class="row">
              <button class="btn primary" :disabled="!!bad" @click="add">{{ $t("importer.add", found.length) }}</button>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.body { display: flex; flex-direction: column; gap: var(--space-md); }
.body p, .body label { margin: 0; }
label { display: flex; flex-direction: column; gap: var(--space-xs); }
label.row { flex-direction: row; align-items: center; }
textarea { min-height: 0; }
.list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--space-md); }
.item { border: 1px solid var(--line); border-radius: var(--radius-lg); padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.item.problem { border-color: var(--bad); }
.top { flex-wrap: nowrap; align-items: flex-start; }
.opt { flex-wrap: nowrap; }
.ltr { width: 20px; text-align: center; color: var(--muted); }
.key { width: auto; }
.bad { color: var(--bad); }
</style>
