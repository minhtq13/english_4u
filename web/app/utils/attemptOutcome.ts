import type { Json, Tables } from "~/types/database.types"
import { ATTEMPT_STATUS, isPastDue, type Score } from "./course"
import { tr } from "./i18n"

// What a page may show about one attempt, and whether a given lesson still takes work.
// Every page reads these rules from here, so the student's roadmap, their progress page, the teacher's
// lists and the class page agree with each other and with the database.

/** A class's settings for one lesson it was given (class_lessons). */
export type ClassLessonSetting = Pick<Tables<"class_lessons">, "for_all" | "closed" | "due_at" | "show_results" | "shuffle">

/** The lesson stopped taking work: closed by the teacher, or past its deadline (pg_cron closes it within a minute). */
export const isClosed = (s: Pick<ClassLessonSetting, "closed" | "due_at">, now = Date.now()) => s.closed || isPastDue(s.due_at, now)

/** How a student may use a lesson given to their class (mirrors private.can_work_lesson in the database). */
export type LessonAccess = "open" | "closed" | "locked"
export const accessOf = (s: Pick<ClassLessonSetting, "for_all" | "closed" | "due_at">, picked: boolean, now = Date.now()): LessonAccess =>
  isClosed(s, now) ? "closed" : s.for_all || picked ? "open" : "locked"

/** attempts.score as counts: missing fields are 0, and `total` falls back to `done`. */
export function toScore(json: Json | null | undefined): Score {
  const s = (json && typeof json === "object" && !Array.isArray(json) ? json : {}) as Partial<Score>
  return { ok: s.ok ?? 0, done: s.done ?? 0, total: s.total ?? s.done ?? 0 }
}

export interface AttemptOutcome {
  /** The viewer may see the score. */
  released: boolean
  /** null until released. */
  score: Score | null
  /** Status text for a badge. */
  label: string
}

/**
 * What one viewer may see of an attempt. Teachers see the score as soon as it is submitted. A student sees it
 * once it is graded, or right at submit when the class shows results at once (`showResults`), as
 * private.results_released decides in the database.
 */
export function attemptOutcome(
  row: Pick<Tables<"attempts">, "status" | "score">,
  viewer: "student" | "teacher",
  showResults = false,
): AttemptOutcome {
  const released = row.status !== "in_progress" && (viewer === "teacher" || row.status === "graded" || showResults)
  // A student whose submitted work already shows its score reads "submitted", not "waiting for the teacher".
  const label = viewer === "student" && row.status === "submitted" && released ? tr("progress.submitted") : ATTEMPT_STATUS[row.status]
  return { released, score: released ? toScore(row.score) : null, label }
}

/** Rounded percentage of `part` in `whole`; null when `whole` is 0 (nothing to measure). */
export const percentOf = (part: number | null | undefined, whole: number | null | undefined) =>
  whole ? Math.round(((part ?? 0) / whole) * 100) : null
