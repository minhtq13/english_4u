import type { ExamVariant } from "./examGenerator"
import type { ExamInfo } from "./exportDocx"
import { answerMatrix } from "./examGenerator"
import { tr } from "./i18n"
import { downloadXlsx, fileSlug, xlsxBytes, type SheetCell, type SheetSpec } from "./spreadsheet"

// The answer key of an exam set as an Excel file with two sheets: the matrix (one row per exam code, one column per
// question number), ready to check papers against or to load into a marking app, and the detailed key (one row per
// question of every code, with where the question sits on the base exam, what the answer says and why).

const noTags = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim()

/** Sheet 1: rows = exam codes, columns = question 1…N, cells = the answer key. */
export function matrixSheet(info: ExamInfo, variants: readonly ExamVariant[]): SheetSpec {
  const m = answerMatrix(variants)
  const numbers = Array.from({ length: m.count }, (_, i) => i + 1)
  // A written answer needs a wider column than a letter.
  const wide = numbers.map((_, i) => variants.some(v => v.questions[i] && !v.questions[i]!.objective))
  return {
    sheetName: tr("examKey.matrixSheet"),
    title: tr("examKey.title", { title: info.title }),
    note: tr("examKey.matrixNote", { mode: tr(`exam.mode.${variants[0]?.mode ?? "all"}.label`) }),
    rows: [
      [tr("examKey.code"), ...numbers.map(n => tr("examKey.questionN", { n }))],
      ...m.codes.map((code, i): SheetCell[] => [code, ...m.rows[i]!]),
    ],
    widths: [12, ...wide.map(w => (w ? 26 : 9))],
  }
}

/** Sheet 2: exam code | question | question on the base exam | key | key on the base exam | answer text | explanation. */
export function detailSheet(info: ExamInfo, variants: readonly ExamVariant[]): SheetSpec {
  return {
    sheetName: tr("examKey.detailSheet"),
    title: tr("examKey.title", { title: info.title }),
    note: tr("examKey.detailNote"),
    rows: [
      [tr("examKey.code"), tr("examKey.number"), tr("examKey.baseNumber"), tr("examKey.key"), tr("examKey.baseKey"),
        tr("examKey.keyText"), tr("examKey.explanation")],
      ...variants.flatMap(v => v.questions.map((q): SheetCell[] =>
        [v.code, q.n, q.baseN, q.key, q.baseKey, q.keyText, noTags(q.q.explanation)])),
    ],
    widths: [12, 10, 12, 14, 14, 36, 70],
    wrapColumns: [5, 6],
  }
}

export const examKeySheets = (info: ExamInfo, variants: readonly ExamVariant[]) => [matrixSheet(info, variants), detailSheet(info, variants)]
export const examKeyBytes = (info: ExamInfo, variants: readonly ExamVariant[]) => xlsxBytes(examKeySheets(info, variants))
export const examKeyFileName = (info: ExamInfo) => `${fileSlug(info.title) || "de-thi"}-${fileSlug(tr("examKey.fileName"))}`

/** Saves the answer key of every code as one .xlsx file. */
export const downloadExamKey = (info: ExamInfo, variants: readonly ExamVariant[]) =>
  downloadXlsx(examKeyFileName(info), examKeySheets(info, variants))
