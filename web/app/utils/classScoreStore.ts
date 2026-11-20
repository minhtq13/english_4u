import type { Client, Failure } from "./classLessonStore"
import type { AttendanceStatus, ClassScoreData, ColumnRow, PointRow, ScoreKind, SessionRow, Term } from "./classScores"
import { tr } from "./i18n"
import { errorText } from "./serverErrors"

// Class marks (class_sessions, attendance, participation_points, score_columns, score_entries): every read and write
// goes through here, never a `from(...)` of these tables in a page. RLS decides who may: the class's teachers and
// admins write, a student reads only their own rows, so the student reads below need no class filter of their own.
// One class's marks in one term are small, so they load whole.

const failed = (e: { message: string } | null): Failure => (e ? tr("common.notSaved", { msg: errorText(e.message) }) : null)
const thrown = (e: { message: string }) => new Error(errorText(e.message))

const SESSION_COLS = "id, held_on, term, note"
const COLUMN_COLS = "id, kind, title, held_on, term"
const POINT_COLS = "id, student_id, points, note, created_at"

/** Everything one class has in one term. */
export async function loadClassScores(client: Client, classId: string, term: Term): Promise<ClassScoreData> {
  const [s, p, c] = await Promise.all([
    client.from("class_sessions").select(SESSION_COLS).eq("class_id", classId).eq("term", term).order("held_on"),
    client.from("participation_points").select(POINT_COLS).eq("class_id", classId).eq("term", term).order("created_at"),
    client.from("score_columns").select(COLUMN_COLS).eq("class_id", classId).eq("term", term).order("held_on"),
  ])
  for (const r of [s, p, c]) if (r.error) throw thrown(r.error)
  const sessions = (s.data ?? []) as SessionRow[]
  const columns = (c.data ?? []) as ColumnRow[]
  const [a, e] = await Promise.all([
    sessions.length ? client.from("attendance").select("session_id, student_id, status").in("session_id", sessions.map(x => x.id)) : null,
    columns.length ? client.from("score_entries").select("column_id, student_id, score").in("column_id", columns.map(x => x.id)) : null,
  ])
  for (const r of [a, e]) if (r?.error) throw thrown(r.error)
  return {
    sessions,
    attendance: (a?.data ?? []) as ClassScoreData["attendance"],
    points: (p.data ?? []) as PointRow[],
    columns,
    entries: (e?.data ?? []) as ClassScoreData["entries"],
  }
}

/** The signed-in student's own marks in one term (RLS limits every read to their class and their rows). */
export async function loadMyScores(client: Client, userId: string, term: Term): Promise<ClassScoreData> {
  const [s, p, c, a, e] = await Promise.all([
    client.from("class_sessions").select(SESSION_COLS).eq("term", term).order("held_on"),
    client.from("participation_points").select(POINT_COLS).eq("student_id", userId).eq("term", term).order("created_at"),
    client.from("score_columns").select(COLUMN_COLS).eq("term", term).order("held_on"),
    client.from("attendance").select("session_id, student_id, status").eq("student_id", userId),
    client.from("score_entries").select("column_id, student_id, score").eq("student_id", userId),
  ])
  for (const r of [s, p, c, a, e]) if (r.error) throw thrown(r.error)
  return {
    sessions: (s.data ?? []) as SessionRow[],
    attendance: (a.data ?? []) as ClassScoreData["attendance"],
    points: (p.data ?? []) as PointRow[],
    columns: (c.data ?? []) as ColumnRow[],
    entries: (e.data ?? []) as ClassScoreData["entries"],
  }
}

// ---------------------------------------------------------------- attendance

/** Saves a session (new, or the one already on that day) and how every listed student stood at it. */
export async function saveAttendance(
  client: Client,
  classId: string,
  day: string,
  term: Term,
  marks: readonly { student_id: string; status: AttendanceStatus }[],
): Promise<{ session: SessionRow | null; error: Failure }> {
  const found = await client.from("class_sessions").select(SESSION_COLS).eq("class_id", classId).eq("held_on", day).maybeSingle()
  if (found.error) return { session: null, error: failed(found.error) }
  let session = found.data as SessionRow | null
  if (!session) {
    const made = await client.from("class_sessions").insert({ class_id: classId, held_on: day, term }).select(SESSION_COLS).maybeSingle()
    if (made.error) return { session: null, error: failed(made.error) }
    session = made.data as SessionRow | null
    if (!session) return { session: null, error: tr("classScores.saveNothing") }
  }
  if (marks.length) {
    const rows = marks.map(m => ({ session_id: session!.id, student_id: m.student_id, status: m.status }))
    const { error } = await client.from("attendance").upsert(rows, { onConflict: "session_id,student_id" })
    if (error) return { session, error: failed(error) }
  }
  return { session, error: null }
}

/** Deletes a session and its attendance (the deleted row is asked back: RLS refuses by deleting nothing). */
export async function deleteSession(client: Client, id: string): Promise<Failure> {
  const { data, error } = await client.from("class_sessions").delete().eq("id", id).select("id")
  if (error) return failed(error)
  return data?.length ? null : tr("classScores.deleteNothing")
}

// ---------------------------------------------------------------- points

/** One award for speaking up; returns the stored row so it can be undone. */
export async function addPoint(
  client: Client,
  classId: string,
  studentId: string,
  term: Term,
  note = "",
): Promise<{ row: PointRow | null; error: Failure }> {
  const { data, error } = await client
    .from("participation_points")
    .insert({ class_id: classId, student_id: studentId, term, note: note.trim() || null })
    .select(POINT_COLS)
    .maybeSingle()
  if (error) return { row: null, error: failed(error) }
  return data ? { row: data as PointRow, error: null } : { row: null, error: tr("classScores.saveNothing") }
}

/** Takes an award back. */
export async function undoPoint(client: Client, id: string): Promise<Failure> {
  const { data, error } = await client.from("participation_points").delete().eq("id", id).select("id")
  if (error) return failed(error)
  return data?.length ? null : tr("classScores.deleteNothing")
}

// ---------------------------------------------------------------- score columns

export interface ColumnForm { kind: ScoreKind; title: string; held_on: string; term: Term }

/** Why a column cannot be saved, or null. */
export const columnProblem = (f: ColumnForm): Failure =>
  !f.title.trim() ? tr("classScores.needTitle") : f.title.trim().length > 80 ? tr("classScores.titleTooLong") : !f.held_on ? tr("classScores.needDay") : null

export async function createColumn(client: Client, classId: string, f: ColumnForm): Promise<{ row: ColumnRow | null; error: Failure }> {
  const problem = columnProblem(f)
  if (problem) return { row: null, error: problem }
  const { data, error } = await client
    .from("score_columns")
    .insert({ class_id: classId, kind: f.kind, title: f.title.trim(), held_on: f.held_on, term: f.term })
    .select(COLUMN_COLS)
    .maybeSingle()
  if (error) return { row: null, error: failed(error) }
  return data ? { row: data as ColumnRow, error: null } : { row: null, error: tr("classScores.saveNothing") }
}

export async function updateColumn(client: Client, id: string, f: ColumnForm): Promise<Failure> {
  const problem = columnProblem(f)
  if (problem) return problem
  const { data, error } = await client
    .from("score_columns")
    .update({ title: f.title.trim(), held_on: f.held_on, term: f.term })
    .eq("id", id)
    .select("id")
  if (error) return failed(error)
  return data?.length ? null : tr("classScores.saveNothing")
}

export async function deleteColumn(client: Client, id: string): Promise<Failure> {
  const { data, error } = await client.from("score_columns").delete().eq("id", id).select("id")
  if (error) return failed(error)
  return data?.length ? null : tr("classScores.deleteNothing")
}

/** Saves a column's marks: a number is stored, null clears that student's mark. */
export async function saveEntries(client: Client, columnId: string, marks: ReadonlyMap<string, number | null>): Promise<Failure> {
  const set = [...marks].filter((m): m is [string, number] => m[1] !== null).map(([student_id, score]) => ({ column_id: columnId, student_id, score }))
  const cleared = [...marks].filter(m => m[1] === null).map(([id]) => id)
  if (set.length) {
    const { error } = await client.from("score_entries").upsert(set, { onConflict: "column_id,student_id" })
    if (error) return failed(error)
  }
  if (cleared.length) {
    const { error } = await client.from("score_entries").delete().eq("column_id", columnId).in("student_id", cleared)
    if (error) return failed(error)
  }
  return null
}
