import type { Database, Views } from "~/types/database.types"
import type { Course } from "~/utils/course"
import type { GiveSettings } from "~/utils/classLesson"
import type { SettingPatch } from "~/utils/classLessonStore"
import { isPastDue } from "~/utils/course"

export type ClassStudentRow = Pick<Views<"student_progress">, "user_id" | "full_name" | "email" | "username" | "submitted" | "waiting" | "ok" | "done" | "last_activity">
export type LessonStatRow = Pick<Views<"class_lesson_stats">, "lesson_id" | "submitted" | "waiting" | "ok" | "done" | "started">
export type MissingRow = Pick<Views<"class_missing_work">, "lesson_id" | "due_at" | "user_id" | "full_name" | "username" | "started">
export interface MissingGroup { lessonId: string; due: string | null; people: MissingRow[] }

/**
 * Everything a teacher does with the lessons of one class, and what each change moves: the lessons given and their
 * settings, the students and the per-lesson numbers, who still owes work. A change that makes some of those stale
 * refreshes them here, so the page only shows. Each control has a busy key, and the outcome of the last change is
 * a `notice` shown inside the lesson it was about (the list is long; the page top is out of sight).
 *
 * @param outline the class's course, for lesson names in messages (set by the page once loaded)
 * @param cls the class, for its name and grade
 */
export function useClassWorkspace(classId: string, outline: Ref<Course | null>, cls: Ref<{ name: string; course_id: string } | null>) {
  const client = useSupabaseClient<Database>()
  const { t } = useI18n()
  /** Which classes of the grade already have each lesson (shown in the panel before giving it). */
  const assignments = useAssignments()
  /** Lessons given to this class (`settings`), who they are open to (`picks`), and every change to them. */
  const classLessons = useClassLessons(classId)
  const { armed, arm } = useTwoClick()

  const students = shallowRef<ClassStudentRow[]>([])
  const lessonRows = shallowRef<Record<string, LessonStatRow>>({})
  const missing = shallowRef<MissingRow[]>([])
  const busy = ref<string | null>(null)
  const notice = ref<{ lessonId: string; text: string; ok: boolean } | null>(null)

  // ---- reading: per-student and per-lesson numbers come pre-aggregated from views (no raw attempts) ----
  async function loadStudents() {
    const [st, ls] = await Promise.all([
      client.from("student_progress")
        .select("user_id, full_name, email, username, submitted, waiting, ok, done, last_activity")
        .eq("class_id", classId).order("full_name"),
      client.from("class_lesson_stats").select("lesson_id, submitted, waiting, ok, done, started").eq("class_id", classId),
    ])
    students.value = (st.data ?? []) as ClassStudentRow[]
    lessonRows.value = Object.fromEntries(((ls.data ?? []) as LessonStatRow[]).map(r => [r.lesson_id ?? "", r]))
  }
  async function loadMissing() {
    const { data } = await client.from("class_missing_work")
      .select("lesson_id, due_at, user_id, full_name, username, started").eq("class_id", classId)
    missing.value = (data ?? []) as MissingRow[]
  }
  /** Everything the page shows about the class's lessons; `courseId` is the class's grade. */
  const load = (courseId: string) => Promise.all([classLessons.load(), loadStudents(), loadMissing(), assignments.load(courseId)])
  const reloadAssignments = () => (cls.value ? assignments.load(cls.value.course_id) : undefined)

  // ---- derived ----
  const lessonName = (id: string) => {
    const l = outline.value?.byId[id]
    return l ? `${l.label} - ${l.title}` : id
  }
  /** One group per lesson, the nearest deadline first (lessons without a deadline last). */
  const missingByLesson = computed<MissingGroup[]>(() => {
    const groups = new Map<string, MissingGroup>()
    for (const m of missing.value) {
      const g = groups.get(m.lesson_id ?? "") ?? { lessonId: m.lesson_id ?? "", due: m.due_at, people: [] }
      g.people.push(m)
      groups.set(g.lessonId, g)
    }
    return [...groups.values()].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
  })
  const remindText = (g: MissingGroup) =>
    t(g.due ? "classPage.remindDue" : "classPage.remind", {
      lesson: lessonName(g.lessonId), due: formatDate(g.due), names: g.people.map(m => personName(m) || "?").join(", "),
    })
  const missingOf = (lessonId: string) => missingByLesson.value.find(g => g.lessonId === lessonId)
  const missingCount = (lessonId: string) => missingOf(lessonId)?.people.length ?? 0
  const remindAll = computed(() => missingByLesson.value.map(remindText).join("\n"))
  const lessonStats = (id: string) => {
    const r = lessonRows.value[id]
    return { done: r?.submitted ?? 0, accuracy: percentOf(r?.ok, r?.done), waiting: r?.waiting ?? 0, started: r?.started ?? 0 }
  }
  /** Other classes of the grade (not this one) that have the lesson. */
  const givenToOthers = (lessonId: string) => assignments.classesOf(lessonId).filter(c => c.id !== classId).map(c => c.name)
  /** Taking back is refused once any student has opened the lesson, even without submitting. */
  const canTakeBack = (lessonId: string) => lessonStats(lessonId).started === 0

  // ---- changing: one busy key per control; the outcome shows under that lesson ----
  const tell = (lessonId: string, text: string, ok = true) => { notice.value = { lessonId, text, ok } }
  /** Runs one change on a lesson with `key` marked busy; true when it went through. */
  async function act(lessonId: string, key: string, change: () => Promise<string | null>) {
    busy.value = key
    notice.value = null
    const e = await change()
    busy.value = null
    if (e) tell(lessonId, e, false)
    return !e
  }

  /** Gives the lesson with its settings; true when it is given afterwards (even if the chosen students failed to save). */
  async function give(lessonId: string, settings: GiveSettings) {
    const ok = await act(lessonId, lessonId, () => classLessons.give(lessonId, settings))
    const given = classLessons.settings.value.has(lessonId)
    if (given) {
      if (ok) tell(lessonId, t("classPage.setup.given", { lesson: lessonName(lessonId), name: cls.value?.name ?? "" }))
      reloadAssignments()
      loadMissing()
    }
    return given
  }

  async function takeBack(lessonId: string) {
    if (!arm(`back-${lessonId}`)) return
    if (!await act(lessonId, lessonId, () => classLessons.takeBack(lessonId))) return
    tell(lessonId, t("classPage.takenBack", { lesson: lessonName(lessonId) }))
    reloadAssignments()
    loadMissing()
  }

  async function setClosed(lessonId: string, close: boolean) {
    if (close && !arm(`close-${lessonId}`)) return
    let submitted = 0
    const ok = await act(lessonId, lessonId, async () => {
      const r = await classLessons.setClosed(lessonId, close)
      submitted = r.submitted
      return r.error
    })
    if (!ok) return
    tell(lessonId, close
      ? [t("classPage.closed"), submitted ? t("classPage.autoSubmitted", { n: submitted }) : "", t("classPage.closedReview")].filter(Boolean).join(" ")
      : t("classPage.reopened"))
    if (close && submitted) await loadStudents()
    loadMissing()
  }

  /** Results at submit, shuffle, who may work: one switch each. Who may work changes who still owes work. */
  async function setSetting(lessonId: string, key: "show" | "shuffle" | "who", patch: SettingPatch) {
    if (await act(lessonId, `${key}-${lessonId}`, () => classLessons.update(lessonId, patch)) && key === "who") loadMissing()
  }

  async function togglePick(lessonId: string, studentId: string) {
    if (await act(lessonId, `pick-${lessonId}-${studentId}`, () => classLessons.togglePick(lessonId, studentId))) loadMissing()
  }

  /** A new deadline (an ISO time) or none (null); a deadline already past is refused. True when it was saved. */
  async function saveDue(lessonId: string, due: string | null) {
    if (due && isPastDue(due)) {
      tell(lessonId, t("classPage.dueInPast"), false)
      return false
    }
    if (!await act(lessonId, `due-${lessonId}`, () => classLessons.update(lessonId, { due_at: due }))) return false
    loadMissing()
    tell(lessonId, due ? t("classPage.dueSet", { date: formatDate(due) }) : t("classPage.dueCleared"))
    return true
  }

  async function releaseAll(lessonId: string) {
    if (!arm(`release-${lessonId}`)) return
    let released = 0
    const ok = await act(lessonId, `release-${lessonId}`, async () => {
      const r = await classLessons.release(lessonId)
      released = r.released
      return r.error
    })
    if (!ok) return
    tell(lessonId, t("classPage.released", { n: released }))
    await loadStudents()
  }

  return {
    ...classLessons, assignments, students, lessonRows, missing, busy, notice, armed, load, loadStudents, loadMissing,
    lessonName, missingByLesson, missingOf, remindText, missingCount, remindAll, lessonStats, givenToOthers, canTakeBack,
    tell, give, takeBack, setClosed, setSetting, togglePick, saveDue, releaseAll,
  }
}
