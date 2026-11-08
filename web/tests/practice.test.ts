import { describe, expect, it } from "vitest"
import type { Lesson } from "~/utils/course"
import { gradeLocal, lessonTotal, qidOf } from "~/utils/course"
import { practiceLesson } from "~/utils/practice"
import { cardId, INTERVALS, parseCardId, review } from "~/utils/srs"

const lesson = {
  id: "6.1", label: "Unit 1", courseId: "c", phase: 1, title: "t", desc: "", heading: "", sub: "",
  sections: [
    { type: "explain", title: "x", html: "x" },
    { type: "mcq", key: "M", title: "Mcq", items: [{ q: "a", opts: ["x", "y"], a: 0 }, { q: "b", opts: ["x", "y"], a: 1 }, { q: "c", opts: ["x", "y"], a: 0 }] },
    { type: "typed", key: "T", title: "Typed", items: [{ n: 4, q: "d", ans: ["go"] }] },
  ],
} as unknown as Lesson

describe("practiceLesson", () => {
  const p = practiceLesson(lesson, new Set(["M2", "T4"]))
  it("keeps only the wrong questions, in their sections, and drops explanations", () => {
    expect(p.sections.map(s => s.title)).toEqual(["Mcq", "Typed"])
    expect(lessonTotal(p)).toBe(2)
  })
  it("keeps each question's original id, so it can be graded like the real attempt", () => {
    const mcq = p.sections[0] as Extract<typeof p.sections[number], { key: string }>
    expect(mcq.items.map((it, i) => qidOf(mcq.key, it, i))).toEqual(["M2"])
    const graded = gradeLocal(p, { M2: { given: "y" }, T4: { given: "went" } })
    expect(graded.M2?.ok).toBe(true)
    expect(graded.T4?.ok).toBe(false)
  })
  it("a lesson with nothing wrong has nothing to practise", () => {
    expect(practiceLesson(lesson, new Set()).sections).toEqual([])
  })
})

describe("srs", () => {
  it("a remembered card moves up a box and waits longer", () => {
    expect(review(1, true, "2026-11-08")).toEqual({ box: 2, due_on: "2026-11-10" })
    expect(review(4, true, "2026-11-08")).toEqual({ box: 5, due_on: "2026-11-24" })
  })
  it("the top box stays there, and a forgotten card starts over for tomorrow", () => {
    expect(review(5, true, "2026-11-08").box).toBe(5)
    expect(review(4, false, "2026-11-08")).toEqual({ box: 1, due_on: "2026-11-09" })
    expect(INTERVALS).toEqual([1, 2, 4, 8, 16])
  })
  it("card ids round-trip, lesson ids with dots included", () => {
    expect(parseCardId(cardId("6.1.1", 3, 12))).toEqual({ lessonId: "6.1.1", section: 3, index: 12 })
    expect(parseCardId("nope")).toBeNull()
  })
})
