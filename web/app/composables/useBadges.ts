import type { Database } from "~/types/database.types"

export type BadgeRow = Database["public"]["Functions"]["my_badges"]["Returns"][number]

/** Icon of each badge (the badge keys are the ones in the `badges` table). */
export const BADGE_ICONS: Record<string, "clock" | "award" | "flame" | "book" | "zap" | "checkCircle"> = {
  on_time_5: "clock", perfect: "award", streak_7: "flame", streak_30: "flame", course_done: "checkCircle", review_50: "book", fast_100: "zap",
}

/**
 * The signed-in student's badges. The database decides (my_badges() counts the student's own work and records what
 * was just reached); `fresh` holds the ones awarded by the latest call, for the popup, until the student closes it.
 * A failed call (for example before the migration is applied) just leaves the list empty.
 */
export function useBadges() {
  const client = useSupabaseClient<Database>()
  const list = useState<BadgeRow[]>("badges", () => [])
  const fresh = useState<string[]>("badges-fresh", () => [])
  const loaded = useState("badges-loaded", () => false)

  async function load() {
    const { data, error } = await client.rpc("my_badges")
    if (error) { loaded.value = true; return }
    list.value = data ?? []
    const added = list.value.filter(b => b.is_new).map(b => b.badge)
    if (added.length) fresh.value = [...fresh.value, ...added]
    loaded.value = true
  }
  const earned = computed(() => list.value.filter(b => b.earned_at))
  return { list, fresh, loaded, earned, load }
}
