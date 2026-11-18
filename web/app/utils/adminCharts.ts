import { percentOf } from "./attemptOutcome"

// The admin dashboard's charts, computed in the browser from the attempts handed in during the last 30 days.

const DAY = 864e5
const isoDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(ms)

export interface SubmittedAttempt { submitted_at: string | null; ok: number; total: number; className: string | null }

/** Hand-ins per day for the last `days` days ending today (Vietnam calendar), oldest first. */
export function dailyCounts(rows: readonly SubmittedAttempt[], now = Date.now(), days = 30): { day: string; n: number }[] {
  const counts = new Map<string, number>()
  for (const r of rows) if (r.submitted_at) counts.set(isoDay(Date.parse(r.submitted_at)), (counts.get(isoDay(Date.parse(r.submitted_at))) ?? 0) + 1)
  return Array.from({ length: days }, (_, i) => {
    const day = isoDay(now - (days - 1 - i) * DAY)
    return { day, n: counts.get(day) ?? 0 }
  })
}

/** The classes with the most hand-ins in the last 7 days. */
export function topClasses(rows: readonly SubmittedAttempt[], now = Date.now(), limit = 5): { name: string; n: number }[] {
  const since = now - 7 * DAY
  const counts = new Map<string, number>()
  for (const r of rows) {
    if (!r.className || !r.submitted_at || Date.parse(r.submitted_at) < since) continue
    counts.set(r.className, (counts.get(r.className) ?? 0) + 1)
  }
  return [...counts].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "vi")).slice(0, limit)
}

/** How many hand-ins scored under 50 %, 50–79 % and 80 % or more. */
export function scoreBands(rows: readonly SubmittedAttempt[]): { low: number; mid: number; good: number } {
  const out = { low: 0, mid: 0, good: 0 }
  for (const r of rows) {
    const p = percentOf(r.ok, r.total)
    if (p === null) continue
    out[p >= 80 ? "good" : p >= 50 ? "mid" : "low"]++
  }
  return out
}
