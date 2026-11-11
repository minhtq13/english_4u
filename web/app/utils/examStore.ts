import type { Database, Json, Tables } from "~/types/database.types"
import type { Client, Failure } from "./classLessonStore"
import { cleanHints, emptyInfo, type ExamDraft, type SheetAt } from "./examDraft"
import { SHUFFLE_MODES, parseCodes, type ExamQuestion } from "./examGenerator"
import { tr } from "./i18n"
import { errorText } from "./serverErrors"

// Saved exam sets (exam_sets): one row per exam set. Every read and write goes through here, never a
// `from("exam_sets")` in a page. RLS decides who sees what (a teacher their own sets, an admin all of them), so these
// functions never filter by owner. The questions are stored as a snapshot, answers and passages included.

export type ExamRow = Tables<"exam_sets">
type ExamInsert = Database["public"]["Tables"]["exam_sets"]["Insert"]

/** One person an exam set is shared with, and whether they may change it. */
export interface ShareRow { user_id: string; can_edit: boolean }
/** An exam set as read for one person: the shares they can see come along (all for the owner, only their own for others). */
export type ExamSetRead = ExamRow & { exam_set_shares: ShareRow[] }

/**
 * What the list shows: no questions, only how many there are. The owner is embedded through its own foreign key: since
 * the shares table links exam sets to profiles a second way (exam_set_shares.user_id), a bare `profiles(...)` is ambiguous.
 */
export const LIST_COLUMNS =
  "id, title, course_id, minutes, codes, mode, question_count, owner_id, created_at, updated_at, profiles!exam_sets_owner_id_fkey(full_name, username, email), exam_set_shares(user_id, can_edit)"
export const MAX_QUESTIONS = 300
const MAX_CODES_LENGTH = 400

const failed = (e: { message: string } | null): Failure => (e ? tr("common.notSaved", { msg: errorText(e.message) }) : null)

/** The row an exam draft is stored as (the owner is the database's default: the signed-in person). */
export function rowOf(d: ExamDraft): ExamInsert {
  return {
    title: d.info.title.trim(),
    course_id: d.info.courseId || null,
    school: d.info.school.trim(),
    department: d.info.department.trim(),
    school_year: d.info.schoolYear.trim(),
    term: d.info.term.trim(),
    minutes: Math.min(600, Math.max(1, Math.floor(Number(d.info.minutes) || 0))),
    codes: d.codesText.trim(),
    mode: d.mode,
    sheet_at: d.sheetAt,
    questions: d.questions as unknown as Json,
    part_hints: cleanHints(d.partHints) as Json,
  }
}

/** The draft a stored row opens as. */
export function draftOf(row: Pick<ExamRow, "id" | "title" | "course_id" | "school" | "department" | "school_year" | "term" | "minutes" | "codes" | "mode" | "sheet_at" | "questions"> & { part_hints?: Json }): ExamDraft {
  return {
    examId: row.id,
    info: { ...emptyInfo(), title: row.title, courseId: row.course_id ?? "", school: row.school, department: row.department, schoolYear: row.school_year, term: row.term, minutes: row.minutes },
    questions: Array.isArray(row.questions) ? (row.questions as unknown as ExamQuestion[]) : [],
    codesText: row.codes,
    mode: (SHUFFLE_MODES as readonly string[]).includes(row.mode) ? (row.mode as ExamDraft["mode"]) : "all",
    sheetAt: (["top", "bottom", "none"] as const).includes(row.sheet_at as SheetAt) ? (row.sheet_at as SheetAt) : "top",
    partHints: cleanHints(row.part_hints),
  }
}

/** Text that changes whenever something that is stored changes: compares the form with what was saved last. */
export const snapshotOf = (d: ExamDraft) => JSON.stringify(rowOf(d))

/** Why a draft cannot be saved, in the current language, or null. */
export function saveProblem(d: ExamDraft): Failure {
  if (!d.info.title.trim()) return tr("examPage.needTitle")
  if (d.questions.length > MAX_QUESTIONS) return tr("examPage.tooManyQuestions", { n: MAX_QUESTIONS })
  if (d.codesText.trim().length > MAX_CODES_LENGTH) return tr("examPage.tooManyCodes")
  return null
}

/** One exam set with its questions, or null when it does not exist (or the reader may not see it). */
export async function getExamSet(client: Client, id: string): Promise<ExamSetRead | null> {
  const { data, error } = await client.from("exam_sets").select("*, exam_set_shares(user_id, can_edit)").eq("id", id).maybeSingle()
  if (error) throw new Error(errorText(error.message))
  return data as ExamSetRead | null
}

/** Saves a new exam set; returns its id, or the reason it could not be saved. */
export async function createExamSet(client: Client, draft: ExamDraft): Promise<{ id: string | null; error: Failure }> {
  const problem = saveProblem(draft)
  if (problem) return { id: null, error: problem }
  const { data, error } = await client.from("exam_sets").insert(rowOf(draft)).select("id").maybeSingle()
  if (error) return { id: null, error: failed(error) }
  return data ? { id: data.id, error: null } : { id: null, error: tr("examPage.saveNothing") }
}

/** Saves changes of an exam set. The changed row is asked back, because RLS refuses by changing nothing. */
export async function updateExamSet(client: Client, id: string, draft: ExamDraft): Promise<Failure> {
  const problem = saveProblem(draft)
  if (problem) return problem
  const { data, error } = await client.from("exam_sets").update(rowOf(draft)).eq("id", id).select("id")
  if (error) return failed(error)
  return data?.length ? null : tr("examPage.saveNothing")
}

/** Deletes an exam set (the deleted row is asked back, as for updates). */
export async function deleteExamSet(client: Client, id: string): Promise<Failure> {
  const { data, error } = await client.from("exam_sets").delete().eq("id", id).select("id")
  if (error) return failed(error)
  return data?.length ? null : tr("examPage.deleteNothing")
}

/** How many exam codes a stored set has. */
export const codeCountOf = (codes: string) => parseCodes(codes).length

// ---------------------------------------------------------------- who may do what

/** manage: change, share and delete it (its owner, or an admin); edit: change it; view: open, print and export it only. */
export type ExamAccess = "manage" | "edit" | "view"

/** What the signed-in person may do with a set, from its owner and the shares they can see. */
export function examAccess(set: { owner_id: string; exam_set_shares?: ShareRow[] | null }, meId: string | undefined, isAdmin: boolean): ExamAccess {
  if (isAdmin || (!!meId && set.owner_id === meId)) return "manage"
  return set.exam_set_shares?.some(s => s.user_id === meId && s.can_edit) ? "edit" : "view"
}

/** The title of a copy: the original's, marked as a copy (within the title length the database allows). */
export function copyTitle(title: string) {
  const mark = ` (${tr("examList.copySuffix")})`
  return title.slice(0, 200 - mark.length) + mark
}

/** A copy of a set for the signed-in person, who owns it: the way for someone who may only view a set to change it. */
export async function copyExamSet(client: Client, id: string): Promise<{ id: string | null; error: Failure }> {
  let row: ExamSetRead | null
  try {
    row = await getExamSet(client, id)
  } catch (e) {
    return { id: null, error: (e as Error).message }
  }
  if (!row) return { id: null, error: tr("examPage.missing") }
  const draft = draftOf(row)
  return createExamSet(client, { ...draft, examId: null, info: { ...draft.info, title: copyTitle(draft.info.title) } })
}

// ---------------------------------------------------------------- sharing

/** A teacher or admin, as the staff directory lists them. */
export interface Person { id: string; full_name: string | null; username: string | null; role: "student" | "teacher" | "admin" }

/** Active teachers and admins other than the caller whose name or username contains `term` (all of them for a blank term). */
export async function searchStaff(client: Client, term: string): Promise<Person[]> {
  const { data, error } = await client.rpc("staff_directory", { term })
  if (error) throw new Error(errorText(error.message))
  return data ?? []
}

/** These teachers and admins by id (to name the owner of a shared set, or the people a set is shared with). */
export async function staffByIds(client: Client, ids: string[]): Promise<Person[]> {
  if (!ids.length) return []
  const { data, error } = await client.rpc("staff_directory", { ids })
  if (error) throw new Error(errorText(error.message))
  return data ?? []
}

/** Who a set is shared with. */
export async function listShares(client: Client, examId: string): Promise<ShareRow[]> {
  const { data, error } = await client.from("exam_set_shares").select("user_id, can_edit, created_at").eq("exam_id", examId).order("created_at")
  if (error) throw new Error(errorText(error.message))
  return data ?? []
}

/** Shares a set with a teacher or admin (the database refuses anyone else, and sharing with yourself). */
export async function addShare(client: Client, examId: string, userId: string, canEdit: boolean): Promise<Failure> {
  const { error } = await client.from("exam_set_shares").insert({ exam_id: examId, user_id: userId, can_edit: canEdit })
  return error ? tr("examShare.addFailed", { msg: errorText(error.message) }) : null
}

/** Lets a person the set is shared with change it (or only view it). The changed row is asked back, as RLS refuses by changing nothing. */
export async function setShareEdit(client: Client, examId: string, userId: string, canEdit: boolean): Promise<Failure> {
  const { data, error } = await client.from("exam_set_shares").update({ can_edit: canEdit }).eq("exam_id", examId).eq("user_id", userId).select("user_id")
  if (error) return failed(error)
  return data?.length ? null : tr("examShare.gone")
}

/** Stops sharing a set with a person (the owner), or drops a share for yourself (the person it was shared with). */
export async function removeShare(client: Client, examId: string, userId: string): Promise<Failure> {
  const { data, error } = await client.from("exam_set_shares").delete().eq("exam_id", examId).eq("user_id", userId).select("user_id")
  if (error) return failed(error)
  return data?.length ? null : tr("examShare.gone")
}
