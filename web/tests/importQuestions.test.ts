import { describe, expect, it } from "vitest"
import { parseQuestions, questionProblems } from "~/utils/importQuestions"

describe("parseQuestions mcq", () => {
  it("reads options on their own lines and a key line", () => {
    const q = parseQuestions("1. She ___ to school every day.\nA. go\nB. goes\nC. going\nD. gone\n* Đáp án: B", "mcq")
    expect(q).toEqual([{ prompt: "She ___ to school every day.", options: ["go", "goes", "going", "gone"], correct: 2, explanation: "" }])
  })
  it("reads options on one line and an arrow key", () => {
    const [q] = parseQuestions("Câu 1: Tom ___ a book. A. read B. reads C. reading D. is read → B.", "mcq")
    expect(q).toMatchObject({ prompt: "Tom ___ a book.", options: ["read", "reads", "reading", "is read"], correct: 2 })
  })
  it("splits several questions and reads an explanation", () => {
    const q = parseQuestions("1. A ___\nA) x\nB) y\nAnswer: a\nGiải thích: vì x\n\n2. B ___\nA. p\nB. q\nĐáp án: B", "mcq")
    expect(q.map(x => x.correct)).toEqual([1, 2])
    expect(q[0]!.explanation).toBe("vì x")
  })
  it("keeps a missing key as 0 and reports it", () => {
    const [q] = parseQuestions("1. Q?\nA. a\nB. b", "mcq")
    expect(q!.correct).toBe(0)
    expect(questionProblems(q!, "mcq")).toEqual(["noKey"])
  })
  it("does not take an article before a dot for an option", () => {
    const [q] = parseQuestions("1. Choose a. Then go.\nA. one\nB. two\nĐáp án: A", "mcq")
    expect(q!.options).toEqual(["one", "two"])
  })
})

describe("parseQuestions tf and error", () => {
  it("true / false keys in English and Vietnamese", () => {
    const q = parseQuestions("1. Nam likes tea. → True\n2. Lan is ten.\nĐáp án: Sai", "tf")
    expect(q.map(x => x.correct)).toEqual([1, 2])
    expect(q[0]!.options).toEqual(["True", "False"])
  })
  it("marked parts of a sentence, text before (A) joins A", () => {
    const [q] = parseQuestions("1. She (A) go (B) to school (C) every day.\nĐáp án: A", "error")
    expect(q!.options).toEqual(["She go", "to school", "every day."])
    expect(q!.correct).toBe(1)
  })
})
