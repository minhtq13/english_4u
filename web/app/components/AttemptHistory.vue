<script lang="ts">
import type { Tables } from "~/types/database.types"

export type AttemptHistoryRow = Pick<Tables<"attempts">, "id" | "lesson_id" | "score" | "status" | "updated_at"> & {
  lessons: Pick<Tables<"lessons">, "title" | "label"> | null
  /** The teacher's comments, shown to the student under each attempt. */
  feedback?: Pick<Tables<"feedback">, "id" | "body" | "created_at">[]
}
</script>

<script setup lang="ts">
// One learner's attempts, newest first: search by lesson, filter by status, paged in the browser
// (one person's attempts are bounded, so they are loaded whole). The score shows once `viewer` may see it.
const props = defineProps<{
  rows: AttemptHistoryRow[]
  viewer: "student" | "teacher"
  /** Lessons whose results show as soon as they are submitted (for a student viewer). */
  showsAtOnce?: Set<string>
  link: (row: AttemptHistoryRow) => string
}>()

const search = ref("")
const status = ref("")
const filtered = computed(() => {
  const term = fold(search.value.trim())
  return props.rows.filter(r =>
    (!status.value || r.status === status.value)
    && (!term || fold(`${r.lessons?.label ?? r.lesson_id} ${r.lessons?.title ?? ""}`).includes(term)))
})
const paged = usePaged(filtered, 10)
watch([search, status], () => { paged.page = 0 })

const outcome = (r: AttemptHistoryRow) => attemptOutcome(r, props.viewer, props.showsAtOnce?.has(r.lesson_id))
const latestFeedback = (r: AttemptHistoryRow) =>
  [...(r.feedback ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0]
const short = (s: string) => (s.length > 90 ? `${s.slice(0, 90)}…` : s)
</script>

<template>
  <div>
    <slot v-if="!rows.length" name="empty" />
    <div v-else class="row list-filters">
      <input v-model="search" type="search" :placeholder="$t('lessonFilter.search')" :aria-label="$t('lessonFilter.search')">
      <select v-model="status" :aria-label="$t('lessonFilter.allStatuses')">
        <option value="">{{ $t("lessonFilter.allStatuses") }}</option>
        <option v-for="(label, key) in ATTEMPT_STATUS" :key="key" :value="key">{{ label }}</option>
      </select>
      <span class="small muted">{{ $t("lessonFilter.count", { n: paged.total }) }}</span>
    </div>
    <p v-if="rows.length && !paged.total" class="muted small">{{ $t("lessonFilter.none") }}</p>
    <NuxtLink v-for="r in paged.rows" :key="r.id" :to="link(r)" class="list-row">
      <span>
        <b>{{ r.lessons?.label ?? r.lesson_id }} - {{ r.lessons?.title ?? "" }}</b>
        <small>
          <template v-if="outcome(r).score">{{ $t("progress.correct", outcome(r).score!) }} · </template>
          {{ formatDate(r.updated_at) }}
          <template v-if="latestFeedback(r)"> · {{ $t("progress.comment") }}: “{{ short(latestFeedback(r)!.body) }}”</template>
        </small>
      </span>
      <span class="badge" :class="r.status">{{ outcome(r).label }}</span>
    </NuxtLink>
    <Pager v-model:page="paged.page" :page-size="paged.pageSize" :total="paged.total" />
  </div>
</template>

<style scoped>
.list-filters { margin-bottom: 8px; }
.list-filters input { flex: 1 1 200px; min-width: 0; }
.list-filters select { width: auto; }
</style>
