import type { Tables } from "~/types/database.types"
import { personName } from "./accounts"

// Marks a teacher keeps for what happens in class (migration 58): attendance per session, +1 points for speaking up,
// and columns of marks 0-10 for oral checks ("kiểm tra bài cũ") and homework. This file only computes; the reads and
// writes are in classScoreStore.ts.

export type AttendanceStatus = Tables<"attendance">["status"]
export type ScoreKind = Tables<"score_columns">["kind"]
export type Term = 1 | 2

export const STATUSES: readonly AttendanceStatus[] = ["present", "late", "excused", "absent"]
export const KINDS: readonly ScoreKind[] = ["oral", "homework"]

/** Attendance starts at 10; an unexcused absence takes 1 off, being late half a point; excused absences cost nothing. */
export const ATTENDANCE_FULL = 10
export const ABSENT_COST = 1
export const LATE_COST = 0.5

/** The school year's first term runs from August to December, the second from January to July. */
export const termOf = (day: string | Date): Term => {
  const month = typeof day === "string" ? Number(day.slice(5, 7)) : day.getMonth() + 1
  return month >= 8 ? 1 : 2
}

/** Today as yyyy-mm-dd in the browser's time zone (what a date input holds). */
export const todayIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

export type StatusCounts = Record<AttendanceStatus, number>
export const emptyCounts = (): StatusCounts => ({ present: 0, late: 0, excused: 0, absent: 0 })

export function countStatuses(statuses: readonly AttendanceStatus[]): StatusCounts {
  const c = emptyCounts()
  for (const s of statuses) c[s]++
  return c
}

/** The attendance mark from how a student stood at each session; null before any session. */
export function attendanceScore(c: StatusCounts): number | null {
  if (c.present + c.late + c.excused + c.absent === 0) return null
  return Math.max(0, ATTENDANCE_FULL - c.absent * ABSENT_COST - c.late * LATE_COST)
}

/** Mean rounded to two decimals, or null for no marks. */
export const meanOf = (xs: readonly number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null

/** A mark typed by a teacher: a number 0-10 with at most two decimals ("8,5" works too), null for an empty box, NaN when invalid. */
export function parseScore(text: string): number | null {
  const s = text.trim().replace(",", ".")
  if (!s) return null
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return Number.NaN
  const n = Number(s)
  return n >= 0 && n <= 10 ? n : Number.NaN
}

/** How a 0-10 mark reads at a glance (the gradebook's bands, on a ten-point scale): 8 and over, 5 and over, below 5. */
export const scoreBand = (n: number | null): "good" | "mid" | "low" | "none" => (n === null ? "none" : n >= 8 ? "good" : n >= 5 ? "mid" : "low")

/** A mark as text ("8.5", "10"), a dash for none. */
export const scoreText = (n: number | null) => (n === null ? "-" : String(Number(n.toFixed(2))))

export type ScoreStudent = { user_id: string | null; full_name: string | null; username: string | null; email: string | null }
export type SessionRow = Pick<Tables<"class_sessions">, "id" | "held_on" | "term" | "note">
export type AttendanceRow = Pick<Tables<"attendance">, "session_id" | "student_id" | "status">
export type PointRow = Pick<Tables<"participation_points">, "id" | "student_id" | "points" | "note" | "created_at">
export type ColumnRow = Pick<Tables<"score_columns">, "id" | "kind" | "title" | "held_on" | "term">
export type EntryRow = Pick<Tables<"score_entries">, "column_id" | "student_id" | "score">

export interface ClassScoreData {
  sessions: SessionRow[]
  attendance: AttendanceRow[]
  points: PointRow[]
  columns: ColumnRow[]
  entries: EntryRow[]
}

export interface ClassScoreRow {
  userId: string
  name: string
  counts: StatusCounts
  attendance: number | null
  points: number
  /** Mean of each kind's columns that have a mark for this student. */
  averages: Record<ScoreKind, number | null>
  /** Mark per column id. */
  marks: Map<string, number>
}

const byDay = <T extends { held_on: string }>(a: T, b: T) => a.held_on.localeCompare(b.held_on)

/** Columns of one kind, oldest first. */
export const columnsOf = (columns: readonly ColumnRow[], kind: ScoreKind) => columns.filter(c => c.kind === kind).sort(byDay)

/** One row per student of the class, by name: attendance, points and the mean of each kind of marks. */
export function buildClassScores(students: readonly ScoreStudent[], data: ClassScoreData): ClassScoreRow[] {
  const sessionIds = new Set(data.sessions.map(s => s.id))
  const kindOf = new Map(data.columns.map(c => [c.id, c.kind]))
  return students
    .filter((s): s is ScoreStudent & { user_id: string } => !!s.user_id)
    .map((s): ClassScoreRow => {
      const counts = countStatuses(data.attendance.filter(a => a.student_id === s.user_id && sessionIds.has(a.session_id)).map(a => a.status))
      const mine = data.entries.filter(e => e.student_id === s.user_id && kindOf.has(e.column_id))
      const averages = Object.fromEntries(KINDS.map(k => [k, meanOf(mine.filter(e => kindOf.get(e.column_id) === k).map(e => Number(e.score)))])) as Record<ScoreKind, number | null>
      return {
        userId: s.user_id,
        name: personName(s),
        counts,
        attendance: attendanceScore(counts),
        points: data.points.filter(p => p.student_id === s.user_id).reduce((a, p) => a + p.points, 0),
        averages,
        marks: new Map(mine.map(e => [e.column_id, Number(e.score)])),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
}

/** A yyyy-mm-dd day as the reader's language writes it ("T6, 20/11/2026" / "Fri, 20/11/2026"). */
export const dayLabel = (d: string, lang: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(lang === "en" ? "en-GB" : "vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })
