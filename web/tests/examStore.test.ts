import { describe, expect, it } from "vitest"
import { cleanHints, docInfoOf, emptyInfo, type ExamDraft } from "~/utils/examDraft"
import type { ExamQuestion } from "~/utils/examGenerator"
import {
  addShare, codeCountOf, copyExamSet, copyTitle, createExamSet, deleteExamSet, draftOf, examAccess, getExamSet, listShares, removeShare, rowOf,
  saveProblem, searchStaff, setShareEdit, snapshotOf, staffByIds, updateExamSet,
} from "~/utils/examStore"
import { memoryClient } from "./helpers/memoryClient"

const question = (id: string): ExamQuestion => ({
  id, type: "mcq", prompt: "<p>She ___ to school.</p>", options: ["go", "goes", "going"], correct: 1, answers: [], words: [], back: "",
  explanation: "<p>he/she/it + V-s</p>", tag: "present simple", sectionId: "s1", sectionTitle: "Chọn đáp án đúng", passage: "<p>Text</p>", lessonId: "6.1",
})
const draft = (over: Partial<ExamDraft> = {}): ExamDraft => ({
  examId: null,
  info: { ...emptyInfo(), title: "  Đề giữa kỳ 1 ", courseId: "lop-6", school: "THCS Nguyễn Du", schoolYear: "2026 – 2027", minutes: 45 },
  questions: [question("q1"), question("q2")],
  codesText: " 101, 102 ",
  mode: "options",
  sheetAt: "bottom",
  partHints: {},
  ...over,
})
const setup = (seed: Record<string, Record<string, unknown>[]> = {}) => memoryClient(seed, { autoId: ["exam_sets"] })

describe("exam set rows", () => {
  it("rowOf trims text, keeps the questions as a snapshot and bounds the minutes", () => {
    const row = rowOf(draft({ info: { ...draft().info, minutes: 9999 } }))
    expect(row).toMatchObject({ title: "Đề giữa kỳ 1", course_id: "lop-6", codes: "101, 102", mode: "options", sheet_at: "bottom", minutes: 600 })
    expect(row.questions).toEqual(draft().questions)
    expect(rowOf(draft({ info: { ...draft().info, minutes: 0, courseId: "" } }))).toMatchObject({ minutes: 1, course_id: null })
  })
  it("a row opens as the same draft it was saved from", () => {
    const stored = { ...rowOf(draft()), id: "e1" } as Parameters<typeof draftOf>[0]
    const back = draftOf(stored)
    expect(back).toMatchObject({ examId: "e1", codesText: "101, 102", mode: "options", sheetAt: "bottom" })
    expect(back.info).toMatchObject({ title: "Đề giữa kỳ 1", courseId: "lop-6", school: "THCS Nguyễn Du", minutes: 45 })
    expect(back.questions).toEqual(draft().questions)
    expect(snapshotOf(back)).toBe(snapshotOf(draft()))
  })
  it("part hints are stored without blanks, unknown parts and extra spaces, and come back as written", () => {
    const hints = { phonetics: "  Chọn từ\n  có phần gạch chân khác.  ", grammar: "   ", reading: "Đọc đoạn văn.", nonsense: "x" } as never
    const row = rowOf(draft({ partHints: hints }))
    expect(row.part_hints).toEqual({ phonetics: "Chọn từ có phần gạch chân khác.", reading: "Đọc đoạn văn." })
    expect(draftOf({ ...row, id: "e1" } as Parameters<typeof draftOf>[0]).partHints).toEqual(row.part_hints)
    expect(rowOf(draft()).part_hints).toEqual({})
    expect(snapshotOf(draft({ partHints: { reading: "A" } }))).not.toBe(snapshotOf(draft()))
    expect(snapshotOf(draft({ partHints: { reading: " " } }))).toBe(snapshotOf(draft()))
  })
  it("cleanHints copes with anything and caps the length", () => {
    expect(cleanHints(null)).toEqual({})
    expect(cleanHints("text")).toEqual({})
    expect(cleanHints({ error: 5, order: "ok" })).toEqual({ order: "ok" })
    expect(cleanHints({ typed: "x".repeat(500) }).typed).toHaveLength(300)
    expect(docInfoOf(draft().info, "Lớp 6", "Test", { match: " Nối " }).partHints).toEqual({ match: "Nối" })
  })
  it("draftOf survives odd stored values", () => {
    const back = draftOf({ ...rowOf(draft()), id: "e1", mode: "weird", sheet_at: "weird", questions: { not: "an array" }, course_id: null, part_hints: ["x"] } as never)
    expect(back).toMatchObject({ mode: "all", sheetAt: "top", questions: [], partHints: {} })
    expect(back.info.courseId).toBe("")
  })
  it("the snapshot changes with every stored field and only with those", () => {
    const base = snapshotOf(draft())
    expect(snapshotOf(draft({ examId: "other" }))).toBe(base)
    expect(snapshotOf(draft({ codesText: "101" }))).not.toBe(base)
    expect(snapshotOf(draft({ questions: [question("q1")] }))).not.toBe(base)
    expect(snapshotOf(draft({ mode: "all" }))).not.toBe(base)
    expect(snapshotOf(draft({ info: { ...draft().info, term: "HK1" } }))).not.toBe(base)
  })
  it("saveProblem asks for a title and keeps within the limits", () => {
    expect(saveProblem(draft())).toBeNull()
    expect(saveProblem(draft({ info: { ...draft().info, title: "  " } }))).toBe("examPage.needTitle")
    expect(saveProblem(draft({ codesText: "1,".repeat(300) }))).toBe("examPage.tooManyCodes")
    expect(saveProblem(draft({ questions: Array.from({ length: 301 }, (_, i) => question(`q${i}`)) }))).toBe("examPage.tooManyQuestions")
  })
  it("codeCountOf counts the codes", () => {
    expect(codeCountOf("101, 102;103 101")).toBe(3)
    expect(codeCountOf("")).toBe(0)
  })
})

describe("exam set store", () => {
  it("create → get → update → delete", async () => {
    const { client, tables } = setup()
    const made = await createExamSet(client, draft())
    expect(made.error).toBeNull()
    expect(made.id).toBeTruthy()
    expect(tables.exam_sets).toHaveLength(1)

    const row = await getExamSet(client, made.id!)
    expect(row).toMatchObject({ id: made.id, title: "Đề giữa kỳ 1" })
    expect(await getExamSet(client, "missing")).toBeNull()

    const changed = draft({ examId: made.id, info: { ...draft().info, title: "Đề cuối kỳ" }, questions: [question("q9")] })
    expect(await updateExamSet(client, made.id!, changed)).toBeNull()
    expect(tables.exam_sets![0]).toMatchObject({ title: "Đề cuối kỳ" })
    expect((tables.exam_sets![0]!.questions as ExamQuestion[]).map(q => q.id)).toEqual(["q9"])

    expect(await deleteExamSet(client, made.id!)).toBeNull()
    expect(tables.exam_sets).toHaveLength(0)
  })
  it("nothing is written when the draft is not valid", async () => {
    const { client, tables, log } = setup()
    const made = await createExamSet(client, draft({ info: { ...draft().info, title: "" } }))
    expect(made).toEqual({ id: null, error: "examPage.needTitle" })
    expect(await updateExamSet(client, "x", draft({ info: { ...draft().info, title: "" } }))).toBe("examPage.needTitle")
    expect(tables.exam_sets ?? []).toHaveLength(0)
    expect(log).toEqual([])
  })
  it("an update or delete that changes no row (not yours, or already gone) is reported", async () => {
    const { client } = setup()
    expect(await updateExamSet(client, "gone", draft())).toBe("examPage.saveNothing")
    expect(await deleteExamSet(client, "gone")).toBe("examPage.deleteNothing")
  })
  it("a database error comes back as a message and leaves the data alone", async () => {
    const { client, tables } = memoryClient({ exam_sets: [{ id: "e1", title: "keep" }] }, { fail: ["exam_sets.insert", "exam_sets.update", "exam_sets.delete"] })
    expect((await createExamSet(client, draft())).error).toBe("common.notSaved")
    expect(await updateExamSet(client, "e1", draft())).toBe("common.notSaved")
    expect(await deleteExamSet(client, "e1")).toBe("common.notSaved")
    expect(tables.exam_sets).toEqual([{ id: "e1", title: "keep" }])
  })
  it("get reports a read error by throwing", async () => {
    const { client } = memoryClient({}, { fail: ["exam_sets.select"] })
    await expect(getExamSet(client, "e1")).rejects.toThrow("boom")
  })
})

describe("who may do what with a set", () => {
  const set = { owner_id: "owner", exam_set_shares: [{ user_id: "viewer", can_edit: false }, { user_id: "editor", can_edit: true }] }
  it("the owner and an admin manage; a person it was shared with edits only when allowed", () => {
    expect(examAccess(set, "owner", false)).toBe("manage")
    expect(examAccess(set, "someone", true)).toBe("manage")
    expect(examAccess(set, "editor", false)).toBe("edit")
    expect(examAccess(set, "viewer", false)).toBe("view")
    expect(examAccess(set, "stranger", false)).toBe("view")
    expect(examAccess({ owner_id: "owner" }, undefined, false)).toBe("view")
    expect(examAccess({ owner_id: "owner", exam_set_shares: null }, "owner", false)).toBe("manage")
  })
})

describe("copying a set", () => {
  it("makes a new set of the caller's own with the same paper and a marked title", async () => {
    const { client, tables } = setup()
    const made = await createExamSet(client, draft({ partHints: { reading: "Đọc kỹ." } }))
    const copy = await copyExamSet(client, made.id!)
    expect(copy.error).toBeNull()
    expect(copy.id).not.toBe(made.id)
    expect(tables.exam_sets).toHaveLength(2)
    const [a, b] = tables.exam_sets!
    expect(b!.title).toBe(copyTitle("Đề giữa kỳ 1"))
    expect(b!.title).toBe("Đề giữa kỳ 1 (examList.copySuffix)")
    expect({ ...b, id: 0, title: 0 }).toEqual({ ...a, id: 0, title: 0 })
  })
  it("keeps the title within the database limit and reports a set that is not there", async () => {
    expect(copyTitle("x".repeat(200)).length).toBeLessThanOrEqual(200)
    const { client } = setup()
    expect(await copyExamSet(client, "gone")).toEqual({ id: null, error: "examPage.missing" })
  })
})

describe("sharing", () => {
  const withShares = () => memoryClient({}, { unique: { exam_set_shares: ["exam_id", "user_id"] } })
  it("share → list → allow editing → stop sharing", async () => {
    const { client, tables } = withShares()
    expect(await addShare(client, "e1", "u1", false)).toBeNull()
    expect(await addShare(client, "e1", "u2", true)).toBeNull()
    expect(tables.exam_set_shares).toMatchObject([{ exam_id: "e1", user_id: "u1", can_edit: false }, { exam_id: "e1", user_id: "u2", can_edit: true }])
    expect((await listShares(client, "e1")).map(s => s.user_id)).toEqual(["u1", "u2"])
    expect(await listShares(client, "other")).toEqual([])

    expect(await setShareEdit(client, "e1", "u1", true)).toBeNull()
    expect(tables.exam_set_shares![0]!.can_edit).toBe(true)
    expect(await removeShare(client, "e1", "u2")).toBeNull()
    expect(tables.exam_set_shares).toHaveLength(1)
  })
  it("a repeated share is refused by the database and reported", async () => {
    const { client, tables } = withShares()
    await addShare(client, "e1", "u1", false)
    expect(await addShare(client, "e1", "u1", true)).toBe("examShare.addFailed")
    expect(tables.exam_set_shares).toHaveLength(1)
  })
  it("a change or removal that touches no row (no such share, or RLS refused) is reported", async () => {
    const { client } = withShares()
    expect(await setShareEdit(client, "e1", "nobody", true)).toBe("examShare.gone")
    expect(await removeShare(client, "e1", "nobody")).toBe("examShare.gone")
  })
  it("database errors come back as messages", async () => {
    const { client } = memoryClient({}, { fail: ["exam_set_shares.insert", "exam_set_shares.update", "exam_set_shares.delete", "exam_set_shares.select"] })
    expect(await addShare(client, "e1", "u1", false)).toBe("examShare.addFailed")
    expect(await setShareEdit(client, "e1", "u1", true)).toBe("common.notSaved")
    expect(await removeShare(client, "e1", "u1")).toBe("common.notSaved")
    await expect(listShares(client, "e1")).rejects.toThrow("boom")
  })
  it("the staff directory is asked by search term or by ids, and only when there is something to ask", async () => {
    const calls: Record<string, unknown>[] = []
    const people = [{ id: "u1", full_name: "An", username: "gv.01", role: "teacher" }]
    const { client } = memoryClient({}, { rpc: { staff_directory: (args) => { calls.push(args); return people } } })
    expect(await searchStaff(client, "an")).toEqual(people)
    expect(await staffByIds(client, ["u1"])).toEqual(people)
    expect(await staffByIds(client, [])).toEqual([])
    expect(calls).toEqual([{ term: "an" }, { ids: ["u1"] }])
    const failing = memoryClient({}, { fail: ["rpc.staff_directory"] }).client
    await expect(searchStaff(failing, "x")).rejects.toThrow("boom")
    await expect(staffByIds(failing, ["u1"])).rejects.toThrow("boom")
  })
})
