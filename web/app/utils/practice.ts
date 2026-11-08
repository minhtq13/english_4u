import type { Lesson } from "./course"
import { isScored, qidOf } from "./course"

/**
 * A practice lesson: only the auto-graded questions the student got wrong, in the same sections. Items keep their
 * original number (`n`), so a question's id is the same as in the real attempt and the browser can grade it with
 * gradeLocal(). Sections with nothing left are dropped. Only for a student whose results were released (the answer
 * key already came with the lesson), and never saved.
 */
export function practiceLesson(lesson: Lesson, wrongQids: ReadonlySet<string>): Lesson {
  const sections = lesson.sections.flatMap((s) => {
    if (!isScored(s)) return []
    const numbered = s.items.map((it, i) => ({ ...it, n: it.n ?? i + 1 }))
    const items = numbered.filter((it, i) => wrongQids.has(qidOf(s.key, s.items[i]!, i)))
    return items.length ? [{ ...s, items } as typeof s] : []
  })
  return { ...lesson, sections }
}
