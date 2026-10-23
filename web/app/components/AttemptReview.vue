<script setup lang="ts">
import type { Answer, Lesson, Response } from "~/utils/course"

// A student's auto-graded work, shown the way the student sees their results.
const props = defineProps<{
  lesson: Lesson
  responses: Record<string, Response>
  /** Graded answers; null while the attempt is still in progress. */
  answers: Record<string, Answer> | null
}>()

const sections = computed(() =>
  props.lesson.sections.filter(isScored).map((s) => {
    const rows = s.items.map((it, i) => props.answers?.[qidOf(s.key, it, i)])
    const ok = rows.filter(a => a?.ok).length
    const wrong = rows.filter(a => a && !a.ok).length
    return { s, ok, wrong, blank: rows.length - ok - wrong, total: rows.length }
  }),
)
</script>

<template>
  <div>
    <div v-if="answers" class="summary">
      <a v-for="x in sections" :key="x.s.key" :href="`#review-${x.s.key}`" class="tile">
        <span class="tile-title">{{ x.s.title }}</span>
        <StatBar :value="Math.round((x.ok / (x.total || 1)) * 100)" :text="`${x.ok}/${x.total}`" />
        <span class="small muted">
          <span v-if="x.wrong" class="bad">{{ $t("review.wrong", { n: x.wrong }) }}</span><template v-if="x.wrong && x.blank"> · </template>
          <template v-if="x.blank">{{ $t("review.blank", { n: x.blank }) }}</template>
          <template v-if="!x.wrong && !x.blank">{{ $t("review.allRight") }}</template>
        </span>
      </a>
    </div>
    <p v-else class="fb key">{{ $t("review.notSubmitted") }}</p>

    <div v-for="x in sections" :id="`review-${x.s.key}`" :key="x.s.key" class="block">
      <div class="block-head">
        <h3>{{ x.s.title }}</h3>
        <span v-if="answers" class="badge" :class="x.ok === x.total ? 'done' : 'partial'">{{ $t("review.correct", { ok: x.ok, total: x.total }) }}</span>
      </div>
      <LessonQuestions :section="x.s" :responses="responses" :results="answers" locked />
    </div>
  </div>
</template>

<style scoped>
.summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 8px; }
.tile { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px;
  background: var(--bg); color: var(--text); text-decoration: none; }
.tile:hover { border-color: var(--accent); }
.tile-title { font-weight: 600; font-size: .92rem; }
.bad { color: var(--bad); font-weight: 600; }
.block { border-top: 1px solid var(--line); margin-top: 16px; padding-top: 8px; scroll-margin-top: 72px; }
.block-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.block-head h3 { margin: 8px 0; }
</style>
