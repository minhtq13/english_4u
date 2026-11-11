import { Workbook } from "exceljs"
import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import { buildParts, buildVariants, type ExamQuestion } from "~/utils/examGenerator"
import { examDocx, examFileName, examZip, htmlToParagraphs, markedBits, optionColumns, partHintOf, type ExamInfo } from "~/utils/exportDocx"
import { detailSheet, examKeyBytes, matrixSheet } from "~/utils/exportExcel"

const info: ExamInfo = { title: "Đề kiểm tra giữa kỳ 1", grade: "Lớp 7", school: "Trường THCS Nguyễn Du", department: "Tổ Ngoại ngữ", schoolYear: "2026 – 2027", term: "", minutes: 45 }
const q = (id: string, init: Partial<ExamQuestion> = {}): ExamQuestion => ({
  id, type: "mcq", prompt: "<p>She <b>___</b> to school.</p>", options: ["go", "goes", "going", "gone"], correct: 1, answers: [], words: [], back: "",
  explanation: "<p>Chủ ngữ số ít &amp; hiện tại đơn.</p>", tag: "", sectionId: "s", sectionTitle: "Chọn đáp án đúng", passage: "", lessonId: "7.1", ...init,
})
const questions = [
  q("p1", { prompt: "Chọn từ có phần gạch chân phát âm khác.", options: ["b[u]s", "l[u]nch", "st[u]dy", "comp[u]ter"], correct: 3 }),
  q("g1"), q("g2", { options: ["a very long option that needs a line", "another long option to print here", "third", "fourth"], correct: 0 }),
  q("e1", { type: "error", options: ["She", "go", "to school", "every day"], correct: 1 }),
  q("r1", { sectionId: "read", passage: "<p>Bat Trang is a <em class=\"g\">pottery</em> village.</p><p>It is near Ha Noi.</p>", prompt: "(1)" }),
  q("m1", { type: "match", prompt: "left 1", back: "right 1", options: [], correct: -1 }),
  q("m2", { type: "match", prompt: "left 2", back: "right 2", options: [], correct: -1 }),
  q("o1", { type: "order", prompt: "", options: [], correct: -1, words: ["I", "like", "green", "tea"] }),
  q("t1", { type: "typed", prompt: "He (go) ___ home.", options: [], correct: -1, answers: ["goes"] }),
]
const variants = buildVariants(buildParts(questions), ["101", "102"], "all")

describe("text for Word", () => {
  it("htmlToParagraphs keeps bold, italic, underline and paragraphs, and decodes entities", () => {
    expect(htmlToParagraphs("<p>A <b>bold</b> &amp; <i>it</i><u>un</u></p><p>Next<br>line &#39;x&#39;</p>")).toEqual([
      [{ text: "A " }, { text: "bold", bold: true }, { text: " & " }, { text: "it", italic: true }, { text: "un", underline: true }],
      [{ text: "Next" }],
      [{ text: "line 'x'" }],
    ])
  })
  it("a keyword (em.g) prints bold, a plain em italic; nested styles add up", () => {
    expect(htmlToParagraphs("<em class=\"g\">key</em> <em>soft</em> <b><i>both</i></b>")).toEqual([
      [{ text: "key", bold: true }, { text: " " }, { text: "soft", italic: true }, { text: " " }, { text: "both", bold: true, italic: true }],
    ])
  })
  it("plain text, empty input and unknown tags", () => {
    expect(htmlToParagraphs("just text")).toEqual([[{ text: "just text" }]])
    expect(htmlToParagraphs("")).toEqual([])
    expect(htmlToParagraphs("<p></p><span>in span</span>")).toEqual([[{ text: "in span" }]])
  })
  it("markedBits underlines what sits in square brackets", () => {
    expect(markedBits("c[a]t")).toEqual([{ text: "c" }, { text: "a", underline: true }, { text: "t" }])
    expect(markedBits("book[s]")).toEqual([{ text: "book" }, { text: "s", underline: true }])
    expect(markedBits("plain")).toEqual([{ text: "plain" }])
    expect(markedBits("[th]ink", { bold: true })).toEqual([{ text: "th", bold: true, underline: true }, { text: "ink", bold: true }])
  })
  it("optionColumns: short choices share a line, long ones get their own", () => {
    expect(optionColumns(["b[u]s", "l[u]nch", "st[u]dy", "comp[u]ter"])).toBe(4)
    expect(optionColumns(["True", "False"])).toBe(2)
    expect(optionColumns(["a reasonably short one", "b", "c", "d"])).toBe(2)
    expect(optionColumns(["a very long option that cannot share a line with another", "b", "c", "d"])).toBe(1)
  })
})

async function documentXml(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  return zip.file("word/document.xml")!.async("string")
}
const textOf = (xml: string) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join("").replace(/&amp;/g, "&")

describe("Word paper", () => {
  it("is a .docx with the heading, every question number and the underlined sound", async () => {
    const v = variants[0]!
    const xml = await documentXml(await examDocx(info, v))
    const text = textOf(xml)
    expect(text).toContain("TRƯỜNG THCS NGUYỄN DU")
    expect(text).toContain("ĐỀ KIỂM TRA GIỮA KỲ 1")
    expect(text.match(/examDoc\.questionN/g)).toHaveLength(v.questions.length)
    // c[a]t marks become underlined runs, never literal brackets.
    expect(text).not.toMatch(/b\[u\]s/)
    expect(xml).toMatch(/<w:u w:val="single"\/>.{0,80}<w:t[^>]*>u<\/w:t>/s)
    expect(text).toContain("Bat Trang is a pottery village.")
    // The student copy carries no answer text.
    expect(text).not.toContain("examDoc.answer:")
    expect(text).not.toContain("Chủ ngữ số ít")
  })
  it("the copy with solutions adds the key and the explanation", async () => {
    const text = textOf(await documentXml(await examDocx(info, variants[0]!, { withKey: true })))
    expect(text).toContain("examDoc.keyTitle")
    expect(text).toContain("Chủ ngữ số ít & hiện tại đơn.")
    expect(text.match(/examDoc\.answer: /g)!.length).toBeGreaterThanOrEqual(6)
    expect(text).toContain("I like green tea")
  })
  it("each part prints the instruction the author wrote, else the default", async () => {
    const mine = { ...info, partHints: { phonetics: "Khoanh tròn đáp án đúng.", reading: "  " } }
    const text = textOf(await documentXml(await examDocx(mine, variants[0]!)))
    expect(text).toContain("Khoanh tròn đáp án đúng.")
    expect(text).not.toContain("exam.part.phonetics.hint")
    expect(text).toContain("exam.part.reading.hint") // blank: the default
    expect(text).toContain("exam.part.grammar.hint")
    expect(partHintOf({ partHints: { error: " Tìm  lỗi " } }, "error")).toBe("Tìm lỗi")
    expect(partHintOf({}, "error")).toBe("exam.part.error.hint")
  })
  it("the answer sheet can be left out", async () => {
    expect(textOf(await documentXml(await examDocx(info, variants[0]!)))).toContain("examDoc.answerSheet")
    expect(textOf(await documentXml(await examDocx(info, variants[0]!, { answerSheet: "none" })))).not.toContain("examDoc.answerSheet")
  })
  it("file names are safe and say the code", () => {
    expect(examFileName(info, "101")).toBe("De-kiem-tra-giua-ky-1-examDoc-fileCode-101.docx")
    expect(examFileName(info, "101", true)).toMatch(/-101-examDoc-fileKey\.docx$/)
  })
  it("the zip holds a paper and a solutions copy per code, plus the key", async () => {
    const zip = await JSZip.loadAsync(await (await examZip(info, variants, {}, { name: "key", bytes: await examKeyBytes(info, variants) })).arrayBuffer())
    const names = Object.keys(zip.files).filter(n => !zip.files[n]!.dir).sort()
    expect(names.filter(n => n.endsWith(".docx"))).toHaveLength(4)
    expect(names).toContain("key.xlsx")
    expect(names).toContain(examFileName(info, "102"))
  })
})

describe("Excel answer key", () => {
  it("matrix sheet: codes down, questions across, the key in each cell", () => {
    const s = matrixSheet(info, variants)
    expect(s.rows).toHaveLength(3)
    expect(s.rows[0]).toHaveLength(questions.length + 1)
    variants.forEach((v, i) => expect(s.rows[i + 1]).toEqual([v.code, ...v.questions.map(x => x.key)]))
  })
  it("detail sheet: one row per question of every code, traced to the base exam", () => {
    const s = detailSheet(info, variants)
    expect(s.rows).toHaveLength(1 + 2 * questions.length)
    const g1 = variants[1]!.questions.find(x => x.q.id === "g1")!
    expect(s.rows).toContainEqual(["102", g1.n, g1.baseN, g1.key, g1.baseKey, "goes", "Chủ ngữ số ít & hiện tại đơn."])
  })
  it("writes a workbook with both sheets", async () => {
    const book = new Workbook()
    await book.xlsx.load(await examKeyBytes(info, variants))
    expect(book.worksheets).toHaveLength(2)
    const matrix = book.worksheets[0]!
    // Title, note, blank line, header, then one row per code.
    expect(matrix.getRow(5).getCell(1).value).toBe("101")
    expect(matrix.getRow(5).getCell(2).value).toBe(variants[0]!.questions[0]!.key)
    expect(book.worksheets[1]!.rowCount).toBe(4 + 2 * questions.length)
  })
})
