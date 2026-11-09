import { describe, expect, it } from "vitest"
import { bandOf, buildGradebook } from "~/utils/gradebook"
import { Workbook } from "exceljs"
import { fileSlug, xlsxBytes } from "~/utils/spreadsheet"

const student = (id: string, name: string) => ({ user_id: id, full_name: name, username: null, email: null })
const lessons = [{ id: "6.1", label: "Unit 1", title: "A", total: 10 }, { id: "6.2", label: "Unit 2", title: "B", total: 20 }]
const attempt = (user: string, lesson: string, status: "in_progress" | "submitted" | "graded", ok = 0) =>
  ({ id: `${user}-${lesson}`, user_id: user, lesson_id: lesson, status, score: { ok, done: 10, total: 10 } })

describe("buildGradebook", () => {
  const book = buildGradebook(
    [student("b", "Bình"), student("a", "An")],
    lessons,
    [attempt("a", "6.1", "graded", 9), attempt("a", "6.2", "submitted", 10), attempt("b", "6.1", "in_progress")],
  )
  it("orders students by name and keeps lesson order", () => {
    expect(book.rows.map(r => r.name)).toEqual(["An", "Bình"])
    expect(book.lessons.map(l => l.id)).toEqual(["6.1", "6.2"])
  })
  it("a cell is a percent of the lesson's questions once submitted, and a state before", () => {
    const an = book.rows[0]!
    expect(an.cells[0]).toMatchObject({ state: "graded", percent: 90 })
    expect(an.cells[1]).toMatchObject({ state: "waiting", percent: 50 })
    expect(book.rows[1]!.cells[0]).toMatchObject({ state: "working", percent: null })
    expect(book.rows[1]!.cells[1]).toMatchObject({ state: "none", attemptId: null })
  })
  it("averages count only submitted work", () => {
    expect(book.rows[0]!.average).toBe(70)
    expect(book.rows[1]!.average).toBeNull()
    expect(book.averages).toEqual([90, 50])
  })
  it("bands", () => {
    expect([bandOf(null), bandOf(90), bandOf(60), bandOf(10)]).toEqual(["none", "good", "mid", "low"])
  })
})

describe("spreadsheet", () => {
  async function sheetOf(spec: Parameters<typeof xlsxBytes>[0]) {
    const book = new Workbook()
    await book.xlsx.load(await xlsxBytes(spec))
    return book.worksheets[0]!
  }
  it("puts the title and the note above the header, then the data", async () => {
    const ws = await sheetOf({ sheetName: "6T1", title: "Bảng điểm", note: "Điểm là %", rows: [["Học sinh", "Bài 1"], ["An", 90]], percentColumns: [1] })
    expect(ws.getRow(1).getCell(1).value).toBe("Bảng điểm")
    expect(ws.getRow(2).getCell(1).value).toBe("Điểm là %")
    expect(ws.getRow(4).getCell(1).value).toBe("Học sinh")
    expect(ws.getRow(5).getCell(1).value).toBe("An")
    expect(ws.getRow(5).getCell(2).value).toBe(90)
    expect(ws.getRow(5).getCell(2).numFmt).toBe('0"%"')
  })
  it("keeps a pasted formula as text and leaves empty cells empty", async () => {
    const ws = await sheetOf({ sheetName: "x", rows: [["Tên", "Điểm"], ["=SUM(A1)", null]] })
    expect(ws.getRow(2).getCell(1).value).toBe("=SUM(A1)")
    expect(ws.getRow(2).getCell(2).value).toBeNull()
  })
  it("cleans a sheet name Excel would refuse", async () => {
    const ws = await sheetOf({ sheetName: "6/T1: [x]", rows: [["a"]] })
    expect(ws.name).toBe("6 T1   x ")
  })
  it("makes a plain file name", () => {
    expect(fileSlug("Bảng điểm 6T1 – Đề 1")).toBe("Bang-diem-6T1-De-1")
  })
})
