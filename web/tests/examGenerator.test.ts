import { describe, expect, it } from "vitest"
import {
  addQuestion, answerMatrix, buildParts, buildVariant, buildVariants, canonicalOrder, codeSeries, drawExam, emptyMatrix, keepsOrder, moveBlock,
  moveBlockTo, moveItem, movePart, movePartTo, orderedQuestions, parseCodes, partOf, poolCounts, rngOf, roman, shuffledBy, toExamQuestions, type ExamQuestion, type PoolRow,
} from "~/utils/examGenerator"

let seq = 0
const q = (init: Partial<ExamQuestion> = {}): ExamQuestion => ({
  id: `q${++seq}`, type: "mcq", prompt: "<p>She ___ to school.</p>", options: ["go", "goes", "going", "gone"], correct: 1,
  answers: [], words: [], back: "", explanation: "", tag: "", sectionId: "s", sectionTitle: "Chọn đáp án đúng", passage: "", lessonId: "7.1",
  ...init,
})
const grammar = (n: number) => Array.from({ length: n }, (_, i) => q({ id: `g${i + 1}`, options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`], correct: i % 4 }))
const phon = (id: string) => q({ id, options: ["b[u]s", "l[u]nch", "st[u]dy", "comp[u]ter"], correct: 3 })
const reading = (section: string, n: number) => Array.from({ length: n }, (_, i) =>
  q({ id: `${section}-${i + 1}`, sectionId: section, passage: `<p>Passage ${section}</p>`, prompt: `(${i + 1})`, options: ["w", "x", "y", "z"], correct: 0 }))
const pairs = (n: number) => Array.from({ length: n }, (_, i) => q({ id: `m${i + 1}`, type: "match", prompt: `left ${i + 1}`, back: `right ${i + 1}`, options: [], correct: -1 }))
const err = (id: string) => q({ id, type: "error", options: ["She", "go", "to school", "every day"], correct: 1 })
const typed = (id: string) => q({ id, type: "typed", prompt: "He (go) ___ home.", options: [], correct: -1, answers: ["goes", "is going"] })
const order = (id: string) => q({ id, type: "order", prompt: "", options: [], correct: -1, words: ["I", "like", "green", "tea"] })

/** A full base exam: 2 phonetics, 8 grammar, 2 error, a 5-question passage, 4 pairs, 1 order, 2 typed. */
const exam = () => [...grammar(8), phon("p1"), err("e1"), ...reading("r1", 5), typed("t1"), ...pairs(4), phon("p2"), order("o1"), err("e2"), typed("t2")]

describe("seeded shuffling", () => {
  it("the same seed always gives the same order; another seed gives another", () => {
    const list = Array.from({ length: 20 }, (_, i) => i)
    expect(shuffledBy(list, rngOf("101"))).toEqual(shuffledBy(list, rngOf("101")))
    expect(shuffledBy(list, rngOf("101"))).not.toEqual(shuffledBy(list, rngOf("102")))
    expect(shuffledBy(list, rngOf("101")).slice().sort((a, b) => a - b)).toEqual(list)
    expect(list).toEqual(Array.from({ length: 20 }, (_, i) => i))
  })
  it("numbers stay in [0, 1)", () => {
    const rng = rngOf("x")
    for (let i = 0; i < 500; i++) { const n = rng(); expect(n >= 0 && n < 1).toBe(true) }
  })
})

describe("base exam", () => {
  it("sorts questions into parts", () => {
    expect(partOf(phon("x"))).toBe("phonetics")
    expect(partOf(q({ sectionTitle: "Trọng âm" }))).toBe("phonetics")
    expect(partOf(q())).toBe("grammar")
    expect(partOf(reading("r", 1)[0]!)).toBe("reading")
    expect(partOf(q({ type: "typed", passage: "<p>text</p>" }))).toBe("reading")
    expect(partOf(err("x"))).toBe("error")
    expect(partOf(typed("x"))).toBe("typed")
    expect(partOf(order("x"))).toBe("order")
    expect(partOf(pairs(1)[0]!)).toBe("match")
  })
  it("prints parts in the order of the list, one block per passage and one for all pairs", () => {
    const parts = buildParts(canonicalOrder(exam()))
    expect(parts.map(p => p.key)).toEqual(["phonetics", "grammar", "error", "reading", "match", "order", "typed"])
    expect(parts.map(p => p.blocks.length)).toEqual([2, 8, 2, 1, 1, 1, 2])
    expect(parts[3]!.blocks[0]!.questions.map(x => x.id)).toEqual(["r1-1", "r1-2", "r1-3", "r1-4", "r1-5"])
    expect(parts[3]!.blocks[0]!.passage).toContain("Passage r1")
    expect(parts[4]!.blocks[0]!.questions).toHaveLength(4)
    // A list in another order prints in that order: parts follow their first question.
    expect(buildParts(exam()).map(p => p.key)).toEqual(["grammar", "phonetics", "error", "reading", "typed", "match", "order"])
  })
  it("canonicalOrder puts the parts in the usual order and keeps each part's own order", () => {
    const ids = canonicalOrder([typed("t1"), ...grammar(2), phon("p1"), typed("t2")]).map(x => x.id)
    expect(ids).toEqual(["p1", "g1", "g2", "t1", "t2"])
  })
  it("a question listed twice is used once", () => {
    const a = q()
    expect(buildParts([a, a])[0]!.blocks).toHaveLength(1)
  })
  it("moveBlock swaps a block with its neighbour inside its part only", () => {
    const list = [...grammar(3), phon("p1")]
    expect(moveBlock(list, "g3", -1).map(x => x.id)).toEqual(["g1", "g3", "g2", "p1"])
    expect(moveBlock(list, "g1", -1).map(x => x.id)).toEqual(["g1", "g2", "g3", "p1"])
    expect(moveBlock(list, "g3", 1).map(x => x.id)).toEqual(["g1", "g2", "g3", "p1"])
    expect(moveBlock(list, "nope", 1).map(x => x.id)).toEqual(["g1", "g2", "g3", "p1"])
  })
  it("moveItem moves one item and leaves the input alone", () => {
    const list = ["a", "b", "c", "d"]
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"])
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"])
    expect(moveItem(list, 1, 1)).toEqual(list)
    expect(moveItem(list, 1, 9)).toEqual(list)
    expect(moveItem(list, -1, 0)).toEqual(list)
    expect(list).toEqual(["a", "b", "c", "d"])
  })
  it("moveBlockTo drags a block anywhere inside its part, a passage with all its questions", () => {
    const list = [...grammar(3), ...reading("r1", 2), ...reading("r2", 2), phon("p1")]
    expect(moveBlockTo(list, "grammar", 0, 2).map(x => x.id)).toEqual(["g2", "g3", "g1", "r1-1", "r1-2", "r2-1", "r2-2", "p1"])
    expect(moveBlockTo(list, "reading", 1, 0).map(x => x.id)).toEqual(["g1", "g2", "g3", "r2-1", "r2-2", "r1-1", "r1-2", "p1"])
    expect(moveBlockTo(list, "typed", 0, 1)).toEqual(list)
  })
  it("movePartTo and movePart drag whole parts, questions and passages along", () => {
    const list = [...grammar(2), phon("p1"), ...reading("r1", 2)]
    expect(buildParts(list).map(p => p.key)).toEqual(["grammar", "phonetics", "reading"])
    expect(movePartTo(list, 2, 0).map(x => x.id)).toEqual(["r1-1", "r1-2", "g1", "g2", "p1"])
    expect(movePartTo(list, 0, 1).map(x => x.id)).toEqual(["p1", "g1", "g2", "r1-1", "r1-2"])
    expect(movePart(list, "phonetics", -1).map(x => x.id)).toEqual(["p1", "g1", "g2", "r1-1", "r1-2"])
    expect(movePart(list, "reading", 1).map(x => x.id)).toEqual(list.map(x => x.id))
    expect(movePart(list, "match", 1).map(x => x.id)).toEqual(list.map(x => x.id))
    expect(orderedQuestions(list).map(x => x.id)).toEqual(list.map(x => x.id))
  })
  it("addQuestion joins an existing part or passage and puts a new part by the usual order among the parts there", () => {
    // The author put reading first; a new grammar question still goes with grammar.
    const list = [...reading("r1", 2), phon("p1"), ...grammar(1)]
    expect(addQuestion(list, q({ id: "g9" })).map(x => x.id)).toEqual(["r1-1", "r1-2", "p1", "g1", "g9"])
    expect(addQuestion(list, reading("r1", 3)[2]!).map(x => x.id)).toEqual(["r1-1", "r1-2", "r1-3", "p1", "g1"])
    expect(buildParts(addQuestion(list, reading("r2", 1)[0]!))[0]!.blocks).toHaveLength(2)
    // New parts: error sits after grammar and before reading in the usual order, so it goes before the first later part.
    const withError = addQuestion([...grammar(1), ...reading("r1", 1)], err("e1"))
    expect(buildParts(withError).map(p => p.key)).toEqual(["grammar", "error", "reading"])
    expect(buildParts(addQuestion(list, typed("t1"))).map(p => p.key)).toEqual(["reading", "phonetics", "grammar", "typed"])
    expect(addQuestion([], typed("t1")).map(x => x.id)).toEqual(["t1"])
    // Adding what is there already changes nothing.
    expect(addQuestion(list, list[0]!).map(x => x.id)).toEqual(list.map(x => x.id))
  })
  it("toExamQuestions maps rows, drops unscored sections and follows lesson order", () => {
    const row = (id: string, lesson: string, type: string, position: number, extra: Partial<PoolRow> = {}): PoolRow => ({
      id, position, prompt: "p", back: null, options: ["a", "b"], correct_option: 2, answers: null, words: null, explanation: null, tag: null,
      lesson_sections: { id: `s-${lesson}-${type}`, type, title: "T", body: "<p>text</p>", lesson_id: lesson, position: 1 }, ...extra,
    })
    const out = toExamQuestions([row("b", "7.2", "mcq", 1), row("c", "7.1", "cards", 1), row("a2", "7.1", "error", 2), row("a1", "7.1", "error", 1)], ["7.1", "7.2"])
    expect(out.map(x => x.id)).toEqual(["a1", "a2", "b"])
    expect(out[2]).toMatchObject({ type: "mcq", correct: 1, passage: "<p>text</p>", lessonId: "7.2" })
    expect(out[0]!.passage).toBe("")
  })
})

describe("drawing from a matrix", () => {
  const pool = [...grammar(12), phon("p1"), phon("p2"), phon("p3"), err("e1"), ...reading("r4", 4), ...reading("r5", 5), ...reading("r6", 6), typed("t1")]
  it("counts what the pool holds", () => {
    expect(poolCounts(pool)).toMatchObject({ grammar: 12, phonetics: 3, error: 1, reading: 15, passages: 3, typed: 1, match: 0 })
  })
  it("fills every part, keeps a passage whole and prefers the one with the wanted size", () => {
    const d = drawExam(pool, { ...emptyMatrix(), phonetics: 2, grammar: 10, error: 1, passages: 1, perPassage: 5 }, rngOf("seed"))
    const parts = buildParts(d.questions)
    expect(parts.map(p => [p.key, p.blocks.reduce((n, b) => n + b.questions.length, 0)])).toEqual([["phonetics", 2], ["grammar", 10], ["error", 1], ["reading", 5]])
    expect(parts[3]!.blocks[0]!.questions.map(x => x.id)).toEqual(["r5-1", "r5-2", "r5-3", "r5-4", "r5-5"])
    expect(d.short).toEqual({})
    expect(new Set(d.questions.map(x => x.id)).size).toBe(18)
  })
  it("is repeatable for a seed and differs between seeds", () => {
    const spec = { ...emptyMatrix(), grammar: 5 }
    const ids = (seed: string) => drawExam(pool, spec, rngOf(seed)).questions.map(x => x.id)
    expect(ids("a")).toEqual(ids("a"))
    expect(["b", "c", "d", "e"].some(s => ids(s).join() !== ids("a").join())).toBe(true)
  })
  it("reports what the pool cannot give", () => {
    const d = drawExam(pool, { ...emptyMatrix(), error: 3, passages: 5, perPassage: 0, match: 2 }, rngOf("s"))
    expect(d.short).toEqual({ error: 2, match: 2, reading: 2 })
    expect(d.questions.filter(x => partOf(x) === "reading")).toHaveLength(15)
  })
})

describe("exam codes", () => {
  it("codeSeries counts up; parseCodes drops blanks and repeats", () => {
    expect(codeSeries(4)).toEqual(["101", "102", "103", "104"])
    expect(codeSeries(2, 201)).toEqual(["201", "202"])
    expect(parseCodes(" 101, 102;103\n101  A1 ")).toEqual(["101", "102", "103", "A1"])
    expect(parseCodes("  ")).toEqual([])
  })
  it("roman numerals for part numbers", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9].map(roman)).toEqual(["I", "II", "III", "IV", "V", "VI", "VII", "IX"])
  })
})

describe("variants", () => {
  const parts = buildParts(exam())
  const ids = (v: ReturnType<typeof buildVariant>) => v.questions.map(x => x.q.id)

  it("is deterministic: the same code and mode give the same paper", () => {
    for (const mode of ["all", "options", "questions"] as const) {
      expect(buildVariant(parts, "101", mode)).toEqual(buildVariant(parts, "101", mode))
    }
    // …also when the base exam is rebuilt from the same questions.
    expect(buildVariant(buildParts(exam()), "203", "all")).toEqual(buildVariant(parts, "203", "all"))
  })
  it("different codes give different papers", () => {
    const [a, b] = buildVariants(parts, ["101", "102"], "all")
    expect(ids(a!)).not.toEqual(ids(b!))
    expect(answerMatrix([a!, b!]).rows[0]).not.toEqual(answerMatrix([a!, b!]).rows[1])
  })
  it("numbers questions 1…N and loses or repeats none, in every mode", () => {
    const all = exam().map(x => x.id).sort()
    for (const mode of ["all", "options", "questions", "base"] as const) {
      const v = buildVariant(parts, "104", mode)
      expect(v.questions.map(x => x.n)).toEqual(all.map((_, i) => i + 1))
      expect(ids(v).slice().sort()).toEqual(all)
    }
  })
  it("parts stay in order and questions never leave their part", () => {
    for (const code of ["101", "102", "103", "104"]) {
      const v = buildVariant(parts, code, "all")
      expect(v.parts.map(p => p.key)).toEqual(parts.map(p => p.key))
      v.parts.forEach((p, i) => {
        expect(p.blocks.flatMap(b => b.questions.map(x => x.q.id)).sort()).toEqual(parts[i]!.blocks.flatMap(b => b.questions.map(x => x.id)).sort())
        p.blocks.forEach(b => b.questions.forEach(x => expect(x.part).toBe(p.key)))
      })
    }
  })
  it("every code prints the parts in the order the author gave them", () => {
    const custom = buildParts(movePartTo(canonicalOrder(exam()), 3, 0))
    expect(custom.map(p => p.key)[0]).toBe("reading")
    for (const mode of ["all", "options", "questions"] as const) {
      for (const code of ["101", "102", "103"]) {
        expect(buildVariant(custom, code, mode).parts.map(p => p.key)).toEqual(custom.map(p => p.key))
      }
    }
    expect(buildVariant(custom, "", "base").questions[0]!.part).toBe("reading")
  })
  it("a passage keeps its questions together and in order", () => {
    const two = buildParts([...reading("r1", 5), ...reading("r2", 4), ...grammar(6)])
    for (const code of ["101", "102", "103", "104", "105", "106"]) {
      const v = buildVariant(two, code, "all")
      const blocks = v.parts.find(p => p.key === "reading")!.blocks
      expect(blocks.map(b => b.questions.map(x => x.q.id).join()).sort()).toEqual(["r1-1,r1-2,r1-3,r1-4,r1-5", "r2-1,r2-2,r2-3,r2-4"])
      for (const b of blocks) {
        expect(b.passage).toContain(`Passage ${b.questions[0]!.q.sectionId}`)
        expect(b.questions.map(x => x.n)).toEqual(b.questions.map((_, i) => b.questions[0]!.n + i))
      }
    }
    // Both orders of the two passages turn up across codes.
    const firsts = new Set(["101", "102", "103", "104", "105", "106", "107", "108"].map(c =>
      buildVariant(two, c, "all").parts.find(p => p.key === "reading")!.blocks[0]!.questions[0]!.q.sectionId))
    expect(firsts.size).toBe(2)
  })
  it("'options' keeps the base order of questions and only moves choices", () => {
    const base = buildVariant(parts, "", "base")
    const v = buildVariant(parts, "102", "options")
    expect(ids(v)).toEqual(ids(base))
    expect(v.questions.map(x => x.baseN)).toEqual(v.questions.map(x => x.n))
    expect(v.questions.some(x => x.q.type === "mcq" && x.options.join() !== x.q.options.join())).toBe(true)
  })
  it("'questions' moves questions inside parts and leaves every choice where it was", () => {
    const base = buildVariant(parts, "", "base")
    const v = buildVariant(parts, "102", "questions")
    expect(ids(v)).not.toEqual(ids(base))
    for (const x of v.questions) {
      if (x.q.type === "mcq") expect(x.options).toEqual(x.q.options)
      expect(x.key).toBe(x.baseKey)
    }
    // Choices do not depend on the code in this mode: matching columns and order chunks print as on the base exam.
    expect(v.parts.find(p => p.key === "match")!.blocks[0]!.choices).toEqual(base.parts.find(p => p.key === "match")!.blocks[0]!.choices)
  })
  it("a question's choices depend on its code and itself, not on the other questions", () => {
    const one = buildVariant(buildParts(grammar(8)), "101", "options").questions.find(x => x.q.id === "g3")!
    const other = buildVariant(buildParts(grammar(4)), "101", "options").questions.find(x => x.q.id === "g3")!
    expect(one.options).toEqual(other.options)
  })
  it("True / False and choices that point at other choices are not reordered", () => {
    expect(keepsOrder(["True", "False"])).toBe(true)
    expect(keepsOrder(["go", "goes", "Both A and B", "None of the above"])).toBe(true)
    expect(keepsOrder(["go", "goes", "going", "gone"])).toBe(false)
    const tf = q({ id: "tf", options: ["True", "False"], correct: 1 })
    const both = q({ id: "both", options: ["x", "y", "Both A and B", "z"], correct: 2 })
    for (const code of ["101", "102", "103", "104"]) {
      const v = buildVariant(buildParts([tf, both]), code, "all")
      for (const x of v.questions) expect(x.options).toEqual(x.q.options)
    }
  })
})

describe("answer key mapping", () => {
  const parts = buildParts(exam())
  it("the key letter always points at the right choice", () => {
    for (const mode of ["all", "options", "questions"] as const) {
      for (const code of ["101", "102", "103", "104", "999"]) {
        for (const x of buildVariant(parts, code, mode).questions) {
          if (x.q.type === "mcq") {
            expect(x.options["ABCD".indexOf(x.key)]).toBe(x.q.options[x.q.correct])
            expect(x.options.slice().sort()).toEqual(x.q.options.slice().sort())
          }
        }
      }
    }
  })
  it("error questions keep their chunks; the key is the wrong chunk's letter", () => {
    const x = buildVariant(parts, "101", "all").questions.find(v => v.q.id === "e1")!
    expect(x).toMatchObject({ options: ["She", "go", "to school", "every day"], key: "B", keyText: "go", objective: true })
  })
  it("matching: the right column holds every right side once and each key finds its pair", () => {
    for (const code of ["", "101", "102"]) {
      const v = buildVariant(parts, code, code ? "all" : "base")
      const b = v.parts.find(p => p.key === "match")!.blocks[0]!
      expect(b.choices.slice().sort()).toEqual(["right 1", "right 2", "right 3", "right 4"])
      for (const x of b.questions) expect(b.choices["ABCD".indexOf(x.key)]).toBe(x.q.back)
    }
    const same = buildParts([...pairs(2), q({ id: "m9", type: "match", prompt: "left 9", back: "right 1", options: [], correct: -1 })])
    const b = buildVariant(same, "101", "all").parts[0]!.blocks[0]!
    expect(b.choices).toHaveLength(2)
    expect(b.questions.filter(x => x.keyText === "right 1").map(x => x.key)).toHaveLength(2)
  })
  it("written answers: typed gives its first answer, order its sentence with scrambled chunks", () => {
    const v = buildVariant(parts, "101", "all")
    expect(v.questions.find(x => x.q.id === "t1")).toMatchObject({ key: "goes", keyText: "goes / is going", objective: false })
    const o = v.questions.find(x => x.q.id === "o1")!
    expect(o.key).toBe("I like green tea")
    expect(o.options.slice().sort()).toEqual(["I", "green", "like", "tea"])
    expect(o.options.join(" ")).not.toBe(o.key)
  })
  it("the pronunciation key text drops the underline marks", () => {
    expect(buildVariant(parts, "101", "all").questions.find(x => x.q.id === "p1")!.keyText).toBe("computer")
  })
  it("baseN and baseKey trace every question back to the base exam", () => {
    const base = buildVariant(parts, "", "base")
    const at = new Map(base.questions.map(x => [x.q.id, x]))
    const v = buildVariant(parts, "103", "all")
    expect(v.questions.map(x => x.baseN).sort((a, b) => a - b)).toEqual(base.questions.map(x => x.n))
    for (const x of v.questions) {
      expect(x.baseN).toBe(at.get(x.q.id)!.n)
      expect(x.baseKey).toBe(at.get(x.q.id)!.key)
      expect(x.keyText).toBe(at.get(x.q.id)!.keyText)
    }
  })
  it("answerMatrix: one row per code, one cell per question, equal to each paper's keys", () => {
    const variants = buildVariants(parts, ["101", "102", "103", "104"], "all")
    const m = answerMatrix(variants)
    expect(m.codes).toEqual(["101", "102", "103", "104"])
    expect(m.count).toBe(exam().length)
    expect(m.rows).toHaveLength(4)
    m.rows.forEach((row, i) => {
      expect(row).toHaveLength(m.count)
      variants[i]!.questions.forEach(x => expect(row[x.n - 1]).toBe(x.key))
    })
    expect(answerMatrix([])).toEqual({ codes: [], count: 0, rows: [] })
  })
})
