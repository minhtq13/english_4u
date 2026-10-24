import { describe, expect, it, vi } from "vitest"

// DOMPurify needs a browser DOM; sanitising is not what these tests check.
vi.mock("dompurify", () => ({ default: { sanitize: (html: string) => html } }))
import { gradeLocal, norm, qidOf, type Lesson, type OrderItem, type ScoredSection } from "~/utils/course"
import {
  draftPayload, draftToLesson, emptyItem, emptySection, itemToDraft, validateDraft,
  type DraftItem, type DraftSection, type LessonDraft,
} from "~/utils/lessonDraft"
import { SECTION_KINDS } from "~/utils/sectionKinds"

// The browser grades a teacher's preview; the database grades students (private.grade_attempt). The norm()
// cases were read from the live database's private.norm_answer; the grading cases follow grade_attempt's rules.

describe("norm mirrors private.norm_answer", () => {
  const fromDatabase: [string, string][] = [
    ["Don't wear it.", "dont wear it"],
    ["DON’T  wear   it!", "dont wear it"],
    ["  \"Hello,\" she said; “ok”: ", "hello she said ok"],
    ["It's 5 o’clock?", "its 5 oclock"],
    ["Ăn   cơm   đi.", "ăn cơm đi"],
    ["a-b c_d", "a-b c_d"],
    ["", ""],
  ]
  it.each(fromDatabase)("%j → %j", (input, expected) => expect(norm(input)).toBe(expected))
})

const item = (init: Partial<DraftItem>) => emptyItem(init)
const draft = (sections: DraftSection[]): LessonDraft => ({ label: "Unit 1", title: "Test", description: "", subtitle: "", sections })
const mcq = emptySection("mcq", { title: "Chọn", items: [item({ prompt: "I <b>am</b> …", options: ["", "a", "an"], correct: 3 })] })
const typed = emptySection("typed", { title: "Điền", items: [item({ prompt: "She ___ (go)", answers: "goes | is going" })] })
const order = emptySection("order", { title: "Sắp xếp", items: [item({ words: "I / like / tea", answers: "Tea I like" })] })
const match = emptySection("match", { title: "Nối", items: [item({ prompt: "cat", back: "con mèo" }), item({ prompt: "dog", back: "con chó" })] })
const error = emptySection("error", { title: "Tìm lỗi", items: [item({ words: "She / go / to school", correct: 2 })] })
const lesson = (...sections: DraftSection[]) => draftToLesson(draft(sections), { id: "6.101", courseId: "6", phase: 1 })
const scored = (l: Lesson, i = 0) => l.sections[i] as ScoredSection
const qid = (l: Lesson, i = 0, k = 0) => { const s = scored(l, i); return qidOf(s.key, s.items[k]!, k) }

describe("draftToLesson previews the lesson as it will be stored and served", () => {
  it("drops blank options and keeps the right answer on its option", () => {
    const s = scored(lesson(mcq))
    expect(s.type === "mcq" && s.items[0]).toMatchObject({ opts: ["a", "an"], a: 1, n: 1 })
  })
  it("serves order chunks with the right sentence first among the answers", () => {
    const it0 = scored(lesson(order)).items[0] as OrderItem
    expect(it0.ans).toEqual(["I like tea", "Tea I like"])
    expect([...it0.words].sort()).toEqual(["I", "like", "tea"])
  })
  it("gives a match section every right side as its choices", () => {
    const s = scored(lesson(match))
    expect(s.type === "match" && [...s.choices].sort()).toEqual(["con chó", "con mèo"])
  })
  it("numbers score keys per type, and fills in an untitled draft", () => {
    const l = draftToLesson(draft([mcq, emptySection("mcq", { items: [item({ prompt: "x", options: ["a", "b"] })] })]), { id: "p", courseId: "6", phase: 1 })
    expect(l.sections.map(s => "key" in s && s.key)).toEqual(["M", "A"])
    expect(l.sections[1]!.title).toBe("sectionType.mcq")
  })
})

describe("gradeLocal grades like grade_attempt", () => {
  const l = lesson(mcq, typed, order, match, error)
  const grade = (i: number, given: string, k = 0) => gradeLocal(l, { [qid(l, i, k)]: { given } })[qid(l, i, k)]

  it("mcq and error compare the option text exactly", () => {
    expect(grade(0, "an")).toMatchObject({ ok: true, q: "I am …", correct: "an" })
    expect(grade(0, "a")!.ok).toBe(false)
    expect(grade(4, "go")).toMatchObject({ ok: true, q: "She go to school", correct: "go" })
  })
  it("typed accepts any listed answer, loosely", () => {
    expect(grade(1, "IS GOING.")!.ok).toBe(true)
    expect(grade(1, "went")).toMatchObject({ ok: false, correct: "goes" })
  })
  it("order accepts the right sentence and the other listed ones; unnamed questions get the default label", () => {
    expect(grade(2, "i like tea")).toMatchObject({ ok: true, q: "lesson.orderDefault", correct: "I like tea" })
    expect(grade(2, "Tea, I like!")!.ok).toBe(true)
    expect(grade(2, "like I tea")!.ok).toBe(false)
  })
  it("match compares the chosen right side loosely", () => {
    expect(grade(3, "Con chó", 1)!.ok).toBe(true)
    expect(grade(3, "con chó", 0)!.ok).toBe(false)
  })
  it("leaves unanswered questions out", () => {
    expect(gradeLocal(l, {})).toEqual({})
  })
})

describe("saving and reopening a draft keeps every question", () => {
  const sections = [mcq, typed, order, match, error]
  it.each(sections.map(s => [s.type, s] as const))("%s", (_, s) => {
    const payload = draftPayload(draft([s]), { id: "6.101", phaseId: 1 }) as unknown as { sections: { items: object[] }[] }
    const reopened = itemToDraft(payload.sections[0]!.items[0]!, s.type)
    const kind = SECTION_KINDS[s.type as keyof typeof SECTION_KINDS]
    // What the teacher typed comes back the same (blank mcq options are dropped on save).
    expect(kind.payload(reopened)).toEqual(kind.payload(s.items[0]!))
  })
})

describe("validateDraft", () => {
  it("names what each kind of question lacks", () => {
    const bad = draft([
      emptySection("mcq", { items: [item({ prompt: "", options: ["a", "", ""], correct: 2 })] }),
      emptySection("error", { items: [item({ words: "a / a", correct: 1 })] }),
    ])
    expect(validateDraft(bad).map(e => e.split(": ").pop())).toEqual([
      "draftCheck.noPrompt", "draftCheck.twoOptions", "draftCheck.noCorrect", "draftCheck.dupChunks",
    ])
  })
  it("accepts a complete lesson", () => {
    expect(validateDraft(draft([mcq, typed, order, match, error]))).toEqual([])
  })
})
