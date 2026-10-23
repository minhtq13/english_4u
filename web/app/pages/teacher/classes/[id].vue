<script setup lang="ts">
import type { Database, Tables, Views } from "~/types/database.types"
import type { Course } from "~/utils/course"
import type { GiveSettings } from "~/utils/classLesson"

definePageMeta({ roles: ["teacher"] })

const route = useRoute()
const classId = route.params.id as string
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { load } = useCourse()
/** Which classes of this grade already have each lesson (shown in the panel before giving it). */
const assignments = useAssignments()
const { t } = useI18n()

type ClassRow = Tables<"classes"> & { courses: Pick<Tables<"courses">, "name"> | null }
type StudentRow = Pick<Views<"student_progress">, "user_id" | "full_name" | "email" | "username" | "submitted" | "waiting" | "ok" | "done" | "last_activity">
type LessonRow = Pick<Views<"class_lesson_stats">, "lesson_id" | "submitted" | "waiting" | "ok" | "done">

const cls = shallowRef<ClassRow | null>(null)
const outline = shallowRef<Course | null>(null)
/** Lessons given to this class → how students may work on them. */
type Setting = Pick<Tables<"class_lessons">, "show_results" | "for_all" | "closed" | "due_at" | "shuffle">
const unlocked = ref<Map<string, Setting>>(new Map())
/** For lessons not open to the whole class: the students it is open to. */
const picks = ref<Map<string, Set<string>>>(new Map())
const students = shallowRef<StudentRow[]>([])
const lessonRows = shallowRef<Record<string, LessonRow>>({})
const otherClasses = shallowRef<Pick<Tables<"classes">, "id" | "name">[]>([])
const loaded = ref(false)
const error = ref("")
const busy = ref<string | null>(null)
const message = ref("")

// Per-student and per-lesson numbers come pre-aggregated from views (no raw attempts).
async function loadStudents() {
  const [st, ls] = await Promise.all([
    client.from("student_progress")
      .select("user_id, full_name, email, username, submitted, waiting, ok, done, last_activity")
      .eq("class_id", classId).order("full_name"),
    client.from("class_lesson_stats").select("lesson_id, submitted, waiting, ok, done").eq("class_id", classId),
  ])
  students.value = (st.data ?? []) as StudentRow[]
  lessonRows.value = Object.fromEntries(((ls.data ?? []) as LessonRow[]).map(r => [r.lesson_id ?? "", r]))
}

onMounted(async () => {
  try {
    const { data, error: e } = await client.from("classes").select("*, courses(name)").eq("id", classId).maybeSingle()
    if (e) throw e
    cls.value = data as ClassRow | null
    if (!cls.value) return
    const [o, u, others] = await Promise.all([
      load(cls.value.course_id, true),
      client.from("class_lessons").select("lesson_id, show_results, for_all, closed, due_at, shuffle").eq("class_id", classId),
      client.from("classes").select("id, name").neq("id", classId).order("name"),
      loadStudents(),
      loadPicks(),
      loadMissing(),
      assignments.load(cls.value.course_id),
    ])
    outline.value = o
    unlocked.value = new Map((u.data ?? []).map(r => [r.lesson_id, { show_results: r.show_results, for_all: r.for_all, closed: r.closed, due_at: r.due_at, shuffle: r.shuffle }]))
    otherClasses.value = others.data ?? []
  } catch (e) {
    error.value = t("classPage.loadFailed", { msg: (e as Error).message })
  } finally {
    loaded.value = true
  }
})
useHead({ title: () => t("classPage.pageTitle", { name: cls.value?.name ?? "" }) })

// ---- who still owes work (open lessons, not submitted) ----
type Missing = Pick<Views<"class_missing_work">, "lesson_id" | "due_at" | "user_id" | "full_name" | "username" | "started">
const missing = shallowRef<Missing[]>([])
async function loadMissing() {
  const { data } = await client.from("class_missing_work")
    .select("lesson_id, due_at, user_id, full_name, username, started").eq("class_id", classId)
  missing.value = (data ?? []) as Missing[]
}
/** One group per lesson, the nearest deadline first (lessons without a deadline last). */
const missingByLesson = computed(() => {
  const groups = new Map<string, { lessonId: string; due: string | null; people: Missing[] }>()
  for (const m of missing.value) {
    const g = groups.get(m.lesson_id ?? "") ?? { lessonId: m.lesson_id ?? "", due: m.due_at, people: [] }
    g.people.push(m)
    groups.set(g.lessonId, g)
  }
  return [...groups.values()].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
})
const lessonName = (id: string) => {
  const l = outline.value?.byId[id]
  return l ? `${l.label} - ${l.title}` : id
}
const personName = (m: Missing) => m.full_name || m.username || "?"
const remindText = (g: { lessonId: string; due: string | null; people: Missing[] }) =>
  t(g.due ? "classPage.remindDue" : "classPage.remind", { lesson: lessonName(g.lessonId), due: formatDate(g.due), names: g.people.map(personName).join(", ") })
const copiedRemind = ref("")
async function copyRemind(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedRemind.value = key
    setTimeout(() => { if (copiedRemind.value === key) copiedRemind.value = "" }, 2000)
  } catch { /* the list stays on screen to copy by hand */ }
}

async function loadPicks() {
  const { data } = await client.from("class_lesson_students").select("lesson_id, student_id").eq("class_id", classId)
  const m = new Map<string, Set<string>>()
  for (const r of data ?? []) m.set(r.lesson_id, new Set([...(m.get(r.lesson_id) ?? []), r.student_id]))
  picks.value = m
}

// ---- giving lessons to the class ----
const error2 = ref("")
function fail(e: { message: string } | null) {
  busy.value = null
  if (e) error2.value = t("common.notChanged", { msg: errorText(e.message) })
  return !!e
}
const patchSetting = (lessonId: string, patch: Partial<Setting>) =>
  (unlocked.value = new Map(unlocked.value).set(lessonId, { ...unlocked.value.get(lessonId)!, ...patch }))

// Taking a lesson back is a second click; the database refuses it once students have worked on it.
const armed = ref<string | null>(null)
function arm(key: string) {
  if (armed.value === key) return true
  armed.value = key
  setTimeout(() => { if (armed.value === key) armed.value = null }, 4000)
  return false
}

// One lesson at a time opens its panel (info + settings) before it is given.
const setupOpen = ref<string | null>(null)
const toggleSetup = (lessonId: string) => (setupOpen.value = setupOpen.value === lessonId ? null : lessonId)
const pickable = computed(() => students.value.map(st => ({ id: st.user_id ?? "", name: st.full_name || st.username || st.email || "?" })))
/** Other classes of the grade (not this one) that have the lesson. */
const givenToOthers = (lessonId: string) => assignments.classesOf(lessonId).filter(c => c.id !== classId).map(c => c.name)

async function give(lessonId: string, settings: GiveSettings) {
  busy.value = lessonId
  error2.value = message.value = ""
  const { error: e } = await client.from("class_lessons").insert({
    class_id: classId, lesson_id: lessonId, unlocked_by: user.value?.sub,
    due_at: settings.dueAt, for_all: settings.forAll, show_results: settings.showResults, shuffle: settings.shuffle,
  })
  if (fail(e)) return
  if (!settings.forAll) {
    const { error: e2 } = await client.from("class_lesson_students")
      .insert(settings.studentIds.map(id => ({ class_id: classId, lesson_id: lessonId, student_id: id })))
    if (e2) error2.value = t("common.notChanged", { msg: errorText(e2.message) })
    else picks.value = new Map(picks.value).set(lessonId, new Set(settings.studentIds))
  }
  unlocked.value = new Map(unlocked.value).set(lessonId, {
    show_results: settings.showResults, for_all: settings.forAll, closed: false, due_at: settings.dueAt, shuffle: settings.shuffle,
  })
  busy.value = null
  setupOpen.value = null
  message.value = t("classPage.setup.given", { lesson: lessonName(lessonId), name: cls.value?.name ?? "" })
  assignments.load(cls.value!.course_id)
  loadMissing()
}

async function takeBack(lessonId: string) {
  if (!arm(`back-${lessonId}`)) return
  armed.value = null
  busy.value = lessonId
  error2.value = message.value = ""
  const { error: e } = await client.from("class_lessons").delete().eq("class_id", classId).eq("lesson_id", lessonId)
  if (fail(e)) return
  const next = new Map(unlocked.value)
  next.delete(lessonId)
  unlocked.value = next
  assignments.load(cls.value!.course_id)
  loadMissing()
}

async function setClosed(lessonId: string, close: boolean) {
  if (close && !arm(`close-${lessonId}`)) return
  armed.value = null
  busy.value = lessonId
  error2.value = message.value = ""
  const { data, error: e } = await client.rpc("close_class_lesson", { target_class: classId, target_lesson: lessonId, close_it: close })
  if (fail(e)) return
  const due = unlocked.value.get(lessonId)?.due_at
  patchSetting(lessonId, close ? { closed: true } : { closed: false, due_at: isPastDue(due) ? null : due })
  message.value = close
    ? [t("classPage.closed"), data ? t("classPage.autoSubmitted", { n: data }) : "", t("classPage.closedReview")].filter(Boolean).join(" ")
    : t("classPage.reopened")
  if (close && data) await loadStudents()
  loadMissing()
}

async function setShuffle(lessonId: string, on: boolean) {
  busy.value = `shuffle-${lessonId}`
  error2.value = ""
  const { error: e } = await client.from("class_lessons").update({ shuffle: on }).eq("class_id", classId).eq("lesson_id", lessonId)
  if (fail(e)) return
  patchSetting(lessonId, { shuffle: on })
}

async function setShowResults(lessonId: string, show: boolean) {
  busy.value = `show-${lessonId}`
  error2.value = ""
  const { error: e } = await client.from("class_lessons").update({ show_results: show }).eq("class_id", classId).eq("lesson_id", lessonId)
  if (fail(e)) return
  patchSetting(lessonId, { show_results: show })
}

// ---- grading shortcuts ----
async function startQueue(lessonId: string) {
  const { data } = await client.from("attempts")
    .select("id, profiles!inner(class_id)")
    .eq("lesson_id", lessonId).eq("status", "submitted").eq("profiles.class_id", classId)
    .order("submitted_at", { ascending: true }).limit(1)
  const first = data?.[0]?.id
  if (first) await navigateTo(`/teacher/attempts/${first}?queue=${encodeURIComponent(lessonId)}&class=${classId}`)
}
async function releaseAll(lessonId: string) {
  if (!arm(`release-${lessonId}`)) return
  armed.value = null
  busy.value = `release-${lessonId}`
  error2.value = message.value = ""
  const { data, error: e } = await client.rpc("release_class_results", { target_class: classId, target_lesson: lessonId })
  if (fail(e)) return
  message.value = t("classPage.released", { n: data ?? 0 })
  await loadStudents()
}

// ---- deadline: past it students cannot work, and the lesson closes itself (pg_cron, every minute) ----
const dueEditing = ref<string | null>(null)
const dueValue = ref("")
/** datetime-local value (local time) ↔ ISO timestamp */
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function editDue(lessonId: string) {
  const current = unlocked.value.get(lessonId)?.due_at
  // Default: one week from now at 21:00.
  const d = new Date(Date.now() + 7 * 864e5)
  d.setHours(21, 0, 0, 0)
  dueValue.value = toLocalInput(current ?? d.toISOString())
  dueEditing.value = lessonId
}
async function saveDue(lessonId: string, clear = false) {
  const due = clear ? null : new Date(dueValue.value).toISOString()
  if (due && isPastDue(due)) {
    error2.value = t("classPage.dueInPast")
    return
  }
  busy.value = `due-${lessonId}`
  error2.value = ""
  const { error: e } = await client.from("class_lessons").update({ due_at: due }).eq("class_id", classId).eq("lesson_id", lessonId)
  if (fail(e)) return
  patchSetting(lessonId, { due_at: due })
  loadMissing()
  dueEditing.value = null
  message.value = due ? t("classPage.dueSet", { date: formatDate(due) }) : t("classPage.dueCleared")
}

// ---- who may work on a lesson (default: the whole class) ----
const expanded = ref<string | null>(null)
async function setForAll(lessonId: string, forAll: boolean) {
  busy.value = `who-${lessonId}`
  error2.value = ""
  const { error: e } = await client.from("class_lessons").update({ for_all: forAll }).eq("class_id", classId).eq("lesson_id", lessonId)
  if (fail(e)) return
  patchSetting(lessonId, { for_all: forAll })
  loadMissing()
}
async function togglePick(lessonId: string, studentId: string) {
  const set = new Set(picks.value.get(lessonId) ?? [])
  const on = set.has(studentId)
  busy.value = `pick-${lessonId}-${studentId}`
  error2.value = ""
  const { error: e } = on
    ? await client.from("class_lesson_students").delete().eq("class_id", classId).eq("lesson_id", lessonId).eq("student_id", studentId)
    : await client.from("class_lesson_students").insert({ class_id: classId, lesson_id: lessonId, student_id: studentId })
  if (fail(e)) return
  if (on) set.delete(studentId)
  else set.add(studentId)
  picks.value = new Map(picks.value).set(lessonId, set)
  loadMissing()
}
const whoText = (lessonId: string) => {
  const st = unlocked.value.get(lessonId)
  return st?.for_all ? t("classPage.wholeClass") : t("classPage.someStudents", { n: picks.value.get(lessonId)?.size ?? 0, total: students.value.length })
}

// ---- numbers ----
const lessonIds = computed(() => outline.value?.order ?? [])
const { isAdmin } = useProfile()
const canEditLesson = (l: { createdBy: string | null }) => isAdmin.value || (!!l.createdBy && l.createdBy === user.value?.sub)
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null)

const lessonStats = (id: string) => {
  const r = lessonRows.value[id]
  return { done: r?.submitted ?? 0, accuracy: accuracyOf(r?.ok, r?.done), waiting: r?.waiting ?? 0 }
}
const studentStats = (s: StudentRow) =>
  ({ done: s.submitted ?? 0, accuracy: accuracyOf(s.ok, s.done), waiting: s.waiting ?? 0, last: s.last_activity })

// ---- moving a student ----
async function moveStudent(s: StudentRow, target: string) {
  if (!target) return
  busy.value = s.user_id
  message.value = ""
  const { error: e } = await client.from("profiles").update({ class_id: target }).eq("id", s.user_id ?? "")
  busy.value = null
  if (e) {
    message.value = t("classPage.moveFailed", { name: s.full_name || s.email, msg: errorText(e.message) })
    return
  }
  message.value = t("classPage.moved", { name: s.full_name || s.email, cls: otherClasses.value.find(c => c.id === target)?.name })
  await loadStudents()
}

const copied = ref(false)
async function copyCode() {
  if (!cls.value) return
  try {
    await navigator.clipboard.writeText(cls.value.join_code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* the code stays visible to copy by hand */ }
}
</script>

<template>
  <div>
    <BackLink to="/teacher" :label="$t('nav.myClasses')" />
    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <p v-else-if="error" class="fb no">{{ error }}</p>
    <p v-else-if="!cls" class="card muted">{{ $t("classPage.notFound") }}</p>
    <template v-else>
      <div class="head">
        <div>
          <h1>{{ $t("nav.classBadge", { name: cls.name }) }}</h1>
          <p class="sub">{{ localName(cls.courses?.name) }} · {{ $t("common.students", students.length) }} · {{ $t("classPage.given", { n: unlocked.size, total: lessonIds.length }) }}</p>
        </div>
        <div class="code-box">
          <span class="small muted">{{ $t("classPage.code") }}</span>
          <b class="code">{{ cls.join_code }}</b>
          <button class="btn small" @click="copyCode">{{ copied ? $t("common.copied") : $t("common.copy") }}</button>
        </div>
      </div>
      <p v-if="message" class="fb ok">{{ message }}</p>
      <p v-if="error2" class="fb no">{{ error2 }}</p>

      <section class="card">
        <div class="section-head">
          <h2>{{ $t("nav.lessons") }}</h2>
          <span class="row">
            <NuxtLink :to="`/teacher/lessons/new?class=${cls.id}`" class="btn primary small">{{ $t("classPage.newLesson") }}</NuxtLink>
            <NuxtLink :to="`/teacher/review/${cls.id}`" class="btn small">{{ $t("classPage.review") }}</NuxtLink>
            <NuxtLink :to="`/teacher/grading?class=${cls.id}`" class="btn ghost small">{{ $t("classPage.grade") }} →</NuxtLink>
          </span>
        </div>
        <details class="help">
          <summary>{{ $t("classPage.helpTitle") }}</summary>
          <ul>
            <li v-for="k in ['give', 'who', 'close', 'due', 'back', 'results']" :key="k" v-html="$t(`classPage.help.${k}`)" />
          </ul>
        </details>
        <p v-if="!lessonIds.length" class="muted small">{{ $t("classPage.noLessons") }}</p>

        <template v-for="phase in outline?.phases ?? []" :key="phase.id">
          <h3 v-if="phase.lessons.length" class="phase">{{ localName(phase.name) }}</h3>
          <div v-for="l in phase.lessons" :key="l.id" class="lesson" :class="{ given: unlocked.has(l.id) }">
            <div class="lesson-top">
              <div class="lesson-name">
                <NuxtLink :to="`/lessons/${l.id}`"><b>{{ l.label }}</b> - {{ l.title }}</NuxtLink>
                <span v-if="l.createdBy" class="badge own">{{ $t("classPage.byTeacher") }}</span>
                <NuxtLink v-if="canEditLesson(l)" :to="`/teacher/lessons/${l.id}?class=${classId}`" class="small">{{ $t("common.edit") }}</NuxtLink>
              </div>
              <button
                v-if="!unlocked.has(l.id)" class="btn small" :class="setupOpen === l.id ? 'ghost' : 'primary'"
                :aria-expanded="setupOpen === l.id" :aria-controls="`setup-${l.id}`" @click="toggleSetup(l.id)"
              >{{ $t("classPage.give") }} {{ setupOpen === l.id ? "▴" : "▾" }}</button>
              <span v-else class="badge" :class="unlocked.get(l.id)!.closed ? '' : 'done'">
                {{ unlocked.get(l.id)!.closed ? $t("classPage.stateClosed") : $t("classPage.stateOpen") }}
              </span>
            </div>

            <ClassLessonSetup
              v-if="!unlocked.has(l.id) && setupOpen === l.id"
              :id="`setup-${l.id}`" :lesson-id="l.id" :class-name="cls.name" :students="pickable"
              :assigned-to="givenToOthers(l.id)" :busy="busy === l.id"
              @give="give(l.id, $event)" @cancel="setupOpen = null"
            />

            <template v-if="unlocked.has(l.id)">
              <div class="lesson-stats">
                <div class="stat-cell">
                  <span class="small muted">{{ $t("classPage.submitted") }}</span>
                  <StatBar :value="pct(lessonStats(l.id).done, students.length)" :text="`${lessonStats(l.id).done}/${students.length}`" />
                </div>
                <div class="stat-cell">
                  <span class="small muted">{{ $t("classPage.accuracy") }}</span>
                  <StatBar :value="lessonStats(l.id).accuracy" />
                </div>
                <div class="stat-cell waiting">
                  <span class="small muted">{{ $t("classPage.waiting") }}</span>
                  <span class="row">
                    <span class="badge" :class="lessonStats(l.id).waiting ? 'submitted' : ''">{{ lessonStats(l.id).waiting }}</span>
                    <template v-if="lessonStats(l.id).waiting">
                      <button class="link small" @click="startQueue(l.id)">{{ $t("classPage.queue") }}</button>
                      <button
                        class="btn small" :class="armed === `release-${l.id}` ? 'danger' : 'ghost'" :disabled="busy === `release-${l.id}`"
                        :title="$t('classPage.releaseTitle')" @click="releaseAll(l.id)"
                      >{{ armed === `release-${l.id}` ? $t("common.confirmAgain") : $t("classPage.release") }}</button>
                    </template>
                  </span>
                </div>
              </div>

              <div class="lesson-controls">
                <span class="row">
                  <button v-if="unlocked.get(l.id)!.closed" class="btn ghost small" :disabled="busy === l.id" @click="setClosed(l.id, false)">{{ $t("classPage.reopen") }}</button>
                  <button
                    v-else class="btn small" :class="armed === `close-${l.id}` ? 'danger' : 'ghost'" :disabled="busy === l.id"
                    :title="$t('classPage.closeTitle')" @click="setClosed(l.id, true)"
                  >{{ armed === `close-${l.id}` ? $t("classPage.closeConfirm") : $t("classPage.close") }}</button>
                  <button
                    class="btn small" :class="armed === `back-${l.id}` ? 'danger' : 'ghost'" :disabled="busy === l.id"
                    :title="$t('classPage.takeBackTitle')" @click="takeBack(l.id)"
                  >{{ armed === `back-${l.id}` ? $t("classPage.takeBackConfirm") : $t("classPage.takeBack") }}</button>
                  <button class="btn ghost small" @click="expanded = expanded === l.id ? null : l.id">
                    👥 {{ whoText(l.id) }} {{ expanded === l.id ? "▴" : "▾" }}
                  </button>
                </span>

                <span class="due">
                  <template v-if="dueEditing === l.id">
                    <input v-model="dueValue" type="datetime-local" :aria-label="$t('classPage.dueLabel', { name: l.label })">
                    <button class="btn small primary" :disabled="!dueValue || busy === `due-${l.id}`" @click="saveDue(l.id)">{{ $t("common.save") }}</button>
                    <button v-if="unlocked.get(l.id)!.due_at" class="btn small ghost" :disabled="busy === `due-${l.id}`" @click="saveDue(l.id, true)">{{ $t("classPage.dueClear") }}</button>
                    <button class="btn small ghost" @click="dueEditing = null">{{ $t("common.cancel") }}</button>
                  </template>
                  <template v-else-if="unlocked.get(l.id)!.due_at">
                    <span class="small" :class="{ late: isPastDue(unlocked.get(l.id)!.due_at) }">
                      ⏰ {{ formatDate(unlocked.get(l.id)!.due_at) }} · {{ timeLeft(unlocked.get(l.id)!.due_at) || $t("classPage.duePassed") }}
                    </span>
                    <button v-if="!unlocked.get(l.id)!.closed" class="link small" @click="editDue(l.id)">{{ $t("common.edit") }}</button>
                  </template>
                  <button v-else-if="!unlocked.get(l.id)!.closed" class="link small" @click="editDue(l.id)">{{ $t("classPage.dueAdd") }}</button>
                </span>

                <span class="toggles">
                  <label class="toggle small">
                    <input type="checkbox" :checked="unlocked.get(l.id)!.show_results" :disabled="busy === `show-${l.id}`" @change="setShowResults(l.id, ($event.target as HTMLInputElement).checked)">
                    {{ $t("classPage.showResults") }}
                  </label>
                  <label class="toggle small" :title="$t('classPage.shuffleTitle')">
                    <input type="checkbox" :checked="unlocked.get(l.id)!.shuffle" :disabled="busy === `shuffle-${l.id}`" @change="setShuffle(l.id, ($event.target as HTMLInputElement).checked)">
                    {{ $t("classPage.shuffle") }}
                  </label>
                </span>
              </div>

              <div v-if="expanded === l.id" class="who-panel">
                <span class="row">
                  <label class="toggle"><input type="radio" :checked="unlocked.get(l.id)!.for_all" :disabled="busy === `who-${l.id}`" @change="setForAll(l.id, true)"> {{ $t("classPage.whoAll") }}</label>
                  <label class="toggle"><input type="radio" :checked="!unlocked.get(l.id)!.for_all" :disabled="busy === `who-${l.id}`" @change="setForAll(l.id, false)"> {{ $t("classPage.whoSome") }}</label>
                </span>
                <template v-if="!unlocked.get(l.id)!.for_all">
                  <p v-if="!students.length" class="muted small">{{ $t("classPage.noStudents") }}</p>
                  <div v-else class="row picks">
                    <label v-for="st in students" :key="st.user_id ?? ''" class="pick" :class="{ on: picks.get(l.id)?.has(st.user_id ?? '') }">
                      <input type="checkbox" :checked="picks.get(l.id)?.has(st.user_id ?? '')" :disabled="busy === `pick-${l.id}-${st.user_id}`" @change="togglePick(l.id, st.user_id ?? '')">
                      {{ st.full_name || st.username }}
                    </label>
                  </div>
                  <p class="hint">{{ $t("classPage.whoHint") }}</p>
                </template>
              </div>
            </template>
          </div>
        </template>
      </section>

      <section v-if="missingByLesson.length" class="card">
        <div class="section-head">
          <h2>{{ $t("classPage.missing") }}</h2>
          <button class="btn ghost small" @click="copyRemind(missingByLesson.map(remindText).join('\n'), 'all')">
            {{ copiedRemind === "all" ? $t("common.copied") : $t("classPage.copyAll") }}
          </button>
        </div>
        <p class="hint">{{ $t("classPage.missingHint") }}</p>
        <div v-for="g in missingByLesson" :key="g.lessonId" class="missing">
          <div class="missing-head">
            <b>{{ lessonName(g.lessonId) }}</b>
            <span v-if="g.due" class="small" :class="{ late: isPastDue(g.due) }">⏰ {{ formatDate(g.due) }}<template v-if="timeLeft(g.due)"> · {{ timeLeft(g.due) }}</template></span>
            <span class="small muted">{{ $t("common.students", g.people.length) }}</span>
            <button class="link small" @click="copyRemind(remindText(g), g.lessonId)">{{ copiedRemind === g.lessonId ? $t("common.copied") : $t("common.copy") }}</button>
          </div>
          <div class="row names">
            <span v-for="m in g.people" :key="m.user_id ?? ''" class="name-chip" :class="{ started: m.started }" :title="m.started ? $t('classPage.inProgress') : $t('classPage.notStarted')">
              {{ personName(m) }}<template v-if="m.started"> · {{ $t("classPage.inProgress") }}</template>
            </span>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="section-head">
          <h2>{{ $t("nav.students") }}</h2>
          <NuxtLink to="/teacher/students" class="btn ghost small">{{ $t("classPage.manageStudents") }} →</NuxtLink>
        </div>
        <p v-if="!students.length" class="muted small" v-html="$t('classPage.noStudentsCode', { code: cls.join_code })" />
        <div v-else class="table-wrap">
          <table class="stats-table">
            <thead>
              <tr>
                <th>{{ $t("common.student") }}</th><th>{{ $t("classPage.submittedLessons") }}</th><th>{{ $t("classPage.accuracy") }}</th>
                <th class="n">{{ $t("classPage.waiting") }}</th><th>{{ $t("classPage.lastActive") }}</th><th>{{ $t("classPage.moveTo") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in students" :key="s.user_id ?? ''">
                <td><NuxtLink :to="`/teacher/students/${s.user_id}`"><b>{{ s.full_name || s.email }}</b></NuxtLink><br><span class="small muted">{{ loginOf(s) }}</span></td>
                <td><StatBar :value="pct(studentStats(s).done, unlocked.size)" :text="`${studentStats(s).done}/${unlocked.size}`" /></td>
                <td><StatBar :value="studentStats(s).accuracy" /></td>
                <td class="n">{{ studentStats(s).waiting }}</td>
                <td class="small muted">{{ studentStats(s).last ? formatDate(studentStats(s).last) : $t("classPage.neverActive") }}</td>
                <td>
                  <select
                    :id="`move-${s.user_id}`"
                    :disabled="busy === s.user_id || !otherClasses.length"
                    value=""
                    @change="moveStudent(s, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">{{ otherClasses.length ? $t("classPage.pickClass") : $t("classPage.noOtherClass") }}</option>
                    <option v-for="o in otherClasses" :key="o.id" :value="o.id">{{ o.name }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.code-box { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
.code { font-size: 1.3rem; letter-spacing: .15em; font-variant-numeric: tabular-nums; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.section-head h2 { margin: 0; }
.section-head .btn { padding: 4px 12px; }

.help { margin: 0 0 12px; font-size: .9rem; color: var(--muted); }
.help summary { cursor: pointer; color: var(--accent); font-weight: 500; width: fit-content; }
.help ul { margin: 8px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }

.phase { font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 16px 0 6px; }
.lesson { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 10px; }
.lesson.given { border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); }
.lesson-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.lesson-name { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-width: 0; }
.lesson-name a { text-decoration: none; }
.lesson-top .btn { padding: 4px 12px; }
.own { font-size: .72rem; }
.lesson-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.stat-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.stat-cell :deep(.meter) { min-width: 0; }
.waiting .row { gap: 8px; flex-wrap: wrap; }
.waiting .btn { padding: 2px 8px; }
.lesson-controls { display: flex; align-items: center; gap: 8px 16px; flex-wrap: wrap; padding-top: 10px; border-top: 1px dashed var(--line); }
.lesson-controls .row { gap: 6px; }
.lesson-controls .btn { padding: 3px 10px; }
.due { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.due input { width: auto; padding: 2px 6px; }
.toggles { display: inline-flex; gap: 6px 14px; flex-wrap: wrap; }
.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.late { color: var(--bad); }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.who-panel { display: flex; flex-direction: column; gap: 8px; background: var(--bg); border-radius: 8px; padding: 10px 12px; }
.picks { gap: 6px; }
.pick { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--card); cursor: pointer; font-size: .88rem; }
.pick.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }

.missing { border-top: 1px solid var(--line); padding: 10px 0; }
.missing:first-of-type { border-top: 0; }
.missing-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.names { gap: 6px; }
.name-chip { font-size: .85rem; padding: 2px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--bg); }
.name-chip.started { border-color: var(--warn); background: var(--warn-soft); color: var(--warn); }

.stats-table th { white-space: nowrap; }
.stats-table td:has(.meter) { min-width: 140px; }
.stats-table a { text-decoration: none; }
.stats-table select { width: auto; }
.n { text-align: right; font-variant-numeric: tabular-nums; }
@media (max-width: 640px) {
  .lesson-stats { grid-template-columns: 1fr 1fr; }
  .stat-cell.waiting { grid-column: span 2; }
  .code-box { width: 100%; justify-content: space-between; }
}
</style>
