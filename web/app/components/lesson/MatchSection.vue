<script setup lang="ts">
import type { Answer, MatchItem, Response } from "~/utils/course"

// Matching: every left side picks one right side from the section's list (lettered a, b, c…).
const props = defineProps<{
  sectionKey: string
  items: MatchItem[]
  /** All right sides, in a fixed shuffled order. */
  choices: string[]
  responses: Record<string, Response>
  /** Graded answers; null while results are hidden. */
  results: Record<string, Answer> | null
  locked?: boolean
  /** Teacher preview: show the answer of unanswered questions without marking them wrong. */
  showKey?: boolean
}>()
const emit = defineEmits<{ respond: [qid: string, response: Response | null] }>()

const qid = (i: number) => qidOf(props.sectionKey, props.items[i]!, i)
const list = computed(() => [...new Set(props.choices)])
const letter = (j: number) => String.fromCharCode(97 + j)

function pick(i: number, value: string) {
  emit("respond", qid(i), value ? { given: value } : null)
}
function state(i: number) {
  if (!props.results) return ""
  const r = props.results[qid(i)]
  return r ? (r.ok ? "right" : "wrong") : ""
}
</script>

<template>
  <div>
    <ol class="choices" type="a">
      <li v-for="(c, j) in list" :key="j">{{ c }}</li>
    </ol>
    <div v-for="(it, i) in items" :key="i" class="q pair">
      <p><b>{{ i + 1 }}.</b> <span v-html="it.q" /></p>
      <select
        :value="responses[qid(i)]?.given ?? ''"
        :disabled="locked"
        :class="state(i)"
        :aria-label="$t('lesson.matchPick', { n: i + 1 })"
        @change="pick(i, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ $t("lesson.matchChoose") }}</option>
        <option v-for="(c, j) in list" :key="j" :value="c">{{ letter(j) }}. {{ c }}</option>
      </select>
      <AnswerFeedback v-if="results" :show-key="showKey" :result="results[qid(i)]" :why="it.why" :correct="it.a" />
    </div>
  </div>
</template>

<style scoped>
.choices { margin: 0 0 8px; padding: 10px 12px 10px 32px; background: var(--accent-soft); border-radius: 8px; }
.choices li { margin: 2px 0; }
.pair select { width: 100%; max-width: 520px; }
.pair select.right { border-color: var(--ok); }
.pair select.wrong { border-color: var(--bad); }
</style>
