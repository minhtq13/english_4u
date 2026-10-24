<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Score } from "~/utils/course"

definePageMeta({ roles: ["student"] })
const { t } = useI18n()
useHead({ title: () => t("progress.pageTitle") })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

type AttemptRow = Pick<Tables<"attempts">, "id" | "lesson_id" | "score" | "status" | "updated_at"> & {
  feedback: Pick<Tables<"feedback">, "id" | "body" | "created_at">[]
  lessons: Pick<Tables<"lessons">, "title" | "label"> | null
}
const attempts = shallowRef<AttemptRow[]>([])
/** Lessons of the class whose results show as soon as they are submitted. */
const showsAtOnce = shallowRef<Set<string>>(new Set())
const { myClass } = useProfile()
const errors = shallowRef<Tables<"error_log">[]>([])
const loaded = ref(false)

onMounted(async () => {
  const me = user.value?.sub
  if (!me) return
  const [a, e, c] = await Promise.all([
    client.from("attempts").select("id, lesson_id, score, status, updated_at, feedback(id, body, created_at), lessons(title, label)")
      .eq("user_id", me).order("updated_at", { ascending: false }),
    client.from("error_log").select("*").eq("user_id", me),
    myClass.value
      ? client.from("class_lessons").select("lesson_id").eq("class_id", myClass.value.id).eq("show_results", true)
      : { data: [] },
  ])
  showsAtOnce.value = new Set((c.data ?? []).map(r => r.lesson_id))
  attempts.value = (a.data ?? []) as AttemptRow[]
  errors.value = e.data ?? []
  loaded.value = true
})

const score = (row: AttemptRow) => row.score as unknown as Score
const released = (row: AttemptRow) =>
  row.status === "graded" || (row.status === "submitted" && showsAtOnce.value.has(row.lesson_id))
const statusText = (row: AttemptRow) =>
  row.status === "submitted" && released(row) ? t("progress.submitted") : ATTEMPT_STATUS[row.status]
// History: search by lesson and filter by status, paged in the browser (one learner's attempts are loaded whole).
const historySearch = ref("")
const historyStatus = ref("")
const historyFiltered = computed(() => {
  const term = fold(historySearch.value.trim())
  return attempts.value.filter(r =>
    (!historyStatus.value || r.status === historyStatus.value)
    && (!term || fold(`${r.lessons?.label ?? r.lesson_id} ${r.lessons?.title ?? ""}`).includes(term)))
})
const history = usePaged(historyFiltered, 10)
watch([historySearch, historyStatus], () => { history.page = 0 })

const latestFeedback = (row: AttemptRow) =>
  [...row.feedback].sort((x, y) => y.created_at.localeCompare(x.created_at))[0]
</script>

<template>
  <div>
    <h1>{{ $t("progress.title") }}</h1>
    <p class="sub">{{ $t("progress.intro") }}</p>

    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <template v-else>
      <section class="card">
        <h2>{{ $t("progress.errors") }}</h2>
        <ErrorLogList :entries="errors" />
      </section>

      <section class="card">
        <h2>{{ $t("progress.history") }}</h2>
        <p v-if="!attempts.length" class="muted small">{{ $t("progress.none") }} <NuxtLink to="/">{{ $t("progress.seeRoadmap") }}</NuxtLink>.</p>
        <div v-else class="row list-filters">
          <input v-model="historySearch" type="search" :placeholder="$t('lessonFilter.search')" :aria-label="$t('lessonFilter.search')">
          <select v-model="historyStatus" :aria-label="$t('lessonFilter.allStatuses')">
            <option value="">{{ $t("lessonFilter.allStatuses") }}</option>
            <option v-for="(label, key) in ATTEMPT_STATUS" :key="key" :value="key">{{ label }}</option>
          </select>
          <span class="small muted">{{ $t("lessonFilter.count", { n: history.total }) }}</span>
        </div>
        <p v-if="attempts.length && !history.total" class="muted small">{{ $t("lessonFilter.none") }}</p>
        <NuxtLink v-for="row in history.rows" :key="row.id" :to="`/lessons/${row.lesson_id}`" class="list-row">
          <span>
            <b>{{ row.lessons?.label ?? row.lesson_id }} - {{ row.lessons?.title ?? "" }}</b>
            <small>
              <template v-if="released(row)">{{ $t("progress.correct", { ok: score(row).ok ?? 0, total: score(row).total ?? score(row).done ?? 0 }) }} · </template>
              {{ formatDate(row.updated_at) }}
              <template v-if="latestFeedback(row)"> · {{ $t("progress.comment") }}: “{{ latestFeedback(row)!.body.slice(0, 90) }}{{ latestFeedback(row)!.body.length > 90 ? "…" : "" }}”</template>
            </small>
          </span>
          <span class="badge" :class="row.status">{{ statusText(row) }}</span>
        </NuxtLink>
        <Pager v-model:page="history.page" :page-size="history.pageSize" :total="history.total" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.list-filters { margin-bottom: 8px; }
.list-filters input { flex: 1 1 200px; min-width: 0; }
.list-filters select { width: auto; }
</style>
