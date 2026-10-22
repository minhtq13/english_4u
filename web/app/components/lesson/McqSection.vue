<script setup lang="ts">
import type { Answer, McqItem } from "~/utils/course"

const props = defineProps<{ sectionKey: string; items: McqItem[]; answers: Record<string, Answer> }>()
const emit = defineEmits<{ answer: [qid: string, answer: Answer] }>()

const qid = (i: number) => `${props.sectionKey}${i + 1}`
const pickedIndex = (it: McqItem, i: number) => {
  const a = props.answers[qid(i)]
  return a ? it.opts.indexOf(a.given) : -1
}

function pick(it: McqItem, i: number, j: number) {
  if (props.answers[qid(i)]) return
  emit("answer", qid(i), {
    ok: j === it.a,
    q: stripTags(it.q),
    given: it.opts[j]!,
    correct: it.opts[it.a]!,
    tag: it.tag || "",
  })
}

function optionClass(it: McqItem, i: number, j: number) {
  if (!props.answers[qid(i)]) return ""
  if (j === it.a) return "right"
  return j === pickedIndex(it, i) ? "wrong" : ""
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
          :disabled="!!answers[qid(i)]"
          :class="optionClass(it, i, j)"
          @click="pick(it, i, j)"
          v-html="o"
        />
      </div>
      <AnswerFeedback
        v-if="answers[qid(i)]"
        :ok="answers[qid(i)]!.ok"
        :why="it.why"
        :correct="answers[qid(i)]!.ok ? '' : it.opts[it.a]"
      />
    </div>
  </div>
</template>
