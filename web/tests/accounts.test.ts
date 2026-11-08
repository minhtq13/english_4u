import { describe, expect, it } from "vitest"
import { loginEmail, personName } from "~/utils/accounts"

describe("personName", () => {
  it("prefers the full name", () => {
    expect(personName({ full_name: "Lê Đức Chi", username: "hs.01", email: loginEmail("hs.01") })).toBe("Lê Đức Chi")
  })
  it("falls back to the username, never to the made-up login address of a username account", () => {
    expect(personName({ full_name: null, username: "hs.01", email: loginEmail("hs.01") })).toBe("hs.01")
  })
  it("uses the real email of an account without a username", () => {
    expect(personName({ full_name: "", username: null, email: "gv@gmail.com" })).toBe("gv@gmail.com")
  })
  it("is empty when there is nothing, so the caller picks a placeholder", () => {
    expect(personName({})).toBe("")
  })
})
