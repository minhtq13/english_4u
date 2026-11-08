import { describe, expect, it } from "vitest"
import { daysThisWeek, heatmap, heatmapFrom, streakOf, vnToday, weekStart } from "~/utils/streak"

// 2026-11-08 is a Sunday.
const today = "2026-11-08"

describe("streakOf", () => {
  it("counts days in a row up to today", () => {
    expect(streakOf(["2026-11-06", "2026-11-07", "2026-11-08"], today)).toEqual({ current: 3, best: 3, doneToday: true })
  })
  it("a streak survives a day not studied yet, if yesterday counted", () => {
    expect(streakOf(["2026-11-06", "2026-11-07"], today)).toEqual({ current: 2, best: 2, doneToday: false })
  })
  it("is broken by a missed day, and keeps the best run", () => {
    expect(streakOf(["2026-10-01", "2026-10-02", "2026-10-03", "2026-11-07"], today)).toMatchObject({ current: 1, best: 3 })
    expect(streakOf(["2026-11-05"], today)).toMatchObject({ current: 0, best: 1 })
    expect(streakOf([], today)).toEqual({ current: 0, best: 0, doneToday: false })
  })
})

describe("weeks", () => {
  it("a week starts on Monday", () => {
    expect(weekStart("2026-11-08")).toBe("2026-11-02")
    expect(weekStart("2026-11-02")).toBe("2026-11-02")
    expect(weekStart("2026-11-04")).toBe("2026-11-02")
  })
  it("counts the study days of this week only", () => {
    expect(daysThisWeek(["2026-11-01", "2026-11-02", "2026-11-05", "2026-11-05", "2026-11-08"], today)).toBe(3)
  })
  it("draws columns of 7 days ending with this week, future days marked", () => {
    const cols = heatmap(["2026-11-03"], "2026-11-04", 2)
    expect(cols).toHaveLength(2)
    expect(cols[0]![0]!.date).toBe("2026-10-26")
    expect(cols[1]![0]!.date).toBe("2026-11-02")
    expect(cols[1]![1]).toEqual({ date: "2026-11-03", active: true, future: false })
    expect(cols[1]![3]!.future).toBe(true)
    expect(heatmapFrom("2026-11-04", 2)).toBe("2026-10-26")
  })
  it("tells today's date in Vietnam", () => {
    expect(vnToday(Date.parse("2026-11-07T20:00:00Z"))).toBe("2026-11-08")
    expect(vnToday(Date.parse("2026-11-07T16:30:00Z"))).toBe("2026-11-07")
  })
})
