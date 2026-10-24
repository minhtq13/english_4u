import type { Tables } from "~/types/database.types"
import type { Answer, MatchItem, McqItem, OrderItem, TypedItem } from "./course"
import type { DraftItem } from "./lessonDraft"
import { norm, safeHtml, stripTags } from "./course"
import { tr } from "./i18n"

// Everything one kind of auto-graded question needs, in one place per kind: how a stored row becomes the
// question students see, how it is graded in the browser (the same way private.grade_attempt() grades it),
// what the editor saves and reads back, what it must contain, and how it reads in one line.
// A new scored section type is one more entry here, plus its section component and the database functions
// (validate_section_item, lesson_items, grade_attempt).

export type ScoredType = "mcq" | "typed" | "order" | "match" | "error"
export const SCORED_TYPES = ["mcq", "typed", "order", "match", "error"] as const
export const isScoredType = (t: string | null | undefined): t is ScoredType => (SCORED_TYPES as readonly string[]).includes(t ?? "")

type ItemRow = Tables<"section_items">
type Fields = Pick<ItemRow, "prompt" | "back" | "options" | "correct_option" | "answers" | "words" | "explanation" | "tag">
/** A stored question: a section_items row, or a question_bank row. */
export type StoredItem = { [K in keyof Fields]?: Fields[K] | null }
type ItemOf = { mcq: McqItem; error: McqItem; typed: TypedItem; order: OrderItem; match: MatchItem }

interface Kind<T extends ScoredType> {
  /** A row as lesson_items() serves it → the question the lesson components show; `n` is its number in the section. */
  item(row: StoredItem, n: number): ItemOf[T]
  /** One answered question as grade_attempt() stores it (without `given` and `tag`). */
  grade(item: ItemOf[T], given: string): Pick<Answer, "ok" | "q" | "correct">
  /** The question fields save_lesson() stores (explanation and tag are added for every kind). */
  payload(it: DraftItem): StoredItem
  /** The draft fields this kind edits, from a stored question. */
  draft(row: StoredItem): Partial<DraftItem>
  /** What a draft question still lacks, as draftCheck.* i18n keys. */
  problems(it: DraftItem): string[]
  /** The stored question in one line, for lists (question bank, review sheets). */
  question(row: StoredItem): string
  /** The stored question's answer key in one line. */
  answer(row: StoredItem): string
}

/** Splits a typed list ("a | b", "chunk / chunk") into its trimmed, non-empty parts. */
export const splitList = (text: string, sep: string) => text.split(sep).map(x => x.trim()).filter(Boolean)

const opt = <T>(v: T | null | undefined) => v ?? undefined
const safeOpt = (html: string | null | undefined) => (html == null ? undefined : safeHtml(html))
const common = (row: StoredItem) => ({ why: safeOpt(row.explanation), tag: opt(row.tag) })
const choice = (row: StoredItem, n: number): McqItem =>
  ({ n, q: safeHtml(row.prompt ?? ""), opts: row.options ?? [], a: (row.correct_option ?? 0) - 1, ...common(row) })
const picked = (row: StoredItem) => (row.options ?? [])[(row.correct_option ?? 1) - 1] ?? ""
/** Accepted typed answers compare loosely (norm), like private.norm_answer. */
const accepts = (answers: string[], given: string) => answers.map(norm).includes(norm(given))

const mcq: Kind<"mcq"> = {
  item: choice,
  grade: (m, given) => {
    const correct = m.opts[m.a] ?? ""
    return { ok: given === correct, q: stripTags(m.q), correct }
  },
  payload: (it) => {
    // Blank options are dropped; the right answer's index follows its option.
    const kept = it.options.map((o, i) => ({ o: o.trim(), right: i === it.correct - 1 })).filter(x => x.o)
    return { prompt: it.prompt.trim(), options: kept.map(x => x.o), correct_option: kept.findIndex(x => x.right) + 1 }
  },
  draft: r => ({ options: r.options?.length ? [...r.options] : ["", "", ""], correct: r.correct_option ?? 1 }),
  problems: (it) => {
    const opts = it.options.map(o => o.trim())
    return [
      ...(!it.prompt.trim() ? ["noPrompt"] : []),
      ...(opts.filter(Boolean).length < 2 ? ["twoOptions"] : []),
      ...(!opts[it.correct - 1] ? ["noCorrect"] : []),
    ]
  },
  question: r => stripTags(r.prompt ?? ""),
  answer: picked,
}

/** Error identification: the chunks of one sentence are its options, the wrong chunk is the answer. */
const error: Kind<"error"> = {
  item: choice,
  grade: (m, given) => {
    const correct = m.opts[m.a] ?? ""
    return { ok: given === correct, q: m.opts.join(" "), correct }
  },
  payload: it => ({ options: splitList(it.words, "/"), correct_option: it.correct }),
  // The editor types the chunks like order chunks.
  draft: r => ({ words: (r.options ?? []).join(" / "), correct: r.correct_option ?? 1 }),
  problems: (it) => {
    const chunks = splitList(it.words, "/")
    return [
      ...(chunks.length < 2 ? ["twoChunks"] : !chunks[it.correct - 1] ? ["noWrongChunk"] : []),
      ...(new Set(chunks).size < chunks.length ? ["dupChunks"] : []),
    ]
  },
  question: r => (r.options ?? []).join(" "),
  answer: picked,
}

const typed: Kind<"typed"> = {
  item: (r, n) => ({ n, q: safeHtml(r.prompt ?? ""), ans: r.answers ?? [], ...common(r) }),
  grade: (t, given) => ({ ok: accepts(t.ans, given), q: stripTags(t.q), correct: t.ans[0] ?? "" }),
  payload: it => ({ prompt: it.prompt.trim(), answers: splitList(it.answers, "|") }),
  draft: r => ({ answers: (r.answers ?? []).join(" | ") }),
  problems: it => [...(!it.prompt.trim() ? ["noPrompt"] : []), ...(!splitList(it.answers, "|").length ? ["noAnswer"] : [])],
  question: r => stripTags(r.prompt ?? ""),
  answer: r => (r.answers ?? []).join(" / "),
}

/** Sentence ordering: `words` are stored in the right order; lesson_items() serves them shuffled, with the right sentence first in `answers`. */
const order: Kind<"order"> = {
  item: (r, n) => ({ n, words: (r.words ?? []).map(w => w.trim()), prompt: opt(r.prompt), ans: r.answers ?? [], ...common(r) }),
  grade: (o, given) => ({ ok: accepts(o.ans, given), q: o.prompt || tr("lesson.orderDefault"), correct: o.ans[0] ?? "" }),
  payload: it => ({ prompt: it.prompt.trim(), words: splitList(it.words, "/"), answers: splitList(it.answers, "|") }),
  draft: r => ({ words: (r.words ?? []).join(" / "), answers: (r.answers ?? []).join(" | ") }),
  problems: it => (splitList(it.words, "/").length < 2 ? ["twoChunks"] : []),
  question: r => (r.words ?? []).join(" / "),
  answer: r => (r.words ?? []).join(" "),
}

/** Matching: one pair per question, left = prompt, right = back. */
const match: Kind<"match"> = {
  item: (r, n) => ({ n, q: safeHtml(r.prompt ?? ""), a: r.back ?? "", ...common(r) }),
  grade: (m, given) => ({ ok: norm(given) === norm(m.a), q: stripTags(m.q), correct: m.a }),
  payload: it => ({ prompt: it.prompt.trim(), back: it.back.trim() }),
  draft: r => ({ back: r.back ?? "" }),
  problems: it => (!it.prompt.trim() || !it.back.trim() ? ["matchSides"] : []),
  question: r => stripTags(r.prompt ?? ""),
  answer: r => r.back ?? "",
}

export const SECTION_KINDS: { [T in ScoredType]: Kind<T> } = { mcq, error, typed, order, match }

/** The kind of a scored type, typed loosely for callers that hold a union of items. */
export const kindOf = (type: ScoredType) => SECTION_KINDS[type] as unknown as Kind<ScoredType>
