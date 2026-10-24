<script setup lang="ts">
import type { Database } from "~/types/database.types"
import type { AttemptLike, LessonState, PersonLike } from "~/utils/lessonStatus"

// Every student of a class and where they stand with one lesson given to it (not started, working, submitted and
// waiting for a grade, graded, or not given the lesson), with the score and the time of submission and a link to read or
// grade the work. It reads everything it needs, so the class page and the lesson page both show it in a popup.
const props = defineProps<{ classId: string; lessonId: string }>()

const client = useSupabaseClient<Database>()
const students = shallowRef<PersonLike[]>([])
const attempts = shallowRef<AttemptLike[]>([])
/** Who may work on the lesson: the whole class, or only `pickedIds`. */
const forAll = ref(true)
const pickedIds = shallowRef<ReadonlySet<string>>(new Set())
const loaded = ref(false)
const failed = ref(false)

async function load() {
  loaded.value = false
  const [st, cl, pk] = await Promise.all([
    client.from("student_progress").select("user_id, full_name, username, email").eq("class_id", props.classId).order("full_name"),
    client.from("class_lessons").select("for_all").eq("class_id", props.classId).eq("lesson_id", props.lessonId).maybeSingle(),
    client.from("class_lesson_students").select("student_id").eq("class_id", props.classId).eq("lesson_id", props.lessonId),
  ])
  const list = st.data ?? []
  const ids = list.map(s => s.user_id ?? "").filter(Boolean)
  const at = ids.length
    ? await client.from("attempts").select("id, user_id, status, score, submitted_at, updated_at").eq("lesson_id", props.lessonId).in("user_id", ids)
    : { data: [], error: null }
  failed.value = !!(st.error || cl.error || pk.error || at.error)
  if (!failed.value) {
    students.value = list
    attempts.value = at.data ?? []
    forAll.value = cl.data?.for_all ?? true
    pickedIds.value = new Set((pk.data ?? []).map(r => r.student_id))
  }
  loaded.value = true
}
onMounted(load)
watch(() => [props.classId, props.lessonId], load)

const rows = computed(() => lessonStates(students.value, attempts.value, { forAll: forAll.value, pickedIds: pickedIds.value }))
const counts = computed(() => countStates(rows.value))
/** The state the list is narrowed to; "" shows everyone. Clicking it again goes back to everyone. */
const only = ref<"" | LessonState>("")
const shown = computed(() => (only.value ? rows.value.filter(r => r.state === only.value) : rows.value))
const paged = usePaged(shown, 10)
watch(only, () => { paged.page = 0 })
const states = computed(() => LESSON_STATES.filter(s => counts.value[s] > 0 || s === only.value))

const BADGE: Record<LessonState, string> = { waiting: "submitted", inProgress: "partial", notStarted: "", graded: "graded", locked: "" }
const scoreOf = (r: (typeof rows.value)[number]) => (r.attempt && r.attempt.status !== "in_progress" ? toScore(r.attempt.score) : null)
</script>

<template>
  <div class="progress">
    <p v-if="!loaded" class="small muted">{{ $t("common.loading") }}</p>
    <p v-else-if="failed" class="fb no small">{{ $t("classPage.lessonProgress.failed") }}</p>
    <p v-else-if="!students.length" class="small muted">{{ $t("classPage.noStudents") }}</p>
    <template v-else>
      <div class="row chips" role="group" :aria-label="$t('classPage.lessonProgress.title')">
        <button type="button" class="chip" :class="{ on: !only }" :aria-pressed="!only" @click="only = ''">
          {{ $t("classPage.lessonProgress.all") }} <b>{{ rows.length }}</b>
        </button>
        <button
          v-for="s in states" :key="s" type="button" class="chip" :class="{ on: only === s }" :aria-pressed="only === s"
          @click="only = only === s ? '' : s"
        >{{ $t(`classPage.lessonState.${s}`) }} <b>{{ counts[s] }}</b></button>
      </div>

      <ul class="list">
        <li v-for="r in paged.rows" :key="r.student.user_id ?? ''" class="item">
          <NuxtLink :to="`/teacher/students/${r.student.user_id}`" class="who"><b>{{ r.student.full_name || r.student.email || r.student.username }}</b></NuxtLink>
          <span class="badge" :class="BADGE[r.state]">{{ $t(`classPage.lessonState.${r.state}`) }}</span>
          <span class="small muted detail">
            <template v-if="scoreOf(r)">{{ $t("progress.correct", scoreOf(r)!) }}</template>
            <template v-if="r.attempt?.submitted_at"> · {{ $t("classPage.lessonProgress.submittedAt", { date: formatDate(r.attempt.submitted_at) }) }}</template>
            <template v-else-if="r.attempt"> · {{ formatDate(r.attempt.updated_at) }}</template>
          </span>
          <NuxtLink v-if="r.attempt" :to="`/teacher/attempts/${r.attempt.id}`" class="small go">
            {{ r.state === "waiting" ? $t("classPage.lessonProgress.grade") : $t("classPage.lessonProgress.view") }} →
          </NuxtLink>
        </li>
      </ul>
      <Pager v-model:page="paged.page" :page-size="paged.pageSize" :total="paged.total" />
    </template>
  </div>
</template>

<style scoped>
.progress { display: flex; flex-direction: column; gap: 8px; }
.chips { gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--bg); color: var(--text); font: inherit; font-size: .85rem; cursor: pointer; }
.chip:hover { border-color: var(--accent); }
.chip.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.item { display: grid; grid-template-columns: minmax(140px, 1.2fr) auto minmax(0, 2fr) auto; align-items: center; gap: 4px 12px;
  padding: 6px 0; border-top: 1px solid var(--line); }
.item:first-child { border-top: 0; }
.who { text-decoration: none; min-width: 0; }
.go { white-space: nowrap; justify-self: end; }
@media (max-width: 640px) {
  .item { grid-template-columns: 1fr auto; }
  .detail { grid-column: 1; }
  .go { grid-column: 2; grid-row: 2; }
}
</style>
