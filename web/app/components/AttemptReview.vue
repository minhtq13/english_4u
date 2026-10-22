<script setup lang="ts">
import type { Answer, Lesson } from "~/utils/course"

const props = defineProps<{ lesson: Lesson; answers: Record<string, Answer> }>()

const sections = computed(() =>
  props.lesson.sections.filter(isScored).map((s) => {
    const rows = s.items.map((_, i) => ({ qid: `${s.key}${i + 1}`, answer: props.answers[`${s.key}${i + 1}`] }))
    const done = rows.filter(r => r.answer)
    return { title: s.title, rows, ok: done.filter(r => r.answer!.ok).length, done: done.length, total: rows.length }
  }),
)
const showAll = ref(false)
</script>

<template>
  <div>
    <label class="row small muted toggle"><input v-model="showAll" type="checkbox"> Hiện cả câu đúng</label>
    <div v-for="s in sections" :key="s.title" class="block">
      <h3>{{ s.title }} <span class="muted small">· {{ s.ok }}/{{ s.done }} đúng<template v-if="s.done < s.total">, bỏ {{ s.total - s.done }} câu</template></span></h3>
      <template v-for="r in s.rows" :key="r.qid">
        <div v-if="r.answer && (showAll || !r.answer.ok)" class="answer" :class="r.answer.ok ? 'ok' : 'no'">
          <div class="small muted">{{ r.qid }} · {{ r.answer.q }}<template v-if="r.answer.tag"> · [{{ r.answer.tag }}]</template></div>
          <div>{{ r.answer.ok ? "✔" : "✘" }} {{ r.answer.given }}</div>
          <div v-if="!r.answer.ok" class="small">Đúng: <b v-html="r.answer.correct" /></div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.toggle { margin-bottom: 4px; }
.toggle input { width: auto; }
.block h3 { margin-top: 12px; }
.answer { border-left: 3px solid var(--line); padding: 4px 10px; margin: 6px 0; }
.answer.ok { border-color: var(--ok); }
.answer.no { border-color: var(--bad); }
</style>
