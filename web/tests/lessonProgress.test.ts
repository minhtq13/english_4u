import { describe, expect, it } from "vitest"
import type { Lesson } from "~/utils/course"
import { blanksLeft, firstBlankSection, sectionProgress, sectionScores, wrongAnswers } from "~/utils/lessonProgress"
import { chartCoords, errorCounts, trendPoints } from "~/utils/scoreTrend"
import { speakable } from "~/utils/speech"

const lesson = {
  id: "6.1", label: "Unit 1", courseId: "c", phase: 1, title: "", desc: "", heading: "", sub: "",
  sections: [
    { type: "explain", title: "Học", html: "x" },
    { type: "mcq", key: "M", title: "Trắc nghiệm", items: [{ q: "a", opts: ["x", "y"], a: 0 }, { q: "b", opts: ["x", "y"], a: 1 }] },
    { type: "typed", key: "T", title: "Điền từ", items: [{ q: "c", ans: ["go"] }] },
    { type: "writing", title: "Viết" },
  ],
} as unknown as Lesson

describe("sectionProgress", () => {
  it("counts answered questions per section and skips explanations", () => {
    const p = sectionProgress(lesson, { M1: { given: "x" }, T1: { given: "go" } }, "")
    expect(p.map(s => [s.title, s.answered, s.total, s.state])).toEqual([
      ["Trắc nghiệm", 1, 2, "partial"], ["Điền từ", 1, 1, "done"], ["Viết", 0, 1, "empty"],
    ])
    expect(p.map(s => s.index)).toEqual([1, 2, 3])
  })
  it("a writing task with text counts as answered but never as a blank", () => {
    const p = sectionProgress(lesson, {}, "  hello ")
    expect(p.find(s => s.title === "Viết")?.state).toBe("done")
    expect(blanksLeft(p)).toBe(3)
  })
  it("finds the first section with a blank scored question", () => {
    expect(firstBlankSection(sectionProgress(lesson, {}, ""))).toBe(1)
    expect(firstBlankSection(sectionProgress(lesson, { M1: { given: "x" }, M2: { given: "y" } }, ""))).toBe(2)
    expect(firstBlankSection(sectionProgress(lesson, { M1: { given: "x" }, M2: { given: "y" }, T1: { given: "go" } }, ""))).toBeNull()
  })
})

describe("results", () => {
  const results = {
    M1: { ok: true, q: "a", given: "x", correct: "x" },
    M2: { ok: false, q: "b", given: "x", correct: "y" },
    T1: { ok: false, q: "c", given: "went", correct: "go" },
  }
  it("scores each scored section", () => {
    expect(sectionScores(lesson, results)).toEqual([
      { index: 1, title: "Trắc nghiệm", ok: 1, total: 2, percent: 50 },
      { index: 2, title: "Điền từ", ok: 0, total: 1, percent: 0 },
    ])
  })
  it("lists the wrong answers in lesson order", () => {
    expect(wrongAnswers(lesson, results).map(w => w.qid)).toEqual(["M2", "T1"])
    expect(wrongAnswers(lesson, results)[1]).toMatchObject({ given: "went", correct: "go", sectionTitle: "Điền từ" })
  })
})

describe("score trend", () => {
  const row = (lesson_id: string, status: "in_progress" | "submitted" | "graded", ok: number, at: string) =>
    ({ lesson_id, status, score: { ok, done: 10, total: 10 }, updated_at: at })
  it("only plots scores the student may see, oldest first", () => {
    const pts = trendPoints([
      row("b", "graded", 8, "2026-10-02T00:00:00Z"), row("a", "graded", 5, "2026-10-01T00:00:00Z"),
      row("c", "submitted", 9, "2026-10-03T00:00:00Z"), row("d", "in_progress", 0, "2026-10-04T00:00:00Z"),
    ])
    expect(pts.map(p => [p.lesson, p.percent])).toEqual([["a", 50], ["b", 80]])
    expect(trendPoints([row("c", "submitted", 9, "2026-10-03T00:00:00Z")], new Set(["c"]))[0]?.percent).toBe(90)
  })
  it("maps points into the chart box, 100% at the top", () => {
    const [a, b] = chartCoords([{ at: "1", percent: 0, lesson: "a" }, { at: "2", percent: 100, lesson: "b" }], 112, 112, 12)
    expect(a).toMatchObject({ x: 12, y: 100 })
    expect(b).toMatchObject({ x: 100, y: 12 })
    expect(chartCoords([{ at: "1", percent: 50, lesson: "a" }], 112, 112, 12)[0]!.x).toBe(56)
  })
  it("counts open mistakes by category", () => {
    const rows = [{ category: "grammar", status: "open" }, { category: "grammar", status: "fixed" }, { category: "logic", status: "improving" }, { category: "grammar", status: "open" }]
    expect(errorCounts(rows)).toEqual([{ category: "grammar", n: 2 }, { category: "logic", n: 1 }])
    expect(errorCounts(rows, false)[0]).toEqual({ category: "grammar", n: 3 })
  })
})

describe("speakable", () => {
  it("drops tags, underline marks and blanks", () => {
    expect(speakable("She <b>goes</b> to [school]&nbsp;every ___ day…")).toBe("She goes to school every day")
  })
})
