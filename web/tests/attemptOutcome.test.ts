import { describe, expect, it } from "vitest"
import { accessOf, attemptOutcome, isClosed, percentOf, toScore } from "~/utils/attemptOutcome"

const now = Date.parse("2026-10-24T10:00:00Z")
const past = "2026-10-24T09:59:00Z"
const future = "2026-10-25T10:00:00Z"
const setting = { for_all: true, closed: false, due_at: null as string | null }

describe("isClosed / accessOf", () => {
  it("treats a passed deadline as closed even before pg_cron closes the lesson", () => {
    expect(isClosed({ closed: false, due_at: past }, now)).toBe(true)
    expect(accessOf({ ...setting, due_at: past }, false, now)).toBe("closed")
  })
  it("is open before the deadline, for the whole class or for a chosen student", () => {
    expect(accessOf({ ...setting, due_at: future }, false, now)).toBe("open")
    expect(accessOf({ ...setting, for_all: false }, true, now)).toBe("open")
    expect(accessOf({ ...setting, for_all: false }, false, now)).toBe("locked")
  })
  it("a closed lesson stays closed whatever the deadline", () => {
    expect(accessOf({ ...setting, closed: true, due_at: future }, true, now)).toBe("closed")
  })
})

describe("attemptOutcome", () => {
  const score = { ok: 7, done: 9, total: 10 }
  it("never shows a score while the student is still working", () => {
    expect(attemptOutcome({ status: "in_progress", score }, "teacher").released).toBe(false)
    expect(attemptOutcome({ status: "in_progress", score }, "student", true).released).toBe(false)
  })
  it("shows teachers the score as soon as it is submitted", () => {
    expect(attemptOutcome({ status: "submitted", score }, "teacher").score).toEqual(score)
  })
  it("shows a student the score once graded, or at submit when the class shows results at once", () => {
    expect(attemptOutcome({ status: "submitted", score }, "student").score).toBeNull()
    expect(attemptOutcome({ status: "submitted", score }, "student", true).score).toEqual(score)
    expect(attemptOutcome({ status: "graded", score }, "student").score).toEqual(score)
  })
  it("labels released submitted work as submitted for the student, not waiting", () => {
    expect(attemptOutcome({ status: "submitted", score }, "student", true).label).toBe("progress.submitted")
    expect(attemptOutcome({ status: "submitted", score }, "student").label).toBe("attemptStatus.submitted")
    expect(attemptOutcome({ status: "submitted", score }, "teacher").label).toBe("attemptStatus.submitted")
  })
})

describe("toScore / percentOf", () => {
  it("fills missing counts; total falls back to done", () => {
    expect(toScore({ ok: 2, done: 3 })).toEqual({ ok: 2, done: 3, total: 3 })
    expect(toScore({})).toEqual({ ok: 0, done: 0, total: 0 })
    expect(toScore(null)).toEqual({ ok: 0, done: 0, total: 0 })
    expect(toScore([1, 2])).toEqual({ ok: 0, done: 0, total: 0 })
  })
  it("rounds, and is null with nothing to measure", () => {
    expect(percentOf(2, 3)).toBe(67)
    expect(percentOf(null, 4)).toBe(0)
    expect(percentOf(3, 0)).toBeNull()
    expect(percentOf(3, null)).toBeNull()
  })
})
