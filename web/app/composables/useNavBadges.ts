import type { Database } from "~/types/database.types"

/**
 * Counts shown beside menu links: for teachers and admins, the work waiting for a grade (the sum over the classes
 * RLS lets them see). Read once per page change at most every 30 seconds, so the menu stays light.
 */
export function useNavBadges(role: Ref<string | null | undefined>) {
  const client = useSupabaseClient<Database>()
  const route = useRoute()
  const grading = ref(0)
  /** Flashcards due today (students). */
  const review = ref(0)
  const cards = useCardReviews()
  let last = 0

  async function refresh(force = false) {
    if (role.value !== "teacher" && role.value !== "admin" && role.value !== "student") return
    if (!force && Date.now() - last < 30_000) return
    last = Date.now()
    if (role.value === "student") {
      review.value = await cards.dueCount()
      return
    }
    const { data } = await client.from("class_overview").select("waiting")
    grading.value = (data ?? []).reduce((n, r) => n + (r.waiting ?? 0), 0)
  }
  watch(() => [role.value, route.fullPath], () => refresh(route.path.startsWith("/teacher/attempts")), { immediate: true })

  /** The count to show beside a link, or 0 for none. */
  const forLink = (to: string) => (to === "/teacher/grading" ? grading.value : to === "/review" ? review.value : 0)
  return { grading, review, forLink, refresh }
}
