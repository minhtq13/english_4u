import type { Json } from "~/types/database.types"
import { percentOf } from "./attemptOutcome"
import { stripTags } from "./course"

// How a class did on each question of one lesson, from the question_analysis() RPC: hardest first, so a teacher sees
// what to teach again. "Wrong answers" are the answers students gave most often when they missed it.

export interface AnalysisInput { qid: string; q: string | null; answered: number; ok: number; wrong: Json }
export interface CommonWrong { given: string; n: number }
export interface AnalysisRow { qid: string; question: string; answered: number; ok: number; percent: number; band: "hard" | "medium" | "easy"; wrong: CommonWrong[] }

/** "hard" under 50 % right, "easy" from 80 %. */
export const bandOfPercent = (percent: number): AnalysisRow["band"] => (percent >= 80 ? "easy" : percent >= 50 ? "medium" : "hard")

const wrongOf = (v: Json): CommonWrong[] =>
  Array.isArray(v)
    ? v.flatMap((w) => {
      const o = w as { given?: unknown; n?: unknown } | null
      return o && typeof o.n === "number" ? [{ given: typeof o.given === "string" && o.given ? o.given : "–", n: o.n }] : []
    })
    : []

/** Number part of a question id ("M12" → 12), to keep ties in lesson order. */
const numberOf = (qid: string) => Number(/(\d+)$/.exec(qid)?.[1] ?? 0)

export function analysisRows(rows: readonly AnalysisInput[]): AnalysisRow[] {
  return rows
    .map((r): AnalysisRow => {
      const percent = percentOf(r.ok, r.answered) ?? 0
      return { qid: r.qid, question: stripTags(r.q ?? "").trim(), answered: r.answered, ok: r.ok, percent, band: bandOfPercent(percent), wrong: wrongOf(r.wrong) }
    })
    .sort((a, b) => a.percent - b.percent || a.qid[0]!.localeCompare(b.qid[0]!) || numberOf(a.qid) - numberOf(b.qid))
}
