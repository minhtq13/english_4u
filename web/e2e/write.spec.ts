import { expect, test } from "@playwright/test"
import { signIn } from "./helpers"

// Writes to the live database, so it is off unless E2E_WRITE=1 and it only touches the class named in E2E_EMPTY_CLASS
// (default 7T2): a class with no students, so nobody is notified and no work exists. Everything it creates is removed.
test.skip(!process.env.E2E_WRITE, "writes data: set E2E_WRITE=1")
const CLASS = process.env.E2E_EMPTY_CLASS ?? "7T2"

test("a teacher gives a timed lesson to the empty class and takes it back; posts and deletes an announcement", async ({ page }) => {
  test.setTimeout(90_000)
  await signIn(page, "TEACHER")
  await page.goto("/teacher")
  await page.locator("a.class-card", { hasText: CLASS }).click()
  await expect(page.locator("#ann-body")).toBeVisible()
  await expect(page.getByText(/0 học sinh|0 students/).first()).toBeVisible()

  // announcement (first remove any left over from an earlier failed run)
  const leftovers = page.locator(".ann li", { hasText: "Thông báo thử (e2e)" })
  while (await leftovers.count()) {
    await leftovers.first().getByRole("button", { name: /Xoá|Delete/ }).click()
    await leftovers.first().getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
    await page.waitForTimeout(800)
  }
  await page.locator("#ann-body").fill("Thông báo thử (e2e)")
  await page.getByRole("button", { name: /Đăng thông báo|Post/ }).click()
  const posted = page.locator(".ann li", { hasText: "Thông báo thử (e2e)" })
  await expect(posted).toBeVisible()
  await posted.getByRole("button", { name: /Xoá|Delete/ }).click()
  await posted.getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
  await expect(posted).toHaveCount(0)

  // give the first lesson that is not given yet, with a time limit
  const takeBack = page.getByRole("button", { name: /^(Thu hồi|Take back)$/ })
  // Given lessons fold to one line; "expand all" shows their buttons (it only expands when something is folded).
  const expandAll = async () => {
    const b = page.getByRole("button", { name: /^(Mở rộng tất cả|Expand all)$/ })
    if (await b.count()) await b.click()
  }
  await expandAll()
  const before = await takeBack.count()
  await page.getByRole("button", { name: /^(Giao cho lớp|Give to class)$/ }).first().click()
  await page.locator("input.limit").fill("15")
  await page.getByRole("button", { name: new RegExp(`^(Giao cho lớp|Give to class) ${CLASS}$`) }).click()
  const notice = page.locator(".notice.ok")
  await expect(notice).toBeVisible()
  await expandAll()
  await expect(takeBack).toHaveCount(before + 1)

  // take it back (no student exists, so the database allows it). The notice names the lesson: «Đã giao “Unit 1 - Hobbies” cho lớp 7T2».
  const name = /[“"](.+?)[”"]/.exec((await notice.innerText()) ?? "")?.[1]
  expect(name).toBeTruthy()
  const block = page.locator(
    `xpath=//*[contains(normalize-space(.), '${name}')][.//button[normalize-space()='Thu hồi' or normalize-space()='Take back']]`
    + `[not(.//*[contains(normalize-space(.), '${name}')][.//button[normalize-space()='Thu hồi' or normalize-space()='Take back']])]`,
  ).first()
  await block.getByRole("button", { name: /^(Thu hồi|Take back)$/ }).click()
  await block.getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
  await expect(page.locator(".notice.ok")).toContainText(/Đã thu hồi|taken back/)
  await expandAll()
  await expect(takeBack).toHaveCount(before)
})
