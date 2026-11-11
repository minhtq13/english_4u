<script setup lang="ts">
import type { ExamVariant } from "~/utils/examGenerator"
import { partHintOf, type ExamInfo } from "~/utils/exportDocx"
import { LETTERS, plainMarked, roman } from "~/utils/examGenerator"

// One exam code as it will print: the same parts, numbers, choices and key the Word file gets, on a white sheet
// (paper stays white in dark mode, like the lesson worksheet).
const props = defineProps<{ info: ExamInfo; variant: ExamVariant; withKey?: boolean; sheet?: "top" | "bottom" | "none" }>()
/** The small answer sheet: the numbers answered with a letter, ten to a row (with the letters filled in on the key copy). */
const sheetRows = computed(() => {
  const objective = props.variant.questions.filter(q => q.objective)
  return Array.from({ length: Math.ceil(objective.length / 10) }, (_, i) =>
    Array.from({ length: 10 }, (_, j) => objective[i * 10 + j] ?? null))
})
const showSheet = (at: "top" | "bottom") => (props.sheet ?? "none") === at && sheetRows.value.length > 0
</script>

<template>
  <article class="paper">
    <header class="head">
      <div>
        <b>{{ (info.school || $t("examDoc.schoolBlank")).toUpperCase() }}</b>
        <span v-if="info.department">{{ info.department }}</span>
        <span v-if="info.schoolYear">{{ $t("examDoc.schoolYear", { year: info.schoolYear }) }}</span>
      </div>
      <div>
        <b>{{ info.title.toUpperCase() }}</b>
        <span>{{ info.grade ? $t("examDoc.subjectGrade", { grade: info.grade }) : $t("examDoc.subject") }}</span>
        <span v-if="info.term">{{ info.term }}</span>
        <span><i>{{ $t("examDoc.duration", { n: info.minutes }) }}</i></span>
        <b>{{ $t("examDoc.code", { code: variant.code }) }}</b>
      </div>
    </header>

    <h3 v-if="withKey" class="key-title">{{ $t("examDoc.keyTitle") }}</h3>
    <table v-else class="student">
      <tbody>
        <tr>
          <td colspan="2">{{ $t("examDoc.name") }}: ………………………………………</td>
          <td>{{ $t("examDoc.class") }}: …………</td>
          <td>{{ $t("examDoc.candidate") }}: ………</td>
        </tr>
        <tr class="tall">
          <th>{{ $t("examDoc.mark") }}</th>
          <th colspan="3">{{ $t("examDoc.comment") }}</th>
        </tr>
      </tbody>
    </table>

    <div v-if="showSheet('top')" class="sheet-wrap">
      <b>{{ $t(withKey ? "examDoc.keySheet" : "examDoc.answerSheet") }}</b>
      <table class="sheet">
        <tbody>
          <template v-for="(row, ri) in sheetRows" :key="ri">
            <tr><th v-for="(c, ci) in row" :key="ci">{{ c ? c.n : "" }}</th></tr>
            <tr><td v-for="(c, ci) in row" :key="ci" class="letter">{{ withKey && c ? c.key : "" }}</td></tr>
          </template>
        </tbody>
      </table>
    </div>

    <section v-for="(p, pi) in variant.parts" :key="p.key" class="part">
      <h3>{{ $t("examDoc.part", { n: roman(pi + 1) }) }} {{ $t(`exam.part.${p.key}.title`).toUpperCase() }}</h3>
      <p class="part-hint">{{ partHintOf(info, p.key) }}</p>

      <template v-for="(b, bi) in p.blocks" :key="bi">
        <div v-if="b.passage" class="passage" v-html="safeHtml(b.passage)" />

        <div v-if="p.key === 'match'" class="match">
          <div>
            <p v-for="q in b.questions" :key="q.q.id">
              <b>{{ $t("examDoc.questionN", { n: q.n }) }}</b> <span v-html="safeHtml(q.q.prompt)" />
              <b v-if="withKey" class="key"> → {{ q.key }}</b>
            </p>
          </div>
          <div><p v-for="(c, ci) in b.choices" :key="ci"><b>{{ LETTERS[ci] }}.</b> {{ c }}</p></div>
        </div>

        <div v-for="q in p.key === 'match' ? [] : b.questions" :key="q.q.id" class="question">
          <p v-if="q.q.type === 'error'">
            <b>{{ $t("examDoc.questionN", { n: q.n }) }}</b>
            <span v-for="(c, ci) in q.options" :key="ci" class="chunk" :class="{ right: withKey && LETTERS[ci] === q.key }">
              <u>{{ plainMarked(c) }}</u> <small>({{ LETTERS[ci] }})</small>
            </span>
          </p>
          <p v-else>
            <b>{{ $t("examDoc.questionN", { n: q.n }) }}</b> <span v-html="safeHtml(q.q.prompt)" />
            <i v-if="q.q.type === 'order'"> {{ q.options.join(" / ") }}</i>
          </p>
          <div v-if="q.q.type === 'mcq'" class="choices">
            <span v-for="(o, oi) in q.options" :key="oi" :class="{ right: withKey && LETTERS[oi] === q.key }">
              <b>{{ LETTERS[oi] }}.</b> <span v-html="markUnderline(o)" />
            </span>
          </div>
          <template v-if="withKey">
            <p class="key">{{ $t("examDoc.answer") }}: {{ q.objective && q.keyText ? `${q.key}. ${q.keyText}` : q.keyText || q.key }}</p>
            <div v-if="q.q.explanation" class="why" v-html="safeHtml(q.q.explanation)" />
          </template>
          <p v-else-if="q.q.type === 'typed' || q.q.type === 'order'" class="line" />
        </div>
      </template>
    </section>
    <p class="end">{{ $t("examDoc.end") }}</p>

    <div v-if="showSheet('bottom')" class="sheet-wrap">
      <b>{{ $t(withKey ? "examDoc.keySheet" : "examDoc.answerSheet") }}</b>
      <table class="sheet">
        <tbody>
          <template v-for="(row, ri) in sheetRows" :key="ri">
            <tr><th v-for="(c, ci) in row" :key="ci">{{ c ? c.n : "" }}</th></tr>
            <tr><td v-for="(c, ci) in row" :key="ci" class="letter">{{ withKey && c ? c.key : "" }}</td></tr>
          </template>
        </tbody>
      </table>
    </div>
  </article>
</template>

<style scoped>
.paper { background: #fff; color: #111; border: 1px solid var(--line); border-radius: 8px; padding: 24px 28px;
  font: 15px/1.5 "Times New Roman", Times, serif; overflow-wrap: anywhere; }
.head { display: grid; grid-template-columns: 2fr 3fr; gap: 12px; text-align: center; margin-bottom: 12px; }
.head div { display: flex; flex-direction: column; }
.part h3 { font-size: 1rem; margin: 16px 0 0; color: #111; }
.part-hint { font-style: italic; margin: 0 0 6px; }
.paper p { margin: 0 0 4px; }
.question { margin-top: 8px; }
.question :deep(p) { display: inline; }
.choices { display: flex; flex-wrap: wrap; gap: 2px 28px; padding-left: 18px; }
.chunk { margin-left: 4px; }
.right, .key { color: #0a5c2b; font-weight: 700; }
.why { font-style: italic; color: #333; padding-left: 18px; }
.passage { border: 1px solid #888; padding: 8px 12px; margin: 6px 0; }
.passage :deep(p) { margin: 0 0 6px; }
.match { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 6px; }
.match :deep(p p) { display: inline; }
.line { border-bottom: 1px dotted #666; height: 1.6em; margin-left: 18px; }
.end { text-align: center; font-weight: 700; margin-top: 16px; }
.student, .sheet { width: 100%; border-collapse: collapse; margin: 8px 0 12px; table-layout: fixed; }
.student td, .student th, .sheet td, .sheet th { border: 1px solid #111; padding: 4px 8px; color: #111; text-align: left; vertical-align: top; }
.student th { text-align: center; }
.student .tall { height: 64px; }
.key-title { text-align: center; color: #0a5c2b; margin: 8px 0 12px; }
.sheet-wrap { text-align: center; margin: 6px 0 10px; }
.sheet th, .sheet td { text-align: center; padding: 2px 0; }
.sheet .letter { height: 24px; font-weight: 700; color: #0a5c2b; }
.paper :deep(em.g) { color: #111; font-weight: 700; }
.paper :deep(td), .paper :deep(th) { color: #111; border-color: #bbb; }
@media (max-width: 560px) {
  .paper { padding: 16px 14px; }
  .head, .match { grid-template-columns: 1fr; }
}
</style>
