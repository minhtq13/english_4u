<script setup lang="ts">
import type { Answer, McqItem, Response } from "~/utils/course"

// Error identification: each sentence is shown as its chunks, lettered A, B, C…; the learner taps the wrong one.
const props = defineProps<{
  sectionKey: string
  items: McqItem[]
  responses: Record<string, Response>
  /** Graded answers; null while results are hidden. */
  results: Record<string, Answer> | null
  locked?: boolean
  /** Teacher preview: show the answer of unanswered questions without marking them wrong. */
  showKey?: boolean
}>()
const emit = defineEmits<{ respond: [qid: string, response: Response | null] }>()

const qid = (i: number) => qidOf(props.sectionKey, props.items[i]!, i)
const LETTERS = "ABCDEFGH"

function pick(it: McqItem, i: number, j: number) {
  if (props.locked) return
  emit("respond", qid(i), { given: it.opts[j]! })
}

function chunkClass(it: McqItem, i: number, j: number) {
  const picked = props.responses[qid(i)]?.given === it.opts[j]
  if (!props.results) return picked ? "picked" : ""
  const correct = props.results[qid(i)]?.correct ?? it.opts[it.a]
  if (it.opts[j] === correct) return "right"
  return picked ? "wrong" : ""
}
</script>

<template>
  <div>
    <div v-for="(it, i) in items" :key="i" class="q">
      <p class="sentence">
        <b>{{ i + 1 }}.</b>
        <template v-for="(c, j) in it.opts" :key="j">
          {{ " " }}<button
            class="chunk"
            :class="chunkClass(it, i, j)"
            :disabled="locked"
            :aria-pressed="responses[qid(i)]?.given === c"
            @click="pick(it, i, j)"
          ><span v-html="markUnderline(c)" /><sub>{{ LETTERS[j] }}</sub></button>
        </template>
      </p>
      <AnswerFeedback v-if="results" :show-key="showKey" :result="results[qid(i)]" :why="it.why" :correct="it.opts[it.a]" />
    </div>
  </div>
</template>

<style scoped>
.sentence { line-height: 2.4; }
.chunk {
  border: none; border-bottom: 2px solid var(--muted); border-radius: 4px 4px 0 0; background: none; color: var(--text);
  font: inherit; padding: 2px 4px; cursor: pointer;
}
.chunk sub { font-size: .7em; font-weight: 700; color: var(--muted); margin-left: 2px; }
.chunk:hover:not(:disabled) { background: var(--accent-soft); }
.chunk:disabled { cursor: default; }
.chunk.picked { background: var(--accent-soft); border-bottom-color: var(--accent); color: var(--accent); font-weight: 600; }
.chunk.right { background: var(--ok-soft); border-bottom-color: var(--ok); color: var(--ok); }
.chunk.wrong { background: var(--bad-soft); border-bottom-color: var(--bad); color: var(--bad); }
</style>
