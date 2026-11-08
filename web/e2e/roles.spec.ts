import { expect, test, type Page } from "@playwright/test"
import { signIn, signOut } from "./helpers"

// What each role sees on the screens added in the improvement plan. Read-only: nothing is saved, submitted or given.
// The accounts are the E2E_* ones in .env.test (see helpers.ts), so the checks name what a screen is, not the data in it.

const main = (page: Page) => page.locator("main#main")
const noPageErrors = (page: Page) => {
  const errors: string[] = []
  page.on("pageerror", e => errors.push(String(e).slice(0, 200)))
  return errors
}

test.describe("student", () => {
  test("roadmap with streak, notifications, review and practice", async ({ page }) => {
    const errors = noPageErrors(page)
    await signIn(page, "STUDENT")

    await page.goto("/")
    await expect(page.locator("section.streak")).toBeVisible()
    await expect(page.locator("a.bell:visible")).toBeVisible()

    await page.goto("/notifications")
    await expect(main(page).locator("h1")).toBeVisible()

    await page.goto("/review")
    await expect(main(page).locator("h1")).toBeVisible()
    await expect(page.locator(".empty, .study").first()).toBeVisible()

    await page.goto("/progress")
    await expect(main(page).locator("figure.trend")).toBeVisible()

    // Teacher and admin screens refuse a student.
    for (const path of ["/teacher/gradebook/x", "/admin/audit", "/admin/logins"]) {
      await page.goto(path)
      await expect(page).not.toHaveURL(/\/(teacher|admin)\//)
    }
    expect(errors).toEqual([])
    await signOut(page)
  })

  test("an open lesson shows the section strip and asks before submitting", async ({ page }) => {
    await signIn(page, "STUDENT")
    await page.goto("/")
    const open = page.locator("a[href^='/lessons/']")
    const hrefs = await open.evaluateAll(as => as.map(a => a.getAttribute("href") ?? ""))
    test.skip(!hrefs.length, "the student has no lesson to open")
    let found = false
    for (const href of [...new Set(hrefs)]) {
      await page.goto(href)
      await page.waitForTimeout(1200)
      if (await page.locator("nav.secnav").count()) { found = true; break }
    }
    test.skip(!found, "no lesson in progress to show the section strip")
    await page.getByRole("button", { name: /Nộp bài|Submit/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("the tab bar shows on a phone, with four tabs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 })
    await signIn(page, "STUDENT")
    await expect(page.locator(".student-tabs")).toBeVisible()
    await expect(page.locator(".student-tabs .tab")).toHaveCount(4)
  })
})

test.describe("teacher", () => {
  test("today, class tools, gradebook and analysis", async ({ page }) => {
    const errors = noPageErrors(page)
    await signIn(page, "TEACHER")
    await page.goto("/teacher")
    await expect(page.locator("a.class-card").first()).toBeVisible()
    await expect(page.locator("section.today")).toBeVisible()

    await page.locator("a.class-card").first().click()
    await expect(page.locator("section[aria-label]").first()).toBeVisible()
    await expect(page.locator("#ann-body")).toBeVisible()
    const classUrl = page.url()

    await page.getByRole("link", { name: /Bảng điểm|Gradebook/ }).click()
    await expect(page).toHaveURL(/\/teacher\/gradebook\//)
    await expect(page.locator("table.grid, .empty").first()).toBeVisible()

    await page.goto(classUrl)
    await page.getByRole("link", { name: /Phân tích câu hỏi|Question analysis/ }).click()
    await expect(page).toHaveURL(/\/teacher\/analysis\//)
    await expect(page.locator("table.tbl, .empty, .fb.no").first()).toBeVisible({ timeout: 15_000 })

    // Admin screens refuse a teacher.
    await page.goto("/admin/audit")
    await expect(page).not.toHaveURL(/\/admin\//)
    expect(errors).toEqual([])
    await signOut(page)
  })

  test("a lesson can be duplicated into the editor, and the grading page lists waiting work", async ({ page }) => {
    await signIn(page, "TEACHER")
    await page.goto("/courses")
    await page.locator("a[href^='/courses/']").first().click()
    const copy = page.locator("a[href*='/teacher/lessons/new?copy=']").first()
    await expect(copy).toBeVisible()
    await copy.click()
    await expect(page).toHaveURL(/copy=/)
    await expect(page.locator("#giving, .card").first()).toBeVisible()
    await page.goto("/teacher/grading")
    await expect(main(page).locator("h1")).toBeVisible()
  })
})

test.describe("admin", () => {
  test("sign-in history, audit log and class tools", async ({ page }) => {
    const errors = noPageErrors(page)
    await signIn(page, "ADMIN")
    await page.goto("/admin/logins")
    await expect(page.locator("table, .empty").first()).toBeVisible()
    await page.goto("/admin/audit")
    await expect(page.locator("table, .empty").first()).toBeVisible()
    await page.goto("/admin/classes")
    await expect(page.locator(".class-row").first()).toBeVisible()
    await expect(page.locator(".class-row select").first()).toBeVisible()
    await page.goto("/admin")
    await expect(main(page).locator("h1")).toBeVisible()
    expect(errors).toEqual([])
    await signOut(page)
  })
})
