// "Paste questions from text" in the lesson editor: turns pasted exam text into draft questions, which the teacher
// checks and edits in a preview before they are added. Pure, so it is tested alone.
//
// Three modes, because the same text means different things in each:
//  - mcq:   `1. Question` / `Câu 1: Question`, options `A. … B. … C. … D. …` (one per line or all on one line),
//           the key as `Đáp án: A`, `* Answer: A`, `→ A` or `-> A` (on its own line or at the end of the options).
//  - tf:    a statement and its key (`True` / `False` / `T` / `F` / `Đúng` / `Sai`); becomes a two-option question.
//  - error: a sentence whose parts are marked `(A) … (B) … (C) … (D) …` plus the key letter of the wrong part.
// A line `Giải thích: …` / `Explanation: …` becomes the question's explanation.

export type ImportMode = "mcq" | "tf" | "error"

export interface ParsedQuestion {
  prompt: string
  /** mcq / tf: the options; error: the marked parts of the sentence. */
  options: string[]
  /** 1-based index of the right option (or the wrong part); 0 when the text gave no key. */
  correct: number
  explanation: string
}

const START = /^\s*(?:(?:câu|cau|question|q)\s*)?(\d{1,3})\s*[.:)\-–]\s*(.*)$/i
const KEY = /^\s*(?:[*•\-]\s*)?(?:đáp\s*án|dap\s*an|answer|key|đ\/a|ans)\s*[:：.\-]?\s*(.+?)\s*$/i
const ARROW = /(?:→|->|=>)\s*(.+?)\s*$/
const WHY = /^\s*(?:[*•\-]\s*)?(?:giải\s*thích|giai\s*thich|explanation|explain)\s*[:：]\s*(.+)$/i
const TRUE = /^(?:t|true|đúng|dung|đ)\b/i
const FALSE = /^(?:f|false|sai|s)\b/i

const letterIndex = (s: string) => {
  const m = /^\(?([A-Da-d])\b/.exec(s.trim())
  return m ? m[1]!.toUpperCase().charCodeAt(0) - 64 : 0
}

/** Splits the pasted text into one block of lines per question. */
function blocks(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n")
  const numbered = lines.some(l => START.test(l))
  const out: string[][] = []
  let cur: string[] = []
  const flush = () => { if (cur.some(l => l.trim())) out.push(cur); cur = [] }
  for (const l of lines) {
    if (numbered ? START.test(l) : !l.trim()) flush()
    if (l.trim() || numbered) cur.push(l)
  }
  flush()
  return out
}

/** Options written on the lines (or on one line) of a block: `A. x B. y`, `A) x`; letters must come in order A, B, C, D. */
function readOptions(lines: string[]): { options: string[]; rest: string[] } {
  const options: string[] = []
  const rest: string[] = []
  for (const line of lines) {
    const marks: { at: number; len: number }[] = []
    const re = /(^|\s)\(?([A-D][.)]|[a-d]\))\s+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(line))) {
      const letter = m[2]![0]!.toUpperCase().charCodeAt(0) - 64
      if (letter === options.length + marks.length + 1) marks.push({ at: m.index + m[1]!.length, len: m[0].length - m[1]!.length })
    }
    if (!marks.length) { rest.push(line); continue }
    if (line.slice(0, marks[0]!.at).trim()) rest.push(line.slice(0, marks[0]!.at))
    marks.forEach((k, i) => {
      const end = i + 1 < marks.length ? marks[i + 1]!.at : line.length
      options.push(line.slice(k.at + k.len, end).trim())
    })
  }
  return { options, rest }
}

export function parseQuestions(text: string, mode: ImportMode): ParsedQuestion[] {
  return blocks(text).map((lines) => {
    let key = ""
    let explanation = ""
    const body: string[] = []
    lines.forEach((raw, i) => {
      let line = i === 0 ? (START.exec(raw)?.[2] ?? raw) : raw
      const why = WHY.exec(line)
      if (why) { explanation = why[1]!.trim(); return }
      const k = KEY.exec(line)
      if (k) { key = k[1]!; return }
      const a = ARROW.exec(line)
      if (a) { key = a[1]!; line = line.replace(ARROW, "") }
      if (line.trim()) body.push(line.trim())
    })

    if (mode === "tf") {
      const k = key.trim()
      const correct = TRUE.test(k) ? 1 : FALSE.test(k) ? 2 : 0
      return { prompt: body.join(" "), options: ["True", "False"], correct, explanation }
    }
    if (mode === "error") {
      const sentence = body.join(" ")
      // Text before each marker `(A)`, `(B)`… belongs to the part that marker opens; the text before (A) joins part A.
      const parts = sentence.split(/\s*\(([A-Da-d])\)\s*/).slice(0)
      const options: string[] = []
      const head = parts[0]!.trim()
      for (let i = 1; i < parts.length; i += 2) options.push(parts[i + 1]?.trim() ?? "")
      if (options.length) options[0] = `${head} ${options[0]}`.trim()
      return { prompt: sentence, options, correct: letterIndex(key), explanation }
    }
    const { options, rest } = readOptions(body)
    return { prompt: rest.join(" ").trim(), options, correct: letterIndex(key), explanation }
  }).filter(q => q.prompt || q.options.length)
}

/** What a parsed question still lacks, as importer.problem.* i18n keys. */
export function questionProblems(q: ParsedQuestion, mode: ImportMode): string[] {
  const out: string[] = []
  if (!q.prompt.trim()) out.push("noPrompt")
  if (mode === "mcq" && q.options.filter(o => o.trim()).length < 2) out.push("fewOptions")
  if (mode === "error" && q.options.filter(o => o.trim()).length < 2) out.push("noMarks")
  if (!q.correct || q.correct > q.options.length) out.push("noKey")
  return out
}
