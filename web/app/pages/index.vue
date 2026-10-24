<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { ClassLessonSetting } from "~/utils/attemptOutcome"
import type { Course, Score } from "~/utils/course"

definePageMeta({ roles: ["student"] })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { role, myClass } = useProfile()
const { load } = useCourse()
const { t } = useI18n()

// Teachers and admins have their own home page.
if (role.value && role.value !== "student") await navigateTo(homeFor(role.value))

const course = shallowRef<Course | null>(null)
/** Lessons given to the class → their settings; `mine` = lessons opened to this student by name. */
const unlocked = shallowRef<Map<string, ClassLessonSetting>>(new Map())
const mine = shallowRef<Set<string>>(new Set())
useHead({ title: () => t("roadmap.pageTitle", { name: myClass.value?.name ?? "" }) })

type Row = Pick<Tables<"attempts">, "lesson_id" | "answers" | "score" | "status" | "updated_at">
const attempts = shallowRef<Record<string, Row>>({})
const openErrors = ref(0)
const loaded = ref(false)
const error = ref("")

onMounted(async () => {
  const me = user.value?.sub
  const cls = myClass.value
  if (!me || !cls) return
  try {
    const [outline, opened, picked, { data: rows }, { count }] = await Promise.all([
      load(cls.course_id),
      client.from("class_lessons").select("lesson_id, show_results, for_all, closed, due_at, shuffle").eq("class_id", cls.id),
      client.from("class_lesson_students").select("lesson_id").eq("class_id", cls.id).eq("student_id", me),
      client.from("attempts").select("lesson_id, answers, score, status, updated_at").eq("user_id", me),
      client.from("error_log").select("id", { count: "exact", head: true }).eq("user_id", me).neq("status", "fixed"),
    ])
    course.value = outline
    unlocked.value = new Map((opened.data ?? []).map(({ lesson_id, ...setting }) => [lesson_id, setting]))
    mine.value = new Set((picked.data ?? []).map(r => r.lesson_id))
    attempts.value = Object.fromEntries((rows ?? []).map(r => [r.lesson_id, r]))
    openErrors.value = count ?? 0
  } catch (e) {
    error.value = t("roadmap.loadFailed", { msg: (e as Error).message })
  }
  loaded.value = true
})

const isOpen = (id: string) => unlocked.value.has(id)
const access = (id: string) => accessOf(unlocked.value.get(id)!, mine.value.has(id))
/** A lesson can be entered to work on it, or to review work already started. */
const canEnter = (id: string) => access(id) === "open" || !!attempts.value[id]
const openOrder = computed(() => (course.value?.order ?? []).filter(isOpen))
const totalOf = (id: string) => course.value?.byId[id]?.total ?? 0
/** The score, only once the student may see it. */
const scoreOfRow = (id: string) => {
  const row = attempts.value[id]
  return row ? attemptOutcome(row, "student", unlocked.value.get(id)?.show_results).score : null
}

function badge(id: string) {
  const row = attempts.value[id]
  const s = scoreOfRow(id)
  const total = totalOf(id)
  if (row?.status === "graded") return { cls: "graded", text: t("roadmap.graded", { ok: s?.ok ?? 0, total }) }
  if (row?.status === "submitted") return s ? { cls: "done", text: t("roadmap.submittedScore", { ok: s.ok, total }) } : { cls: "submitted", text: t("roadmap.submittedWaiting") }
  if (access(id) === "closed") return { cls: "", text: t("roadmap.closed") }
  if (access(id) === "locked") return { cls: "", text: t("roadmap.locked") }
  const answered = Object.keys(row?.answers ?? {}).length
  const left = timeLeft(unlocked.value.get(id)?.due_at)
  const due = left ? ` · ${left}` : ""
  if (answered) return { cls: "partial", text: t("roadmap.inProgress", { n: answered, total }) + due }
  return { cls: left ? "submitted" : "partial", text: t("roadmap.notStarted") + due }
}

const isFinished = (id: string) => !!attempts.value[id] && attempts.value[id]!.status !== "in_progress"
const completed = computed(() => openOrder.value.filter(isFinished).length)

const accuracy = computed(() => {
  const scores = Object.keys(attempts.value).map(scoreOfRow).filter((s): s is Score => !!s)
  return percentOf(scores.reduce((n, s) => n + s.ok, 0), scores.reduce((n, s) => n + s.done, 0))
})

// What to do next: the open, unsubmitted lesson with the nearest deadline; otherwise the most recently
// touched one in progress; otherwise the first one not started.
const nextLesson = computed(() => {
  const todo = openOrder.value.filter(id => access(id) === "open" && !isFinished(id))
  const due = todo.filter(id => unlocked.value.get(id)?.due_at)
    .sort((a, b) => unlocked.value.get(a)!.due_at!.localeCompare(unlocked.value.get(b)!.due_at!))[0]
  const started = todo.filter(id => attempts.value[id])
    .sort((a, b) => attempts.value[b]!.updated_at.localeCompare(attempts.value[a]!.updated_at))[0]
  const id = due ?? started ?? todo[0]
  return id ? course.value?.byId[id] : undefined
})
</script>

<template>
  <div>
    <h1>{{ $t("roadmap.title", { name: myClass?.name }) }}</h1>
    <p class="sub">{{ localName(myClass?.courses?.name) }} · {{ $t("roadmap.intro") }}</p>

    <p v-if="error" class="fb no">{{ error }}</p>

    <div class="stats three">
      <div class="stat"><b>{{ completed }}/{{ openOrder.length }}</b><span>{{ $t("roadmap.statSubmitted") }}</span></div>
      <div class="stat"><b>{{ accuracy === null ? "-" : `${accuracy}%` }}</b><span>{{ $t("roadmap.statAccuracy") }}</span></div>
      <NuxtLink to="/progress" class="stat stat-link"><b>{{ openErrors }}</b><span>{{ $t("roadmap.statErrors") }}</span></NuxtLink>
    </div>

    <div v-if="loaded && nextLesson" class="card next">
      <span class="time">{{ $t("roadmap.next") }}</span>
      <h2>{{ nextLesson.label }} - {{ nextLesson.title }}</h2>
      <p v-if="unlocked.get(nextLesson.id)?.due_at" class="small due">
        ⏰ {{ $t("roadmap.due", { date: formatDate(unlocked.get(nextLesson.id)!.due_at) }) }} · {{ timeLeft(unlocked.get(nextLesson.id)!.due_at) }}
      </p>
      <p class="muted small">{{ nextLesson.desc }}</p>
      <NuxtLink :to="`/lessons/${nextLesson.id}`" class="btn primary">{{ $t("roadmap.open") }}</NuxtLink>
    </div>
    <p v-else-if="loaded && course && !openOrder.length" class="card muted">{{ $t("roadmap.empty", { name: myClass?.name }) }}</p>

    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <!-- Only lessons assigned to the class reach the student (RLS), so every listed lesson is open. -->
    <section v-for="phase in (course?.phases ?? []).filter(p => p.lessons.some(l => isOpen(l.id)))" :key="phase.id" class="card">
      <h2>{{ phase.name }}</h2>
      <template v-for="l in phase.lessons" :key="l.id">
        <template v-if="isOpen(l.id)">
          <NuxtLink v-if="canEnter(l.id)" :to="`/lessons/${l.id}`" class="list-row">
            <span><b>{{ l.label }} - {{ l.title }}</b><small>{{ l.desc }}</small></span>
            <span class="badge" :class="badge(l.id).cls">{{ badge(l.id).text }}</span>
          </NuxtLink>
          <div v-else class="list-row unavailable">
            <span><b>{{ l.label }} - {{ l.title }}</b><small>{{ l.desc }}</small></span>
            <span class="badge">{{ badge(l.id).text }}</span>
          </div>
        </template>
      </template>
    </section>
  </div>
</template>

<style scoped>
.stat-link { text-decoration: none; color: var(--text); }
.stat-link:hover { border-color: var(--accent); }
.next h2 { margin-bottom: 0; }
.unavailable { opacity: .6; }
.next .due { color: var(--warn); font-weight: 600; margin: 4px 0 0; }
.next p { margin: 4px 0 12px; }
</style>
