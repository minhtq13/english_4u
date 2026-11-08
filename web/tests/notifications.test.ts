import { describe, expect, it } from "vitest"
import { dueOf, lessonOf, safeLink, unreadCount } from "~/utils/notifications"

describe("notifications", () => {
  it("reads the lesson and the deadline out of the params", () => {
    expect(lessonOf({ params: { lesson_id: "6.1", due_at: "2026-11-09T10:00:00Z" } })).toBe("6.1")
    expect(dueOf({ params: { lesson_id: "6.1", due_at: "2026-11-09T10:00:00Z" } })).toBe("2026-11-09T10:00:00Z")
    expect(lessonOf({ params: { announcement_id: "x" } })).toBeNull()
    expect(lessonOf({ params: null })).toBeNull()
    expect(lessonOf({ params: ["6.1"] })).toBeNull()
  })
  it("counts the unread ones", () => {
    expect(unreadCount([{ read_at: null }, { read_at: "2026-11-08T00:00:00Z" }, { read_at: null }])).toBe(2)
  })
  it("follows only paths of this site", () => {
    expect(safeLink("/lessons/6.1")).toBe("/lessons/6.1")
    expect(safeLink("//evil.example")).toBe("/")
    expect(safeLink("https://evil.example")).toBe("/")
    expect(safeLink(null)).toBe("/")
  })
})
