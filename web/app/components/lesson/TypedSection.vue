<script setup lang="ts">
import type { Answer, Response, TypedItem } from "~/utils/course"

const props = defineProps<{
  sectionKey: string
  items: TypedItem[]
  short?: boolean
  responses: Record<string, Response>
  /** Graded answers; null while results are hidden. */
  results: Record<string, Answer> | null
  locked?: boolean
  /** Teacher preview: show the answer of unanswered questions without marking them wrong. */
  showKey?: boolean
}>()
const emit = defineEmits<{ respond: [qid: string, response: Response | null] }>()

const qid = (i: number) => qidOf(props.sectionKey, props.items[i]!, i)

// Inputs start from the saved choices; every edit is saved (debounced by the attempt).
const values = ref<string[]>(props.items.map((_, i) => props.responses[qid(i)]?.given ?? ""))

function changed(i: number) {
  const given = (values.value[i] ?? "").trim()
  emit("respond", qid(i), given ? { given } : null)
}
</script>

<template>
  <div>
    <div v-for="(it, i) in items" :key="i" class="q">
      <p><b>{{ i + 1 }}.</b> <span v-html="it.q" /></p>
      <input
        :id="`in-${qid(i)}`"
        v-model="values[i]"
        type="text"
        :class="{ short }"
        :disabled="locked"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        translate="no"
        data-gramm="false"
        @input="changed(i)"
      >
      <AnswerFeedback v-if="results" :show-key="showKey" :result="results[qid(i)]" :why="it.why" :correct="it.ans[0]" />
    </div>
  </div>
</template>
