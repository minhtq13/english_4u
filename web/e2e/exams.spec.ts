import { expect, test } from "@playwright/test"
import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { signIn, signInWith, testAccount } from "./helpers"

// The exam-set builder (/teacher/exams/new): reads the question bank, saves nothing in the database; every file is
// made in the browser. E2E_SAVE_DIR keeps the downloaded files and screenshots for a look by hand.
const OUT = process.env.E2E_SAVE_DIR

/** Drags with the mouse like a person: press the grip, move a little, then to the target, release. */
async function drag(page: import("@playwright/test").Page, grip: import("@playwright/test").Locator, to: { x: number; y: number }) {
  const box = (await grip.boundingBox())!
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + 12, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 25 })
  await page.mouse.move(to.x, to.y + 1)
  await page.mouse.up()
  await page.waitForTimeout(400)
}

test("an admin draws an exam from a matrix, picks one by hand and downloads Word, zip and Excel", async ({ page }) => {
  test.setTimeout(120_000)
  if (OUT) mkdirSync(OUT, { recursive: true })
  const keep = async (name: string, download: import("@playwright/test").Download) => { if (OUT) await download.saveAs(join(OUT, name)) }

  await signIn(page, "ADMIN")
  await page.goto("/teacher/exams/new")
  await page.evaluate(() => localStorage.removeItem("exam-draft-v1"))
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Tạo bộ đề thi|Build an exam set/)

  await page.getByPlaceholder(/Đề kiểm tra giữa kỳ 1|Mid-term test 1/).fill("Đề kiểm tra giữa kỳ 1")
  await page.getByPlaceholder(/THCS Nguyễn Du|Nguyen Du/).fill("Trường THCS Nguyễn Du")
  // Nothing can be downloaded before there are questions.
  await expect(page.locator(".problems li")).toHaveCount(1)

  // paging: every page has its own questions (same text twice would mean a row came back on a later page)
  const pager = page.locator(".pager")
  await expect(pager).toContainText(/Trang 1\/|Page 1\//)
  await page.waitForTimeout(1500) // the grade filter is applied after a short debounce
  await expect(pager).toContainText(/Trang 1\/|Page 1\//)
  const seen = new Set<string>()
  for (let n = 1; n < 30; n++) {
    await expect(pager).toContainText(new RegExp(`(Trang|Page) ${n}/`))
    const rows = await page.locator(".q-row .q-text").allInnerTexts()
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) { expect(seen.has(r), `question repeated on page ${n}: ${r}`).toBe(false); seen.add(r) }
    const next = page.getByRole("button", { name: /Sau|Next/ })
    if (await next.isDisabled()) break
    // The pager shows the new page number at once; the rows follow when the page has loaded.
    const firstRow = page.locator(".q-row .q-text").first()
    const before = await firstRow.innerText()
    await next.click()
    await expect.poll(() => firstRow.innerText()).not.toBe(before)
  }
  expect(seen.size).toBeGreaterThan(50)
  await expect(page.locator(".q-row.on")).toHaveCount(0)
  await page.reload()

  // filter by what is already chosen: tick two, then "Đã chọn" lists exactly them and "Chưa chọn" leaves them out
  const filter = page.getByLabel(/Lọc theo câu đã chọn|Filter by chosen/)
  const total = Number((await pager.innerText()).match(/\/ (\d+)/)?.[1] ?? 0)
  await page.locator(".q-row input[type=checkbox]").nth(0).check()
  await expect(page.locator(".q-row.on")).toHaveCount(1)
  await page.locator(".q-row input[type=checkbox]").nth(1).check()
  await expect(page.locator(".q-row.on")).toHaveCount(2)
  await filter.selectOption("in")
  await expect(page.locator(".q-row")).toHaveCount(2)
  await expect(page.locator(".q-row.on")).toHaveCount(2)
  await filter.selectOption("out")
  await expect(page.locator(".q-row")).toHaveCount(10)
  await expect(page.locator(".q-row.on")).toHaveCount(0)
  await expect(page.locator(".q-row .q-text").first()).not.toContainText(/^$/)
  await expect(page.getByText(new RegExp(`${total - 2} (câu|questions)`))).toBeVisible()
  await filter.selectOption("all")
  await expect(page.locator(".q-row")).toHaveCount(10)
  await page.locator(".q-row.on input[type=checkbox]").nth(0).uncheck()
  await page.locator(".q-row.on input[type=checkbox]").nth(0).uncheck()
  await expect(page.locator(".q-row.on")).toHaveCount(0)

  // looking at one question in full, then adding it from the preview
  await page.locator(".q-row .preview-btn").first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(".key")).toContainText(/Đáp án|Answer/)
  await dialog.getByRole("button", { name: /Thêm vào đề|Add to the exam/ }).click()
  await dialog.getByRole("button", { name: /^(Đóng|Close)/ }).first().click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator(".base-q")).toHaveCount(1)
  await page.locator(".base-q .acts .btn").first().click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: /Bỏ khỏi đề|Remove from the exam/ }).click()
  await dialog.getByRole("button", { name: /^(Đóng|Close)/ }).first().click()
  await expect(page.locator(".base-q")).toHaveCount(0)

  // by matrix
  await page.getByRole("tab", { name: /Tự động theo ma trận|Draw from a matrix/ }).click()
  const rows = page.locator(".matrix .m-row")
  await expect(page.locator(".lessons summary")).toContainText(/[1-9]\d*\/\d+/)
  await expect(rows).toHaveCount(7)
  await rows.nth(0).locator("input").fill("3")
  await rows.nth(1).locator("input").fill("6")
  await rows.nth(2).locator("input").fill("3")
  await rows.nth(3).locator("input").fill("3")
  await rows.nth(4).locator("input").fill("1")
  await rows.nth(5).locator("input").fill("2")
  await rows.nth(6).locator("input").first().fill("1")
  await page.locator(".draw button").click()
  await expect(page.locator(".base-q").first()).toBeVisible()
  const drawn = await page.locator(".base-q").count()
  expect(drawn).toBeGreaterThan(10)

  // dragging: the last part to the top (parts and numbers follow), then a question inside its part
  await page.setViewportSize({ width: 1280, height: 5000 }) // the whole list in view, so the mouse can reach both ends
  await page.evaluate(() => window.scrollTo(0, 0))
  const parts = page.locator(".parts > .base-part")
  await parts.first().scrollIntoViewIfNeeded()
  const titles = async () => (await parts.locator(".part-head h3").allInnerTexts()).map(x => x.replace(/^\S+\s+\S+\s+/, "").trim())
  const before = await titles()
  expect(before.length).toBeGreaterThan(3)
  const topBox = (await parts.first().boundingBox())!
  await drag(page, parts.last().locator(".part-handle"), { x: topBox.x + topBox.width / 2, y: topBox.y + 6 })
  const after = await titles()
  expect(after[0]).toBe(before[before.length - 1])
  expect(after.slice(1)).toEqual(before.slice(0, -1))
  await expect(parts.first().locator(".base-q").first().locator("b").first()).toHaveText("1.")
  expect(await page.locator(".base-q").count()).toBe(drawn)

  let widest = parts.first()
  let most = 0
  for (let i = 0; i < (await parts.count()); i++) {
    const n = await parts.nth(i).locator(".blocks > .block").count()
    if (n > most) { most = n; widest = parts.nth(i) }
  }
  const blocks = widest.locator(".blocks > .block")
  const nBlocks = await blocks.count()
  expect(nBlocks).toBeGreaterThan(2)
  const firstText = (await blocks.first().locator(".q-text").first().innerText()).replace(/^\d+\.\s*/, "").split("\n")[0]!
  const target = (await blocks.nth(2).boundingBox())!
  await drag(page, blocks.first().locator(".block-handle"), { x: target.x + target.width / 2, y: target.y + target.height - 4 })
  expect(await blocks.count()).toBe(nBlocks)
  expect((await blocks.first().locator(".q-text").first().innerText()).includes(firstText)).toBe(false)
  await expect(blocks.nth(2).locator(".q-text").first()).toContainText(firstText)
  // the arrow buttons still work as the keyboard way
  await blocks.nth(2).getByRole("button", { name: /Đưa lên|Move up/ }).click()
  await expect(blocks.nth(1).locator(".q-text").first()).toContainText(firstText)

  // an instruction written by the author replaces the default under the part title, in the paper too
  const hint = parts.first().locator(".hint-input")
  await expect(hint).toHaveAttribute("placeholder", /.+/)
  await hint.fill("Khoanh tròn đáp án đúng (do tôi viết).")
  await expect(page.locator(".paper .part-hint").first()).toHaveText("Khoanh tròn đáp án đúng (do tôi viết).")
  await parts.first().getByRole("button", { name: /Dùng mặc định|Use default/ }).click()
  await expect(page.locator(".paper .part-hint").first()).not.toContainText("do tôi viết")

  // by hand: one more question from the bank
  await page.getByRole("tab", { name: /Chọn thủ công|Pick by hand/ }).click()
  const free = page.locator(".q-row:not(.on)").first()
  await free.locator("input").check()
  await expect(page.locator(".base-q")).toHaveCount(drawn + 1)

  // the paper of each code
  await expect(page.locator(".code-tabs .btn")).toHaveCount(4)
  await expect(page.locator(".paper")).toContainText(/Mã đề: 101|Exam code: 101/)
  const first = await page.locator(".paper").innerText()
  await page.locator(".code-tabs .btn", { hasText: "102" }).click()
  await expect(page.locator(".paper")).toContainText(/Mã đề: 102|Exam code: 102/)
  expect(await page.locator(".paper").innerText()).not.toBe(first)
  if (OUT) await page.screenshot({ path: join(OUT, "page-light.png"), fullPage: true })

  const save = async (name: RegExp, file: RegExp, as: string) => {
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name }).click()])
    expect(download.suggestedFilename()).toMatch(file)
    await keep(as, download)
  }
  await save(/Tải file \.docx mã đề 102|Download \.docx for code 102/, /-102\.docx$/, "de-102.docx")
  await save(/Tải đề kèm lời giải|with solutions/, /-102-.*\.docx$/, "de-102-loi-giai.docx")
  await save(/\.zip/, /\.zip$/, "bo-de.zip")
  await save(/Excel/, /\.xlsx$/, "dap-an.xlsx")

  // the PDF page: opens in a new tab, one paper per code, answers on request
  await page.context().addInitScript(() => { window.print = () => {} }) // the page opens the print dialog by itself
  const [tab2] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("link", { name: /Tải PDF tất cả|PDF of all/ }).click()])
  await tab2.waitForLoadState()
  await expect(tab2.locator(".paper")).toHaveCount(4)
  await expect(tab2.locator(".paper").first().locator("table.student")).toBeVisible()
  await expect(tab2.locator(".paper").first().locator("table.sheet")).toBeVisible()
  await tab2.getByLabel(/Bản kèm đáp án|Copy with answers/).check()
  await expect(tab2.locator(".paper").first().locator(".key-title")).toBeVisible()
  if (OUT) await tab2.pdf({ path: join(OUT, "bo-de-print.pdf"), format: "A4", printBackground: true })
  await tab2.close()

  // the draft survives a reload
  await page.reload()
  await expect(page.locator(".base-q")).toHaveCount(drawn + 1)

  // English and dark mode
  await page.context().addCookies([{ name: "lang", value: "en", url: page.url() }, { name: "theme", value: "dark", url: page.url() }])
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Build an exam set")
  await expect(page.locator(".paper")).toContainText("Exam code: 101")
  if (OUT) await page.screenshot({ path: join(OUT, "page-dark-en.png"), fullPage: true })
  await page.evaluate(() => localStorage.removeItem("exam-draft-v1"))
})

// Writes to the live database (one exam set, deleted at the end), so it only runs with E2E_WRITE=1.
test("an exam set is saved, listed, edited and deleted", async ({ page }) => {
  test.skip(!process.env.E2E_WRITE, "writes data: set E2E_WRITE=1")
  test.setTimeout(90_000)
  const title = `E2E bộ đề ${Date.now()}`
  await signIn(page, "ADMIN")
  await page.goto("/teacher/exams/new")
  await page.evaluate(() => localStorage.removeItem("exam-draft-v1"))
  await page.reload()
  const remove = async () => {
    await page.goto("/teacher/exams")
    await page.getByRole("searchbox").fill("E2E bộ đề")
    for (let i = 0; i < 10; i++) {
      const row = page.locator("tbody tr", { hasText: "E2E bộ đề" }).first()
      await page.waitForTimeout(800)
      if (!(await row.count())) break
      await row.getByRole("button", { name: /^(Xoá|Delete)$/ }).click()
      await row.getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
      await page.waitForTimeout(1000)
    }
  }
  try {
    await expect(page.locator(".savebar")).toContainText(/Chưa lưu vào danh sách|Not saved to your exam sets/)
    await page.getByPlaceholder(/Đề kiểm tra giữa kỳ 1|Mid-term test 1/).fill(title)
    await expect(page.locator(".q-row").first()).toBeVisible()
    for (const i of [0, 1, 2]) await page.locator(".q-row input[type=checkbox]").nth(i).check()
    await expect(page.locator(".base-q")).toHaveCount(3)
    await page.locator(".hint-input").first().fill("Chú thích riêng của e2e")
    await page.getByRole("button", { name: /Lưu bộ đề|Save exam set/ }).click()
    await expect(page).toHaveURL(/\/teacher\/exams\/[0-9a-f-]{36}$/)
    await expect(page.locator(".savebar")).toContainText(/Đã lưu|Saved/)

    // it comes back from the database after a reload
    await page.reload()
    await expect(page.getByPlaceholder(/Đề kiểm tra giữa kỳ 1|Mid-term test 1/)).toHaveValue(title)
    await expect(page.locator(".base-q")).toHaveCount(3)
    await expect(page.locator(".hint-input").first()).toHaveValue("Chú thích riêng của e2e")
    await expect(page.locator(".paper .part-hint").first()).toHaveText("Chú thích riêng của e2e")

    // an edit marks the set as changed until it is saved
    await page.getByPlaceholder(/Đề kiểm tra giữa kỳ 1|Mid-term test 1/).fill(`${title} (sửa)`)
    await expect(page.locator(".savebar")).toContainText(/Có thay đổi chưa lưu|Unsaved changes/)
    await page.getByRole("button", { name: /Lưu thay đổi|Save changes/ }).click()
    await expect(page.locator(".savebar")).toContainText(/Đã lưu|Saved/)

    // the PDF page prints the saved set
    const [print] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("link", { name: /Tải PDF tất cả|PDF of all/ }).click()])
    await print.addInitScript(() => { window.print = () => {} })
    await expect(print.locator(".paper")).toHaveCount(4)
    await print.close()

    // the list shows it, with its size
    await page.goto("/teacher/exams")
    await page.getByRole("searchbox").fill(title)
    const row = page.locator("tbody tr", { hasText: title })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText("(sửa)")
    await expect(row.locator("td").nth(2)).toHaveText("3")

    // delete asks twice, then the set is gone
    await row.getByRole("button", { name: /^(Xoá|Delete)$/ }).click()
    await row.getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
    await expect(page.locator("tbody tr", { hasText: title })).toHaveCount(0)
    await page.goto(page.url())
    await page.goto("/teacher/exams")
    await page.getByRole("searchbox").fill(title)
    await expect(page.locator("tbody tr", { hasText: title })).toHaveCount(0)
  } finally {
    await remove()
  }
})

// Two accounts at once (each has one session, so each gets its own browser context), the plain test accounts test.admin
// and gv.02: the admin makes an exam set and shares it with the teacher; the teacher can only view it, then edit it, copies it and drops the share.
// Writes to the live database and removes everything it made, so it only runs with E2E_WRITE=1.
test("an exam set is shared with another teacher: view only, then edit, copy and leave", async ({ page, browser }) => {
  test.skip(!process.env.E2E_WRITE, "writes data: set E2E_WRITE=1")
  test.setTimeout(150_000)
  const title = `E2E chia sẻ ${Date.now()}`
  const titleBox = (p: import("@playwright/test").Page) => p.getByPlaceholder(/Đề kiểm tra giữa kỳ 1|Mid-term test 1/)
  const other = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" })
  const teacher = await other.newPage()

  /** Deletes what this run made, as the account of `p` (only sets it may delete show a Delete button). */
  const purge = async (p: import("@playwright/test").Page) => {
    await p.goto("/teacher/exams")
    await p.getByRole("searchbox").fill("E2E chia sẻ")
    for (let i = 0; i < 10; i++) {
      await p.waitForTimeout(900)
      // Only sets this account may delete have a Delete button; once pressed it asks again, and only that button is armed.
      const del = p.locator("tbody tr", { hasText: "E2E chia sẻ" }).getByRole("button", { name: /^(Xoá|Delete)$/ })
      if (!(await del.count())) break
      await del.first().click()
      await p.getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
      await p.waitForTimeout(900)
    }
  }
  const search = async (p: import("@playwright/test").Page, text: string) => {
    await p.goto("/teacher/exams")
    await p.getByRole("searchbox").fill(text)
    await p.waitForTimeout(900)
  }

  try {
    // admin: make a set and share it as view-only
    await signInWith(page, testAccount("ADMIN"))
    await page.goto("/teacher/exams/new")
    await page.evaluate(() => localStorage.removeItem("exam-draft-v1"))
    await page.reload()
    await expect(page.getByRole("button", { name: /Chia sẻ|Share/ })).toBeDisabled() // nothing to share before it is saved
    await titleBox(page).fill(title)
    await expect(page.locator(".q-row").first()).toBeVisible()
    for (const i of [0, 1]) await page.locator(".q-row input[type=checkbox]").nth(i).check()
    await expect(page.locator(".base-q")).toHaveCount(2)
    await page.getByRole("button", { name: /Lưu bộ đề|Save exam set/ }).click()
    await expect(page).toHaveURL(/\/teacher\/exams\/[0-9a-f-]{36}$/)
    const setUrl = new URL(page.url()).pathname

    await page.getByRole("button", { name: /^(\s*Chia sẻ|\s*Share)$/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder(/Tìm giáo viên|Search teachers/).fill("gv.02")
    const candidate = dialog.locator("[data-test=candidate-row]", { hasText: "gv.02" })
    await expect(candidate).toHaveCount(1)
    await candidate.getByRole("button", { name: /^(Chia sẻ|Share)$/ }).click()
    const shared = dialog.locator("[data-test=share-row]", { hasText: "gv.02" })
    await expect(shared).toHaveCount(1)
    await expect(shared.getByRole("combobox")).toHaveValue("view")
    await expect(dialog.locator("[data-test=candidate-row]", { hasText: "gv.02" })).toHaveCount(0) // already shared: not offered again
    await dialog.getByRole("button", { name: /^(Đóng|Close)/ }).first().click()

    // teacher: sees it, view only
    await signInWith(teacher, testAccount("TEACHER"))
    await search(teacher, title)
    const row = teacher.locator("tbody tr", { hasText: title })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(/Chỉ xem|View only/)
    await expect(row.getByRole("button", { name: /^(Xoá|Delete)$/ })).toHaveCount(0) // not theirs to delete
    await expect(row.getByRole("button", { name: /^(Chia sẻ|Share)$/ })).toHaveCount(0)
    await teacher.goto(setUrl)
    await expect(teacher.locator(".fb.key")).toContainText(/chia sẻ cho bạn|shared with you/)
    await expect(titleBox(teacher)).toHaveValue(title)
    await expect(titleBox(teacher)).toBeDisabled()
    await expect(teacher.getByRole("button", { name: /Lưu thay đổi|Save changes/ })).toHaveCount(0)
    await expect(teacher.getByRole("button", { name: /^(\s*Chia sẻ|\s*Share)$/ })).toHaveCount(0)
    await expect(teacher.getByRole("link", { name: /Tải PDF tất cả|PDF of all/ })).toBeVisible() // can still print and export
    await expect(teacher.getByRole("button", { name: /Tạo bản sao để sửa|Make a copy to edit/ })).toBeVisible()

    // admin lets them edit; the teacher then changes the title and the admin sees it
    await page.getByRole("button", { name: /^(\s*Chia sẻ|\s*Share)$/ }).click()
    await dialog.locator("[data-test=share-row]", { hasText: "gv.02" }).getByRole("combobox").selectOption("edit")
    await expect(dialog.locator("[data-test=share-row]", { hasText: "gv.02" }).getByRole("combobox")).toHaveValue("edit")
    await dialog.getByRole("button", { name: /^(Đóng|Close)/ }).first().click()
    await teacher.reload()
    await expect(teacher.locator(".fb.key")).toContainText(/được sửa|may edit|you may edit/i)
    await expect(titleBox(teacher)).toBeEnabled()
    await titleBox(teacher).fill(`${title} (giáo viên sửa)`)
    await teacher.getByRole("button", { name: /Lưu thay đổi|Save changes/ }).click()
    await expect(teacher.locator(".savebar")).toContainText(/Đã lưu|Saved/)
    await page.reload()
    await expect(titleBox(page)).toHaveValue(`${title} (giáo viên sửa)`)

    // the teacher makes a copy of their own, which is theirs to delete
    await search(teacher, title)
    await teacher.locator("tbody tr", { hasText: title }).getByRole("button", { name: /Tạo bản sao|Make a copy/ }).click()
    await expect(teacher).toHaveURL(/\/teacher\/exams\/[0-9a-f-]{36}$/)
    await expect(titleBox(teacher)).toHaveValue(/\((bản sao|copy)\)$/)
    await expect(teacher.getByRole("button", { name: /^(\s*Chia sẻ|\s*Share)$/ })).toBeEnabled()
    await purge(teacher) // deletes the copy; the shared original has no Delete button for them

    // the teacher leaves the share: the set is gone from their list but not from the admin's
    await search(teacher, title)
    const mine = teacher.locator("tbody tr", { hasText: title }).first()
    await mine.getByRole("button", { name: /^(Bỏ chia sẻ|Remove share)$/ }).click()
    await mine.getByRole("button", { name: /Bấm lần nữa|Click again/ }).click()
    await expect(teacher.locator("tbody tr", { hasText: title })).toHaveCount(0)
    await page.goto(setUrl)
    await expect(titleBox(page)).toHaveValue(/E2E chia sẻ/)
    await page.getByRole("button", { name: /^(\s*Chia sẻ|\s*Share)$/ }).click()
    await expect(dialog.locator("[data-test=share-row]")).toHaveCount(0)
  } finally {
    await purge(page)
    await other.close()
  }
})
