import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { signIn, type Role } from "./helpers"

// Every new screen must switch language: with either language chosen, no page may show a raw message key such as
// "gradebook.title" (vue-i18n prints the key when a message is missing) and the headline must differ between languages.
const messages = JSON.parse(readFileSync(fileURLToPath(new URL("../i18n/locales/vi.json", import.meta.url)), "utf8")) as Record<string, unknown>
const namespaces = Object.keys(messages).filter(k => /^[a-z][A-Za-z]+$/.test(k))
const rawKey = new RegExp(`(^|[^A-Za-z0-9_.@/-])(${namespaces.join("|")})\\.[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z0-9_]+)*`)

const PAGES: Record<Role, string[]> = {
  STUDENT: ["/", "/progress", "/review", "/notifications", "/practice/6.1"],
  TEACHER: ["/teacher", "/courses", "/teacher/grading", "/teacher/bank"],
  ADMIN: ["/admin", "/admin/classes", "/admin/users", "/admin/logins", "/admin/audit"],
}

async function setLang(page: Page, lang: "vi" | "en") {
  await page.context().addCookies([{ name: "lang", value: lang, url: "http://localhost:3000" }])
}

for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) {
  test(`${role}: no raw keys in either language, and the headline is translated`, async ({ page }) => {
    test.setTimeout(120_000)
    await signIn(page, role)
    const heads: Record<string, string[]> = { vi: [], en: [] }
    for (const lang of ["vi", "en"] as const) {
      await setLang(page, lang)
      for (const path of PAGES[role]) {
        await page.goto(path)
        await page.waitForTimeout(1500)
        const text = await page.locator("body").innerText()
        const hit = rawKey.exec(text)
        expect(hit?.[0], `${lang} ${path} shows a raw key`).toBeUndefined()
        heads[lang].push((await page.locator("main h1").first().innerText().catch(() => "")).trim())
      }
    }
    // At least one headline of the role's pages reads differently in English.
    expect(heads.vi.some((h, i) => h && h !== heads.en[i])).toBe(true)
  })
}
