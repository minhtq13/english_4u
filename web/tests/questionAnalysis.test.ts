import { describe, expect, it } from "vitest"
import { analysisRows, bandOfPercent } from "~/utils/questionAnalysis"

describe("analysisRows", () => {
  const rows = [
    { qid: "M2", q: "Easy <b>one</b>", answered: 10, ok: 9, wrong: [{ given: "x", n: 1 }] },
    { qid: "M10", q: "Hard", answered: 4, ok: 1, wrong: [{ given: "a", n: 2 }, { given: "", n: 1 }] },
    { qid: "G1", q: null, answered: 4, ok: 1, wrong: [] },
    { qid: "M3", q: "Mid", answered: 2, ok: 1, wrong: "not a list" },
  ]
  const out = analysisRows(rows as never)
  it("puts the hardest first and keeps lesson order among equals", () => {
    expect(out.map(r => r.qid)).toEqual(["G1", "M10", "M3", "M2"])
  })
  it("percent, band and the question text without tags", () => {
    expect(out.find(r => r.qid === "M2")).toMatchObject({ percent: 90, band: "easy", question: "Easy one" })
    expect(out.find(r => r.qid === "M10")).toMatchObject({ percent: 25, band: "hard" })
    expect(out.find(r => r.qid === "G1")?.question).toBe("")
  })
  it("reads the common wrong answers, tolerating junk", () => {
    expect(out.find(r => r.qid === "M10")?.wrong).toEqual([{ given: "a", n: 2 }, { given: "–", n: 1 }])
    expect(out.find(r => r.qid === "M3")?.wrong).toEqual([])
  })
  it("bands", () => {
    expect([bandOfPercent(49), bandOfPercent(50), bandOfPercent(79), bandOfPercent(80)]).toEqual(["hard", "medium", "medium", "easy"])
  })
})
