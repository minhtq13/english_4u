<script setup lang="ts">
import type { Answer, McqItem, Response } from "~/utils/course"

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

function pick(it: McqItem, i: number, j: number) {
  if (props.locked) return
  emit("respond", qid(i), { given: it.opts[j]! })
}

function optionClass(it: McqItem, i: number, j: number) {
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
      <p><b>{{ i + 1 }}.</b> <span v-html="it.q" /></p>
      <div class="opts">
        <button
          v-for="(o, j) in it.opts"
          :key="j"
          :disabled="locked"
          :class="optionClass(it, i, j)"
          :aria-pressed="responses[qid(i)]?.given === o"
          @click="pick(it, i, j)"
          v-html="markUnderline(o)"
        />
      </div>
      <AnswerFeedback v-if="results" :show-key="showKey" :result="results[qid(i)]" :why="it.why" :correct="it.opts[it.a]" />
    </div>
  </div>
</template>
