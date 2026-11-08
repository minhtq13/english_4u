import { describe, expect, it } from "vitest"
import { dueSoonTasks, inactiveTasks, waitingTasks } from "~/utils/todayTasks"

const now = Date.parse("2026-11-08T10:00:00Z")
const inHours = (h: number) => new Date(now + h * 3600e3).toISOString()
const daysAgo = (d: number) => new Date(now - d * 864e5).toISOString()

describe("waitingTasks", () => {
  it("keeps lessons with work to grade, biggest pile first", () => {
    const rows = [
      { class_id: "a", lesson_id: "1", waiting: 1 }, { class_id: "a", lesson_id: "2", waiting: 0 },
      { class_id: "b", lesson_id: "1", waiting: 4 }, { class_id: null, lesson_id: "3", waiting: 9 },
    ]
    expect(waitingTasks(rows)).toEqual([
      { classId: "b", lessonId: "1", count: 4 }, { classId: "a", lessonId: "1", count: 1 },
    ])
  })
})

describe("dueSoonTasks", () => {
  const m = (due: string | null, user = "u", lesson = "1") => ({ class_id: "a", lesson_id: lesson, due_at: due, user_id: user })
  it("counts who has not handed in, for deadlines in the next 48 hours only", () => {
    const out = dueSoonTasks([m(inHours(5)), m(inHours(5), "v"), m(inHours(60)), m(inHours(-1)), m(null)], now)
    expect(out).toEqual([{ classId: "a", lessonId: "1", count: 2, due: inHours(5) }])
  })
  it("orders by the nearest deadline", () => {
    const out = dueSoonTasks([m(inHours(30), "u", "2"), m(inHours(3), "u", "1")], now)
    expect(out.map(t => t.lessonId)).toEqual(["1", "2"])
  })
})

describe("inactiveTasks", () => {
  const s = (id: string, last: string | null) => ({ user_id: id, full_name: id, username: null, email: null, class_id: "a", last_activity: last })
  it("lists students silent for a week or more, and those who never started, longest first", () => {
    const out = inactiveTasks([s("fresh", daysAgo(2)), s("old", daysAgo(10)), s("never", null), s("edge", daysAgo(7))], now)
    expect(out.map(x => x.name)).toEqual(["never", "old", "edge"])
    expect(out.find(x => x.name === "old")?.days).toBe(10)
    expect(out.find(x => x.name === "never")?.days).toBeNull()
  })
})
