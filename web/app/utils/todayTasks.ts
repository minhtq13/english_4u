import { personName } from "./accounts"

// "Việc hôm nay": what a teacher should look at first, worked out from rows the class views already return.
// Pure, so it is tested alone; the page reads the rows (RLS limits them to the teacher's classes).

export const DUE_SOON_MS = 48 * 3600e3
export const INACTIVE_DAYS = 7

export interface WaitingRow { class_id: string | null; lesson_id: string | null; waiting: number | null }
export interface MissingLike { class_id: string | null; lesson_id: string | null; due_at: string | null; user_id: string | null }
export interface InactiveStudent {
  user_id: string | null; full_name: string | null; username: string | null; email: string | null
  class_id: string | null; last_activity: string | null
}

export interface LessonTask { classId: string; lessonId: string; count: number }
export interface DueTask extends LessonTask { due: string }

/** Lessons with work waiting for a grade, the biggest pile first. */
export function waitingTasks(rows: readonly WaitingRow[]): LessonTask[] {
  return rows
    .filter(r => r.class_id && r.lesson_id && (r.waiting ?? 0) > 0)
    .map(r => ({ classId: r.class_id!, lessonId: r.lesson_id!, count: r.waiting! }))
    .sort((a, b) => b.count - a.count)
}

/** Lessons whose deadline falls within `DUE_SOON_MS` and that some student still has to hand in, the nearest deadline first. */
export function dueSoonTasks(missing: readonly MissingLike[], now = Date.now()): DueTask[] {
  const groups = new Map<string, DueTask>()
  for (const m of missing) {
    if (!m.class_id || !m.lesson_id || !m.due_at) continue
    const left = Date.parse(m.due_at) - now
    if (left <= 0 || left > DUE_SOON_MS) continue
    const key = `${m.class_id}|${m.lesson_id}`
    const g = groups.get(key) ?? { classId: m.class_id, lessonId: m.lesson_id, count: 0, due: m.due_at }
    g.count++
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => a.due.localeCompare(b.due))
}

/** Whole days since the student last did anything; null when they never have. */
export const daysSince = (iso: string | null, now = Date.now()) => (iso ? Math.floor((now - Date.parse(iso)) / 864e5) : null)

/** The ISO time before which a student counts as inactive, for the database filter. */
export const inactiveCutoff = (now = Date.now()) => new Date(now - INACTIVE_DAYS * 864e5).toISOString()

/** Students with no activity for a week (or ever), the longest silent first (never before long ago). */
export function inactiveTasks(students: readonly InactiveStudent[], now = Date.now()) {
  return students
    .filter((s) => {
      const days = daysSince(s.last_activity, now)
      return !!s.user_id && (days === null || days >= INACTIVE_DAYS)
    })
    .map(s => ({ userId: s.user_id!, classId: s.class_id ?? "", name: personName(s) || "?", days: daysSince(s.last_activity, now) }))
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))
}
