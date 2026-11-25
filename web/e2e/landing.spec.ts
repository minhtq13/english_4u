import { expect, test } from "@playwright/test"
import { signIn } from "./helpers"

// The public landing page "/": prerendered HTML (text and Open Graph tags without JavaScript), a way to the login page,
// both languages, and a signed-in person sent on to their own home. Read-only.
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"

test("a visitor sees the landing page, its FAQ opens, and it leads to the login page", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", e => errors.push(String(e)))
  await page.goto("/")
  await expect(page).toHaveURL(new RegExp(`${BASE}/$`))
  await expect(page.getByRole("heading", { level: 1 })).toContainText("30 phút mỗi ngày")
  await expect(page.locator("#features li.tile")).toHaveCount(6)
  await expect(page.locator("#curriculum li.course")).toHaveCount(5)

  // The example question is live: a wrong answer is refused, the right one is marked.
  const demo = page.locator(".demo-card")
  await demo.getByRole("button", { name: "go", exact: true }).click()
  await expect(demo.locator(".fb.no")).toBeVisible()
  await demo.getByRole("button", { name: "goes" }).click()
  await expect(demo.locator(".fb.ok")).toBeVisible()
  await expect(demo.getByRole("button", { name: "going" })).toBeDisabled()

  const first = page.locator("#faq details").first()
  await first.locator("summary").click()
  await expect(first).toHaveAttribute("open", "")

  await page.locator("header.topbar").getByRole("link", { name: "Đăng nhập" }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole("link", { name: "Về trang giới thiệu" }).click()
  await expect(page).toHaveURL(new RegExp(`${BASE}/$`))
  expect(errors).toEqual([])
})

test("the HTML already holds the text and the link-preview tags (prerendered)", async ({ request }) => {
  const html = await (await request.get("/")).text()
  expect(html).toContain("Ngữ pháp tiếng Anh,")
  expect(html).toContain("Chấm ngay khi nộp")
  expect(html).toMatch(/property="og:title"/)
  expect(html).toMatch(/property="og:image" content="[^"]*\/og\.png"/)
  expect(html).toMatch(/name="twitter:card" content="summary_large_image"/)
})

test("with the English cookie the page is in English", async ({ page, context }) => {
  await context.addCookies([{ name: "lang", value: "en", url: BASE }])
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("30 minutes a day")
  await expect(page.locator("header.topbar").getByRole("link", { name: "Sign in" })).toBeVisible()
  await expect(page.locator(".lang button.on")).toHaveText("EN")
})

test("a signed-in student who opens / goes to the roadmap", async ({ page }) => {
  await signIn(page, "STUDENT")
  await expect(page).toHaveURL(/\/learn$/)
  await page.goto("/")
  await expect(page).toHaveURL(/\/learn$/)
  await expect(page.locator("section.streak")).toBeVisible()
})

test("a signed-in teacher who opens / goes to their classes", async ({ page }) => {
  await signIn(page, "TEACHER")
  await page.goto("/")
  await expect(page).toHaveURL(/\/teacher$/)
})
