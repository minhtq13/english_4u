import { fold } from "./text"

// Filtering and sorting the students of one class (a class is small, so its rows are loaded whole and handled
// in the browser; see ClassStudents). Pure, so the rules are tested without a page.

/** The columns of the student_progress view this needs. */
export interface StudentLike {
  full_name: string | null
  email: string | null
  username: string | null
  submitted: number | null
  waiting: number | null
  ok: number | null
  done: number | null
  last_activity: string | null
}

/** Who to show: with work waiting for a grade, with nothing submitted yet, or not active for IDLE_DAYS (or never). */
export type StudentStatus = "" | "waiting" | "none" | "idle"
/** The order: by name, lowest accuracy first, most recently active first, most work to grade first. */
export type StudentSort = "name" | "accuracy" | "activity" | "waiting"
export const IDLE_DAYS = 7

const nameOf = (s: StudentLike) => s.full_name || s.email || s.username || ""
const accuracyOf = (s: StudentLike) => (s.done ? (s.ok ?? 0) / s.done : null)
const activityOf = (s: StudentLike) => (s.last_activity ? Date.parse(s.last_activity) : null)
/** Compares numbers, a missing one always last. `dir` 1 puts small first, -1 large first. */
const nullsLast = (a: number | null, b: number | null, dir: 1 | -1) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : (a - b) * dir)

export function filterStudents<T extends StudentLike>(
  rows: readonly T[],
  f: { q: string; status: StudentStatus; sort: StudentSort },
  now = Date.now(),
): T[] {
  const term = fold(f.q.trim())
  const idleBefore = now - IDLE_DAYS * 864e5
  const shown = rows.filter(s =>
    (!term || fold(`${s.full_name ?? ""} ${s.username ?? ""} ${s.email ?? ""}`).includes(term))
    && (!f.status
      || (f.status === "waiting" && (s.waiting ?? 0) > 0)
      || (f.status === "none" && (s.submitted ?? 0) === 0)
      || (f.status === "idle" && (activityOf(s) ?? -Infinity) < idleBefore)))
  const byName = (a: T, b: T) => nameOf(a).localeCompare(nameOf(b), "vi")
  const compare: Record<StudentSort, (a: T, b: T) => number> = {
    name: byName,
    accuracy: (a, b) => nullsLast(accuracyOf(a), accuracyOf(b), 1),
    activity: (a, b) => nullsLast(activityOf(a), activityOf(b), -1),
    waiting: (a, b) => (b.waiting ?? 0) - (a.waiting ?? 0),
  }
  return [...shown].sort((a, b) => compare[f.sort](a, b) || byName(a, b))
}
