import type { DraftSection } from "~/utils/lessonDraft"

/**
 * A new lesson built on another page, waiting for the editor: a review sheet from wrong answers
 * (/teacher/review/<class>) or questions picked in the question bank (/teacher/bank). The page sets it and
 * opens `/teacher/lessons/new?from=<from>`; the editor takes it once and clears it.
 */
export interface LessonHandoff {
  from: "review" | "bank"
  title: string
  /** The draft's label; empty for none. */
  label: string
  sections: DraftSection[]
  /** The grade the lesson is made in. */
  courseId: string
  /** A review made for one student (in class `classId`) is given to that student only. */
  classId?: string
  studentId?: string
}

export const useLessonHandoff = () => useState<LessonHandoff | null>("lesson-handoff", () => null)
