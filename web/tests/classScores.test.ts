import { describe, expect, it } from "vitest"
import { attendanceScore, buildClassScores, columnsOf, countStatuses, meanOf, parseScore, scoreBand, scoreText, termOf } from "~/utils/classScores"

const student = (id: string, name: string) => ({ user_id: id, full_name: name, username: null, email: null })

describe("termOf", () => {
  it("August to December is term 1, January to July term 2", () => {
    expect(termOf("2026-08-01")).toBe(1)
    expect(termOf("2026-12-31")).toBe(1)
    expect(termOf("2027-01-05")).toBe(2)
    expect(termOf("2027-07-20")).toBe(2)
    expect(termOf(new Date(2026, 10, 20))).toBe(1)
  })
})

describe("attendanceScore", () => {
  it("is null before any session", () => {
    expect(attendanceScore(countStatuses([]))).toBeNull()
  })
  it("takes 1 off per absence, half per late, nothing for excused, never below 0", () => {
    expect(attendanceScore(countStatuses(["present", "excused", "excused"]))).toBe(10)
    expect(attendanceScore(countStatuses(["absent", "late", "present"]))).toBe(8.5)
    expect(attendanceScore(countStatuses(Array(12).fill("absent")))).toBe(0)
  })
})

describe("parseScore and meanOf", () => {
  it("reads marks 0-10 with a dot or a comma, empty as null", () => {
    expect(parseScore("8,5")).toBe(8.5)
    expect(parseScore(" 10 ")).toBe(10)
    expect(parseScore("")).toBeNull()
    expect(parseScore("11")).toBeNaN()
    expect(parseScore("7.125")).toBeNaN()
    expect(parseScore("abc")).toBeNaN()
  })
  it("rounds means to two decimals", () => {
    expect(meanOf([7, 8, 8])).toBe(7.67)
    expect(meanOf([])).toBeNull()
    expect(scoreText(7.5)).toBe("7.5")
    expect(scoreText(null)).toBe("-")
  })
})

describe("buildClassScores", () => {
  const data = {
    sessions: [{ id: "s1", held_on: "2026-11-02", term: 1, note: null }, { id: "s2", held_on: "2026-11-09", term: 1, note: null }],
    attendance: [
      { session_id: "s1", student_id: "a", status: "present" as const },
      { session_id: "s2", student_id: "a", status: "absent" as const },
      { session_id: "s1", student_id: "b", status: "late" as const },
      { session_id: "old", student_id: "b", status: "absent" as const },
    ],
    points: [
      { id: "p1", student_id: "a", points: 1, note: null, created_at: "" },
      { id: "p2", student_id: "a", points: 2, note: null, created_at: "" },
    ],
    columns: [
      { id: "h1", kind: "homework" as const, title: "BT 2", held_on: "2026-11-10", term: 1 },
      { id: "o1", kind: "oral" as const, title: "KT", held_on: "2026-11-03", term: 1 },
      { id: "h0", kind: "homework" as const, title: "BT 1", held_on: "2026-11-01", term: 1 },
    ],
    entries: [
      { column_id: "o1", student_id: "a", score: 9 },
      { column_id: "h0", student_id: "a", score: 6 },
      { column_id: "h1", student_id: "a", score: 7 },
      { column_id: "h1", student_id: "b", score: 10 },
    ],
  }
  const rows = buildClassScores([student("b", "Bình"), student("a", "An"), { ...student("x", "X"), user_id: null }], data)

  it("one row per student, by name", () => {
    expect(rows.map(r => r.name)).toEqual(["An", "Bình"])
  })
  it("counts attendance only for the term's sessions", () => {
    expect(rows[0]!.counts).toEqual({ present: 1, late: 0, excused: 0, absent: 1 })
    expect(rows[0]!.attendance).toBe(9)
    expect(rows[1]!.attendance).toBe(9.5)
  })
  it("sums points and averages each kind of marks", () => {
    expect(rows[0]!.points).toBe(3)
    expect(rows[1]!.points).toBe(0)
    expect(rows[0]!.averages).toEqual({ oral: 9, homework: 6.5 })
    expect(rows[1]!.averages).toEqual({ oral: null, homework: 10 })
    expect(rows[0]!.marks.get("h1")).toBe(7)
  })
  it("lists a kind's columns oldest first", () => {
    expect(columnsOf(data.columns, "homework").map(c => c.id)).toEqual(["h0", "h1"])
  })
})

describe("scoreBand", () => {
  it("reads a mark as good from 8, mid from 5, low below, none without a mark", () => {
    expect([10, 8, 7.99, 5, 4.99, 0].map(scoreBand)).toEqual(["good", "good", "mid", "mid", "low", "low"])
    expect(scoreBand(null)).toBe("none")
  })
})
