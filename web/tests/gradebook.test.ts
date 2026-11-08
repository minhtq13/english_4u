import { describe, expect, it } from "vitest"
import { bandOf, buildGradebook } from "~/utils/gradebook"
import { csvCell, fileSlug, toCsv } from "~/utils/csv"

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

describe("csv", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""')
    expect(csvCell("x\ny")).toBe('"x\ny"')
    expect(csvCell(null)).toBe("")
    expect(csvCell(7)).toBe("7")
  })
  it("defuses spreadsheet formulas in text", () => {
    expect(csvCell("=SUM(A1)")).toBe('"\t=SUM(A1)"')
    expect(csvCell(-3)).toBe("-3")
  })
  it("starts with a byte-order mark and ends rows with CRLF", () => {
    expect(toCsv([["Tên", "Điểm"], ["An", 9]])).toBe("﻿Tên,Điểm\r\nAn,9\r\n")
  })
  it("makes a plain file name", () => {
    expect(fileSlug("Bảng điểm 6T1 – Đề 1")).toBe("Bang-diem-6T1-De-1")
  })
})
