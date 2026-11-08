import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

// Test accounts (see web/CLAUDE.md): passwords live in the gitignored web/.env.test.
const envFile = fileURLToPath(new URL("../.env.test", import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

export type Role = "ADMIN" | "TEACHER" | "STUDENT"

export function account(role: Role) {
  const user = process.env[`E2E_${role}_USER`] ?? process.env[`TEST_${role}_USER`]
  const password = process.env[`E2E_${role}_PASSWORD`] ?? process.env[`TEST_${role}_PASSWORD`]
  if (!user || !password) throw new Error(`E2E_${role}_USER / E2E_${role}_PASSWORD (or TEST_*) are not set (web/.env.test)`)
  return { user, password }
}

/** Signs in through the login page and waits until the signed-in layout is there. */
export async function signIn(page: Page, role: Role) {
  const { user, password } = account(role)
  await page.goto("/login")
  await page.locator("#login-user").fill(user)
  await page.locator("#login-pass").fill(password)
  await page.locator("form button.btn.primary").click()
  // On a phone the menu is a closed drawer: it is in the page but not visible.
  await expect(page.locator("nav.side-nav")).toBeAttached()
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: /Đăng xuất|Sign out/ }).click()
  await expect(page.locator("#login-user")).toBeVisible()
}
