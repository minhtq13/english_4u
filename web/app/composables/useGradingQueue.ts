import type { Database } from "~/types/database.types"
import { queueLink, waitingAttempts } from "~/utils/attemptReview"

/**
 * "Chấm lần lượt": the submitted work of one lesson in one class, graded oldest first. The class page and
 * the grading page start a queue; the attempt page walks it (?queue=<lesson>&class=<class>).
 */
export function useGradingQueue() {
  const client = useSupabaseClient<Database>()

  /** Ids of the attempts still waiting for grading, in submission order. */
  const waiting = (lessonId: string, classId: string) => waitingAttempts(client, lessonId, classId)

  /** Opens the oldest waiting attempt; does nothing when none is waiting. */
  async function start(lessonId: string, classId: string) {
    const [first] = await waiting(lessonId, classId)
    if (first) await navigateTo(queueLink(first, lessonId, classId))
  }

  return { waiting, link: queueLink, start }
}
