// A student's study streak, weekly goal and calendar heat-map, from the days (Vietnam calendar, "YYYY-MM-DD") on which
// they saved or submitted work. Pure, so it is tested alone; the database writes the days (table study_days).

const DAY = 864e5
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Today's date in Vietnam as "YYYY-MM-DD". */
export const vnToday = (now = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now)

export interface Streak {
  /** Days in a row up to today. A streak is still alive on a day the student has not studied yet, if yesterday counted. */
  current: number
  best: number
  /** Whether today already counts. */
  doneToday: boolean
}

export function streakOf(days: readonly string[], today: string): Streak {
  const set = new Set(days)
  const doneToday = set.has(today)
  let current = 0
  for (let t = utc(today) - (doneToday ? 0 : DAY); set.has(iso(t)); t -= DAY) current++
  const sorted = [...set].sort()
  let best = 0
  let run = 0
  let prev = 0
  for (const d of sorted) {
    run = prev && utc(d) - prev === DAY ? run + 1 : 1
    best = Math.max(best, run)
    prev = utc(d)
  }
  return { current, best, doneToday }
}

/** Monday of the week that contains `day`. */
export const weekStart = (day: string) => {
  const dow = (new Date(utc(day)).getUTCDay() + 6) % 7
  return iso(utc(day) - dow * DAY)
}

/** Study days in the week that contains `today`. */
export const daysThisWeek = (days: readonly string[], today: string) => {
  const from = weekStart(today)
  return new Set(days.filter(d => d >= from && d <= today)).size
}

export interface HeatCell { date: string; active: boolean; future: boolean }

/** The last `weeks` weeks as columns of 7 days, Monday first, ending with the current week. */
export function heatmap(days: readonly string[], today: string, weeks = 12): HeatCell[][] {
  const set = new Set(days)
  const first = utc(weekStart(today)) - (weeks - 1) * 7 * DAY
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = iso(first + (w * 7 + d) * DAY)
      return { date, active: set.has(date), future: date > today }
    }))
}

/** The first day a heat-map of `weeks` weeks covers, for the database filter. */
export const heatmapFrom = (today: string, weeks = 12) => iso(utc(weekStart(today)) - (weeks - 1) * 7 * DAY)

export const GOALS = [1, 2, 3, 4, 5, 6, 7] as const
export const DEFAULT_GOAL = 3
