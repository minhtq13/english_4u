// CSV a teacher opens in Excel: comma separated, values quoted when needed, a UTF-8 byte-order mark so Excel reads
// Vietnamese letters correctly, and CRLF line ends. Values starting with = + - @ get a leading apostrophe-free guard
// (a tab) so a pasted name can never run as a spreadsheet formula.

export type CsvCell = string | number | boolean | null | undefined

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(v: CsvCell): string {
  let s = v === null || v === undefined ? "" : String(v)
  if (typeof v === "string" && FORMULA_START.test(s)) s = `\t${s}`
  return /[",\r\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsv = (rows: readonly (readonly CsvCell[])[]) => `﻿${rows.map(r => r.map(csvCell).join(",")).join("\r\n")}\r\n`

/** Saves `rows` as a file in the browser. */
export function downloadCsv(filename: string, rows: readonly (readonly CsvCell[])[]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A file name safe on every system: no accents, spaces or separators. */
export const fileSlug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")
