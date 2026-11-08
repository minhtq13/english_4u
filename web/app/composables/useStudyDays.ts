import type { Database } from "~/types/database.types"
import { daysThisWeek, DEFAULT_GOAL, heatmap, heatmapFrom, streakOf, vnToday } from "~/utils/streak"

const GOAL_KEY = "weeklyGoal"
const WEEKS = 12

/** The signed-in student's study days (last 12 weeks) with their streak, this week's count and the weekly goal. */
export function useStudyDays() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const days = shallowRef<string[]>([])
  const loaded = ref(false)
  const today = ref(vnToday())
  // The goal is a personal convenience, kept in this browser only.
  const goal = ref(DEFAULT_GOAL)
  onMounted(() => {
    try { goal.value = Math.min(7, Math.max(1, Number(localStorage.getItem(GOAL_KEY)) || DEFAULT_GOAL)) } catch { /* default goal */ }
  })
  watch(goal, (g) => { try { localStorage.setItem(GOAL_KEY, String(g)) } catch { /* not kept */ } })

  async function load() {
    const me = user.value?.sub
    if (!me) return
    today.value = vnToday()
    const { data } = await client.from("study_days").select("day").eq("user_id", me).gte("day", heatmapFrom(today.value, WEEKS))
    days.value = (data ?? []).map(r => r.day)
    loaded.value = true
  }

  const streak = computed(() => streakOf(days.value, today.value))
  const thisWeek = computed(() => daysThisWeek(days.value, today.value))
  const cells = computed(() => heatmap(days.value, today.value, WEEKS))
  return { days, loaded, goal, streak, thisWeek, cells, today, load }
}
