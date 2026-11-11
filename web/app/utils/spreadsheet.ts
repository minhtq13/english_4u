// Excel files (.xlsx) for teachers: a title, an optional note that says what the numbers mean, a bold header row,
// then the data. exceljs is loaded only when a file is saved, so it never weighs on the pages. Text is always written
// as a text cell (never a formula), so a pasted name such as "=SUM(A1)" stays text.

export type SheetCell = string | number | null | undefined

export interface SheetSpec {
  sheetName: string
  /** First line, bold. */
  title?: string
  /** Second line: what the numbers are (e.g. "percent of questions answered correctly"). */
  note?: string
  /** The header row, then the data rows. */
  rows: readonly (readonly SheetCell[])[]
  /** 0-based columns whose numbers are percents, shown as `85%`. */
  percentColumns?: readonly number[]
  /** Last rows to show in bold (e.g. the class average). */
  boldLastRows?: number
  /** Column widths in characters, from the first column; the rest keep the default. */
  widths?: readonly number[]
  /** 0-based columns whose text wraps inside the cell (long explanations). */
  wrapColumns?: readonly number[]
}

const SHEET_NAME_BAD = /[\\/?*[\]:]/g

/** A file name safe on every system: no accents, spaces or separators. */
export const fileSlug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")

/** The .xlsx file as bytes: one sheet per spec. */
export async function xlsxBytes(spec: SheetSpec | readonly SheetSpec[]): Promise<ArrayBuffer> {
  const { Workbook } = await import("exceljs")
  const book = new Workbook()
  for (const s of Array.isArray(spec) ? spec as readonly SheetSpec[] : [spec as SheetSpec]) addSheet(book, s)
  return (await book.xlsx.writeBuffer()) as ArrayBuffer
}

function addSheet(book: import("exceljs").Workbook, spec: SheetSpec) {
  const sheet = book.addWorksheet(spec.sheetName.replace(SHEET_NAME_BAD, " ").slice(0, 31) || "Sheet1")
  const width = Math.max(1, ...spec.rows.map(r => r.length))

  if (spec.title) sheet.addRow([spec.title]).font = { bold: true, size: 14 }
  if (spec.note) {
    const note = sheet.addRow([spec.note])
    sheet.mergeCells(note.number, 1, note.number, width)
    note.getCell(1).alignment = { wrapText: true, vertical: "top" }
    note.getCell(1).font = { italic: true, color: { argb: "FF555555" } }
    note.height = 15 * Math.max(1, Math.ceil(spec.note.length / (width * 14)))
  }
  if (spec.title || spec.note) sheet.addRow([])

  const headerAt = sheet.rowCount + 1
  const [header = [], ...data] = spec.rows
  const head = sheet.addRow(header.map(c => c ?? ""))
  head.font = { bold: true }
  head.alignment = { vertical: "middle", wrapText: true }
  head.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } } })
  for (const r of data) {
    const row = sheet.addRow(r.map(c => (c === null || c === undefined || c === "" ? null : c)))
    for (const col of spec.percentColumns ?? []) {
      const cell = row.getCell(col + 1)
      if (typeof cell.value === "number") cell.numFmt = '0"%"'
    }
    for (const col of spec.wrapColumns ?? []) row.getCell(col + 1).alignment = { wrapText: true, vertical: "top" }
  }
  for (let i = 0; i < (spec.boldLastRows ?? 0); i++) sheet.getRow(sheet.rowCount - i).font = { bold: true }

  sheet.getColumn(1).width = 28
  for (let c = 2; c <= width; c++) sheet.getColumn(c).width = 16
  spec.widths?.forEach((w, i) => { sheet.getColumn(i + 1).width = w })
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: headerAt }]
}

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** Saves bytes or a blob as a file in the browser. */
export function saveFile(filename: string, data: Blob | ArrayBuffer, type = "application/octet-stream") {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Saves the sheet (or sheets) as `<filename>.xlsx` in the browser. */
export async function downloadXlsx(filename: string, spec: SheetSpec | readonly SheetSpec[]) {
  saveFile(`${filename}.xlsx`, await xlsxBytes(spec), XLSX_TYPE)
}
