<script setup lang="ts">
import type { Answer, TypedItem } from "~/utils/course"

const props = defineProps<{ sectionKey: string; items: TypedItem[]; short?: boolean; answers: Record<string, Answer> }>()
const emit = defineEmits<{ answer: [qid: string, answer: Answer] }>()

const qid = (i: number) => `${props.sectionKey}${i + 1}`

// Inputs start from the saved first attempt; later checks only update the local feedback.
const values = ref<string[]>(props.items.map((_, i) => props.answers[qid(i)]?.given ?? ""))
const results = ref<(boolean | null)[]>(props.items.map((_, i) => props.answers[qid(i)]?.ok ?? null))

watch(() => props.answers, (answers) => {
  props.items.forEach((_, i) => {
    if (!answers[qid(i)]) { values.value[i] = ""; results.value[i] = null }
  })
})

function check(it: TypedItem, i: number) {
  const given = (values.value[i] ?? "").trim()
  if (!given) return
  const ok = it.ans.map(norm).includes(norm(given))
  results.value[i] = ok
  emit("answer", qid(i), { ok, q: stripTags(it.q), given, correct: it.ans[0]!, tag: it.tag || "" })
}
</script>

<template>
  <div>
    <div v-for="(it, i) in items" :key="i" class="q">
      <p><b>{{ i + 1 }}.</b> <span v-html="it.q" /></p>
      <div class="row">
        <input
          :id="`in-${qid(i)}`"
          v-model="values[i]"
          type="text"
          :class="{ short }"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @keydown.enter="check(it, i)"
        >
        <button class="btn" @click="check(it, i)">Kiểm tra</button>
      </div>
      <AnswerFeedback v-if="results[i] !== null" :ok="!!results[i]" :why="it.why" :correct="results[i] ? '' : it.ans[0]" />
    </div>
  </div>
</template>
