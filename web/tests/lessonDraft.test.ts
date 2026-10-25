import { describe, expect, it, vi } from "vitest"

vi.mock("dompurify", () => ({ default: { sanitize: (html: string) => html } }))
import {
  EXAM_STRUCTURE, MAX_ITEMS_PER_SECTION, SECTION_PRESETS, STANDARD_STRUCTURE, cloneSection, draftPayload, emptyItem, emptySection,
  hasContent, resizeItems, sectionsFromRows, sectionsFromStructure, structureOf, type LessonDraft,
} from "~/utils/lessonDraft"

const draft = (sections = STANDARD_STRUCTURE()): LessonDraft => ({ label: " Unit 1 ", title: " Tên ", description: "", subtitle: "", sections })
type Payload = { heading: string; label: string; sections: { score_key: string; type: string; body: string; short_input: boolean }[] }
const payload = (d: LessonDraft) => draftPayload(d, { id: "6.101", phaseId: 1 }) as unknown as Payload

describe("saved structures", () => {
  it("rebuild the same outline, presets included, without any question", () => {
    const sections = [...EXAM_STRUCTURE(), emptySection("explain", { title: "Lý thuyết", body: "secret" })]
    sections[0]!.items[0]!.options = ["x", "y", "z", "w"]
    const spec = structureOf(sections)
    expect(JSON.stringify(spec)).not.toContain("secret")
    const back = sectionsFromStructure(JSON.parse(JSON.stringify(spec)))
    expect(structureOf(back)).toEqual(spec)
    expect(back[0]!.items[0]!.options).toEqual(["", "", "", ""])
    expect(back.every(s => !hasContent(s))).toBe(true)
  })
  it("skip what is malformed, and keep question counts in range", () => {
    const back = sectionsFromStructure([
      null, 3, { type: "nope" }, { title: "no type" },
      { type: "mcq", items: 9999 }, { type: "typed", items: -4 }, { type: "writing", items: 5 }, { type: "cards", items: "x" },
    ])
    expect(back.map(s => [s.type, s.items.length])).toEqual([["mcq", MAX_ITEMS_PER_SECTION], ["typed", 1], ["writing", 0], ["cards", 1]])
    expect(sectionsFromStructure("not a list")).toEqual([])
  })
})

describe("hasContent", () => {
  it("does not count a preset's starter prompts, numbered blanks or True / False", () => {
    for (const key of Object.keys(SECTION_PRESETS) as (keyof typeof SECTION_PRESETS)[]) expect(hasContent(SECTION_PRESETS[key].make())).toBe(false)
  })
  it("counts anything the teacher typed", () => {
    const s = SECTION_PRESETS.trueFalse.make()
    s.items[1]!.prompt = "The cat is black."
    expect(hasContent(s)).toBe(true)
    expect(hasContent(emptySection("writing", { placeholder: "Viết…" }))).toBe(true)
    expect(hasContent(emptySection("typed", { items: [emptyItem({ answers: "am" })] }))).toBe(true)
  })
})

describe("resizeItems", () => {
  it("adds questions with the last one's layout but no text, and removes from the end", () => {
    const s = emptySection("mcq", { items: [emptyItem({ prompt: "keep", options: ["True", "False", "x"] })] })
    resizeItems(s, 3)
    expect(s.items.map(i => [i.prompt, i.options])).toEqual([["keep", ["True", "False", "x"]], ["", ["True", "False", ""]], ["", ["True", "False", ""]]])
    resizeItems(s, 0)
    expect(s.items.map(i => i.prompt)).toEqual(["keep"])
  })
})

describe("cloneSection", () => {
  it("gets its own uid and its own option lists", () => {
    const a = emptySection("mcq", { preset: "reading" })
    const b = cloneSection(a)
    expect(b.uid).not.toBe(a.uid)
    expect(b.preset).toBe("reading")
    b.items[0]!.options[0] = "changed"
    expect(a.items[0]!.options[0]).toBe("")
  })
})

describe("draftPayload", () => {
  it("gives every scored section its own score key", () => {
    const types = ["mcq", "mcq", "typed", "mcq", "error", "error", "match", "order", "order", "explain"] as const
    const keys = payload(draft(types.map(t => emptySection(t)))).sections.map(s => s.score_key)
    const scored = keys.filter(Boolean)
    expect(new Set(scored).size).toBe(scored.length)
    expect(scored.every(k => /^[A-Z]$/.test(k))).toBe(true)
    expect(keys.at(-1)).toBe("")
  })
  it("trims the title and builds the heading", () => {
    expect(payload(draft())).toMatchObject({ label: "Unit 1", heading: "Unit 1 - Tên" })
    expect(payload({ ...draft(), label: "" }).heading).toBe("Tên")
  })
  it("keeps a body only where the type has one, and short input only for typed", () => {
    const s = payload(draft([emptySection("order", { body: "x", short: true }), emptySection("mcq", { body: "passage" }), emptySection("typed", { short: true })])).sections
    expect(s.map(x => [x.body, x.short_input])).toEqual([["", false], ["passage", false], ["", true]])
  })
})

describe("sectionsFromRows", () => {
  const rows = [
    { id: "b", lesson_id: "x", type: "mcq", position: 2, title: "B", time_label: null, hint: null, body: "passage", placeholder: null, score_key: "M", short_input: false,
      section_items: [{ id: "i", section_id: "b", position: 1, prompt: "Q", back: null, options: ["a", "b"], correct_option: 2, answers: null, words: null, explanation: "why", tag: "t" }] },
    { id: "a", lesson_id: "x", type: "writing", position: 1, title: "A", time_label: "5'", hint: "h", body: null, placeholder: "Viết", score_key: null, short_input: false, section_items: [] },
  ]
  it("keeps content when asked, in position order", () => {
    const s = sectionsFromRows(rows as never, true)
    expect(s.map(x => x.title)).toEqual(["A", "B"])
    expect(s[0]).toMatchObject({ placeholder: "Viết", time: "5'", items: [] })
    expect(s[1]).toMatchObject({ body: "passage", items: [{ prompt: "Q", options: ["a", "b"], correct: 2, explanation: "why" }] })
  })
  it("keeps only the outline otherwise", () => {
    const s = sectionsFromRows(rows as never, false)
    expect(s[1]).toMatchObject({ body: "", items: [{ prompt: "" }] })
    expect(s[0]!.placeholder).toBe("")
  })
})
