import type { Database } from "~/types/database.types"
import type { ClassLessonSetting } from "~/utils/attemptOutcome"
import type { GiveForm, GiveSettings } from "~/utils/classLesson"
import { isClosed } from "~/utils/attemptOutcome"
import { isPastDue } from "~/utils/course"
import { tr } from "~/utils/i18n"
import { errorText } from "~/utils/serverErrors"

type Client = ReturnType<typeof useSupabaseClient<Database>>
/** What a teacher changes on a given lesson with one switch or field (class_lessons). */
export type SettingPatch = Partial<Pick<ClassLessonSetting, "due_at" | "for_all" | "show_results" | "shuffle">>
/** How a lesson stands in one class. */
export type ClassLessonState = "notGiven" | "open" | "closed"

const failed = (e: { message: string } | null) => (e ? tr("common.notChanged", { msg: errorText(e.message) }) : null)

/**
 * Gives a lesson to a class: the class_lessons row, plus the chosen students when it is not for the whole class.
 * Settings left out take the database defaults. `given` is false when the lesson was not given at all;
 * a failure on the chosen students still leaves it given (to nobody yet).
 */
export async function giveLesson(client: Client, classId: string, lessonId: string, settings: Partial<GiveSettings> = {}, by?: string) {
  const { error } = await client.from("class_lessons").insert({
    class_id: classId, lesson_id: lessonId, unlocked_by: by,
    due_at: settings.dueAt, for_all: settings.forAll, show_results: settings.showResults, shuffle: settings.shuffle,
  })
  if (error) return { given: false, error: failed(error) }
  if (settings.forAll !== false || !settings.studentIds?.length) return { given: true, error: null }
  const { error: e } = await client.from("class_lesson_students")
    .insert(settings.studentIds.map(id => ({ class_id: classId, lesson_id: lessonId, student_id: id })))
  return { given: true, error: failed(e) }
}

/**
 * Takes a lesson back from a class; the database refuses once students have worked on it. Returns an error
 * message, or null. The deleted row is asked back: RLS deletes nothing, silently, for a class the user does not teach.
 */
export async function takeBackLesson(client: Client, classId: string, lessonId: string) {
  const { data, error } = await client.from("class_lessons").delete().eq("class_id", classId).eq("lesson_id", lessonId).select("lesson_id")
  if (error) return failed(error)
  return data?.length ? null : tr("classPage.takeBackNothing")
}

/**
 * Brings a lesson already given to a class from `prev` to `next` (the form it was loaded as, and as edited):
 * only the class_lessons fields that differ are written, and the students it is open to are added or removed
 * while "chosen students" is on. Returns an error message, or null.
 */
export async function updateGivenLesson(client: Client, classId: string, lessonId: string, prev: GiveForm, next: GiveForm) {
  const patch: SettingPatch = {}
  if (prev.due !== next.due) patch.due_at = next.due ? new Date(next.due).toISOString() : null
  if (prev.forAll !== next.forAll) patch.for_all = next.forAll
  if (prev.showResults !== next.showResults) patch.show_results = next.showResults
  if (prev.shuffle !== next.shuffle) patch.shuffle = next.shuffle
  if (Object.keys(patch).length) {
    const { error } = await client.from("class_lessons").update(patch).eq("class_id", classId).eq("lesson_id", lessonId)
    if (error) return failed(error)
  }
  if (next.forAll) return null
  const add = next.studentIds.filter(id => !prev.studentIds.includes(id))
  const drop = prev.studentIds.filter(id => !next.studentIds.includes(id))
  if (add.length) {
    const { error } = await client.from("class_lesson_students").insert(add.map(id => ({ class_id: classId, lesson_id: lessonId, student_id: id })))
    if (error) return failed(error)
  }
  if (drop.length) {
    const { error } = await client.from("class_lesson_students").delete().eq("class_id", classId).eq("lesson_id", lessonId).in("student_id", drop)
    if (error) return failed(error)
  }
  return null
}

/**
 * The lessons given to one class and how students may work on them: read, give, take back, close/reopen,
 * deadline, who may work, results at submit, shuffle, release results. RLS limits writes to the class's
 * teachers (and admins). Every action returns an error message (already in the current language) or null,
 * and keeps `settings` / `picks` in step with the database.
 */
export function useClassLessons(classId: string) {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  /** Lessons given to the class → their settings. */
  const settings = shallowRef(new Map<string, ClassLessonSetting>())
  /** For lessons not open to the whole class: the students it is open to. */
  const picks = shallowRef(new Map<string, Set<string>>())

  const patch = (lessonId: string, p: Partial<ClassLessonSetting>) => {
    settings.value = new Map(settings.value).set(lessonId, { ...settings.value.get(lessonId)!, ...p })
  }

  async function load() {
    const [s, p] = await Promise.all([
      client.from("class_lessons").select("lesson_id, show_results, for_all, closed, due_at, shuffle").eq("class_id", classId),
      client.from("class_lesson_students").select("lesson_id, student_id").eq("class_id", classId),
    ])
    if (s.error) throw s.error
    settings.value = new Map((s.data ?? []).map(({ lesson_id, ...setting }) => [lesson_id, setting]))
    const m = new Map<string, Set<string>>()
    for (const r of p.data ?? []) m.set(r.lesson_id, new Set([...(m.get(r.lesson_id) ?? []), r.student_id]))
    picks.value = m
  }

  const stateOf = (lessonId: string): ClassLessonState => {
    const s = settings.value.get(lessonId)
    return !s ? "notGiven" : isClosed(s) ? "closed" : "open"
  }

  async function give(lessonId: string, s: GiveSettings) {
    const { given, error } = await giveLesson(client, classId, lessonId, s, user.value?.sub)
    if (given) {
      settings.value = new Map(settings.value).set(lessonId, {
        show_results: s.showResults, for_all: s.forAll, closed: false, due_at: s.dueAt, shuffle: s.shuffle,
      })
      if (!s.forAll && !error) picks.value = new Map(picks.value).set(lessonId, new Set(s.studentIds))
    }
    return error
  }

  async function takeBack(lessonId: string) {
    const error = await takeBackLesson(client, classId, lessonId)
    if (!error) {
      const next = new Map(settings.value)
      next.delete(lessonId)
      settings.value = next
    }
    return error
  }

  async function update(lessonId: string, p: SettingPatch) {
    const { error } = await client.from("class_lessons").update(p).eq("class_id", classId).eq("lesson_id", lessonId)
    if (!error) patch(lessonId, p)
    return failed(error)
  }

  /** Closing submits the work in progress (`submitted` = how many); reopening drops a deadline already passed. */
  async function setClosed(lessonId: string, close: boolean) {
    const { data, error } = await client.rpc("close_class_lesson", { target_class: classId, target_lesson: lessonId, close_it: close })
    if (!error) {
      const due = settings.value.get(lessonId)?.due_at
      patch(lessonId, close ? { closed: true } : { closed: false, due_at: isPastDue(due) ? null : due })
    }
    return { error: failed(error), submitted: data ?? 0 }
  }

  async function togglePick(lessonId: string, studentId: string) {
    const set = new Set(picks.value.get(lessonId) ?? [])
    const on = set.has(studentId)
    const { error } = on
      ? await client.from("class_lesson_students").delete().eq("class_id", classId).eq("lesson_id", lessonId).eq("student_id", studentId)
      : await client.from("class_lesson_students").insert({ class_id: classId, lesson_id: lessonId, student_id: studentId })
    if (!error) {
      if (on) set.delete(studentId)
      else set.add(studentId)
      picks.value = new Map(picks.value).set(lessonId, set)
    }
    return failed(error)
  }

  /** Marks every submitted attempt of the lesson in the class graded (`released` = how many). */
  async function release(lessonId: string) {
    const { data, error } = await client.rpc("release_class_results", { target_class: classId, target_lesson: lessonId })
    return { error: failed(error), released: data ?? 0 }
  }

  return { settings, picks, load, stateOf, give, takeBack, update, setClosed, togglePick, release }
}
