import type { ScoredType } from "./sectionKinds"

// A paper exam set built from the question bank: the base exam (parts → blocks → questions), then one variant per
// exam code ("mã đề"). Every shuffle draws from a generator seeded by the exam code, so a code always gives the
// same paper for the same base exam and its answer key can be rebuilt at any time.
// Everything here is plain data in, plain data out: no Nuxt, no database, no document.

/** The parts of a paper, in printed order. */
export const PART_KEYS = ["phonetics", "grammar", "error", "reading", "match", "order", "typed"] as const
export type PartKey = typeof PART_KEYS[number]

/** A bank question with what a paper needs around it: its section (title, reading passage) and its lesson. */
export interface ExamQuestion {
  id: string
  type: ScoredType
  /** HTML as stored. */
  prompt: string
  /** mcq: the choices; error: the chunks of the sentence. */
  options: string[]
  /** 0-based index of the right choice / the wrong chunk; -1 for the other types. */
  correct: number
  answers: string[]
  /** order: the chunks in the right order. */
  words: string[]
  /** match: the right side of the pair. */
  back: string
  explanation: string
  tag: string
  sectionId: string
  sectionTitle: string
  /** The reading passage shared by the section's questions (HTML), "" when there is none. */
  passage: string
  lessonId: string
}

/** A question as read for a paper: a section_items row with its section embedded. */
export interface PoolRow {
  id: string
  position: number
  prompt: string | null
  back: string | null
  options: string[] | null
  correct_option: number | null
  answers: string[] | null
  words: string[] | null
  explanation: string | null
  tag: string | null
  lesson_sections: { id: string; type: string; title: string; body: string | null; lesson_id: string; position: number }
}

const SCORED: readonly string[] = ["mcq", "typed", "order", "match", "error"]

/** Rows of scored sections as exam questions, ordered by lesson (in `lessonOrder`), section, then question. */
export function toExamQuestions(rows: readonly PoolRow[], lessonOrder: readonly string[] = []): ExamQuestion[] {
  const at = (id: string) => { const i = lessonOrder.indexOf(id); return i < 0 ? lessonOrder.length : i }
  return rows
    .filter(r => SCORED.includes(r.lesson_sections.type))
    .slice()
    .sort((a, b) => at(a.lesson_sections.lesson_id) - at(b.lesson_sections.lesson_id)
      || a.lesson_sections.lesson_id.localeCompare(b.lesson_sections.lesson_id)
      || a.lesson_sections.position - b.lesson_sections.position || a.position - b.position)
    .map((r): ExamQuestion => {
      const type = r.lesson_sections.type as ScoredType
      return {
        id: r.id,
        type,
        prompt: r.prompt ?? "",
        options: r.options ?? [],
        correct: type === "mcq" || type === "error" ? (r.correct_option ?? 0) - 1 : -1,
        answers: r.answers ?? [],
        words: (r.words ?? []).map(w => w.trim()),
        back: r.back ?? "",
        explanation: r.explanation ?? "",
        tag: r.tag ?? "",
        sectionId: r.lesson_sections.id,
        sectionTitle: r.lesson_sections.title,
        passage: type === "mcq" || type === "typed" ? r.lesson_sections.body ?? "" : "",
        lessonId: r.lesson_sections.lesson_id,
      }
    })
}

/** One question, or the questions that must stay together (one reading passage; every matching pair). */
export interface ExamBlock { id: string; passage: string; questions: ExamQuestion[] }
export interface ExamPart { key: PartKey; blocks: ExamBlock[] }

const UNDERLINED = /\[[^\]]+\]/
const PHONETIC_WORDS = /phát âm|trọng âm|ngữ âm|pronunciation|pronounced|stress/i
const noTags = (s: string) => s.replace(/<[^>]+>/g, "")
/** `c[a]t` without its marks, for places that cannot underline (a spreadsheet cell). */
export const plainMarked = (s: string) => s.replace(/\[([^\]]+)\]/g, "$1")

/** The part of the paper a question belongs to. */
export function partOf(q: ExamQuestion): PartKey {
  if (q.passage.trim() && (q.type === "mcq" || q.type === "typed")) return "reading"
  if (q.type !== "mcq") return q.type
  const phonetic = q.options.some(o => UNDERLINED.test(o)) || PHONETIC_WORDS.test(`${q.tag} ${q.sectionTitle} ${noTags(q.prompt)}`)
  return phonetic ? "phonetics" : "grammar"
}

/** Instructions the author wrote for parts, by part; a part without an entry (or a blank one) prints the default. */
export type PartHints = Partial<Record<PartKey, string>>

/**
 * The base exam of a list of chosen questions. The list is the printed order: parts come in the order of their first
 * question, and inside a part the blocks keep the order of the list. Questions of one passage form one block (placed
 * where its first question is), and all matching pairs form one block, since their right sides are printed as one column.
 */
export function buildParts(questions: readonly ExamQuestion[]): ExamPart[] {
  const parts = new Map<PartKey, ExamBlock[]>()
  const seen = new Set<string>()
  for (const q of questions) {
    if (seen.has(q.id)) continue
    seen.add(q.id)
    const key = partOf(q)
    const blocks = parts.get(key) ?? []
    parts.set(key, blocks)
    const id = key === "reading" ? `passage:${q.sectionId}` : key === "match" ? "match" : q.id
    const block = blocks.find(b => b.id === id)
    if (block) block.questions.push(q)
    else blocks.push({ id, passage: key === "reading" ? q.passage : "", questions: [q] })
  }
  return [...parts].map(([key, blocks]) => ({ key, blocks }))
}

const flatten = (parts: readonly ExamPart[]) => parts.flatMap(p => p.blocks.flatMap(b => b.questions))
const canonical = (key: PartKey) => PART_KEYS.indexOf(key)

/** The chosen questions in printed order, with each part's questions together (what buildParts() prints). */
export const orderedQuestions = (questions: readonly ExamQuestion[]) => flatten(buildParts(questions))

/** The same questions with the parts in the usual order (phonetics, grammar, error, reading, matching, ordering, written). */
export const canonicalOrder = (questions: readonly ExamQuestion[]) =>
  flatten(buildParts(questions).sort((a, b) => canonical(a.key) - canonical(b.key)))

/**
 * The list with one more question. It joins its part (or its passage) when the exam has one; a part the exam does not
 * have yet is placed by the usual order among the parts already there, so reordering parts by hand is never undone.
 */
export function addQuestion(questions: readonly ExamQuestion[], q: ExamQuestion): ExamQuestion[] {
  if (questions.some(x => x.id === q.id)) return [...questions]
  const key = partOf(q)
  const parts = buildParts(questions)
  const at = parts.find(p => p.key === key)
  if (at) {
    const id = key === "reading" ? `passage:${q.sectionId}` : key === "match" ? "match" : q.id
    const block = at.blocks.find(b => b.id === id)
    if (block) block.questions.push(q)
    else at.blocks.push({ id, passage: key === "reading" ? q.passage : "", questions: [q] })
    return flatten(parts)
  }
  const next = parts.findIndex(p => canonical(p.key) > canonical(key))
  const added = buildParts([q])
  parts.splice(next < 0 ? parts.length : next, 0, ...added)
  return flatten(parts)
}

/** Moves item `from` of a list to place `to` (both 0-based, `to` counted in the list as it is after the move). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice()
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item!)
  return out
}

/** The list with block number `from` of a part moved to place `to` inside the same part. */
export function moveBlockTo(questions: readonly ExamQuestion[], part: PartKey, from: number, to: number): ExamQuestion[] {
  const parts = buildParts(questions)
  const p = parts.find(x => x.key === part)
  if (p) p.blocks = moveItem(p.blocks, from, to)
  return flatten(parts)
}

/** The list with part number `from` moved to place `to`, parts taking their questions along. */
export const movePartTo = (questions: readonly ExamQuestion[], from: number, to: number): ExamQuestion[] =>
  flatten(moveItem(buildParts(questions), from, to))

/** The list with a block moved one place up (-1) or down (1) inside its part. */
export function moveBlock(questions: readonly ExamQuestion[], blockId: string, dir: -1 | 1): ExamQuestion[] {
  for (const p of buildParts(questions)) {
    const i = p.blocks.findIndex(b => b.id === blockId)
    if (i >= 0) return moveBlockTo(questions, p.key, i, i + dir)
  }
  return [...questions]
}

/** The list with a part moved one place up (-1) or down (1). */
export function movePart(questions: readonly ExamQuestion[], key: PartKey, dir: -1 | 1): ExamQuestion[] {
  const i = buildParts(questions).findIndex(p => p.key === key)
  return i < 0 ? [...questions] : movePartTo(questions, i, i + dir)
}

// ---- seeded randomness ----

export type Rng = () => number

/** A generator of numbers in [0, 1) that depends only on `seed` (xmur3 hash → mulberry32). */
export function rngOf(seed: string): Rng {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  let a = (h ^ (h >>> 16)) >>> 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A shuffled copy (Fisher-Yates). */
export function shuffledBy<T>(list: readonly T[], rng: Rng): T[] {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const x = a[i]!
    a[i] = a[j]!
    a[j] = x
  }
  return a
}

// ---- drawing a base exam from a matrix ----

/** How many questions of each part the teacher wants; reading counts passages and the questions under each. */
export interface MatrixSpec {
  phonetics: number
  grammar: number
  error: number
  /** Number of reading passages. */
  passages: number
  /** Questions under each passage; 0 takes every question of the passage. */
  perPassage: number
  match: number
  order: number
  typed: number
}
export const emptyMatrix = (): MatrixSpec => ({ phonetics: 0, grammar: 0, error: 0, passages: 0, perPassage: 5, match: 0, order: 0, typed: 0 })

/** What the pool can give per part: questions, and for reading the number of passages. */
export function poolCounts(pool: readonly ExamQuestion[]): Record<PartKey, number> & { passages: number } {
  const n = { phonetics: 0, grammar: 0, error: 0, reading: 0, match: 0, order: 0, typed: 0, passages: 0 }
  const sections = new Set<string>()
  for (const q of pool) {
    const k = partOf(q)
    n[k]++
    if (k === "reading") sections.add(q.sectionId)
  }
  n.passages = sections.size
  return n
}

export interface Draw {
  questions: ExamQuestion[]
  /** Parts the pool could not fill: how many are missing (reading counts passages). */
  short: Partial<Record<PartKey, number>>
}

/**
 * Picks questions at random from `pool` to fill the matrix. Loose questions are sampled per part and keep the pool's
 * order; a passage comes with its questions in their own order (a passage with exactly `perPassage` questions is
 * preferred, so no gap of a cloze text is left without its question).
 */
export function drawExam(pool: readonly ExamQuestion[], spec: MatrixSpec, rng: Rng): Draw {
  const short: Draw["short"] = {}
  const picked = new Set<string>()
  const want = (n: number) => Math.max(0, Math.floor(Number(n) || 0))
  const byPart = (key: PartKey) => pool.filter(q => partOf(q) === key)

  for (const key of ["phonetics", "grammar", "error", "match", "order", "typed"] as const) {
    const n = want(spec[key])
    if (!n) continue
    const got = shuffledBy(byPart(key), rng).slice(0, n)
    got.forEach(q => picked.add(q.id))
    if (got.length < n) short[key] = n - got.length
  }

  const passages = want(spec.passages)
  if (passages) {
    const per = want(spec.perPassage)
    const groups = new Map<string, ExamQuestion[]>()
    for (const q of byPart("reading")) groups.set(q.sectionId, [...(groups.get(q.sectionId) ?? []), q])
    // Random order first, then (stable sort) the passages that fit best.
    const fit = (g: ExamQuestion[]) => (!per || g.length === per ? 0 : g.length > per ? 1 : 2)
    const got = shuffledBy([...groups.values()], rng).sort((a, b) => fit(a) - fit(b)).slice(0, passages)
    for (const g of got) (per ? g.slice(0, per) : g).forEach(q => picked.add(q.id))
    if (got.length < passages) short.reading = passages - got.length
  }
  return { questions: canonicalOrder(pool.filter(q => picked.has(q.id))), short }
}

// ---- exam codes ----

/** `count` codes counting up from `start`: 101, 102, 103… */
export const codeSeries = (count: number, start = 101) =>
  Array.from({ length: Math.max(0, Math.floor(count) || 0) }, (_, i) => String(Math.floor(start) + i))

/** Codes typed by the teacher ("101, 102; 205"), without blanks or repeats. */
export const parseCodes = (text: string) => [...new Set(text.split(/[\s,;]+/).map(c => c.trim()).filter(Boolean))]

// ---- variants ----

/** all: questions inside each part and choices; options: choices only; questions: questions inside each part only. */
export const SHUFFLE_MODES = ["all", "options", "questions"] as const
export type ShuffleMode = typeof SHUFFLE_MODES[number]

export interface VariantQuestion {
  /** Number on this paper, 1…N. */
  n: number
  /** Number on the base exam. */
  baseN: number
  part: PartKey
  q: ExamQuestion
  /** mcq: choices as printed; error: the chunks; order: the chunks, scrambled; otherwise empty. */
  options: string[]
  /** Answered with a letter (mcq, error, match) rather than written out. */
  objective: boolean
  /** The answer key: a letter, or the text to write. */
  key: string
  /** The key of the same question on the base exam. */
  baseKey: string
  /** What the right answer says (the choice, the wrong chunk, the pair's right side, every accepted answer). */
  keyText: string
}
export interface VariantBlock {
  passage: string
  questions: VariantQuestion[]
  /** match: the right sides as printed (lettered A, B, C…); otherwise empty. */
  choices: string[]
}
export interface VariantPart { key: PartKey; blocks: VariantBlock[] }
export interface ExamVariant {
  code: string
  mode: ShuffleMode | "base"
  parts: VariantPart[]
  /** Every question in printed order. */
  questions: VariantQuestion[]
}

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const letter = (i: number) => LETTERS[i] ?? "?"

const POSITIONAL = /\b(all|none|both|neither) of (the above|these|them)\b|\b[A-D] (and|or|&) [A-D]\b|\b[A-D] (và|hoặc) [A-D]\b|cả .+ đều|tất cả (các )?(đáp án|phương án)/i
/** Choices that must stay where they are: True / False pairs and choices that point at other choices ("Both A and B"). */
export const keepsOrder = (options: readonly string[]) => options.length <= 2 || options.some(o => POSITIONAL.test(o))

/** Order chunks in a scrambled order that is not the right one (when it can differ). */
function scramble(words: readonly string[], rng: Rng) {
  const out = shuffledBy(words, rng)
  if (out.length > 1 && out.every((w, i) => w === words[i])) out.push(out.shift()!)
  return out
}

interface Laid { part: PartKey; q: ExamQuestion; options: string[]; objective: boolean; key: string; keyText: string }

function layQuestion(q: ExamQuestion, part: PartKey, seed: string, mixOptions: boolean): Laid {
  if (q.type === "mcq") {
    const order = q.options.map((_, i) => i)
    const printed = mixOptions && !keepsOrder(q.options) ? shuffledBy(order, rngOf(`${seed}:q:${q.id}`)) : order
    return {
      part, q, objective: true,
      options: printed.map(i => q.options[i]!),
      key: letter(printed.indexOf(q.correct)),
      keyText: plainMarked(q.options[q.correct] ?? ""),
    }
  }
  // The chunks of a sentence are never reordered: the letter is the chunk's place.
  if (q.type === "error") {
    return { part, q, objective: true, options: q.options, key: letter(q.correct), keyText: plainMarked(q.options[q.correct] ?? "") }
  }
  if (q.type === "order") {
    const sentence = q.words.join(" ")
    return { part, q, objective: false, options: scramble(q.words, rngOf(`${seed}:q:${q.id}`)), key: sentence, keyText: sentence }
  }
  if (q.type === "match") return { part, q, objective: true, options: [], key: "", keyText: q.back }
  return { part, q, objective: false, options: [], key: q.answers[0] ?? "", keyText: q.answers.join(" / ") }
}

/**
 * One paper: `mixQuestions` moves blocks inside their part, `mixOptions` moves choices. `seed` is "" for the base exam.
 * A part in `fixed` is laid out as on the base exam whatever the code: its questions and choices do not move.
 */
function layOut(parts: readonly ExamPart[], seed: string, mixQuestions: boolean, mixOptions: boolean, fixed: readonly PartKey[] = []) {
  return parts.map((p) => {
    const still = fixed.includes(p.key)
    const mixQ = mixQuestions && !still
    const mixO = mixOptions && !still
    // Without choice shuffling every code prints the choices of the base exam, so those draws ignore the code.
    const optionSeed = mixO ? seed : ""
    const blocks = mixQ ? shuffledBy(p.blocks, rngOf(`${seed}:part:${p.key}`)) : p.blocks
    return {
      key: p.key,
      blocks: blocks.map((b) => {
        const isMatch = p.key === "match"
        // The pairs of a matching block are its questions; a passage's questions follow the text and stay in order.
        const qs = isMatch && mixQ ? shuffledBy(b.questions, rngOf(`${seed}:match:left`)) : b.questions
        const laid = qs.map(q => layQuestion(q, p.key, optionSeed, mixO))
        // The right column is always mixed: printed in the order of the left column it would give the key away.
        const choices = isMatch ? shuffledBy([...new Set(b.questions.map(q => q.back))].sort(), rngOf(`${optionSeed}:match:right`)) : []
        for (const l of laid) if (isMatch) l.key = letter(choices.indexOf(l.q.back))
        return { passage: b.passage, choices, laid }
      }),
    }
  })
}

/**
 * The paper of one exam code. The same base exam, code and mode always give the same paper.
 * Parts keep their order in every mode, and a passage keeps its questions in order under it.
 * Parts listed in `fixed` are not shuffled at all: they print as on the base exam on every code.
 * `round` is how many times the teacher shuffled this code again: 0 is the first shuffle (the seed is the code itself),
 * every higher number is another, equally fixed, paper for the same code.
 */
export function buildVariant(parts: readonly ExamPart[], code: string, mode: ShuffleMode | "base", fixed: readonly PartKey[] = [], round = 0): ExamVariant {
  const base = new Map<string, { n: number; key: string }>()
  let n = 0
  for (const p of layOut(parts, "", false, false)) for (const b of p.blocks) for (const l of b.laid) base.set(l.q.id, { n: ++n, key: l.key })

  const seed = mode === "base" ? "" : round > 0 ? `${code}#${Math.floor(round)}` : code
  const laid = layOut(parts, seed, mode === "all" || mode === "questions", mode === "all" || mode === "options", fixed)
  n = 0
  const out: VariantPart[] = laid.map(p => ({
    key: p.key,
    blocks: p.blocks.map(b => ({
      passage: b.passage,
      choices: b.choices,
      questions: b.laid.map((l): VariantQuestion => ({ ...l, n: ++n, baseN: base.get(l.q.id)!.n, baseKey: base.get(l.q.id)!.key })),
    })),
  }))
  return { code, mode, parts: out, questions: out.flatMap(p => p.blocks.flatMap(b => b.questions)) }
}

/** How many times each code was shuffled again; a code that is not here (or 0) keeps its first shuffle. */
export type ShuffleRounds = Record<string, number>
export const MAX_ROUND = 999

export const buildVariants = (parts: readonly ExamPart[], codes: readonly string[], mode: ShuffleMode, fixed: readonly PartKey[] = [], rounds: ShuffleRounds = {}) =>
  codes.map(code => buildVariant(parts, code, mode, fixed, rounds[code] ?? 0))

/**
 * The counters worth keeping: whole numbers 1..MAX_ROUND, by code. Given the codes in use, entries of codes that are gone
 * are dropped (so the stored object stays small); at most 24 codes, like the form allows.
 */
export function cleanRounds(raw: unknown, codes?: readonly string[]): ShuffleRounds {
  const out: ShuffleRounds = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [code, v] of Object.entries(raw as Record<string, unknown>)) {
    if (codes && !codes.includes(code)) continue
    const n = typeof v === "number" ? Math.floor(v) : NaN
    if (code && code.length <= 40 && n >= 1) out[code] = Math.min(MAX_ROUND, n)
    if (Object.keys(out).length >= 24) break
  }
  return out
}

/** Only known part keys, once each, in the order the parts are defined (what is stored as exam_sets.fixed_parts). */
export function cleanFixed(raw: unknown): PartKey[] {
  const list = Array.isArray(raw) ? raw : []
  return PART_KEYS.filter(k => list.includes(k))
}

/** The answer matrix: one row per exam code, one cell per question number. */
export interface AnswerMatrix { codes: string[]; count: number; rows: string[][] }
export function answerMatrix(variants: readonly ExamVariant[]): AnswerMatrix {
  return {
    codes: variants.map(v => v.code),
    count: Math.max(0, ...variants.map(v => v.questions.length)),
    rows: variants.map(v => v.questions.map(q => q.key)),
  }
}

/** A blank the student fills in inside a question ("She ___ (study) Science"). */
export const BLANK_RE = /_{2,}/g
export const hasBlank = (html: string) => /_{2,}/.test(html)
/** How a blank prints in the Word file: about 3.5 cm of line, wide enough to write a verb form in. */
export const WORD_BLANK = "_".repeat(16)
/** Does this question print a ruled line under it for the answer? A rewriting task does; a fill-in with its own blank does not. */
export const needsAnswerLine = (q: { type: string; prompt: string }) => q.type === "order" || (q.type === "typed" && !hasBlank(q.prompt))

/** Roman numeral of a part number (I, II, III…), as printed before a part's title. */
export function roman(n: number) {
  const table: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]
  let out = ""
  for (const [v, s] of table) while (n >= v) { out += s; n -= v }
  return out
}
