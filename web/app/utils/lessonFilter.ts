import type { LessonSummary } from "~/utils/course"
import { fold } from "./text"

// Filters for lesson lists. A course outline is bounded by the curriculum and already loaded whole,
// so these run in the browser (useLessonFilter); lists that grow with users are filtered in the database instead.

/** The kind of a lesson, read from its label: "Unit 1" or "19.1" (a lesson), "Luyện đề 1", "Bài tập về nhà 1", "Kiểm tra 15 phút"; anything else is "other". */
export type LessonKind = "lesson" | "practice" | "homework" | "test" | "other"
export const LESSON_KINDS = ["lesson", "practice", "homework", "test", "other"] as const
export const LESSON_KIND = labels("lessonFilter.kind", LESSON_KINDS)
/** Who made the lesson: shipped with the course, made by a teacher in the editor, or by the signed-in user. */
export const LESSON_AUTHORS = ["builtin", "teacher", "mine"] as const
export const LESSON_AUTHOR = labels("lessonFilter.author", LESSON_AUTHORS)

export function lessonKind(l: Pick<LessonSummary, "label">): LessonKind {
  const label = fold(l.label).trim()
  if (/^unit\b/.test(label) || /^\d+(\.\d+)*$/.test(label)) return "lesson"
  if (label.startsWith("luyen de")) return "practice"
  if (label.startsWith("bai tap ve nha")) return "homework"
  if (label.startsWith("kiem tra")) return "test"
  return "other"
}
