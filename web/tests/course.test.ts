import { describe, expect, it, vi } from "vitest"

vi.mock("dompurify", () => ({ default: { sanitize: (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "") } }))
import {
  gradeLocal, hasAnswerKey, isPastDue, lessonTotal, markUnderline, pageRange, qidOf, scoreOf, shuffleLesson, timeLeft, toCourse,
  toLesson, type Lesson, type LessonRow, type McqItem, type Response,
} from "~/utils/course"

const lesson = (): Lesson => ({
  id: "6.1", label: "Unit 1", courseId: "6", phase: 1, title: "t", desc: "", heading: "", sub: "",
  sections: [
    { type: "explain", title: "e", html: "" },
    { type: "mcq", key: "M", title: "m", items: Array.from({ length: 6 }, (_, i) => ({ q: `q${i}`, opts: ["a", "b", "c", "d"], a: i % 4 })) },
    { type: "error", key: "E", title: "e", items: [{ q: "", opts: ["I", "has", "a cat"], a: 1 }, { q: "", opts: ["She", "go", "home"], a: 1 }] },
    { type: "match", key: "N", title: "n", choices: ["x", "y", "z"], items: [{ q: "1", a: "x" }, { q: "2", a: "y" }, { q: "3", a: "z" }] },
    { type: "typed", key: "G", title: "g", items: [{ q: "a", ans: ["am"] }, { q: "b", ans: ["is"] }, { q: "c", ans: ["are"] }] },
    { type: "order", key: "O", title: "o", items: [{ words: ["b", "a"], ans: ["a b"] }, { words: ["d", "c"], ans: ["c d"] }] },
  ],
})

/** The right answer of every question, keyed by qid (what a student who knows everything submits). */
function allRight(l: Lesson): Record<string, Response> {
  const out: Record<string, Response> = {}
  for (const s of l.sections) {
    if (!("key" in s)) continue
    s.items.forEach((it, i) => {
      const given = "opts" in it ? it.opts[it.a]! : "ans" in it ? it.ans[0]! : (it as { a: string }).a
      out[qidOf(s.key, it, i)] = { given }
    })
  }
  return out
}

describe("shuffleLesson", () => {
  it("gives the same student the same order every time, and another student another order", () => {
    const a = JSON.stringify(shuffleLesson(lesson(), "student-a"))
    expect(JSON.stringify(shuffleLesson(lesson(), "student-a"))).toBe(a)
    expect(JSON.stringify(shuffleLesson(lesson(), "student-b"))).not.toBe(a)
  })
  it("keeps every question's number and grades the same answers the same", () => {
    const shuffled = shuffleLesson(lesson(), "student-a")
    const keys = (l: Lesson) => Object.keys(gradeLocal(l, allRight(l))).sort()
    expect(keys(shuffled)).toEqual(keys(lesson()))
    const graded = gradeLocal(lesson(), allRight(shuffled))
    expect(Object.values(graded).every(a => a.ok)).toBe(true)
    expect(Object.keys(graded)).toHaveLength(lessonTotal(lesson()))
  })
  it("moves the right option with its text, and never reorders the chunks of an error sentence", () => {
    const s = shuffleLesson(lesson(), "student-a").sections
    const mcq = s[1] as { items: McqItem[] }
    for (const it of mcq.items) expect(it.opts[it.a]).toBe(["a", "b", "c", "d"][(it.n! - 1) % 4])
    const err = s[2] as { items: McqItem[] }
    expect(err.items.map(i => i.opts.join(" ")).sort()).toEqual(["I has a cat", "She go home"])
  })
  it("keeps a hidden answer hidden", () => {
    const l = lesson()
    ;(l.sections[1] as { items: McqItem[] }).items.forEach(i => { i.a = -1 })
    const s = shuffleLesson(l, "x").sections[1] as { items: McqItem[] }
    expect(s.items.every(i => i.a === -1)).toBe(true)
  })
  it("leaves unscored sections as they are", () => {
    const l = lesson()
    expect(shuffleLesson(l, "x").sections[0]).toBe(l.sections[0])
  })
})

describe("gradeLocal and scoreOf", () => {
  it("counts right, answered and total", () => {
    const l = lesson()
    const r = allRight(l)
    r.M1 = { given: "wrong" }
    delete r.G1
    expect(scoreOf(gradeLocal(l, r), lessonTotal(l))).toEqual({ ok: lessonTotal(l) - 2, done: lessonTotal(l) - 1, total: lessonTotal(l) })
  })
})

describe("hasAnswerKey", () => {
  it("sees a key on any kind of question, and none when everything is hidden", () => {
    expect(hasAnswerKey(lesson())).toBe(true)
    const hidden: Lesson = { ...lesson(), sections: [
      { type: "mcq", key: "M", title: "", items: [{ q: "", opts: ["a"], a: -1 }] },
      { type: "match", key: "N", title: "", choices: [], items: [{ q: "", a: "" }] },
      { type: "typed", key: "G", title: "", items: [{ q: "", ans: [] }] },
    ] }
    expect(hasAnswerKey(hidden)).toBe(false)
  })
})

describe("deadlines", () => {
  const now = Date.parse("2026-10-24T12:00:00Z")
  it("isPastDue: no deadline is never past; the deadline itself is past", () => {
    expect(isPastDue(null, now)).toBe(false)
    expect(isPastDue("2026-10-24T12:00:00Z", now)).toBe(true)
    expect(isPastDue("2026-10-24T12:01:00Z", now)).toBe(false)
  })
  it("timeLeft picks minutes, hours or days, and is empty once passed", () => {
    const at = (min: number) => timeLeft(new Date(now + min * 60000).toISOString(), now)
    expect(at(-5)).toBe("")
    expect(at(0)).toBe("")
    expect(at(59)).toBe("time.minutesLeft")
    expect(at(60)).toBe("time.hoursLeft")
    expect(at(48 * 60 - 1)).toBe("time.hoursLeft")
    expect(at(48 * 60)).toBe("time.daysLeft")
    expect(timeLeft(null, now)).toBe("")
  })
})

describe("small helpers", () => {
  it("pageRange is inclusive, for PostgREST", () => {
    expect(pageRange(0, 10)).toEqual([0, 9])
    expect(pageRange(2, 25)).toEqual([50, 74])
  })
  it("markUnderline underlines [x] and still sanitises", () => {
    expect(markUnderline("c[a]t b[oo]k")).toBe("c<u>a</u>t b<u>oo</u>k")
    expect(markUnderline("[x]<script>alert(1)</script>")).toBe("<u>x</u>")
  })
  it("qidOf uses the stored number, not the position", () => {
    expect(qidOf("M", { n: 7 }, 0)).toBe("M7")
    expect(qidOf("M", {}, 0)).toBe("M1")
  })
})

describe("toLesson and toCourse", () => {
  it("orders sections and items by position, whatever order PostgREST returns them in", () => {
    const row: LessonRow = {
      id: "6.1", label: "Unit 1", phase_id: 1, title: "t", description: "d", heading: "h", subtitle: "s", phases: { course_id: "6" },
      lesson_sections: [
        { id: "b", type: "typed", position: 2, title: "B", time_label: null, hint: null, body: null, placeholder: null, score_key: "G", short_input: true },
        { id: "a", type: "explain", position: 1, title: "A", time_label: "5'", hint: null, body: "<p>x</p>", placeholder: null, score_key: null, short_input: false },
      ],
    }
    const items = [
      { section_id: "b", position: 2, prompt: "second", answers: ["2"] },
      { section_id: "b", position: 1, prompt: "first", answers: ["1"] },
    ]
    const l = toLesson(row, items)
    expect(l.sections.map(s => s.title)).toEqual(["A", "B"])
    expect(l.sections[1]!.type === "typed" && l.sections[1]!.items.map(i => [i.n, i.q])).toEqual([[1, "first"], [2, "second"]])
    expect(l.courseId).toBe("6")
  })
  it("groups lessons under their phases, in order", () => {
    const phases = [{ id: 2, course_id: "6", name: "HK2", position: 20 }, { id: 1, course_id: "6", name: "HK1", position: 10 }]
    const ov = [
      { id: "6.2", label: "Unit 2", phase_id: 1, position: 20, title: "b", description: null, scored_items: 3, is_published: true, created_by: null },
      { id: "6.1", label: null, phase_id: 1, position: 10, title: "a", description: null, scored_items: null, is_published: null, created_by: "u" },
      { id: "6.7", label: "Unit 7", phase_id: 2, position: 70, title: "c", description: "x", scored_items: 1, is_published: false, created_by: null },
    ]
    const c = toCourse("6", phases as never, ov as never)
    expect(c.phases.map(p => [p.name, p.lessons.map(l => l.id)])).toEqual([["HK1", ["6.1", "6.2"]], ["HK2", ["6.7"]]])
    expect(c.order).toEqual(["6.1", "6.2", "6.7"])
    expect(c.byId["6.1"]).toMatchObject({ label: "6.1", total: 0, published: true, createdBy: "u" })
  })
})
