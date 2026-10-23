<script setup lang="ts">
import type { Lesson } from "~/utils/course"

// The worksheet body for printing (A4): student version with blanks and lines, or the answer version.
const props = defineProps<{ lesson: Lesson; withKey?: boolean; withTheory?: boolean }>()
const letters = "ABCDEFGH"
/** Hints written for the web ("bấm…", "tap…") make no sense on paper. */
const paperHint = (h?: string) => (h && !/bấm|gõ|lật|\btap\b|\btype\b|\bflip\b/i.test(stripTags(h)) ? h : "")

const sections = computed(() => props.lesson.sections.filter(s => props.withTheory || s.type !== "explain"))
/** Compact answer list at the end of the answer version: "1. B · 2. goes · …" per section. */
const keyRows = computed(() => sections.value.filter(isScored).map(s => ({
  title: s.title,
  answers: s.items.map((it, i) => {
    if ("opts" in it) return `${i + 1}. ${letters[it.a] ?? "?"}`
    if (s.type === "match" && "a" in it) return `${i + 1}. ${matchLetter(s.choices, it.a)}`
    return "ans" in it ? `${i + 1}. ${stripTags(it.ans[0] ?? "")}` : ""
  }),
})))
/** Right sides of a matching section, without repeats, lettered a, b, c… */
const matchList = (choices: string[]) => [...new Set(choices)]
const matchLetter = (choices: string[], answer: string) =>
  String.fromCharCode(97 + Math.max(0, matchList(choices).indexOf(answer)))
</script>

<template>
  <article class="sheet">
    <header class="sheet-head">
      <h1>{{ lesson.heading }}</h1>
      <p v-if="lesson.sub" class="sub">{{ lesson.sub }}<template v-if="withKey"> · <b>{{ $t("worksheet.keyVersion") }}</b></template></p>
      <div v-if="!withKey" class="student-line">
        <span>{{ $t("worksheet.name") }}: ……………………………………………</span><span>{{ $t("worksheet.class") }}: …………</span><span>{{ $t("worksheet.date") }}: …………</span>
      </div>
    </header>

    <section v-for="(s, i) in sections" :key="i" class="part">
      <h2>{{ i + 1 }}. {{ s.title }}</h2>
      <p v-if="paperHint(s.hint)" class="hint" v-html="paperHint(s.hint)" />

      <div v-if="(s.type === 'mcq' || s.type === 'typed') && s.passage" class="passage" v-html="s.passage" />

      <div v-if="s.type === 'explain'" class="explain" v-html="s.html" />

      <table v-else-if="s.type === 'cards'" class="vocab">
        <tr v-for="(c, j) in s.items" :key="j"><td v-html="c[0]" /><td v-html="c[1]" /></tr>
      </table>

      <ol v-else-if="s.type === 'mcq'" class="qs">
        <li v-for="(it, j) in s.items" :key="j">
          <span v-html="it.q" />
          <div class="opts">
            <span v-for="(o, k) in it.opts" :key="k" :class="{ right: withKey && k === it.a }">
              {{ letters[k] }}. <span v-html="markUnderline(o)" />
            </span>
          </div>
          <div v-if="withKey && it.why" class="why" v-html="it.why" />
        </li>
      </ol>

      <ol v-else-if="s.type === 'typed'" class="qs">
        <li v-for="(it, j) in s.items" :key="j">
          <span v-html="it.q" />
          <div v-if="withKey" class="answer">→ {{ it.ans.join(" / ") }}<span v-if="it.why" class="why" v-html="` · ${it.why}`" /></div>
        </li>
      </ol>

      <ol v-else-if="s.type === 'order'" class="qs">
        <li v-for="(it, j) in s.items" :key="j">
          <span v-if="it.prompt">{{ it.prompt }} </span><span class="chunks">{{ it.words.join(" / ") }}</span>
          <div v-if="withKey" class="answer">→ {{ it.ans[0] }}</div>
          <div v-else class="write-line" />
        </li>
      </ol>

      <ol v-else-if="s.type === 'error'" class="qs">
        <li v-for="(it, j) in s.items" :key="j">
          <span v-for="(c, k) in it.opts" :key="k" class="err-chunk" :class="{ right: withKey && k === it.a }">
            <span v-html="markUnderline(c)" /><sub>{{ letters[k] }}</sub>
          </span>
          <div v-if="withKey" class="answer">→ {{ letters[it.a] }}<span v-if="it.why" class="why" v-html="` · ${it.why}`" /></div>
          <div v-else class="fix-line">{{ $t("worksheet.fix") }}: ……………………………………</div>
        </li>
      </ol>

      <div v-else-if="s.type === 'match'" class="match">
        <ol class="qs">
          <li v-for="(it, j) in s.items" :key="j">
            <span v-html="it.q" /> <b v-if="withKey" class="answer">→ {{ matchLetter(s.choices, it.a) }}</b><span v-else> ……</span>
          </li>
        </ol>
        <ol class="qs" type="a">
          <li v-for="(c, j) in matchList(s.choices)" :key="j">{{ c }}</li>
        </ol>
      </div>

      <div v-else-if="s.type === 'writing'" class="lines">
        <div v-for="n in 8" :key="n" class="write-line" />
      </div>
    </section>

    <section v-if="withKey && keyRows.length" class="part key">
      <h2>{{ $t("worksheet.quickKey") }}</h2>
      <p v-for="k in keyRows" :key="k.title"><b>{{ k.title }}:</b> {{ k.answers.join(" · ") }}</p>
    </section>
  </article>
</template>

<style scoped>
.sheet { background: #fff; color: #111; padding: 32px 40px; border: 1px solid var(--line); border-radius: 8px; font-size: 15px; line-height: 1.55; }
.sheet h1 { font-size: 1.35rem; margin: 0 0 2px; color: #111; }
.sheet .sub { color: #444; margin: 0 0 8px; }
.student-line { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 12px 0 4px; }
.part { margin-top: 18px; break-inside: auto; }
.part h2 { font-size: 1.05rem; margin: 0 0 4px; color: #111; }
.sheet .hint { color: #444; font-style: italic; margin: 0 0 6px; font-size: .95em; }
.qs { margin: 0; padding-left: 22px; }
.qs li { margin: 6px 0; break-inside: avoid; }
.opts { display: flex; flex-wrap: wrap; gap: 4px 28px; margin-top: 2px; }
.right { font-weight: 700; text-decoration: underline; }
.answer { color: #0a5c2b; font-weight: 600; }
.why { color: #444; font-weight: 400; font-size: .92em; }
.chunks { font-style: italic; }
.write-line { border-bottom: 1px dotted #888; height: 1.9em; }
.lines .write-line { height: 2.1em; }
.vocab { width: 100%; border-collapse: collapse; }
.vocab td { border: 1px solid #ccc; padding: 4px 8px; width: 50%; color: #111; }
.sheet :deep(.box), .sheet :deep(.warn) { background: none; border: 1px solid #bbb; color: #111; }
.sheet :deep(em.g) { color: #111; font-weight: 700; text-decoration: underline; }
.sheet :deep(th), .sheet :deep(td) { color: #111; border-color: #ccc; }
.key p { margin: 4px 0; }
.passage { border: 1px solid #bbb; padding: 8px 12px; margin-bottom: 8px; }
.passage :deep(p) { margin: 0 0 6px; }
.err-chunk { margin-right: 6px; }
.err-chunk > span { text-decoration: underline; }
.err-chunk sub { font-weight: 700; font-size: .7em; margin-left: 1px; }
.fix-line { color: #444; }
.match { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

@media print {
  .sheet { border: 0; padding: 0; border-radius: 0; }
}
</style>
