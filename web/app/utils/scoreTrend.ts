import type { Tables } from "~/types/database.types"
import { attemptOutcome, percentOf } from "./attemptOutcome"

// The student's results over time for the progress page: a point per attempt whose score the student may see.

export interface TrendPoint { at: string; percent: number; lesson: string }

export type TrendAttempt = Pick<Tables<"attempts">, "lesson_id" | "score" | "status" | "updated_at"> & {
  lessons?: { label: string; title: string } | null
}

/** Points in time order, only for attempts whose score has been released to the student. */
export function trendPoints(rows: readonly TrendAttempt[], showsAtOnce: ReadonlySet<string> = new Set()): TrendPoint[] {
  return rows
    .flatMap((r) => {
      const outcome = attemptOutcome(r, "student", showsAtOnce.has(r.lesson_id))
      const percent = outcome.score ? percentOf(outcome.score.ok, outcome.score.total) : null
      return percent === null ? [] : [{ at: r.updated_at, percent, lesson: r.lessons?.label ?? r.lesson_id }]
    })
    .sort((a, b) => a.at.localeCompare(b.at))
}

/** SVG polyline points for a chart `width` × `height` with `pad` around it; 0 % is the bottom, 100 % the top. */
export function chartCoords(points: readonly TrendPoint[], width: number, height: number, pad = 12) {
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  return points.map((p, i) => ({
    x: pad + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW),
    y: pad + innerH - (p.percent / 100) * innerH,
    percent: p.percent,
    lesson: p.lesson,
    at: p.at,
  }))
}

/** Errors by category, biggest first, for the "repeated mistakes" bars. */
export function errorCounts(rows: readonly { category: string; status: string }[], onlyOpen = true) {
  const counts = new Map<string, number>()
  for (const r of rows) if (!onlyOpen || r.status !== "fixed") counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  return [...counts].map(([category, n]) => ({ category, n })).sort((a, b) => b.n - a.n)
}
