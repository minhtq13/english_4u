import type { Tables } from "~/types/database.types"

// Where each student of a class stands with one lesson given to it. A class is small, so the page loads the
// students and their attempts at that lesson whole and works out the rest here (pure, so it is tested alone).

/** Work waiting for a grade first, then who is still working, who has not started, who is done, who was not given the lesson. */
export const LESSON_STATES = ["waiting", "inProgress", "notStarted", "graded", "locked"] as const
export type LessonState = (typeof LESSON_STATES)[number]

export interface PersonLike {
  user_id: string | null
  full_name: string | null
  username: string | null
  email: string | null
}
export type AttemptLike = Pick<Tables<"attempts">, "id" | "user_id" | "status" | "score" | "submitted_at" | "updated_at">

export interface StudentLesson<S, A> {
  student: S
  attempt: A | null
  state: LessonState
}

const nameOf = (s: PersonLike) => s.full_name || s.email || s.username || ""

/**
 * One row per student. An attempt decides the state whenever there is one (even for a student no longer on the list
 * of who may work); without one, a student the lesson is not open to is "locked", the others have not started.
 * Rows come ordered by LESSON_STATES, then by name.
 */
export function lessonStates<S extends PersonLike, A extends AttemptLike>(
  students: readonly S[],
  attempts: readonly A[],
  access: { forAll: boolean; pickedIds?: ReadonlySet<string> },
): StudentLesson<S, A>[] {
  const byUser = new Map(attempts.map(a => [a.user_id, a]))
  const rows = students.map((student): StudentLesson<S, A> => {
    const attempt = byUser.get(student.user_id ?? "") ?? null
    const state: LessonState = attempt
      ? attempt.status === "graded" ? "graded" : attempt.status === "submitted" ? "waiting" : "inProgress"
      : !access.forAll && !access.pickedIds?.has(student.user_id ?? "") ? "locked" : "notStarted"
    return { student, attempt, state }
  })
  return rows.sort((a, b) =>
    LESSON_STATES.indexOf(a.state) - LESSON_STATES.indexOf(b.state) || nameOf(a.student).localeCompare(nameOf(b.student), "vi"))
}

/** How many students are in each state. */
export const countStates = (rows: readonly { state: LessonState }[]) =>
  Object.fromEntries(LESSON_STATES.map(s => [s, rows.filter(r => r.state === s).length])) as Record<LessonState, number>
