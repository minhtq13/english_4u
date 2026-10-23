<script setup lang="ts">
import type { Database, Enums, Tables, Views } from "~/types/database.types"

definePageMeta({ roles: ["admin"] })
const { t } = useI18n()

const route = useRoute()
const courseId = route.params.id as string
const client = useSupabaseClient<Database>()

const course = shallowRef<Pick<Tables<"courses">, "name" | "description"> | null>(null)
const summary = shallowRef<Views<"course_summary"> | null>(null)
const lessons = shallowRef<Views<"lesson_stats">[]>([])
const classes = shallowRef<Views<"class_overview">[]>([])
const errorStats = shallowRef<Views<"course_error_stats">[]>([])
const loaded = ref(false)
const error = ref("")

onMounted(async () => {
  try {
    const [c, sm, l, k, e] = await Promise.all([
      client.from("courses").select("name, description").eq("id", courseId).maybeSingle(),
      client.from("course_summary").select("*").eq("course_id", courseId).maybeSingle(),
      client.from("lesson_stats").select("*").eq("course_id", courseId).order("position"),
      client.from("class_overview").select("class_id, name, students, waiting, ok, done").eq("course_id", courseId).order("name"),
      client.from("course_error_stats").select("category, status, occurrences, entries").eq("course_id", courseId),
    ])
    for (const r of [c, sm, l, k, e]) if (r.error) throw r.error
    course.value = c.data
    summary.value = sm.data
    lessons.value = l.data ?? []
    classes.value = (k.data ?? []) as Views<"class_overview">[]
    errorStats.value = (e.data ?? []) as Views<"course_error_stats">[]
    await loadStudents()
  } catch (e) {
    error.value = t("dashboard.loadFailed", { msg: (e as Error).message })
  }
  loaded.value = true
})
useHead({ title: computed(() => `${t("gradeStats.title", { name: localName(course.value?.name ?? "") })} - Grammar`) })

const pct = (part: number | null, whole: number | null) => (whole ? Math.round(((part ?? 0) / whole) * 100) : null)

const tiles = computed(() => ({
  students: summary.value?.students ?? 0,
  active: summary.value?.active ?? 0,
  accuracy: accuracyOf(summary.value?.ok, summary.value?.done),
  waiting: summary.value?.waiting ?? 0,
}))

// Errors by category: total occurrences, split into still-open vs fixed.
const errorRows = computed(() => {
  const rows = Object.entries(ERROR_CATEGORIES).map(([key, label]) => {
    const of = errorStats.value.filter(e => e.category === key)
    const sum = (list: typeof of) => list.reduce((n, e) => n + (e.occurrences ?? 0), 0)
    return {
      key: key as Enums<"error_category">,
      label,
      total: sum(of),
      open: sum(of.filter(e => e.status !== "fixed")),
      learners: of.reduce((n, e) => n + (e.entries ?? 0), 0),
    }
  })
  return rows.sort((a, b) => b.total - a.total)
})
const maxErrors = computed(() => Math.max(1, ...errorRows.value.map(r => r.total)))
const lessonCount = computed(() => lessons.value.length)

// ---- students: one page at a time, most recently active first ----
const PAGE = 20
const page = ref(0)
const students = shallowRef<Views<"student_progress">[]>([])
const studentTotal = ref(0)
async function loadStudents() {
  const [from, to] = pageRange(page.value, PAGE)
  const { data, count, error: e } = await client.from("student_progress")
    .select("user_id, full_name, email, class_name, submitted, waiting, ok, done, last_activity, open_errors", { count: "exact" })
    .eq("course_id", courseId)
    .order("last_activity", { ascending: false, nullsFirst: false })
    .range(from, to)
  if (e) throw e
  students.value = (data ?? []) as Views<"student_progress">[]
  studentTotal.value = count ?? 0
}
watch(page, () => loadStudents().catch((e) => { error.value = (e as Error).message }))
</script>

<template>
  <div>
    <BackLink to="/admin" label="Dashboard" />
    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <p v-else-if="error" class="fb no">{{ error }}</p>
    <p v-else-if="!course" class="muted">{{ $t("coursesPage.notFound") }}</p>
    <template v-else>
      <h1>{{ $t("gradeStats.title", { name: localName(course.name) }) }}</h1>
      <p class="sub">{{ course.description }}</p>

      <div class="stats">
        <div class="stat"><b>{{ tiles.students }}</b><span>{{ $t("gradeStats.studentsIn", { n: classes.length }) }}</span></div>
        <div class="stat"><b>{{ tiles.active }}</b><span>{{ $t("dashboard.active") }}</span></div>
        <div class="stat"><b>{{ tiles.accuracy === null ? "-" : `${tiles.accuracy}%` }}</b><span>{{ $t("dashboard.accuracy") }}</span></div>
        <NuxtLink to="/teacher/grading" class="stat stat-link" :class="{ alert: tiles.waiting > 0 }">
          <b>{{ tiles.waiting }}</b><span>{{ $t("dashboard.waiting") }} →</span>
        </NuxtLink>
      </div>

      <section class="card">
        <h2>{{ $t("nav.classes") }}</h2>
        <p v-if="!classes.length" class="muted small">{{ $t("gradeStats.noClasses") }} <NuxtLink to="/admin/classes">{{ $t("nav.classes") }}</NuxtLink></p>
        <div v-else class="table-wrap">
          <table class="stats-table">
            <thead><tr><th>{{ $t("common.class") }}</th><th class="n">{{ $t("nav.students") }}</th><th>{{ $t("classPage.accuracy") }}</th><th class="n">{{ $t("classPage.waiting") }}</th></tr></thead>
            <tbody>
              <tr v-for="r in classes" :key="r.class_id ?? ''">
                <td><NuxtLink :to="`/teacher/classes/${r.class_id}`"><b>{{ r.name }}</b></NuxtLink></td>
                <td class="n">{{ r.students }}</td>
                <td><StatBar :value="accuracyOf(r.ok, r.done)" /></td>
                <td class="n">{{ r.waiting }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>{{ $t("gradeStats.lessons") }}</h2>
        <p v-if="!lessons.length" class="muted small">{{ $t("classPage.noLessons") }}</p>
        <div v-else class="table-wrap">
          <table class="stats-table">
            <thead>
              <tr>
                <th>{{ $t("gradeStats.lesson") }}</th>
                <th class="n">{{ $t("gradeStats.scored") }}</th>
                <th class="n">{{ $t("gradeStats.opened") }}</th>
                <th>{{ $t("gradeStats.submittedOf") }}</th>
                <th>{{ $t("classPage.accuracy") }}</th>
                <th class="n">{{ $t("classPage.waiting") }}</th>
                <th class="n">{{ $t("gradeStats.graded") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in lessons" :key="l.lesson_id ?? ''">
                <td><NuxtLink :to="`/lessons/${l.lesson_id}`"><b>{{ l.label }}</b> - {{ l.title }}</NuxtLink></td>
                <td class="n">{{ l.scored_items }}</td>
                <td class="n">{{ l.learners }}</td>
                <td>
                  <StatBar
                    :value="pct(l.completed ?? 0, tiles.students)"
                    :text="`${l.completed ?? 0}/${tiles.students}`"
                  />
                </td>
                <td><StatBar :value="l.accuracy" /></td>
                <td class="n">
                  <span v-if="l.waiting" class="badge submitted">{{ l.waiting }}</span>
                  <span v-else class="muted">0</span>
                </td>
                <td class="n">{{ l.graded }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>{{ $t("gradeStats.errors") }}</h2>
        <p class="hint">{{ $t("gradeStats.errorsHint") }}</p>
        <p v-if="!errorRows.some(r => r.total)" class="muted small">{{ $t("gradeStats.noErrors") }}</p>
        <div v-else class="error-list">
          <div v-for="r in errorRows" :key="r.key" class="error-row">
            <span class="error-label">{{ r.label }}</span>
            <StatBar
              :value="Math.round((r.total / maxErrors) * 100)"
              :text="$t('gradeStats.times', { n: r.total })"
            />
            <span class="small muted">{{ $t("gradeStats.open", { n: r.open }) }}</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>{{ $t("nav.students") }}</h2>
        <p v-if="!studentTotal" class="muted small">{{ $t("gradeStats.noStudents") }}</p>
        <div v-else class="table-wrap">
          <table class="stats-table">
            <thead>
              <tr>
                <th>{{ $t("common.student") }}</th>
                <th>{{ $t("common.class") }}</th>
                <th>{{ $t("gradeStats.progress") }}</th>
                <th>{{ $t("classPage.accuracy") }}</th>
                <th class="n">{{ $t("classPage.waiting") }}</th>
                <th class="n">{{ $t("studentPage.openErrors") }}</th>
                <th>{{ $t("classPage.lastActive") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in students" :key="s.user_id ?? ''">
                <td>
                  <NuxtLink :to="`/teacher/students/${s.user_id}`"><b>{{ s.full_name || s.email }}</b></NuxtLink>
                </td>
                <td>{{ s.class_name }}</td>
                <td>
                  <StatBar
                    :value="pct(s.submitted, lessonCount)"
                    :text="`${s.submitted}/${lessonCount}`"
                  />
                </td>
                <td><StatBar :value="accuracyOf(s.ok, s.done)" /></td>
                <td class="n">{{ s.waiting }}</td>
                <td class="n">{{ s.open_errors }}</td>
                <td class="small muted">{{ s.last_activity ? formatDate(s.last_activity) : $t("classPage.neverActive") }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pager v-model:page="page" :page-size="PAGE" :total="studentTotal" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.stat-link { text-decoration: none; color: var(--text); }
.stat-link:hover { border-color: var(--accent); }
.stat.alert { border-color: var(--warn); background: var(--warn-soft); }
.stats-table th { white-space: nowrap; }
.stats-table td:has(.meter) { min-width: 170px; }
.stats-table a { text-decoration: none; }
.n { text-align: right; font-variant-numeric: tabular-nums; }
.error-list { display: flex; flex-direction: column; gap: 10px; }
.error-row { display: grid; grid-template-columns: 180px 1fr 90px; align-items: center; gap: 12px; }
.error-label { font-size: .92rem; }
@media (max-width: 560px) { .error-row { grid-template-columns: 1fr; gap: 2px; } }
</style>
