<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Score } from "~/utils/course"

definePageMeta({ roles: ["teacher"] })

const route = useRoute()
const client = useSupabaseClient<Database>()
const studentId = route.params.id as string

const student = shallowRef<Tables<"profiles"> | null>(null)
type AttemptRow = Pick<Tables<"attempts">, "id" | "lesson_id" | "score" | "status" | "updated_at"> & {
  lessons: Pick<Tables<"lessons">, "title" | "label"> | null
}
const attempts = shallowRef<AttemptRow[]>([])
const errors = shallowRef<Tables<"error_log">[]>([])
const loaded = ref(false)

async function loadErrors() {
  const { data } = await client.from("error_log").select("*").eq("user_id", studentId)
  errors.value = data ?? []
}

onMounted(async () => {
  const [p, a] = await Promise.all([
    client.from("profiles").select("*").eq("id", studentId).maybeSingle(),
    client.from("attempts").select("id, lesson_id, score, status, updated_at, lessons(title, label)").eq("user_id", studentId).order("updated_at", { ascending: false }),
    loadErrors(),
  ])
  student.value = p.data
  attempts.value = (a.data ?? []) as AttemptRow[]
  loaded.value = true
})
const { t } = useI18n()
useHead({ title: () => student.value?.full_name || t("common.student") })

const score = (row: AttemptRow) => row.score as unknown as Score
// Work list: search by lesson and filter by status, paged in the browser (one student's attempts are loaded whole).
const workSearch = ref("")
const workStatus = ref("")
const workFiltered = computed(() => {
  const term = fold(workSearch.value.trim())
  return attempts.value.filter(a =>
    (!workStatus.value || a.status === workStatus.value)
    && (!term || fold(`${a.lessons?.label ?? a.lesson_id} ${a.lessons?.title ?? ""}`).includes(term)))
})
const work = usePaged(workFiltered, 10)
watch([workSearch, workStatus], () => { work.page = 0 })

const accuracy = computed(() => {
  const done = attempts.value.reduce((n, a) => n + (score(a).done ?? 0), 0)
  const ok = attempts.value.reduce((n, a) => n + (score(a).ok ?? 0), 0)
  return done ? Math.round((ok / done) * 100) : null
})
</script>

<template>
  <div>
    <BackLink to="/teacher/students" :label="$t('nav.students')" />
    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <p v-else-if="!student" class="muted">{{ $t("studentPage.notFound") }}</p>
    <template v-else>
      <h1>{{ student.full_name || student.email }}</h1>
      <p class="sub">{{ loginOf(student) }} · {{ $t("studentPage.joined", { date: formatDate(student.created_at) }) }}</p>
      <p v-if="student.class_id">
        <NuxtLink :to="`/teacher/review/${student.class_id}?student=${student.id}`" class="btn ghost">{{ $t("studentPage.review") }}</NuxtLink>
      </p>

      <div class="stats">
        <div class="stat"><b>{{ attempts.length }}</b><span>{{ $t("studentPage.lessons") }}</span></div>
        <div class="stat"><b>{{ accuracy === null ? "-" : `${accuracy}%` }}</b><span>{{ $t("studentPage.accuracy") }}</span></div>
        <div class="stat"><b>{{ errors.filter(e => e.status !== "fixed").length }}</b><span>{{ $t("studentPage.openErrors") }}</span></div>
      </div>

      <section class="card">
        <h2>{{ $t("studentPage.errorLog") }}</h2>
        <ErrorLogList :entries="errors" editable @changed="loadErrors" />
      </section>

      <section class="card">
        <h2>{{ $t("studentPage.work") }}</h2>
        <p v-if="!attempts.length" class="muted small">{{ $t("studentPage.noWork") }}</p>
        <div v-else class="row list-filters">
          <input v-model="workSearch" type="search" :placeholder="$t('lessonFilter.search')" :aria-label="$t('lessonFilter.search')">
          <select v-model="workStatus" :aria-label="$t('lessonFilter.allStatuses')">
            <option value="">{{ $t("lessonFilter.allStatuses") }}</option>
            <option v-for="(label, key) in ATTEMPT_STATUS" :key="key" :value="key">{{ label }}</option>
          </select>
          <span class="small muted">{{ $t("lessonFilter.count", { n: work.total }) }}</span>
        </div>
        <p v-if="attempts.length && !work.total" class="muted small">{{ $t("lessonFilter.none") }}</p>
        <NuxtLink v-for="a in work.rows" :key="a.id" :to="`/teacher/attempts/${a.id}`" class="list-row">
          <span>
            <b>{{ a.lessons?.label ?? a.lesson_id }} - {{ a.lessons?.title ?? "" }}</b>
            <small><template v-if="a.status !== 'in_progress'">{{ $t("progress.correct", { ok: score(a).ok ?? 0, total: score(a).total ?? score(a).done ?? 0 }) }} · </template>{{ formatDate(a.updated_at) }}</small>
          </span>
          <span class="badge" :class="a.status">{{ ATTEMPT_STATUS[a.status] }}</span>
        </NuxtLink>
        <Pager v-model:page="work.page" :page-size="work.pageSize" :total="work.total" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.list-filters { margin-bottom: 8px; }
.list-filters input { flex: 1 1 200px; min-width: 0; }
.list-filters select { width: auto; }
</style>
