<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Score } from "~/utils/course"

definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("grading.pageTitle") })

const client = useSupabaseClient<Database>()
const route = useRoute()
const router = useRouter()

type AttemptRow = Pick<Tables<"attempts">, "id" | "lesson_id" | "score" | "status" | "submitted_at" | "updated_at"> & {
  profiles: Pick<Tables<"profiles">, "full_name" | "email" | "class_id"> | null
  lessons: Pick<Tables<"lessons">, "title" | "label"> | null
}
const classes = shallowRef<Pick<Tables<"classes">, "id" | "name">[]>([])
const loaded = ref(false)

// Class filter, kept in the URL so the class page can link here (?class=<id>).
const classFilter = computed({
  get: () => (typeof route.query.class === "string" ? route.query.class : ""),
  set: (v: string) => router.replace({ query: v ? { class: v } : {} }),
})

// Lesson and student filters (in the database, like the class filter).
const lessonFilter = ref("")
const studentSearch = ref("")
const lessonOptions = shallowRef<{ id: string; name: string }[]>([])

// Both lists are fetched one page at a time; RLS limits teachers to their own students.
const PAGE = 15
const COLUMNS = "id, lesson_id, score, status, submitted_at, updated_at, profiles!inner(full_name, email, class_id), lessons(title, label)"

function listQuery(waiting: boolean, page: number) {
  const [from, to] = pageRange(page, PAGE)
  let q = client.from("attempts").select(COLUMNS, { count: "exact" })
  q = waiting
    ? q.eq("status", "submitted").order("submitted_at", { ascending: true })
    : q.neq("status", "submitted").order("updated_at", { ascending: false })
  if (classFilter.value) q = q.eq("profiles.class_id", classFilter.value)
  if (lessonFilter.value) q = q.eq("lesson_id", lessonFilter.value)
  // Characters with a meaning in PostgREST filters are dropped from the search text.
  const term = studentSearch.value.trim().replace(/[,()*%\\]/g, " ").trim()
  if (term) q = q.or(`full_name.ilike.*${term}*,username.ilike.*${term}*,email.ilike.*${term}*`, { referencedTable: "profiles" })
  return q.range(from, to)
}

function useList(waiting: boolean) {
  const rows = shallowRef<AttemptRow[]>([])
  const total = ref(0)
  const page = ref(0)
  let latest = 0 // only the answer to the latest request is shown when filters change quickly
  async function load() {
    const mine = ++latest
    const { data, count } = await listQuery(waiting, page.value)
    if (mine !== latest) return
    rows.value = (data ?? []) as unknown as AttemptRow[]
    total.value = count ?? 0
  }
  watch(page, load)
  return reactive({ rows, total, page, load })
}
const waiting = useList(true)
const recent = useList(false)

// ---- "Chấm lần lượt": lessons with submitted work per class, graded one after another ----
type QueueRow = { class_id: string; lesson_id: string; waiting: number; label: string }
const queues = shallowRef<QueueRow[]>([])
async function loadQueues() {
  let q = client.from("class_lesson_stats").select("class_id, lesson_id, waiting").gt("waiting", 0)
  if (classFilter.value) q = q.eq("class_id", classFilter.value)
  if (lessonFilter.value) q = q.eq("lesson_id", lessonFilter.value)
  const { data } = await q
  const rows = (data ?? []) as { class_id: string; lesson_id: string; waiting: number }[]
  const ids = [...new Set(rows.map(r => r.lesson_id))]
  const { data: ls } = ids.length ? await client.from("lessons").select("id, label, title").in("id", ids) : { data: [] }
  const name = new Map((ls ?? []).map(l => [l.id, `${l.label} - ${l.title}`]))
  queues.value = rows.map(r => ({ ...r, label: name.get(r.lesson_id) ?? r.lesson_id }))
}
async function startQueue(r: QueueRow) {
  const { data } = await client.from("attempts")
    .select("id, profiles!inner(class_id)")
    .eq("lesson_id", r.lesson_id).eq("status", "submitted").eq("profiles.class_id", r.class_id)
    .order("submitted_at", { ascending: true }).limit(1)
  const first = data?.[0]?.id
  if (first) await navigateTo(`/teacher/attempts/${first}?queue=${encodeURIComponent(r.lesson_id)}&class=${r.class_id}`)
}

/** The lessons given to the chosen class (or to all my classes), for the lesson filter. */
async function loadLessonOptions() {
  let q = client.from("class_lesson_stats").select("lesson_id")
  if (classFilter.value) q = q.eq("class_id", classFilter.value)
  const { data } = await q
  const ids = [...new Set(((data ?? []) as { lesson_id: string | null }[]).map(r => r.lesson_id ?? "").filter(Boolean))]
  const { data: ls } = ids.length ? await client.from("lessons").select("id, label, title, position").in("id", ids).order("position") : { data: [] }
  lessonOptions.value = (ls ?? []).map(l => ({ id: l.id, name: `${l.label} - ${l.title}` }))
  if (lessonFilter.value && !lessonOptions.value.some(l => l.id === lessonFilter.value)) lessonFilter.value = ""
}

async function reload() {
  waiting.page = 0
  recent.page = 0
  await Promise.all([waiting.load(), recent.load(), loadQueues()])
}
watch(classFilter, () => Promise.all([reload(), loadLessonOptions()]))
watch(lessonFilter, reload)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(studentSearch, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, 300)
})

onMounted(async () => {
  const [c] = await Promise.all([client.from("classes").select("id, name").order("name"), reload(), loadLessonOptions()])
  classes.value = c.data ?? []
  loaded.value = true
})

const name = (p: { full_name: string | null; email: string } | null) => p?.full_name || p?.email || t("common.student")
const score = (row: AttemptRow) => row.score as unknown as Score
const className = (id: string | null | undefined) => classes.value.find(c => c.id === id)?.name ?? "-"
const lessonLabel = (a: AttemptRow) => `${a.lessons?.label ?? a.lesson_id} - ${a.lessons?.title ?? ""}`
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h1>{{ $t("nav.grading") }}</h1>
        <p class="sub">{{ $t("grading.intro") }}</p>
      </div>
      <div class="filters">
        <label class="filter">
          <span class="small muted">{{ $t("common.class") }}</span>
          <select id="grading-class" v-model="classFilter">
            <option value="">{{ $t("grading.allMine") }}</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="filter">
          <span class="small muted">{{ $t("grading.lesson") }}</span>
          <select id="grading-lesson" v-model="lessonFilter">
            <option value="">{{ $t("grading.allLessons") }}</option>
            <option v-for="l in lessonOptions" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </label>
        <label class="filter">
          <span class="small muted">{{ $t("common.student") }}</span>
          <input id="grading-student" v-model="studentSearch" type="search" :placeholder="$t('grading.searchStudent')">
        </label>
      </div>
    </div>

    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <template v-else>
      <section v-if="queues.length" class="card">
        <h2>{{ $t("classPage.queue") }}</h2>
        <p class="hint">{{ $t("grading.queueHint") }}</p>
        <div v-for="q in queues" :key="`${q.class_id}-${q.lesson_id}`" class="list-row">
          <span><b>{{ $t("nav.classBadge", { name: className(q.class_id) }) }} · {{ q.label }}</b><small>{{ $t("grading.waitingCount", { n: q.waiting }) }}</small></span>
          <button class="btn small primary" @click="startQueue(q)">{{ $t("classPage.queue") }} →</button>
        </div>
      </section>

      <section class="card">
        <h2>{{ $t("grading.waiting", { n: waiting.total }) }}</h2>
        <p v-if="!waiting.total" class="muted small">{{ $t("grading.noneWaiting") }}</p>
        <NuxtLink v-for="a in waiting.rows" :key="a.id" :to="`/teacher/attempts/${a.id}`" class="list-row">
          <span>
            <b>{{ name(a.profiles) }} · {{ lessonLabel(a) }}</b>
            <small>{{ $t("nav.classBadge", { name: className(a.profiles?.class_id) }) }} · {{ $t("progress.correct", { ok: score(a).ok ?? 0, total: score(a).total ?? score(a).done ?? 0 }) }} · {{ $t("grading.submittedAt", { date: formatDate(a.submitted_at) }) }}</small>
          </span>
          <span class="badge submitted">{{ $t("grading.grade") }}</span>
        </NuxtLink>
        <Pager v-model:page="waiting.page" :page-size="PAGE" :total="waiting.total" />
      </section>

      <section class="card">
        <h2>{{ $t("grading.recent") }}</h2>
        <p v-if="!recent.total" class="muted small">{{ $t("grading.noRecent") }}</p>
        <NuxtLink v-for="a in recent.rows" :key="a.id" :to="`/teacher/attempts/${a.id}`" class="list-row">
          <span>
            <b>{{ name(a.profiles) }} · {{ lessonLabel(a) }}</b>
            <small>{{ $t("nav.classBadge", { name: className(a.profiles?.class_id) }) }}<template v-if="a.status !== 'in_progress'"> · {{ $t("progress.correct", { ok: score(a).ok ?? 0, total: score(a).total ?? score(a).done ?? 0 }) }}</template> · {{ formatDate(a.updated_at) }}</small>
          </span>
          <span class="badge" :class="a.status">{{ ATTEMPT_STATUS[a.status] }}</span>
        </NuxtLink>
        <Pager v-model:page="recent.page" :page-size="PAGE" :total="recent.total" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.filters { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: flex-end; margin-bottom: 16px; }
.filter { display: flex; flex-direction: column; gap: 2px; }
.filter select { width: auto; min-width: 180px; max-width: 280px; }
.filter input { min-width: 180px; }
</style>
