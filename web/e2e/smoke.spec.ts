import { expect, test } from "@playwright/test"
import { account, signIn, signOut } from "./helpers"

test("a wrong password is refused with a message, and the login page stays", async ({ page }) => {
  await page.goto("/login")
  await page.locator("#login-user").fill(account("STUDENT").user)
  await page.locator("#login-pass").fill("not-the-password")
  await page.locator("form button.btn.primary").click()
  await expect(page.locator("#login-error")).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test("a signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/progress")
  await expect(page).toHaveURL(/\/login/)
})

test("student: roadmap, a lesson opens, sign out", async ({ page }) => {
  await signIn(page, "STUDENT")
  await expect(page.locator("main h1").first()).toBeVisible()
  // Teacher-only pages bounce a student back.
  await page.goto("/teacher")
  await expect(page).not.toHaveURL(/\/teacher/)
  await page.goto("/")
  const lesson = page.locator("a[href^='/lessons/']").first()
  if (await lesson.count()) {
    await lesson.click()
    await expect(page).toHaveURL(/\/lessons\//)
    await expect(page.locator(".lesson-content, .card h2").first()).toBeVisible()
  }
  await signOut(page)
})

test("teacher: classes page and a class, sign out", async ({ page }) => {
  await signIn(page, "TEACHER")
  await page.goto("/teacher")
  await expect(page.locator("main h1").first()).toBeVisible()
  await page.goto("/admin")
  await expect(page).not.toHaveURL(/\/admin/)
  await signOut(page)
})

test("admin: dashboard and users, sign out", async ({ page }) => {
  await signIn(page, "ADMIN")
  await page.goto("/admin")
  await expect(page.locator("main h1").first()).toBeVisible()
  await page.goto("/admin/users")
  await expect(page.locator("main h1").first()).toBeVisible()
  await signOut(page)
})

test("the language switch shows English on the login page", async ({ page, context }) => {
  await context.addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }])
  await page.goto("/login")
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
})
