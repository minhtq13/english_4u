<script setup lang="ts">
import type { BankRow } from "~/composables/useQuestionBank"

// Every auto-graded question the teacher may see with answers (question_bank view, RLS), filtered and paged
// in the database. Picked questions (kept across pages and filters) open in the editor as a new lesson.
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("bankPage.pageTitle") })

const { listCourses } = useCourse()
const courses = shallowRef<{ id: string; name: string }[]>([])
const course = ref("")
const type = ref("")
const search = ref("")
const tag = ref("")
const bank = useQuestionBank({ course, type, search, tag }, 20)
onMounted(async () => {
  courses.value = (await listCourses()).map(c => ({ id: c.id, name: c.name }))
  await bank.load()
})

const picked = shallowRef(new Map<string, BankRow>())
function toggle(r: BankRow) {
  const next = new Map(picked.value)
  if (next.has(r.id ?? "")) next.delete(r.id ?? "")
  else next.set(r.id ?? "", r)
  picked.value = next
}
const clearPicks = () => { picked.value = new Map() }

const handoff = useLessonHandoff()
/** The new lesson's grade: the grade filter, otherwise the grade most picked questions come from. */
function gradeOf(rows: BankRow[]) {
  if (course.value) return course.value
  const n = new Map<string, number>()
  for (const r of rows) n.set(r.course_id ?? "", (n.get(r.course_id ?? "") ?? 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
}
async function build() {
  const rows = [...picked.value.values()]
  if (!rows.length) return
  handoff.value = {
    from: "bank",
    label: "",
    title: t("bankPage.lessonTitle"),
    courseId: gradeOf(rows),
    sections: sectionsFromQuestions(rows, k => SECTION_TYPES[k].label),
  }
  await navigateTo("/teacher/lessons/new?from=bank")
}
</script>

<template>
  <div>
    <h1>{{ $t("bankPage.pageTitle") }}</h1>
    <p class="sub">{{ $t("bankPage.intro") }}</p>

    <div class="row filters">
      <select id="bank-course" v-model="course" :aria-label="$t('bank.allGrades')">
        <option value="">{{ $t("bank.allGrades") }}</option>
        <option v-for="c in courses" :key="c.id" :value="c.id">{{ localName(c.name) }}</option>
      </select>
      <select id="bank-type" v-model="type" :aria-label="$t('bankPage.allTypes')">
        <option value="">{{ $t("bankPage.allTypes") }}</option>
        <option v-for="k in SCORED_TYPES" :key="k" :value="k">{{ SECTION_TYPES[k].label }}</option>
      </select>
      <input id="bank-search" v-model="search" type="search" :placeholder="$t('bank.search')">
      <input id="bank-tag" v-model="tag" type="search" class="tag" :placeholder="$t('bank.tag')">
      <span class="small muted">{{ $t("bankPage.found", { n: bank.total }) }}</span>
    </div>

    <div v-if="picked.size" class="picked-bar">
      <b>{{ $t("bankPage.picked", { n: picked.size }) }}</b>
      <span class="row">
        <button class="btn small ghost" @click="clearPicks">{{ $t("bankPage.clear") }}</button>
        <button class="btn small primary" @click="build">{{ $t("bankPage.build") }} →</button>
      </span>
    </div>

    <section class="card">
      <p v-if="bank.error" class="fb no">{{ bank.error }}</p>
      <p v-else-if="!bank.rows.length" class="muted small">{{ bank.loading ? $t("common.loading") : $t("bank.none") }}</p>
      <label v-for="r in bank.rows" :key="r.id ?? ''" class="q-row" :class="{ on: picked.has(r.id ?? '') }">
        <input type="checkbox" :checked="picked.has(r.id ?? '')" @change="toggle(r)">
        <span class="q-text">
          <span><span v-if="r.type" class="badge">{{ SECTION_TYPES[r.type].label }}</span> {{ questionText(r) }}</span>
          <small class="muted">
            → <b>{{ stripTags(answerText(r)) }}</b>
            <template v-if="r.tag"> · [{{ r.tag }}]</template>
            · {{ $t("bankPage.from") }}: <NuxtLink :to="`/lessons/${r.lesson_id}`" @click.stop>{{ r.lesson_label }} - {{ r.lesson_title }}</NuxtLink>
          </small>
        </span>
      </label>
      <Pager v-model:page="bank.page" :page-size="bank.pageSize" :total="bank.total" />
    </section>
  </div>
</template>

<style scoped>
.filters { margin-bottom: 12px; }
.filters select { width: auto; }
.filters input { flex: 1 1 200px; min-width: 0; }
.filters .tag { max-width: 220px; }
.picked-bar { position: sticky; top: 8px; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 8px;
  flex-wrap: wrap; margin-bottom: 12px; padding: 8px 14px; border-radius: 10px; background: var(--accent-soft); color: var(--accent); }
.picked-bar .btn { padding: 4px 12px; }
.q-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px;
  cursor: pointer; margin-bottom: 6px; }
.q-row:hover { border-color: var(--accent); }
.q-row.on { border-color: var(--accent); background: var(--accent-soft); }
.q-row input { margin-top: 4px; }
.q-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.q-text .badge { font-size: .72rem; margin-right: 4px; }
</style>
