import type { Database } from "~/types/database.types"
import { toExamQuestions, type PoolRow } from "~/utils/examGenerator"

const COLUMNS = "id, position, prompt, back, options, correct_option, answers, words, explanation, tag, "
  + "lesson_sections!inner(id, type, title, body, lesson_id, position)"

/**
 * Questions for a paper exam, read with their section (title, reading passage) from `section_items`: RLS gives a
 * teacher the questions of lessons they teach, with answers, exactly as the question_bank view does. The pool of
 * the chosen lessons is bounded by the curriculum, so it loads whole (up to PostgREST's row limit).
 */
export function useExamPool() {
  const client = useSupabaseClient<Database>()

  /** Every auto-graded question of these lessons, in lesson order. */
  async function ofLessons(lessonIds: string[]) {
    if (!lessonIds.length) return []
    const { data, error } = await client.from("section_items").select(COLUMNS)
      .in("lesson_sections.lesson_id", lessonIds)
      .in("lesson_sections.type", [...SCORED_TYPES])
    if (error) throw error
    return toExamQuestions((data ?? []) as unknown as PoolRow[], lessonIds)
  }

  /** These questions (picked in the question bank) with their sections. */
  async function ofIds(ids: string[]) {
    if (!ids.length) return []
    const { data, error } = await client.from("section_items").select(COLUMNS).in("id", ids)
    if (error) throw error
    return toExamQuestions((data ?? []) as unknown as PoolRow[])
  }

  return { ofLessons, ofIds }
}
