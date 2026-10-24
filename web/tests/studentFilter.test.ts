import { describe, expect, it } from "vitest"
import { filterStudents, type StudentLike } from "~/utils/studentFilter"
import { fold } from "~/utils/text"

const now = Date.parse("2026-10-24T10:00:00Z")
const day = 864e5
const student = (name: string, init: Partial<StudentLike> = {}): StudentLike => ({
  full_name: name, email: `${name}@x.vn`, username: null, submitted: 0, waiting: 0, ok: 0, done: 0, last_activity: null, ...init,
})
const ago = (days: number) => new Date(now - days * day).toISOString()
const names = (rows: StudentLike[]) => rows.map(s => s.full_name)

const an = student("Nguyễn Văn An", { submitted: 3, waiting: 2, ok: 9, done: 10, last_activity: ago(1) })
const binh = student("Trần Thị Bình", { submitted: 2, waiting: 0, ok: 3, done: 10, last_activity: ago(10) })
const chi = student("Lê Đức Chi", { submitted: 0 })
const dung = student("Phạm Dũng", { submitted: 1, waiting: 1, ok: 0, done: 0, last_activity: ago(2), username: "hs.04" })
const all = [dung, chi, binh, an]
const by = (f: Partial<Parameters<typeof filterStudents>[1]>) => names(filterStudents(all, { q: "", status: "", sort: "name", ...f }, now))

describe("fold", () => {
  it("drops Vietnamese accents and đ", () => expect(fold("Đức Nguyễn Luyện đề")).toBe("duc nguyen luyen de"))
})

describe("filterStudents", () => {
  it("finds a name, username or email without accents or capitals", () => {
    expect(by({ q: "nguyen van" })).toEqual(["Nguyễn Văn An"])
    expect(by({ q: "DUC" })).toEqual(["Lê Đức Chi"])
    expect(by({ q: "hs.04" })).toEqual(["Phạm Dũng"])
    expect(by({ q: "binh@x" })).toEqual(["Trần Thị Bình"])
    expect(by({ q: "không có ai" })).toEqual([])
  })
  it("keeps who has work waiting for a grade", () => {
    expect(by({ status: "waiting" })).toEqual(["Nguyễn Văn An", "Phạm Dũng"])
  })
  it("keeps who has submitted nothing", () => {
    expect(by({ status: "none" })).toEqual(["Lê Đức Chi"])
  })
  it("keeps who has been away for a week or more, including who never came", () => {
    expect(by({ status: "idle" })).toEqual(["Lê Đức Chi", "Trần Thị Bình"])
  })
  it("combines the search with a status", () => {
    expect(by({ q: "an", status: "waiting" })).toEqual(["Nguyễn Văn An"])
  })
})

describe("sorting", () => {
  it("by name, as a Vietnamese reader expects", () => {
    expect(by({ sort: "name" })).toEqual(["Lê Đức Chi", "Nguyễn Văn An", "Phạm Dũng", "Trần Thị Bình"])
  })
  it("lowest accuracy first; nobody with answers yet goes last", () => {
    expect(by({ sort: "accuracy" })).toEqual(["Trần Thị Bình", "Nguyễn Văn An", "Lê Đức Chi", "Phạm Dũng"])
  })
  it("most recently active first; who never came goes last", () => {
    expect(by({ sort: "activity" })).toEqual(["Nguyễn Văn An", "Phạm Dũng", "Trần Thị Bình", "Lê Đức Chi"])
  })
  it("most work to grade first, then by name", () => {
    expect(by({ sort: "waiting" })).toEqual(["Nguyễn Văn An", "Phạm Dũng", "Lê Đức Chi", "Trần Thị Bình"])
  })
  it("does not change the list it was given", () => {
    const before = names(all)
    by({ sort: "accuracy" })
    expect(names(all)).toEqual(before)
  })
})
