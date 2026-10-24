import type { Database } from "~/types/database.types"

/**
 * "Chấm lần lượt": the submitted work of one lesson in one class, graded oldest first. The class page and
 * the grading page start a queue; the attempt page walks it (?queue=<lesson>&class=<class>).
 */
export function useGradingQueue() {
  const client = useSupabaseClient<Database>()

  /** Ids of the attempts still waiting for grading, in submission order. */
  async function waiting(lessonId: string, classId: string) {
    const { data } = await client.from("attempts")
      .select("id, profiles!inner(class_id)")
      .eq("lesson_id", lessonId).eq("status", "submitted").eq("profiles.class_id", classId)
      .order("submitted_at", { ascending: true })
    return (data ?? []).map(r => r.id)
  }

  const link = (attemptId: string, lessonId: string, classId: string) =>
    `/teacher/attempts/${attemptId}?queue=${encodeURIComponent(lessonId)}&class=${classId}`

  /** Opens the oldest waiting attempt; does nothing when none is waiting. */
  async function start(lessonId: string, classId: string) {
    const [first] = await waiting(lessonId, classId)
    if (first) await navigateTo(link(first, lessonId, classId))
  }

  return { waiting, link, start }
}
