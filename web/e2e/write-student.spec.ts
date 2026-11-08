import { expect, test, type Page } from "@playwright/test"
import { signIn } from "./helpers"

// A whole student journey on throw-away data: an admin makes class ZZE2E and one student, gives two lessons (one timed),
// the student works, submits, sees the result, practises and is told in real time; then everything is deleted again
// (the student first, then the class), also when a step fails. Writes to the live database: E2E_WRITE=1 only.
test.skip(!process.env.E2E_WRITE, "writes data: set E2E_WRITE=1")

const CLASS = "ZZE2E"
const PLAIN = "Unit 1 - My New School"
const TIMED = "Bài tập về nhà 1 - My New School"
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const GIVE = ["Giao cho lớp", "Give to class"]

/** The smallest element that holds `text` and a button called one of `labels`: one lesson's block on the class page. */
function blockWith(page: Page, text: string, labels: string[]) {
  const has = `.//button[${labels.map(b => `normalize-space()='${b}'`).join(" or ")}]`
  return page.locator(`xpath=//*[contains(normalize-space(.), '${text}')][${has}][not(.//*[contains(normalize-space(.), '${text}')][${has}])]`).first()
}

/**
 * Deletes what this test made: the student first (their work goes with them), then the class. Only rows that belong to
 * the test are touched: the account list is searched for "zze2e", every row shown must be a test account of class ZZE2E,
 * and each delete button is clicked inside its own row. Anything else on screen stops the clean-up instead of deleting it.
 */
async function removeEverything(admin: Page) {
  await admin.goto("/teacher/students")
  await admin.locator("input[type=search]").fill("zze2e")
  await admin.waitForTimeout(1500)
  const rows = admin.locator("table.stack-table.accounts tbody tr")
  const mine = rows.filter({ hasText: /zze2e/i })
  const total = await rows.count()
  if (total !== (await mine.count())) throw new Error(`clean-up stopped: ${total} accounts shown but ${await mine.count()} are test accounts`)
  for (let n = total; n > 0; n--) {
    const row = mine.first()
    await expect(row).toContainText(CLASS)
    await row.getByRole("button", { name: /^(Xoá|Delete)$/ }).click()
    await row.getByRole("button", { name: /Bấm lần nữa|Click again|Bấm lần nữa: xoá/ }).click()
    await admin.waitForTimeout(2000)
  }
  await admin.goto("/admin/classes")
  await admin.locator(".class-row").first().waitFor() // the list loads after the page does
  const named = () => admin.locator(".class-row").filter({ has: admin.locator("a b", { hasText: new RegExp(`^${CLASS}$`) }) })
  const row = named()
  if (await row.count()) {
    await expect(row).toHaveCount(1)
    await row.getByRole("button", { name: /^(Xoá lớp|Delete class)$/ }).click()
    await row.getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
    await expect(named()).toHaveCount(0)
  }
}

test("student works a plain and a timed lesson end to end", async ({ browser }) => {
  test.setTimeout(8 * 60_000)
  const adminCtx = await browser.newContext({ baseURL: BASE })
  const admin = await adminCtx.newPage()
  const errors: string[] = []
  admin.on("pageerror", e => errors.push(`admin: ${String(e).slice(0, 200)}`))
  await signIn(admin, "ADMIN")
  try {
    await removeEverything(admin) // leftovers of an earlier failed run

    // ---- class, student, two lessons ----
    await admin.goto("/admin/classes")
    await admin.locator("#new-class-course").selectOption("lop-6")
    await admin.locator("#new-class-name").fill(CLASS)
    await admin.getByRole("button", { name: /^(Tạo lớp|Create class)$/ }).click()
    const classRow = admin.locator(".class-row").filter({ has: admin.locator("a b", { hasText: new RegExp(`^${CLASS}$`) }) })
    await expect(classRow).toBeVisible()
    const classHref = (await classRow.locator("a[href^='/teacher/classes/']").first().getAttribute("href"))!

    await admin.goto("/teacher/students")
    await admin.locator(".head > .btn.primary").click() // opens the "add accounts" card
    await admin.locator("label.field", { hasText: /Lớp|Class/ }).locator("select").first().selectOption({ label: CLASS })
    await admin.locator("textarea").first().fill("Học Sinh Thử")
    await admin.getByRole("button", { name: /Tạo tên đăng nhập|Generate/ }).click()
    await admin.getByRole("button", { name: /^(Tạo 1 tài khoản|Create 1 account)/ }).click()
    const creds = admin.locator("table.printable tbody tr").first()
    await expect(creds.locator("code")).toBeVisible()
    const username = (await creds.locator("b").innerText()).trim()
    const password = (await creds.locator("code").innerText()).trim()
    expect(username).toMatch(/^zze2e/)

    await admin.goto(classHref)
    for (const [name, limit] of [[PLAIN, ""], [TIMED, "1"]] as const) {
      await blockWith(admin, name, GIVE).getByRole("button", { name: /^(Giao cho lớp|Give to class)$/ }).click()
      if (limit) await admin.locator("input.limit").fill(limit)
      else await admin.getByLabel(/Hiện điểm ngay khi nộp|Show results/).check()
      await admin.getByRole("button", { name: new RegExp(`^(Giao cho lớp|Give to class) ${CLASS}$`) }).click()
      await expect(admin.locator(".notice.ok")).toBeVisible()
    }

    // ---- the student ----
    const studentCtx = await browser.newContext({ baseURL: BASE })
    const student = await studentCtx.newPage()
    student.on("pageerror", e => errors.push(`student: ${String(e).slice(0, 200)}`))
    await student.goto("/login")
    await student.locator("#login-user").fill(username)
    await student.locator("#login-pass").fill(password)
    await student.locator("form button.btn.primary").click()
    await expect(student.locator("section.streak")).toBeVisible()
    // two "lesson given" notices were written by the trigger
    await expect(student.locator("a.bell:visible .dot")).toHaveText("2")

    // real time: a new announcement raises the bell without a reload
    await admin.goto(classHref)
    await admin.locator("#ann-body").fill("Nhắc cả lớp (e2e)")
    await admin.getByRole("button", { name: /Đăng thông báo|Post/ }).click()
    await expect(admin.locator(".ann li", { hasText: "Nhắc cả lớp (e2e)" })).toBeVisible()
    await expect(student.locator("a.bell:visible .dot")).toHaveText("3", { timeout: 20_000 })

    // plain lesson: section strip, the submit summary, jump to the blanks, submit, result, practice
    await student.goto("/lessons/6.1")
    await expect(student.locator("nav.secnav")).toBeVisible()
    await student.locator(".opts button").first().click()
    await student.getByRole("button", { name: /^(Nộp bài|Submit)$/ }).click()
    await expect(student.getByRole("dialog")).toContainText(/chưa làm|left blank/)
    await student.getByRole("button", { name: /Tới phần còn trống|Go to the blanks/ }).click()
    await expect(student.getByRole("dialog")).toHaveCount(0)
    await student.getByRole("button", { name: /^(Nộp bài|Submit)$/ }).click()
    await student.getByRole("button", { name: /Vẫn nộp bài|Submit anyway/ }).click()
    await expect(student.locator("section.result")).toBeVisible({ timeout: 20_000 })
    await student.getByRole("link", { name: /Luyện lại câu sai|Practise what I got wrong/ }).click()
    await expect(student).toHaveURL(/\/practice\/6\.1/)
    await student.locator(".opts button").first().click()
    await student.getByRole("button", { name: /^(Kiểm tra|Check)$/ }).click()
    await expect(student.locator(".fb").first()).toBeVisible()
    // the streak now counts today
    await student.goto("/")
    await expect(student.locator("section.streak")).toContainText(/1 ngày|1 day/)

    // timed lesson: the clock starts at the first answer, runs out after a minute, the server submits the work
    await student.goto("/")
    await student.locator("a[href^='/lessons/']", { hasText: TIMED }).first().click()
    await expect(student.locator("[role=timer]")).toContainText(/1 phút|1-minute/)
    await student.locator(".opts button, textarea").first().click()
    await expect(student.locator("[role=timer] .digits")).toBeVisible({ timeout: 10_000 })
    await expect(student.getByText(/Hết giờ|Time is up/)).toBeVisible({ timeout: 90_000 })
    // the cron job submits within a minute, then the page polls and shows the state
    await expect(student.getByText(/Đã nộp|Submitted|chờ chấm|waiting|Kết quả|result/i).first()).toBeVisible({ timeout: 150_000 })

    // teachers see it: gradebook and analysis have the student's work
    await admin.goto(classHref.replace("/teacher/classes/", "/teacher/gradebook/"))
    await expect(admin.locator("table.grid")).toContainText("Học Sinh Thử")
    await admin.goto(classHref.replace("/teacher/classes/", "/teacher/analysis/"))
    await expect(admin.locator("table.tbl tbody tr").first()).toBeVisible({ timeout: 15_000 })
    await studentCtx.close()
  } finally {
    await removeEverything(admin)
    await adminCtx.close()
  }
  expect(errors).toEqual([])
})

// Removes what an interrupted run above left behind (the test account and class ZZE2E, nothing else): E2E_CLEANUP=1.
test("clean up the leftovers of an interrupted run", async ({ browser }) => {
  test.skip(!process.env.E2E_CLEANUP, "set E2E_CLEANUP=1 (with E2E_WRITE=1) to run it")
  test.setTimeout(120_000)
  const ctx = await browser.newContext({ baseURL: BASE })
  const admin = await ctx.newPage()
  await signIn(admin, "ADMIN")
  await removeEverything(admin)
  await ctx.close()
})
