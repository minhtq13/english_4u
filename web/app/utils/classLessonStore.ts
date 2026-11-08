import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables } from "~/types/database.types"
import type { ClassLessonSetting } from "./attemptOutcome"
import type { GiveForm, GiveSettings } from "./classLesson"
import { accessOf, isClosed, type LessonAccess } from "./attemptOutcome"
import { formOf, limitOf } from "./classLesson"
import { isPastDue } from "./course"
import { tr } from "./i18n"
import { errorText } from "./serverErrors"

// Every read and write of the lessons given to classes (`class_lessons`) and of the students a lesson is open to
// (`class_lesson_students`). Teacher pages, the lesson editor and the student's pages all go through here, so the
// rules (what is written together, what the database refuses, how access is worked out) live in one place.
// The seam is the Supabase client: the app passes the real one, tests pass an in-memory stand-in.

export type Client = SupabaseClient<Database>
/** What a teacher changes on a given lesson with one switch or field (class_lessons). */
export type SettingPatch = Partial<Pick<ClassLessonSetting, "due_at" | "for_all" | "show_results" | "shuffle" | "time_limit_min">>
/** How a lesson stands in one class. */
export type ClassLessonState = "notGiven" | "open" | "closed"
/** An error message already in the current language, or null. */
export type Failure = string | null

const SETTING_COLUMNS = "show_results, for_all, closed, due_at, shuffle, time_limit_min"

export const failed = (e: { message: string } | null): Failure => (e ? tr("common.notChanged", { msg: errorText(e.message) }) : null)

const pickRows = (classId: string, lessonId: string, studentIds: string[]) =>
  studentIds.map(id => ({ class_id: classId, lesson_id: lessonId, student_id: id }))

// ---------------------------------------------------------------- writes

/**
 * Gives a lesson to a class: the class_lessons row, plus the chosen students when it is not for the whole class.
 * Settings left out take the database defaults. `given` is false when the lesson was not given at all;
 * a failure on the chosen students still leaves it given (to nobody yet).
 */
export async function giveLesson(client: Client, classId: string, lessonId: string, settings: Partial<GiveSettings> = {}, by?: string) {
  const { error } = await client.from("class_lessons").insert({
    class_id: classId, lesson_id: lessonId, unlocked_by: by,
    due_at: settings.dueAt, for_all: settings.forAll, show_results: settings.showResults, shuffle: settings.shuffle,
    time_limit_min: settings.timeLimit,
  })
  if (error) return { given: false, error: failed(error) }
  if (settings.forAll !== false || !settings.studentIds?.length) return { given: true, error: null }
  const { error: e } = await client.from("class_lesson_students").insert(pickRows(classId, lessonId, settings.studentIds))
  return { given: true, error: failed(e) }
}

/**
 * Takes a lesson back from a class; the database refuses once students have worked on it. Returns an error
 * message, or null. The deleted row is asked back: RLS deletes nothing, silently, for a class the user does not teach.
 */
export async function takeBackLesson(client: Client, classId: string, lessonId: string): Promise<Failure> {
  const { data, error } = await client.from("class_lessons").delete().eq("class_id", classId).eq("lesson_id", lessonId).select("lesson_id")
  if (error) return failed(error)
  return data?.length ? null : tr("classPage.takeBackNothing")
}

/** Changes settings of a lesson already given to a class. */
export async function updateSettings(client: Client, classId: string, lessonId: string, patch: SettingPatch): Promise<Failure> {
  const { error } = await client.from("class_lessons").update(patch).eq("class_id", classId).eq("lesson_id", lessonId)
  return failed(error)
}

/**
 * Brings a lesson already given to a class from `prev` to `next` (the form it was loaded as, and as edited):
 * only the class_lessons fields that differ are written, and the students it is open to are added or removed
 * while "chosen students" is on. Returns an error message, or null.
 */
export async function updateGivenLesson(client: Client, classId: string, lessonId: string, prev: GiveForm, next: GiveForm): Promise<Failure> {
  const patch: SettingPatch = {}
  if (prev.due !== next.due) patch.due_at = next.due ? new Date(next.due).toISOString() : null
  if (prev.forAll !== next.forAll) patch.for_all = next.forAll
  if (prev.showResults !== next.showResults) patch.show_results = next.showResults
  if (prev.shuffle !== next.shuffle) patch.shuffle = next.shuffle
  if (String(prev.limit).trim() !== String(next.limit).trim()) patch.time_limit_min = limitOf(next.limit)
  if (Object.keys(patch).length) {
    const e = await updateSettings(client, classId, lessonId, patch)
    if (e) return e
  }
  if (next.forAll) return null
  const add = next.studentIds.filter(id => !prev.studentIds.includes(id))
  const drop = prev.studentIds.filter(id => !next.studentIds.includes(id))
  if (add.length) {
    const { error } = await client.from("class_lesson_students").insert(pickRows(classId, lessonId, add))
    if (error) return failed(error)
  }
  if (drop.length) {
    const { error } = await client.from("class_lesson_students").delete().eq("class_id", classId).eq("lesson_id", lessonId).in("student_id", drop)
    if (error) return failed(error)
  }
  return null
}

/** Opens (`on`) or closes the lesson to one student of a class that is not given the lesson as a whole. */
export async function setStudentPicked(client: Client, classId: string, lessonId: string, studentId: string, on: boolean): Promise<Failure> {
  const { error } = on
    ? await client.from("class_lesson_students").insert({ class_id: classId, lesson_id: lessonId, student_id: studentId })
    : await client.from("class_lesson_students").delete().eq("class_id", classId).eq("lesson_id", lessonId).eq("student_id", studentId)
  return failed(error)
}

/** Closing submits the work in progress (`submitted` = how many); reopening is the same call the other way. */
export async function closeLesson(client: Client, classId: string, lessonId: string, close: boolean) {
  const { data, error } = await client.rpc("close_class_lesson", { target_class: classId, target_lesson: lessonId, close_it: close })
  return { error: failed(error), submitted: data ?? 0 }
}

/** Marks every submitted attempt of the lesson in the class graded (`released` = how many). */
export async function releaseResults(client: Client, classId: string, lessonId: string) {
  const { data, error } = await client.rpc("release_class_results", { target_class: classId, target_lesson: lessonId })
  return { error: failed(error), released: data ?? 0 }
}

/** The deadline kept when a lesson is reopened: a deadline already passed is dropped. */
export const dueAfterReopen = (due: string | null | undefined) => (isPastDue(due) ? null : (due ?? null))

// ---------------------------------------------------------------- reads, for a teacher

/** Lessons given to one class → their settings, and for lessons not open to the whole class, who they are open to. */
export async function lessonsOfClass(client: Client, classId: string) {
  const [s, p] = await Promise.all([
    client.from("class_lessons").select(`lesson_id, ${SETTING_COLUMNS}`).eq("class_id", classId),
    client.from("class_lesson_students").select("lesson_id, student_id").eq("class_id", classId),
  ])
  if (s.error) throw s.error
  const settings = new Map<string, ClassLessonSetting>((s.data ?? []).map(({ lesson_id, ...setting }) => [lesson_id, setting]))
  const picks = new Map<string, Set<string>>()
  for (const r of p.data ?? []) picks.set(r.lesson_id, new Set([...(picks.get(r.lesson_id) ?? []), r.student_id]))
  return { settings, picks }
}

/** One lesson in several classes: each class that has it → its settings as a form, and whether it is closed. */
export async function givenInClasses(client: Client, lessonId: string, classIds: string[]) {
  const out = new Map<string, { form: GiveForm; locked: boolean }>()
  if (!classIds.length) return out
  const [rows, picks] = await Promise.all([
    client.from("class_lessons").select("class_id, due_at, for_all, show_results, shuffle, closed, time_limit_min").eq("lesson_id", lessonId).in("class_id", classIds),
    client.from("class_lesson_students").select("class_id, student_id").eq("lesson_id", lessonId).in("class_id", classIds),
  ])
  for (const r of rows.data ?? []) {
    const ids = (picks.data ?? []).filter(p => p.class_id === r.class_id).map(p => p.student_id)
    out.set(r.class_id, { form: formOf(r, ids), locked: isClosed(r) })
  }
  return out
}

/** Which (class, lesson) pairs are given among `classIds`, optionally only for `lessonIds`. */
export async function givenPairs(client: Client, classIds: string[], lessonIds?: string[]) {
  if (!classIds.length) return [] as Pick<Tables<"class_lessons">, "class_id" | "lesson_id">[]
  let q = client.from("class_lessons").select("class_id, lesson_id").in("class_id", classIds)
  if (lessonIds) q = q.in("lesson_id", lessonIds)
  return (await q).data ?? []
}

/** Who may work on one lesson of a class: everyone, or only `pickedIds`. Failures are reported in `error`. */
export async function whoMayWork(client: Client, classId: string, lessonId: string) {
  const [cl, pk] = await Promise.all([
    client.from("class_lessons").select("for_all").eq("class_id", classId).eq("lesson_id", lessonId).maybeSingle(),
    client.from("class_lesson_students").select("student_id").eq("class_id", classId).eq("lesson_id", lessonId),
  ])
  return {
    forAll: cl.data?.for_all ?? true,
    pickedIds: new Set((pk.data ?? []).map(r => r.student_id)),
    error: cl.error ?? pk.error,
  }
}

// ---------------------------------------------------------------- reads, for a student

/** The lessons given to the student's class and the ones they were picked for. Access is `accessOf(setting, picked.has(id))`. */
export async function lessonsForStudent(client: Client, classId: string, studentId: string) {
  const [s, p] = await Promise.all([
    client.from("class_lessons").select(`lesson_id, ${SETTING_COLUMNS}`).eq("class_id", classId),
    client.from("class_lesson_students").select("lesson_id").eq("class_id", classId).eq("student_id", studentId),
  ])
  if (s.error) throw s.error
  return {
    settings: new Map<string, ClassLessonSetting>((s.data ?? []).map(({ lesson_id, ...setting }) => [lesson_id, setting])),
    picked: new Set((p.data ?? []).map(r => r.lesson_id)),
  }
}

/** One lesson as a student of `classId` meets it: how they may use it, its deadline and whether it is shuffled. */
export async function lessonForStudent(client: Client, classId: string, lessonId: string, studentId: string) {
  const [cl, mine] = await Promise.all([
    client.from("class_lessons").select("for_all, closed, due_at, shuffle, time_limit_min").eq("class_id", classId).eq("lesson_id", lessonId).maybeSingle(),
    client.from("class_lesson_students").select("lesson_id").eq("class_id", classId).eq("lesson_id", lessonId).eq("student_id", studentId).maybeSingle(),
  ])
  const access: LessonAccess = cl.data ? accessOf(cl.data, !!mine.data) : "locked"
  return { access, dueAt: cl.data?.due_at ?? null, shuffle: !!cl.data?.shuffle, timeLimit: cl.data?.time_limit_min ?? null }
}

/** The lessons of a class whose results students see at once, as soon as they submit. */
export async function lessonsShowingResults(client: Client, classId: string) {
  const { data } = await client.from("class_lessons").select("lesson_id").eq("class_id", classId).eq("show_results", true)
  return new Set((data ?? []).map(r => r.lesson_id))
}
