import { describe, expect, it } from "vitest"
import { dailyCounts, scoreBands, topClasses } from "~/utils/adminCharts"
import { analysisRows, answerBars, reteach } from "~/utils/questionAnalysis"

const now = Date.parse("2026-11-18T05:00:00Z")
const at = (iso: string, ok = 5, total = 10, className: string | null = "6A") => ({ submitted_at: iso, ok, total, className })

describe("adminCharts", () => {
  const rows = [at("2026-11-18T01:00:00Z"), at("2026-11-18T02:00:00Z", 9, 10, "6B"), at("2026-11-10T02:00:00Z", 2, 10, "6B"), at("2026-10-01T00:00:00Z")]
  it("counts per day over 30 days, oldest first, today last", () => {
    const d = dailyCounts(rows, now)
    expect(d).toHaveLength(30)
    expect(d.at(-1)).toEqual({ day: "2026-11-18", n: 2 })
    expect(d.find(x => x.day === "2026-11-10")?.n).toBe(1)
  })
  it("ranks classes by this week's hand-ins", () => {
    expect(topClasses(rows, now)).toEqual([{ name: "6A", n: 1 }, { name: "6B", n: 1 }])
  })
  it("splits scores into three bands", () => {
    expect(scoreBands(rows)).toEqual({ low: 1, mid: 2, good: 1 })
  })
})

describe("reteach and answerBars", () => {
  const out = analysisRows([
    { qid: "M5", q: "q", answered: 10, ok: 2, wrong: [{ given: "b", n: 6 }, { given: "c", n: 2 }] },
    { qid: "M6", q: "q", answered: 2, ok: 0, wrong: [] },
    { qid: "M7", q: "q", answered: 10, ok: 9, wrong: [] },
  ] as never)
  it("flags hard questions answered by enough students", () => {
    expect(reteach(out).map(r => r.qid)).toEqual(["M5"])
  })
  it("gives a bar for the right answers and each wrong one", () => {
    expect(answerBars(out.find(r => r.qid === "M5")!).map(b => [b.label, b.percent, b.right])).toEqual([[null, 20, true], ["b", 60, false], ["c", 20, false]])
  })
})
