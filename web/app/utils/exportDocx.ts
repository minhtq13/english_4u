import type { Paragraph, Table } from "docx"
import type { ExamVariant, PartHints, PartKey, VariantBlock, VariantPart, VariantQuestion } from "./examGenerator"
import { LETTERS, plainMarked, roman } from "./examGenerator"
import { tr } from "./i18n"
import { fileSlug } from "./spreadsheet"

// One exam paper as a Word file (.docx), laid out like a Vietnamese school test: a two-column heading, the student
// box, a small answer sheet, then the parts with questions numbered 1…N. Built in the browser with `docx`, which is
// imported only when a file is made (like exceljs), so it never weighs on the pages.

/** What the heading of the paper says. */
export interface ExamInfo {
  title: string
  /** The grade as printed ("7"), "" to leave it out. */
  grade: string
  school: string
  /** Subject group ("Tổ Ngoại ngữ"). */
  department: string
  schoolYear: string
  term: string
  minutes: number
  /** Instructions the author wrote for parts; see partHintOf(). */
  partHints?: PartHints
}

/** The instruction printed under a part's title: the one the author wrote, else the default. */
export const partHintOf = (info: Pick<ExamInfo, "partHints">, key: PartKey) =>
  info.partHints?.[key]?.replace(/\s+/g, " ").trim() || tr(`exam.part.${key}.hint`)

export interface DocxOptions {
  /** The teacher's copy: right answers marked, the key and the explanation under every question. */
  withKey?: boolean
  /** Where the small answer sheet goes. */
  answerSheet?: "top" | "bottom" | "none"
}

// ---- text: stored HTML and `c[a]t` marks → runs ----

export interface TextBit { text: string; bold?: boolean; italic?: boolean; underline?: boolean; sub?: boolean; sup?: boolean }

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " }
const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m
  const code = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
  return Number.isFinite(code) ? String.fromCodePoint(code) : m
})

const BREAKS = new Set(["p", "div", "br", "li", "ul", "ol", "tr", "table", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6"])
const STYLE: Record<string, keyof Omit<TextBit, "text">> = { b: "bold", strong: "bold", i: "italic", u: "underline", sub: "sub", sup: "sup" }

/**
 * Lesson HTML (what the rich editor saves) as paragraphs of styled runs. Bold, italic, underline, sub and superscript
 * are kept; `em.g` (a highlighted keyword) prints bold, any other `em` italic; block tags and `<br>` start a new
 * paragraph; table cells are separated by a tab. Everything else is dropped, its text kept.
 */
export function htmlToParagraphs(html: string): TextBit[][] {
  const out: TextBit[][] = []
  let line: TextBit[] = []
  const on = { bold: 0, italic: 0, underline: 0, sub: 0, sup: 0 }
  const ems: (keyof typeof on)[] = []
  const flush = () => {
    const kept = trimLine(line)
    if (kept.length) out.push(kept)
    line = []
  }
  for (const token of html.match(/<[^>]*>|[^<]+/g) ?? []) {
    if (token[0] !== "<") {
      const text = decode(token).replace(/\s+/g, " ")
      if (text) line.push({ text, ...Object.fromEntries(Object.entries(on).filter(([, n]) => n > 0).map(([k]) => [k, true])) })
      continue
    }
    const m = /^<\s*(\/?)\s*([a-z0-9]+)/i.exec(token)
    if (!m) continue
    const closing = m[1] === "/"
    const tag = m[2]!.toLowerCase()
    if (BREAKS.has(tag)) {
      flush()
      if (tag === "li" && !closing) line.push({ text: "• " })
    } else if ((tag === "td" || tag === "th") && closing) {
      line.push({ text: "\t" })
    } else if (tag === "em") {
      if (!closing) ems.push(/class\s*=\s*["'][^"']*\bg\b/i.test(token) ? "bold" : "italic")
      const key = closing ? ems.pop() : ems[ems.length - 1]
      if (key) on[key] = Math.max(0, on[key] + (closing ? -1 : 1))
    } else if (STYLE[tag]) {
      const key = STYLE[tag] as keyof typeof on
      on[key] = Math.max(0, on[key] + (closing ? -1 : 1))
    }
  }
  flush()
  return out
}

function trimLine(line: TextBit[]) {
  const bits = line.map(b => ({ ...b }))
  while (bits.length && !bits[0]!.text.trim()) bits.shift()
  while (bits.length && !bits[bits.length - 1]!.text.trim()) bits.pop()
  if (bits.length) {
    bits[0]!.text = bits[0]!.text.replace(/^[ \t]+/, "")
    bits[bits.length - 1]!.text = bits[bits.length - 1]!.text.replace(/[ \t]+$/, "")
  }
  return bits
}

/** A choice or chunk with its pronunciation marks: `c[a]t` → "c", underlined "a", "t". */
export function markedBits(text: string, style: Omit<TextBit, "text"> = {}): TextBit[] {
  const bits: TextBit[] = []
  let last = 0
  for (const m of text.matchAll(/\[([^\]]+)\]/g)) {
    if (m.index > last) bits.push({ text: text.slice(last, m.index), ...style })
    bits.push({ text: m[1]!, ...style, underline: true })
    last = m.index + m[0].length
  }
  if (last < text.length) bits.push({ text: text.slice(last), ...style })
  return bits
}

/** How many choices fit on one line: all of them when short, two when medium, one when long. */
export function optionColumns(options: readonly string[]): number {
  const longest = Math.max(0, ...options.map(o => plainMarked(o).length))
  if (options.length <= 4 && longest <= 14) return Math.max(1, options.length)
  if (longest <= 34) return 2
  return 1
}

// ---- the document ----

const FONT = "Times New Roman"
/** Font sizes are in half-points. */
const SIZE = 24
/** A4 in twips, with the margins below: the width the text and tables can use. */
const PAGE = { width: 11906, height: 16838, left: 1134, right: 851, top: 851, bottom: 851 }
const CONTENT = PAGE.width - PAGE.left - PAGE.right
const INDENT = 340
const KEY_COLOR = "0A5C2B"
const DOTS = "…".repeat(60)

export const examFileName = (info: ExamInfo, code: string, withKey = false) =>
  `${fileSlug(info.title) || "de-thi"}-${fileSlug(tr("examDoc.fileCode"))}-${fileSlug(code) || "x"}${withKey ? `-${fileSlug(tr("examDoc.fileKey"))}` : ""}.docx`

/** The paper of one exam code as a .docx file. */
export async function examDocx(info: ExamInfo, variant: ExamVariant, opts: DocxOptions = {}): Promise<Blob> {
  const d = await import("docx")
  const withKey = !!opts.withKey
  const sheetAt = opts.answerSheet ?? "top"

  const run = (b: TextBit, extra: Partial<TextBit> & { color?: string; size?: number } = {}) => {
    const s = { ...b, ...extra }
    const style = {
      bold: s.bold, italics: s.italic, underline: s.underline ? { type: d.UnderlineType.SINGLE } : undefined,
      subScript: s.sub, superScript: s.sup, color: extra.color, size: extra.size,
    }
    // A tab inside the text (table cells of a passage) becomes a real tab.
    const parts = s.text.split("\t")
    return parts.length === 1
      ? new d.TextRun({ text: s.text, ...style })
      : new d.TextRun({ children: parts.flatMap((p, i) => (i ? [new d.Tab(), p] : [p])), ...style })
  }
  const text = (t: string, style: Omit<TextBit, "text"> & { color?: string; size?: number } = {}) => run({ text: t }, style)
  type Runs = InstanceType<typeof d.TextRun>[]
  const para = (children: Runs, o: { center?: boolean; justify?: boolean; indent?: number; before?: number; after?: number; keep?: boolean; tabs?: number[] } = {}) =>
    new d.Paragraph({
      children,
      alignment: o.center ? d.AlignmentType.CENTER : o.justify ? d.AlignmentType.JUSTIFIED : d.AlignmentType.LEFT,
      indent: o.indent ? { left: o.indent } : undefined,
      spacing: { before: o.before ?? 0, after: o.after ?? 60, line: 300 },
      keepNext: o.keep,
      keepLines: true,
      tabStops: o.tabs?.map(position => ({ type: d.TabStopType.LEFT, position })),
    })

  const none = { style: d.BorderStyle.NONE, size: 0, color: "FFFFFF" }
  const line = { style: d.BorderStyle.SINGLE, size: 6, color: "000000" }
  const borders = (b: typeof none | typeof line) => ({ top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b })
  const cell = (children: (Paragraph | Table)[], width: number, o: { span?: number; middle?: boolean } = {}) =>
    new d.TableCell({
      children,
      width: { size: width, type: d.WidthType.DXA },
      columnSpan: o.span,
      verticalAlign: o.middle ? d.VerticalAlignTable.CENTER : d.VerticalAlignTable.TOP,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    })
  const table = (widths: number[], rows: InstanceType<typeof d.TableRow>[], bordered: boolean) =>
    new d.Table({
      rows,
      columnWidths: widths,
      width: { size: widths.reduce((a, b) => a + b, 0), type: d.WidthType.DXA },
      layout: d.TableLayoutType.FIXED,
      borders: borders(bordered ? line : none),
    })
  const gap = (after = 120) => para([], { after })

  // -- heading: school on the left, the test on the right --
  const left = Math.round(CONTENT * 0.42)
  const heading = table([left, CONTENT - left], [new d.TableRow({
    children: [
      cell([
        para([text((info.school || tr("examDoc.schoolBlank")).toUpperCase(), { bold: true })], { center: true }),
        ...(info.department ? [para([text(info.department, { bold: true })], { center: true })] : []),
        ...(info.schoolYear ? [para([text(tr("examDoc.schoolYear", { year: info.schoolYear }))], { center: true })] : []),
      ], left),
      cell([
        para([text(info.title.toUpperCase(), { bold: true, size: 26 })], { center: true }),
        para([text(info.grade ? tr("examDoc.subjectGrade", { grade: info.grade }) : tr("examDoc.subject"))], { center: true }),
        ...(info.term ? [para([text(info.term)], { center: true })] : []),
        para([text(tr("examDoc.duration", { n: info.minutes }), { italic: true })], { center: true }),
        para([text(tr("examDoc.code", { code: variant.code }), { bold: true })], { center: true }),
      ], CONTENT - left),
    ],
  })], false)

  // -- student box: name, class and candidate number, then the mark beside the teacher's comment --
  const markW = Math.round(CONTENT * 0.22)
  const smallW = Math.round(CONTENT * 0.2)
  const nameW = CONTENT - markW - 2 * smallW
  const studentBox = table([markW, nameW, smallW, smallW], [
    new d.TableRow({
      children: [
        cell([para([text(`${tr("examDoc.name")}: ${"…".repeat(30)}`)], { after: 0 })], markW + nameW, { span: 2 }),
        cell([para([text(`${tr("examDoc.class")}: ${"…".repeat(8)}`)], { after: 0 })], smallW),
        cell([para([text(`${tr("examDoc.candidate")}: ${"…".repeat(5)}`)], { after: 0 })], smallW),
      ],
    }),
    new d.TableRow({
      height: { value: 1300, rule: d.HeightRule.ATLEAST },
      children: [
        cell([para([text(tr("examDoc.mark"), { bold: true })], { center: true })], markW),
        cell([para([text(tr("examDoc.comment"), { bold: true })], { center: true })], CONTENT - markW, { span: 3 }),
      ],
    }),
  ], true)

  // -- the small answer sheet: the numbers answered with a letter, ten to a row --
  const objective = variant.questions.filter(q => q.objective)
  function answerSheet(): (Paragraph | Table)[] {
    if (!objective.length) return []
    const perRow = 10
    const w = Math.floor(CONTENT / perRow)
    const rows: InstanceType<typeof d.TableRow>[] = []
    for (let i = 0; i < objective.length; i += perRow) {
      const chunk: (VariantQuestion | null)[] = objective.slice(i, i + perRow)
      while (chunk.length < perRow) chunk.push(null)
      rows.push(new d.TableRow({ cantSplit: true, children: chunk.map(q => cell([para([text(q ? String(q.n) : "", { bold: true })], { center: true, after: 0 })], w, { middle: true })) }))
      rows.push(new d.TableRow({
        cantSplit: true,
        height: { value: 420, rule: d.HeightRule.ATLEAST },
        children: chunk.map(q => cell([para([text(withKey && q ? q.key : "", { bold: true, color: KEY_COLOR })], { center: true, after: 0 })], w, { middle: true })),
      }))
    }
    return [
      para([text(tr(withKey ? "examDoc.keySheet" : "examDoc.answerSheet"), { bold: true })], { center: true, before: 160, after: 80, keep: true }),
      table(Array.from({ length: perRow }, () => w), rows, true),
      gap(),
    ]
  }

  // -- questions --
  const label = (q: VariantQuestion) => text(`${tr("examDoc.questionN", { n: q.n })} `, { bold: true })
  /** The label, then the prompt: its first paragraph on the label's line, the rest under it. */
  function prompted(q: VariantQuestion, tail: Runs = [], keep = true) {
    const [first = [], ...rest] = htmlToParagraphs(q.q.prompt)
    return [
      para([label(q), ...first.map(b => run(b)), ...tail], { before: 100, keep, justify: true }),
      ...rest.map(p => para(p.map(b => run(b)), { indent: INDENT, keep, justify: true })),
    ]
  }
  const answerLine = () => para([text(DOTS)], { indent: INDENT })
  function solution(q: VariantQuestion) {
    if (!withKey) return []
    const shown = q.objective && q.keyText ? `${q.key}. ${q.keyText}` : q.keyText || q.key
    const why = htmlToParagraphs(q.q.explanation)
    return [
      para([text(`${tr("examDoc.answer")}: `, { bold: true, color: KEY_COLOR }), text(shown, { bold: true, color: KEY_COLOR })], { indent: INDENT }),
      ...why.map((p, i) => para([...(i ? [] : [text(`${tr("examDoc.why")}: `, { italic: true, bold: true })]), ...p.map(b => run(b, { italic: true }))], { indent: INDENT, justify: true })),
    ]
  }

  function choices(q: VariantQuestion) {
    const cols = optionColumns(q.options)
    const step = Math.floor((CONTENT - INDENT) / cols)
    const tabs = Array.from({ length: cols - 1 }, (_, i) => INDENT + step * (i + 1))
    const lines: Paragraph[] = []
    for (let i = 0; i < q.options.length; i += cols) {
      const runs: Runs = []
      q.options.slice(i, i + cols).forEach((o, j) => {
        const right = withKey && LETTERS[i + j] === q.key
        if (j) runs.push(new d.TextRun({ children: [new d.Tab()] }))
        runs.push(text(`${LETTERS[i + j]}. `, { bold: true, color: right ? KEY_COLOR : undefined }))
        runs.push(...markedBits(o).map(b => run(b, right ? { bold: true, color: KEY_COLOR } : {})))
      })
      lines.push(para(runs, { indent: INDENT, tabs, keep: i + cols < q.options.length || withKey }))
    }
    return lines
  }

  function question(q: VariantQuestion): Paragraph[] {
    switch (q.q.type) {
      case "mcq":
        return [...prompted(q), ...choices(q), ...solution(q)]
      case "error": {
        // The sentence with every chunk underlined and lettered; the student names the wrong chunk.
        const runs: Runs = [label(q)]
        q.options.forEach((c, i) => {
          const right = withKey && LETTERS[i] === q.key
          runs.push(text(plainMarked(c), { underline: true, bold: right, color: right ? KEY_COLOR : undefined }))
          runs.push(text(` (${LETTERS[i]})`, { bold: true, size: 20 }))
          if (i < q.options.length - 1) runs.push(text(" "))
        })
        return [para(runs, { before: 100, justify: true, keep: withKey }), ...solution(q)]
      }
      case "order": {
        const chunks = text(q.options.join(" / "), { italic: true })
        const head = q.q.prompt.trim() ? prompted(q, [text(" "), chunks]) : [para([label(q), chunks], { before: 100, keep: true })]
        return [...head, ...(withKey ? solution(q) : [answerLine()])]
      }
      default:
        return [...prompted(q, [], q.part !== "reading"), ...(withKey ? solution(q) : [answerLine()])]
    }
  }

  function matchBlock(b: VariantBlock): (Paragraph | Table)[] {
    const half = Math.floor(CONTENT / 2)
    const rows = Array.from({ length: Math.max(b.questions.length, b.choices.length) }, (_, i) => {
      const q = b.questions[i]
      const c = b.choices[i]
      const leftRuns: Runs = q
        ? [label(q), ...(htmlToParagraphs(q.q.prompt)[0] ?? []).map(x => run(x)), ...(withKey ? [text(`  → ${q.key}`, { bold: true, color: KEY_COLOR })] : [])]
        : []
      return new d.TableRow({
        cantSplit: true,
        children: [
          cell([para(leftRuns, { after: 0 })], half),
          cell([para(c === undefined ? [] : [text(`${LETTERS[i]}. `, { bold: true }), text(c)], { after: 0 })], CONTENT - half),
        ],
      })
    })
    const why = withKey ? b.questions.filter(q => q.q.explanation.trim()).flatMap(q => htmlToParagraphs(q.q.explanation).map((p, i) =>
      para([...(i ? [] : [text(`${tr("examDoc.questionN", { n: q.n })}: `, { italic: true, bold: true })]), ...p.map(x => run(x, { italic: true }))], { indent: INDENT }))) : []
    return [table([half, CONTENT - half], rows, false), ...why]
  }

  function block(part: VariantPart, b: VariantBlock): (Paragraph | Table)[] {
    if (part.key === "match") return matchBlock(b)
    const passage = b.passage.trim()
      ? [table([CONTENT], [new d.TableRow({
          children: [cell(htmlToParagraphs(b.passage).map(p => para(p.map(x => run(x)), { justify: true, after: 80, tabs: [2400, 4800, 7200] })), CONTENT)],
        })], true), gap(40)]
      : []
    return [...passage, ...b.questions.flatMap(question)]
  }

  const body = variant.parts.flatMap((p, i): (Paragraph | Table)[] => {
    const count = p.blocks.reduce((n, b) => n + b.questions.length, 0)
    return [
      para([text(`${tr("examDoc.part", { n: roman(i + 1) })} ${tr(`exam.part.${p.key}.title`).toUpperCase()}`, { bold: true }), text(` ${tr("examDoc.partCount", { n: count })}`, { italic: true })], { before: 220, after: 40, keep: true }),
      para([text(partHintOf(info, p.key), { italic: true })], { keep: true, justify: true }),
      ...p.blocks.flatMap(b => block(p, b)),
    ]
  })

  const sheet = sheetAt === "none" ? [] : answerSheet()
  const doc = new d.Document({
    creator: "english_4u",
    title: `${info.title} - ${variant.code}`,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{
      properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.left, right: PAGE.right } } },
      footers: {
        default: new d.Footer({
          children: [new d.Paragraph({
            alignment: d.AlignmentType.CENTER,
            children: [new d.TextRun({ children: [tr("examDoc.footer", { code: variant.code }), d.PageNumber.CURRENT, "/", d.PageNumber.TOTAL_PAGES], size: 20 })],
          })],
        }),
      },
      children: [
        heading,
        gap(80),
        ...(withKey
          ? [para([text(tr("examDoc.keyTitle"), { bold: true, size: 26, color: KEY_COLOR })], { center: true, after: 120 })]
          : [studentBox, gap(80)]),
        ...(sheetAt === "top" ? sheet : []),
        ...body,
        para([text(tr("examDoc.end"), { bold: true })], { center: true, before: 240, after: 120 }),
        ...(sheetAt === "bottom" ? sheet : []),
      ],
    }],
  })
  return d.Packer.toBlob(doc)
}

/**
 * The whole set in one .zip: the paper of every code, the teacher's copy of every code (with answers and
 * explanations, in its own folder) and the Excel answer key.
 */
export async function examZip(info: ExamInfo, variants: readonly ExamVariant[], opts: DocxOptions, key: { name: string; bytes: ArrayBuffer }): Promise<Blob> {
  const { default: JSZip } = await import("jszip")
  const zip = new JSZip()
  for (const v of variants) {
    zip.file(examFileName(info, v.code), await (await examDocx(info, v, opts)).arrayBuffer())
    zip.file(`${fileSlug(tr("examDoc.keyFolder"))}/${examFileName(info, v.code, true)}`, await (await examDocx(info, v, { ...opts, withKey: true })).arrayBuffer())
  }
  zip.file(`${key.name}.xlsx`, key.bytes)
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" })
}
