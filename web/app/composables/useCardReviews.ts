import type { Database } from "~/types/database.types"
import { review } from "~/utils/srs"
import { vnToday } from "~/utils/streak"

/** The signed-in student's flashcard schedule (table card_reviews, own rows only): mark a card, list the ones due. */
export function useCardReviews() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  /** Records that the student remembered a card (or not) and schedules it. Returns false when it could not be saved. */
  async function mark(card: string, remembered: boolean) {
    const me = user.value?.sub
    if (!me) return false
    const { data: old } = await client.from("card_reviews").select("box").eq("card", card).maybeSingle()
    const next = review(old?.box ?? 1, remembered, vnToday())
    const { error } = await client.from("card_reviews")
      .upsert({ user_id: me, card, box: next.box, due_on: next.due_on, updated_at: new Date().toISOString() }, { onConflict: "user_id,card" })
    return !error
  }

  /** The cards due today or earlier, the longest waiting first. */
  async function due(limit = 30) {
    const { data } = await client.from("card_reviews").select("card, box, due_on").lte("due_on", vnToday()).order("due_on").limit(limit)
    return data ?? []
  }

  /** How many cards are due today (for the menu badge). */
  async function dueCount() {
    const { count } = await client.from("card_reviews").select("card", { count: "exact", head: true }).lte("due_on", vnToday())
    return count ?? 0
  }

  return { mark, due, dueCount }
}
