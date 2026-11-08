import type { Tables } from "~/types/database.types"
import { personName } from "./accounts"
import { percentOf, toScore } from "./attemptOutcome"

// The class gradebook: one row per student, one column per lesson given to the class. A teacher reads every
// attempt of their class (RLS), so a cell shows the score as soon as the work is submitted.

export type GradeAttempt = Pick<Tables<"attempts">, "id" | "user_id" | "lesson_id" | "status" | "score">
export interface GradeStudent { user_id: string | null; full_name: string | null; username: string | null; email: string | null }
export interface GradeLesson { id: string; label: string; title: string; total: number }

export type CellState = "none" | "working" | "waiting" | "graded"
export interface GradeCell {
  state: CellState
  attemptId: string | null
  ok: number
  /** Percent of the lesson's questions answered correctly; null until the work is submitted. */
  percent: number | null
}
export interface GradeRow { userId: string; name: string; cells: GradeCell[]; average: number | null }
export interface Gradebook { lessons: GradeLesson[]; rows: GradeRow[]; averages: (number | null)[] }

const EMPTY: GradeCell = { state: "none", attemptId: null, ok: 0, percent: null }

const mean = (xs: readonly number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

export function buildGradebook(students: readonly GradeStudent[], lessons: readonly GradeLesson[], attempts: readonly GradeAttempt[]): Gradebook {
  const byKey = new Map(attempts.map(a => [`${a.user_id}|${a.lesson_id}`, a]))
  const rows = students.filter(s => s.user_id).map((s): GradeRow => {
    const cells = lessons.map((l): GradeCell => {
      const a = byKey.get(`${s.user_id}|${l.id}`)
      if (!a) return EMPTY
      if (a.status === "in_progress") return { state: "working", attemptId: a.id, ok: 0, percent: null }
      const ok = toScore(a.score).ok
      return { state: a.status === "graded" ? "graded" : "waiting", attemptId: a.id, ok, percent: percentOf(ok, l.total) }
    })
    return { userId: s.user_id!, name: personName(s) || "?", cells, average: mean(cells.flatMap(c => (c.percent === null ? [] : [c.percent]))) }
  })
  rows.sort((a, b) => a.name.localeCompare(b.name, "vi"))
  const averages = lessons.map((_, i) => mean(rows.flatMap(r => (r.cells[i]!.percent === null ? [] : [r.cells[i]!.percent!]))))
  return { lessons: [...lessons], rows, averages }
}

/** A colour band for a percentage: used for cell backgrounds and read by tests. */
export const bandOf = (percent: number | null): "good" | "mid" | "low" | "none" =>
  percent === null ? "none" : percent >= 80 ? "good" : percent >= 50 ? "mid" : "low"
