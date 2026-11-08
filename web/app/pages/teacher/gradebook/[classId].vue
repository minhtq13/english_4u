<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import { bandOf, buildGradebook, type GradeAttempt, type GradeStudent, type Gradebook } from "~/utils/gradebook"
import { downloadCsv, fileSlug } from "~/utils/csv"
import { lessonsOfClass } from "~/utils/classLessonStore"

// Students × the lessons given to the class, each cell the score as a percent (or where the work stands).
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("gradebook.pageTitle") })

const route = useRoute()
const classId = route.params.classId as string
const client = useSupabaseClient<Database>()
const { load } = useCourse()

const cls = shallowRef<Pick<Tables<"classes">, "id" | "name" | "course_id"> | null>(null)
const book = shallowRef<Gradebook | null>(null)
const loaded = ref(false)
const error = ref("")

onMounted(async () => {
  try {
    const { data, error: e } = await client.from("classes").select("id, name, course_id").eq("id", classId).maybeSingle()
    if (e) throw e
    cls.value = data
    if (!data) return
    const [outline, given, st] = await Promise.all([
      load(data.course_id, true),
      lessonsOfClass(client, classId),
      client.from("student_progress").select("user_id, full_name, username, email").eq("class_id", classId),
    ])
    const lessons = outline.order.filter(id => given.settings.has(id)).map((id) => {
      const l = outline.byId[id]!
      return { id, label: l.label, title: l.title, total: l.total }
    })
    const students = (st.data ?? []) as GradeStudent[]
    const ids = students.map(s => s.user_id ?? "").filter(Boolean)
    let attempts: GradeAttempt[] = []
    if (ids.length && lessons.length) {
      const a = await client.from("attempts").select("id, user_id, lesson_id, status, score").in("user_id", ids).in("lesson_id", lessons.map(l => l.id))
      if (a.error) throw a.error
      attempts = a.data ?? []
    }
    book.value = buildGradebook(students, lessons, attempts)
  } catch (e) {
    error.value = t("gradebook.loadFailed", { msg: (e as Error).message })
  }
  loaded.value = true
})

const stateText = (s: string) => t(`gradebook.state.${s}`)
const cellText = (c: { state: string; percent: number | null }) => (c.percent !== null ? `${c.percent}%` : c.state === "none" ? "–" : stateText(c.state))

function exportCsv() {
  if (!book.value || !cls.value) return
  const b = book.value
  const rows = [
    [t("common.student"), ...b.lessons.map(l => `${l.label} - ${l.title}`), t("gradebook.average")],
    ...b.rows.map(r => [r.name, ...r.cells.map(c => (c.percent !== null ? c.percent : c.state === "none" ? "" : stateText(c.state))), r.average ?? ""]),
    [t("gradebook.average"), ...b.averages.map(a => a ?? ""), ""],
  ]
  downloadCsv(`${fileSlug(t("gradebook.fileName"))}-${fileSlug(cls.value.name)}.csv`, rows)
}
</script>

<template>
  <div>
    <BackLink :to="`/teacher/classes/${classId}`" :label="cls?.name ?? $t('nav.myClasses')" />
    <Skeleton v-if="!loaded" />
    <p v-else-if="error" class="fb no">{{ error }}</p>
    <p v-else-if="!cls" class="card muted">{{ $t("classPage.notFound") }}</p>
    <template v-else-if="book">
      <div class="head">
        <div>
          <h1>{{ $t("gradebook.title", { name: cls.name }) }}</h1>
          <p class="sub">{{ $t("gradebook.intro") }}</p>
        </div>
        <button class="btn" :disabled="!book.rows.length || !book.lessons.length" @click="exportCsv"><Icon name="file" /> {{ $t("gradebook.export") }}</button>
      </div>
      <EmptyState v-if="!book.lessons.length" icon="clipboard" :title="$t('gradebook.noLessons')" :text="$t('gradebook.noLessonsHint')" />
      <EmptyState v-else-if="!book.rows.length" icon="users" :title="$t('gradebook.noStudents')" :text="$t('gradebook.noStudentsHint')" />
      <div v-else class="card scroll" tabindex="0" role="region" :aria-label="$t('gradebook.title', { name: cls.name })">
        <table class="grid">
          <thead>
            <tr>
              <th class="who">{{ $t("common.student") }}</th>
              <th v-for="l in book.lessons" :key="l.id" :title="l.title"><span class="lbl">{{ l.label }}</span></th>
              <th class="avg">{{ $t("gradebook.average") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in book.rows" :key="r.userId">
              <th class="who" scope="row"><NuxtLink :to="`/teacher/students/${r.userId}`">{{ r.name }}</NuxtLink></th>
              <td v-for="(c, i) in r.cells" :key="i" :class="['cell', bandOf(c.percent), c.state]">
                <NuxtLink v-if="c.attemptId" :to="`/teacher/attempts/${c.attemptId}`" :title="stateText(c.state)">{{ cellText(c) }}</NuxtLink>
                <span v-else class="muted">{{ cellText(c) }}</span>
              </td>
              <td class="avg">{{ r.average === null ? "–" : `${r.average}%` }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th class="who" scope="row">{{ $t("gradebook.average") }}</th>
              <td v-for="(a, i) in book.averages" :key="i" class="avg">{{ a === null ? "–" : `${a}%` }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="small muted legend">{{ $t("gradebook.legend") }}</p>
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.scroll { overflow-x: auto; padding: 0; }
.grid { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.grid th, .grid td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: center; white-space: nowrap; }
.grid thead th { background: var(--card); font-size: .85rem; color: var(--muted); }
.who { position: sticky; left: 0; background: var(--card); text-align: left !important; z-index: 1; min-width: 150px; }
.cell a { display: block; text-decoration: none; font-weight: 600; color: inherit; }
.cell.good { background: var(--ok-soft); color: var(--ok); }
.cell.mid { background: var(--warn-soft); color: var(--warn); }
.cell.low { background: var(--bad-soft); color: var(--bad); }
.cell.working, .cell.waiting { font-style: italic; }
.avg { font-weight: 700; }
.legend { margin-top: 8px; }
</style>
