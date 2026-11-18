import { describe, expect, it } from "vitest"
import { reportOf, throttle } from "~/utils/errorReport"

describe("reportOf", () => {
  it("takes the message and stack of an Error, or a plain string", () => {
    expect(reportOf(new Error("boom"))?.msg).toBe("boom")
    expect(reportOf("text")).toEqual({ msg: "text", trace: null })
  })
  it("ignores a ended session, a lost connection and empty errors", () => {
    expect(reportOf(new Error("Phiên đăng nhập đã kết thúc"))).toBeNull()
    expect(reportOf(new TypeError("Failed to fetch"))).toBeNull()
    expect(reportOf(null)).toBeNull()
  })
  it("cuts long text", () => {
    expect(reportOf("x".repeat(900))!.msg).toHaveLength(500)
  })
})

describe("throttle", () => {
  it("lets each message through once and stops after the limit", () => {
    const ok = throttle(2)
    expect(ok({ msg: "a", trace: null })).toBe(true)
    expect(ok({ msg: "a", trace: null })).toBe(false)
    expect(ok({ msg: "b", trace: null })).toBe(true)
    expect(ok({ msg: "c", trace: null })).toBe(false)
  })
})
