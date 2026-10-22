<script setup lang="ts">
import type { Answer, OrderItem } from "~/utils/course"

const props = defineProps<{ sectionKey: string; items: OrderItem[]; answers: Record<string, Answer> }>()
const emit = defineEmits<{ answer: [qid: string, answer: Answer] }>()

const qid = (i: number) => `${props.sectionKey}${i + 1}`

// Words are stored in the correct order, separated by "|"; the pool shows them shuffled.
const items = props.items.map(it => {
  const words = it.words.split("|").map(w => w.trim())
  return { it, words, correct: words.join(" "), pool: shuffled(words.map((_, k) => k)) }
})
const chosen = ref<number[][]>(items.map((_, i) => props.answers[qid(i)]?.chosen?.slice() ?? []))
const results = ref<(boolean | null)[]>(items.map((_, i) => props.answers[qid(i)]?.ok ?? null))

watch(() => props.answers, (answers) => {
  items.forEach((_, i) => {
    if (!answers[qid(i)]) { chosen.value[i] = []; results.value[i] = null }
  })
})

const add = (i: number, k: number) => { chosen.value[i]!.push(k) }
const remove = (i: number, pos: number) => { chosen.value[i]!.splice(pos, 1) }
const clear = (i: number) => { chosen.value[i] = []; results.value[i] = null }

function check(i: number) {
  const { it, words, correct } = items[i]!
  const picked = chosen.value[i]!
  if (picked.length !== words.length) return
  const given = picked.map(k => words[k]).join(" ")
  const ok = [correct, ...(it.alt || [])].map(norm).includes(norm(given))
  results.value[i] = ok
  emit("answer", qid(i), { ok, q: it.prompt || "Sắp xếp câu", given, correct, chosen: picked.slice(), tag: it.tag || "" })
}
</script>

<template>
  <div>
    <div v-for="(row, i) in items" :key="i" class="q">
      <p><b>{{ i + 1 }}.</b> {{ row.it.prompt || "Sắp xếp thành câu đúng:" }}</p>
      <div class="built">
        <button v-for="(k, pos) in chosen[i]" :key="`${k}-${pos}`" class="chip" @click="remove(i, pos)">
          {{ row.words[k] }}
        </button>
      </div>
      <div class="pool">
        <template v-for="k in row.pool" :key="k">
          <button v-if="!chosen[i]!.includes(k)" class="chip" @click="add(i, k)">{{ row.words[k] }}</button>
        </template>
      </div>
      <div class="row">
        <button class="btn" :disabled="chosen[i]!.length !== row.words.length" @click="check(i)">Kiểm tra</button>
        <button class="btn ghost" @click="clear(i)">Làm lại</button>
      </div>
      <AnswerFeedback v-if="results[i] !== null" :ok="!!results[i]" :why="row.it.why" :correct="results[i] ? '' : row.correct" />
    </div>
  </div>
</template>
