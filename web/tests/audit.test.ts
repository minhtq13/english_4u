import { describe, expect, it } from "vitest"
import { auditView, idsToName, targetsClass, type AuditRow } from "~/utils/audit"

const row = (action: string, extra: Partial<AuditRow> = {}): AuditRow =>
  ({ id: 1, at: "2026-11-08T00:00:00Z", actor: "admin", action, target: "t1", detail: {}, ...extra })
const people = new Map([["admin", "Minh"], ["t1", "An"]])
const classes = new Map([["c1", "6T1"], ["c2", "7T1"]])

describe("auditView", () => {
  it("names the actor and the person it happened to", () => {
    expect(auditView(row("account_locked"), people, classes)).toMatchObject({ actor: "Minh", target: "An", detail: null })
  })
  it("a role change shows from and to", () => {
    expect(auditView(row("role_changed", { detail: { from: "student", to: "teacher" } }), people, classes).detail)
      .toEqual({ key: "audit.detail.role", params: { from: "student", to: "teacher" } })
  })
  it("a move between classes shows class names, unknown ones as ?", () => {
    expect(auditView(row("class_changed", { detail: { from: "c1", to: "gone" } }), people, classes).detail?.params).toEqual({ from: "6T1", to: "?" })
  })
  it("a promoted class shows how many students and where", () => {
    const v = auditView(row("class_promoted", { target: "c1", detail: { to: "c2", students: 30 } }), people, classes)
    expect(v.target).toBe("6T1")
    expect(v.detail).toEqual({ key: "audit.detail.promoted", params: { n: 30, to: "7T1" } })
  })
  it("a deleted account or class is named from the details kept in the log", () => {
    expect(auditView(row("account_deleted", { target: "gone", detail: { name: "Bình", username: "hs.9", role: "student" } }), people, classes).target).toBe("Bình")
    expect(auditView(row("class_deleted", { target: "gone", detail: { name: "6T9" } }), people, classes).target).toBe("6T9")
  })
  it("an action done by the edge function has no actor", () => {
    expect(auditView(row("account_deleted", { actor: null }), people, classes).actor).toBe("")
  })
})

describe("idsToName", () => {
  it("collects the people and classes a page must look up", () => {
    const ids = idsToName([
      row("role_changed"), row("class_promoted", { target: "c1", detail: { to: "c2" } }), row("class_changed", { target: "t2", detail: { from: "c1", to: "c3" } }),
    ])
    expect(ids.people.sort()).toEqual(["admin", "t1", "t2"])
    expect(ids.classes.sort()).toEqual(["c1", "c2", "c3"])
    expect(targetsClass("class_deleted")).toBe(true)
    expect(targetsClass("role_changed")).toBe(false)
  })
})
