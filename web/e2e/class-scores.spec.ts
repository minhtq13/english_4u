import { expect, test } from "@playwright/test"
import { removeTestClass, signIn } from "./helpers"

// Class marks end to end on throw-away data: an admin makes class ZZE2S and one student, takes attendance, gives a bonus
// point (and takes it back), makes an oral-check column and a homework column, renames one, reads the summary, exports it
// and deletes a column and the session with the two-click button; the student then sees only their own marks. Everything
// is deleted again (the student first, then the class), also when a step fails. Writes to the live database: E2E_WRITE=1 only.
// Set E2E_SHOT_DIR to keep screenshots (light, dark, English, phone).
test.skip(!process.env.E2E_WRITE, "writes data: set E2E_WRITE=1")

const CLASS = "ZZE2S"
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const SHOTS = process.env.E2E_SHOT_DIR

test("a class takes attendance, bonus points and marks, and the student sees their own", async ({ browser }) => {
  test.setTimeout(6 * 60_000)
  const adminCtx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } })
  const admin = await adminCtx.newPage()
  const errors: string[] = []
  admin.on("pageerror", e => errors.push(`admin: ${String(e).slice(0, 200)}`))
  await signIn(admin, "ADMIN")
  const shot = async (page: typeof admin, name: string) => {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/scores-${name}.png`, fullPage: true })
  }
  try {
    await removeTestClass(admin, CLASS) // leftovers of an earlier failed run

    // ---- a class with one student ----
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
    await admin.locator("textarea").first().fill("Học Sinh Điểm")
    await admin.getByRole("button", { name: /Tạo tên đăng nhập|Generate/ }).click()
    await admin.getByRole("button", { name: /^(Tạo 1 tài khoản|Create 1 account)/ }).click()
    const creds = admin.locator("table.printable tbody tr").first()
    await expect(creds.locator("code")).toBeVisible()
    const username = (await creds.locator("b").innerText()).trim()
    const password = (await creds.locator("code").innerText()).trim()
    expect(username).toMatch(/^zze2s/)

    // ---- the way in: a button at the top of the class page ----
    await admin.goto(classHref)
    await admin.getByRole("link", { name: "Điểm trên lớp" }).click()
    await expect(admin.getByRole("heading", { level: 1 })).toContainText(`Điểm trên lớp ${CLASS}`)

    // ---- attendance: one student, marked absent, saved, then the session is on the list ----
    await admin.getByRole("radio", { name: "Vắng", exact: true }).click()
    await expect(admin.getByRole("radio", { name: "Vắng", exact: true })).toHaveAttribute("aria-checked", "true")
    await admin.getByRole("button", { name: "Lưu điểm danh" }).click()
    await expect(admin.getByText("Đã lưu điểm danh")).toBeVisible()
    await expect(admin.locator(".badge.graded", { hasText: "Đã điểm danh" })).toBeVisible()
    await expect(admin.locator(".list-row", { hasText: "Vắng 1" })).toBeVisible()
    await shot(admin, "attendance")

    // ---- bonus points: +1, undo, +1 again ----
    await admin.getByRole("tab", { name: "Điểm cộng" }).click()
    const card = admin.locator("button.stu").first()
    await card.click()
    await expect(card.locator(".tot b")).toHaveText("+1")
    await admin.getByRole("button", { name: "Hoàn tác" }).click()
    await expect(card.locator(".tot b")).toHaveText("+0")
    await admin.locator("#pt-note").fill("trả lời đúng")
    await card.click()
    await expect(card.locator(".tot b")).toHaveText("+1")
    await expect(admin.locator(".list-row", { hasText: "trả lời đúng" })).toBeVisible()
    await shot(admin, "points")

    // ---- an oral-check column: a bad mark is refused, a good one saved ----
    await admin.getByRole("tab", { name: "KT bài cũ" }).click()
    await expect(admin.getByText("Chưa có cột điểm nào")).toBeVisible()
    await admin.getByRole("button", { name: "Thêm cột điểm" }).first().click()
    await admin.locator("#new-title").fill("KT miệng thử")
    await admin.getByRole("button", { name: "Tạo cột" }).click()
    const box = admin.locator(".marks input").first()
    await box.fill("12")
    await expect(admin.getByText("1 ô chưa đúng")).toBeVisible()
    await expect(admin.getByRole("button", { name: "Lưu điểm", exact: true })).toBeDisabled()
    await box.fill("8,5")
    await box.press("Enter") // one student: there is no next box, nothing breaks
    await admin.getByRole("button", { name: "Lưu điểm", exact: true }).click()
    await expect(admin.getByText("Đã lưu điểm", { exact: true })).toBeVisible()
    await expect(admin.locator("table.grid tbody .mark").first()).toHaveText("8.5")
    await expect(admin.locator("table.grid tfoot")).toContainText("8.5")
    await shot(admin, "oral")

    // ---- a homework column, then renamed ----
    await admin.getByRole("tab", { name: "Bài tập" }).click()
    await expect(admin.getByText("Chưa có cột điểm nào")).toBeVisible()
    await admin.getByRole("button", { name: "Thêm cột điểm" }).first().click()
    await admin.locator("#new-title").fill("BT thử")
    await admin.getByRole("button", { name: "Tạo cột" }).click()
    await admin.locator(".marks input").first().fill("6")
    await admin.getByRole("button", { name: "Lưu điểm", exact: true }).click()
    await expect(admin.locator("table.grid tbody .mark").first()).toHaveText("6")
    await admin.locator("#col-title").fill("BT đã đổi tên")
    await admin.getByRole("button", { name: "Lưu điểm", exact: true }).click()
    await expect(admin.locator("button.col .t", { hasText: "BT đã đổi tên" })).toBeVisible({ timeout: 20_000 })
    await shot(admin, "homework")

    // ---- summary: attendance 10 - 1 (absent), +1 point, 8.5 and 6; the Excel file is made ----
    await admin.getByRole("tab", { name: "Tổng hợp" }).click()
    const row = admin.locator("table.stats-table tbody tr").first()
    await expect(row).toContainText("Vắng 1")
    await expect(row.locator(".meter .num")).toHaveText("9")
    await expect(row.locator(".badge")).toHaveText("+1")
    await expect(row.locator(".mark")).toHaveText(["8.5", "6"])
    const download = admin.waitForEvent("download")
    await admin.getByRole("button", { name: "Xuất Excel" }).click()
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/)
    await shot(admin, "summary")

    // ---- the student: only their own marks ----
    const studentCtx = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } })
    const student = await studentCtx.newPage()
    student.on("pageerror", e => errors.push(`student: ${String(e).slice(0, 200)}`))
    await student.goto("/login")
    await student.locator("#login-user").fill(username)
    await student.locator("#login-pass").fill(password)
    await student.locator("form button.btn.primary").click()
    await expect(student.locator("section.streak")).toBeVisible()
    await student.goto("/progress")
    const mine = student.locator("section.card", { has: student.getByRole("heading", { name: "Điểm trên lớp" }) })
    await expect(mine).toBeVisible()
    await expect(mine.locator(".stat b")).toHaveText(["9", "+1", "8.5", "6"])
    await expect(mine.locator(".list-row", { hasText: "BT đã đổi tên" })).toBeVisible()
    await expect(mine.locator(".badge.absent")).toHaveText("Vắng")
    await shot(student, "student")
    await studentCtx.close()

    // ---- English and dark, on the pages that were not looked at before ----
    if (SHOTS) {
      await adminCtx.addCookies([{ name: "lang", value: "en", url: BASE }, { name: "theme", value: "dark", url: BASE }])
      for (const tab of ["points", "summary"]) {
        await admin.goto(`${classHref.replace("/classes/", "/scores/")}?tab=${tab}`)
        await expect(admin.getByRole("heading", { level: 1 })).toContainText(`Class marks ${CLASS}`)
        await shot(admin, `en-dark-${tab}`)
      }
      await adminCtx.addCookies([{ name: "lang", value: "vi", url: BASE }, { name: "theme", value: "light", url: BASE }])
    }

    // ---- delete a column and the session with the two-click button ----
    await admin.goto(`${classHref.replace("/classes/", "/scores/")}?tab=homework`)
    await admin.locator("button.col").first().click()
    await admin.getByRole("button", { name: "Xoá cột" }).click()
    await admin.getByRole("button", { name: "Bấm lần nữa" }).click()
    await expect(admin.getByText("Đã xoá cột điểm")).toBeVisible()
    await expect(admin.getByText("Chưa có cột điểm nào")).toBeVisible()
    await admin.getByRole("tab", { name: "Điểm danh" }).click()
    await admin.getByRole("button", { name: "Xoá", exact: true }).click()
    await admin.getByRole("button", { name: "Bấm lần nữa" }).click()
    await expect(admin.getByText("Đã xoá buổi học")).toBeVisible()
    await expect(admin.getByText("Chưa có buổi nào trong học kỳ này")).toBeVisible()
  } finally {
    await removeTestClass(admin, CLASS)
    expect(errors).toEqual([])
    await adminCtx.close()
  }
})
