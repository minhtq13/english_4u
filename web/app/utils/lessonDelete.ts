import { tr } from "./i18n"
import { errorText } from "./serverErrors"

/**
 * Why a lesson could not be deleted, in the current language. Students' work (attempts reference the lesson with
 * ON DELETE RESTRICT, and the class_lessons guard trigger refuses too) is the usual reason; other messages pass through.
 */
export function lessonDeleteError(message: string): string {
  return /foreign key|attempts|đã làm bài nên không thu hồi/i.test(message) ? tr("lessonDelete.hasAttempts") : errorText(message)
}
