import type { Database } from "~/types/database.types"

/** Deleting a lesson (RLS: its author or an admin). Sections, questions and class assignments go with it. */
export function useLessonDelete() {
  const client = useSupabaseClient<Database>()

  /** Resolves to "" when the lesson is gone, otherwise to the reason (in the current language). */
  async function deleteLesson(id: string): Promise<string> {
    // RLS hides rows the caller may not delete instead of failing, so ask for the deleted rows back.
    const { data, error } = await client.from("lessons").delete().eq("id", id).select("id")
    if (error) return lessonDeleteError(error.message)
    return data?.length ? "" : tr("lessonDelete.denied")
  }

  return { deleteLesson }
}
