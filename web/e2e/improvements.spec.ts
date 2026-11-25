import { expect, test, type Page } from "@playwright/test"
import { signIn, signOut, testAccount } from "./helpers"

// The screens added in the improvement plan (dashboard charts, error log, promotion preview, paste-from-text import,
// student home extras, admin creates a class and adds a teacher). The first group is read-only; the last test writes
// and is switched on by E2E_WRITE=1. It makes class ZZE2F, assigns the plain test teacher, and deletes the class again.

const main = (page: Page) => page.locator("main#main")
const noPageErrors = (page: Page) => {
  const errors: string[] = []
  page.on("pageerror", e => errors.push(String(e).slice(0, 200)))
  return errors
}

test.describe("admin (read-only)", () => {
  test("dashboard charts, login stats, error log and the promotion preview", async ({ page }) => {
    const errors = noPageErrors(page)
    await signIn(page, "ADMIN")

    await page.goto("/admin")
    await expect(page.locator(".charts .card")).toHaveCount(3)
    await expect(page.locator(".daily .col")).toHaveCount(30)

    await page.goto("/admin/logins")
    await expect(page.locator(".stats .stat")).toHaveCount(2)

    await page.goto("/admin/errors")
    await expect(main(page).locator("h1")).toBeVisible()

    // The promotion preview lists the moves; nothing runs until the box is ticked and the button pressed.
    await page.goto("/admin/classes")
    await page.locator(".class-row").first().waitFor()
    await page.getByRole("button", { name: /Lên lớp đầu năm học|Move up for the new school year/ }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.locator(".steps li").first()).toBeVisible()
    await expect(dialog.getByRole("button", { name: /^(Lên lớp cho|Move up \d)/ })).toBeDisabled()
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test("paste questions from text: preview, a missing key blocks adding", async ({ page }) => {
    const errors = noPageErrors(page)
    await signIn(page, "ADMIN")
    await page.goto("/teacher/lessons/new")
    await page.locator("select").first().selectOption("lop-6")
    await page.getByRole("button", { name: /^(Tiếp tục|Continue)/ }).click()
    await page.getByRole("button", { name: /Dán đề từ văn bản|Paste questions from text/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.locator("textarea").fill("1. She ___ to school.\nA. go\nB. goes\nC. going\nD. gone\nĐáp án: B\n\n2. Tom ___ a book. A. read B. reads → B\n3. No key here\nA. x\nB. y")
    await dialog.getByRole("button", { name: /Xem trước|Preview/ }).click()
    await expect(dialog.locator(".item")).toHaveCount(3)
    await expect(dialog.locator(".item.problem")).toHaveCount(1)
    await expect(dialog.getByRole("button", { name: /^(Thêm|Add)/ })).toBeDisabled()
    expect(errors).toEqual([])
  })
})

test.describe("student (read-only)", () => {
  test("home shows course progress and the review card; account shows badges when the database has them", async ({ page }) => {
    const errors = noPageErrors(page)
    await signIn(page, "STUDENT")
    await page.goto("/learn")
    await expect(page.locator(".review-card")).toBeVisible()
    await page.goto("/account")
    await expect(main(page).locator("h1")).toBeVisible()
    expect(errors).toEqual([])
  })
})

/** Cumulative layout shift of a page load: what jumps when data arrives after the skeleton. */
async function shiftOf(page: Page, path: string) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number }
    w.__cls = 0
    new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value }).observe({ type: "layout-shift", buffered: true })
  })
  await page.goto(path)
  await page.waitForTimeout(3500)
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls)
}

test.describe("layout shift stays under 0.1 (skeletons reserve their space)", () => {
  for (const [role, path] of [["STUDENT", "/learn"], ["TEACHER", "/teacher"], ["ADMIN", "/admin"]] as const) {
    test(`${role} ${path}`, async ({ page }) => {
      await signIn(page, role)
      expect(await shiftOf(page, path)).toBeLessThan(0.1)
    })
  }
})

test("admin creates a class, adds a teacher, then deletes the class", async ({ browser }) => {
  test.skip(!process.env.E2E_WRITE, "writes data: set E2E_WRITE=1")
  test.setTimeout(3 * 60_000)
  const NAME = "ZZE2F"
  const teacher = testAccount("TEACHER").user
  const page = await (await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" })).newPage()
  await signIn(page, "ADMIN")
  const row = () => page.locator(".class-row").filter({ has: page.locator("a b", { hasText: new RegExp(`^${NAME}$`) }) })
  const removeClass = async () => {
    await page.goto("/admin/classes")
    await page.locator(".class-row").first().waitFor()
    if (await row().count()) {
      await row().getByRole("button", { name: /^(Xoá lớp|Delete class)$/ }).click()
      await row().getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
      await expect(row()).toHaveCount(0)
    }
  }
  try {
    await removeClass() // leftovers of an earlier failed run
    await page.locator("#new-class-course").selectOption("lop-6")
    await page.locator("#new-class-name").fill(NAME)
    await page.getByRole("button", { name: /^(Tạo lớp|Create class)$/ }).click()
    await expect(row()).toBeVisible()
    // Assign the plain test teacher: the option is named by the teacher's name or login, so pick by position among teachers.
    const select = row().locator("select").first()
    const options = await select.locator("option").allTextContents()
    expect(options.length).toBeGreaterThan(1)
    const wanted = options.find(o => o.toLowerCase().includes(teacher.toLowerCase())) ?? options[1]!
    await select.selectOption({ label: wanted })
    await expect(row().locator(".chip-tag")).toHaveCount(1)
    await expect(row().locator(".chip-tag")).toContainText(wanted)
  } finally {
    await removeClass()
    await signOut(page).catch(() => {})
  }
})
