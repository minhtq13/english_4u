<script setup lang="ts">
import type { Answer, OrderItem, Response } from "~/utils/course"

const props = defineProps<{
  sectionKey: string
  items: OrderItem[]
  responses: Record<string, Response>
  /** Graded answers; null while results are hidden. */
  results: Record<string, Answer> | null
  locked?: boolean
  /** Teacher preview: show the answer of unanswered questions without marking them wrong. */
  showKey?: boolean
}>()
const emit = defineEmits<{ respond: [qid: string, response: Response | null] }>()

const qid = (i: number) => qidOf(props.sectionKey, props.items[i]!, i)

// `words` arrive in a fixed shuffled order (saved `chosen` indices point into it); the pool reshuffles for display.
const rows = props.items.map(it => ({ it, pool: shuffled(it.words.map((_, k) => k)) }))
const chosen = ref<number[][]>(props.items.map((it, i) => restore(it.words, props.responses[qid(i)])))

/** Saved indices, or (for answers saved before words were served shuffled) indices rebuilt from the sentence. */
function restore(words: string[], r?: Response): number[] {
  if (!r) return []
  if (r.chosen && r.chosen.map(k => words[k]).join(" ") === r.given) return r.chosen.slice()
  const picked: number[] = []
  let rest = r.given
  while (rest) {
    const k = words.findIndex((w, j) => !picked.includes(j) && (rest === w || rest.startsWith(`${w} `)))
    if (k < 0) return []
    picked.push(k)
    rest = rest.slice(words[k]!.length).trimStart()
  }
  return picked
}

// A sentence counts as answered once every chunk is placed.
function save(i: number) {
  const { it } = rows[i]!
  const picked = chosen.value[i]!
  emit("respond", qid(i), picked.length === it.words.length
    ? { given: picked.map(k => it.words[k]).join(" "), chosen: picked.slice() }
    : null)
}

const add = (i: number, k: number) => { if (!props.locked) { chosen.value[i]!.push(k); save(i) } }
const remove = (i: number, pos: number) => { if (!props.locked) { chosen.value[i]!.splice(pos, 1); save(i) } }
const clear = (i: number) => { chosen.value[i] = []; save(i) }
</script>

<template>
  <div>
    <div v-for="(row, i) in rows" :key="i" class="q">
      <p><b>{{ i + 1 }}.</b> {{ row.it.prompt || $t("lesson.orderPrompt") }}</p>
      <div class="built">
        <button v-for="(k, pos) in chosen[i]" :key="`${k}-${pos}`" class="chip" :disabled="locked" @click="remove(i, pos)">
          {{ row.it.words[k] }}
        </button>
      </div>
      <template v-if="!locked">
        <div class="pool">
          <template v-for="k in row.pool" :key="k">
            <button v-if="!chosen[i]!.includes(k)" class="chip" @click="add(i, k)">{{ row.it.words[k] }}</button>
          </template>
        </div>
        <button v-if="chosen[i]!.length" class="btn ghost small" @click="clear(i)">{{ $t("lesson.reorder") }}</button>
      </template>
      <AnswerFeedback v-if="results" :show-key="showKey" :result="results[qid(i)]" :why="row.it.why" :correct="row.it.ans[0]" />
    </div>
  </div>
</template>
