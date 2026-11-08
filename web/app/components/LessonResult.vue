<script setup lang="ts">
import type { Answer, Lesson } from "~/utils/course"
import { sectionScores, wrongAnswers } from "~/utils/lessonProgress"
import { percentOf } from "~/utils/attemptOutcome"

// The summary a student sees once the result is out: the score as a ring, each section's score, and what they got wrong.
const props = defineProps<{ lesson: Lesson; results: Record<string, Answer>; ok: number; total: number }>()
const percent = computed(() => percentOf(props.ok, props.total) ?? 0)
const sections = computed(() => sectionScores(props.lesson, props.results))
const wrong = computed(() => wrongAnswers(props.lesson, props.results))
const onlyWrong = ref(false)
const R = 42
const C = 2 * Math.PI * R
const band = computed(() => (percent.value >= 80 ? "good" : percent.value >= 50 ? "mid" : "low"))
function go(index: number) {
  document.getElementById(`sec-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
}
</script>

<template>
  <section class="card result" :aria-label="$t('resultView.title')">
    <div class="top">
      <svg class="ring" :class="band" viewBox="0 0 100 100" role="img" :aria-label="$t('resultView.ring', { ok, total, percent })">
        <circle cx="50" cy="50" :r="R" class="track" />
        <circle cx="50" cy="50" :r="R" class="fill" :stroke-dasharray="`${(percent / 100) * C} ${C}`" transform="rotate(-90 50 50)" />
        <text x="50" y="54" text-anchor="middle" class="pct">{{ percent }}%</text>
      </svg>
      <div>
        <h2>{{ $t("resultView.title") }}</h2>
        <p class="big">{{ $t("lessonPage.result", { ok, total }) }}</p>
        <p class="muted small">{{ wrong.length ? $t("resultView.wrongCount", wrong.length) : $t("resultView.perfect") }}</p>
      </div>
    </div>

    <ul class="parts">
      <li v-for="s in sections" :key="s.index">
        <button type="button" class="link" @click="go(s.index)">{{ s.title }}</button>
        <StatBar :value="s.percent" />
        <span class="n">{{ s.ok }}/{{ s.total }}</span>
      </li>
    </ul>

    <template v-if="wrong.length">
      <div class="row">
        <button class="btn small" :aria-expanded="onlyWrong" @click="onlyWrong = !onlyWrong">
          {{ onlyWrong ? $t("resultView.hideWrong") : $t("resultView.showWrong", wrong.length) }}
        </button>
        <NuxtLink :to="`/practice/${lesson.id}`" class="btn small primary">{{ $t("practice.start") }}</NuxtLink>
      </div>
      <ol v-if="onlyWrong" class="wrong">
        <li v-for="w in wrong" :key="w.qid">
          <span class="muted small">{{ w.sectionTitle }}</span>
          <div class="q" v-html="safeHtml(w.q)" />
          <div class="row small">
            <span class="bad">{{ $t("resultView.yours") }}: <b>{{ w.given || "–" }}</b></span>
            <span class="good">{{ $t("resultView.correct") }}: <b>{{ w.correct }}</b></span>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.result { margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
.top { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.top h2 { margin: 0; }
.big { font-size: 1.1rem; font-weight: 600; margin: 2px 0; }
.ring { width: 110px; height: 110px; flex: none; }
.track { fill: none; stroke: var(--line); stroke-width: 10; }
.fill { fill: none; stroke: var(--accent); stroke-width: 10; stroke-linecap: round; }
.ring.good .fill { stroke: var(--ok); }
.ring.mid .fill { stroke: var(--warn); }
.ring.low .fill { stroke: var(--bad); }
.pct { font-size: 22px; font-weight: 700; fill: var(--text); font-variant-numeric: tabular-nums; }
.parts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.parts li { display: grid; grid-template-columns: minmax(100px, 1fr) minmax(80px, 2fr) auto; gap: 10px; align-items: center; }
.link { background: none; border: 0; padding: 0; color: var(--accent); text-align: left; font-weight: 600; cursor: pointer; }
.n { font-variant-numeric: tabular-nums; font-weight: 600; }
.wrong { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; }
.q { margin: 2px 0; }
.good { color: var(--ok); }
.bad { color: var(--bad); }
.row { display: flex; gap: 16px; flex-wrap: wrap; }
</style>
