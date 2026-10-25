import { describe, expect, it } from "vitest"
import { LOGIN_DOMAIN, USERNAME_RULE, loginEmail, loginOf, randomPassword, slug } from "~/utils/accounts"
import { lessonKind } from "~/utils/lessonFilter"
import { filterTerm, likeTerm, personSearch } from "~/utils/search"
import { fold } from "~/utils/text"

describe("search text", () => {
  it("filterTerm turns PostgREST filter characters into spaces", () => {
    expect(filterTerm("  an (b), c*d%e\\f ")).toBe("an  b   c d e f")
    expect(filterTerm(" ( ) ")).toBe("")
  })
  it("personSearch matches name, username or email", () => {
    expect(personSearch("an")).toBe("full_name.ilike.*an*,username.ilike.*an*,email.ilike.*an*")
  })
  it("likeTerm drops the wildcards of ilike", () => {
    expect(likeTerm(" 50%_off\\ ")).toBe("50off")
  })
  it("fold drops accents and lower-cases", () => {
    expect(fold("ĐỀ Luyện Ứng")).toBe("de luyen ung")
  })
})

describe("accounts", () => {
  it("a username logs in through the internal domain; an email stays as typed", () => {
    expect(loginEmail("  HS.An ")).toBe(`hs.an@${LOGIN_DOMAIN}`)
    expect(loginEmail("Teacher@Gmail.com ")).toBe("teacher@gmail.com")
  })
  it("loginOf prefers the username", () => {
    expect(loginOf({ username: "hs1", email: "x@y.z" })).toBe("hs1")
    expect(loginOf({ username: null, email: "x@y.z" })).toBe("x@y.z")
    expect(loginOf({ email: null })).toBe("")
  })
  it("randomPassword uses no look-alike characters", () => {
    const p = randomPassword(200)
    expect(p).toHaveLength(200)
    expect(p).toMatch(/^[a-z2-9]+$/)
    expect(p).not.toMatch(/[ilo01]/)
  })
  it("slug builds a valid username part from a class name", () => {
    expect(slug("Lớp 6A - Đông")).toBe("lop6adong")
    expect(USERNAME_RULE.test(`${slug("6T1")}.01`)).toBe(true)
  })
  it("USERNAME_RULE: 3–32 characters, starting with a letter or digit", () => {
    expect(USERNAME_RULE.test("ab")).toBe(false)
    expect(USERNAME_RULE.test(".abc")).toBe(false)
    expect(USERNAME_RULE.test("Abc")).toBe(false)
    expect(USERNAME_RULE.test("a".repeat(32))).toBe(true)
    expect(USERNAME_RULE.test("a".repeat(33))).toBe(false)
  })
})

describe("lessonKind", () => {
  it.each([
    ["Unit 1", "lesson"], ["19.1", "lesson"], ["  unit 12 ", "lesson"],
    ["Luyện đề 1", "practice"], ["LUYEN DE 2", "practice"],
    ["Bài tập về nhà 3", "homework"], ["Kiểm tra 15 phút", "test"],
    ["Ôn tập", "other"], ["Units review", "other"],
  ])("%j → %s", (label, kind) => expect(lessonKind({ label })).toBe(kind))
})
