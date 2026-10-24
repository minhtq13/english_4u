import { describe, expect, it } from "vitest"
import { countStates, lessonStates, type AttemptLike, type PersonLike } from "~/utils/lessonStatus"

const person = (id: string, name: string): PersonLike => ({ user_id: id, full_name: name, username: null, email: null })
const attempt = (userId: string, status: AttemptLike["status"]): AttemptLike =>
  ({ id: `a-${userId}`, user_id: userId, status, score: { ok: 1, done: 2, total: 2 }, submitted_at: null, updated_at: "2026-10-24T00:00:00Z" })

const an = person("an", "Nguyễn Văn An")
const binh = person("binh", "Trần Thị Bình")
const chi = person("chi", "Lê Đức Chi")
const dung = person("dung", "Phạm Dũng")
const students = [an, binh, chi, dung]
const states = (rows: ReturnType<typeof lessonStates>) => rows.map(r => `${r.student.full_name}:${r.state}`)

describe("lessonStates", () => {
  it("reads each student's state from their attempt", () => {
    const rows = lessonStates(students, [attempt("an", "graded"), attempt("binh", "submitted"), attempt("chi", "in_progress")], { forAll: true })
    expect(states(rows)).toEqual([
      "Trần Thị Bình:waiting", "Lê Đức Chi:inProgress", "Phạm Dũng:notStarted", "Nguyễn Văn An:graded",
    ])
  })
  it("keeps the attempt with the student, and none for who has not started", () => {
    const rows = lessonStates(students, [attempt("an", "graded")], { forAll: true })
    expect(rows.find(r => r.student === an)!.attempt!.id).toBe("a-an")
    expect(rows.find(r => r.student === dung)!.attempt).toBeNull()
  })
  it("marks who the lesson is not open to, when only chosen students may work", () => {
    const rows = lessonStates(students, [], { forAll: false, pickedIds: new Set(["an", "chi"]) })
    expect(states(rows)).toEqual(["Lê Đức Chi:notStarted", "Nguyễn Văn An:notStarted", "Phạm Dũng:locked", "Trần Thị Bình:locked"])
  })
  it("lets an attempt win over 'not open to them', and treats no list as nobody picked", () => {
    const rows = lessonStates(students, [attempt("dung", "submitted")], { forAll: false })
    expect(states(rows)).toEqual(["Phạm Dũng:waiting", "Lê Đức Chi:locked", "Nguyễn Văn An:locked", "Trần Thị Bình:locked"])
  })
  it("ignores attempts of people who are not in the class", () => {
    const rows = lessonStates([an], [attempt("someone-else", "submitted")], { forAll: true })
    expect(states(rows)).toEqual(["Nguyễn Văn An:notStarted"])
  })
  it("counts every state, zero included, and does not touch the lists it is given", () => {
    const list = [attempt("an", "graded")]
    const rows = lessonStates(students, list, { forAll: true })
    expect(countStates(rows)).toEqual({ waiting: 0, inProgress: 0, notStarted: 3, graded: 1, locked: 0 })
    expect(students.map(s => s.user_id)).toEqual(["an", "binh", "chi", "dung"])
  })
})
