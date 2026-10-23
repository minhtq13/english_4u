import DOMPurify from "dompurify"
import type { Enums, Tables, Views } from "~/types/database.types"

// Lesson content lives in Supabase (phases → lessons → lesson_sections → section_items).
// The types below are the shape the lesson components work with; toLesson() maps database rows into it.

// Students get the answer key (a, ans, why) only once their results are released;
// until then a = -1 and ans = [] (see lesson_items() in the database).

/** `a` is the 0-based index of the right option (section_items.correct_option counts from 1). */
// `n` is the question's number within its section (1-based, in stored order). Answers are keyed by
// score_key + n (e.g. M3), so a shuffled lesson still saves and grades against the original question.
export interface McqItem { n?: number; q: string; opts: string[]; a: number; why?: string; tag?: string }
export interface TypedItem { n?: number; q: string; ans: string[]; why?: string; tag?: string }
/** `words` come in a fixed shuffled order; `ans` lists accepted sentences, the correct one first. */
export interface OrderItem { n?: number; words: string[]; prompt?: string; ans: string[]; why?: string; tag?: string }
/** One pair: `q` is the left side, `a` the right side ("" while the key is hidden). */
export interface MatchItem { n?: number; q: string; a: string; why?: string; tag?: string }

/** The answer key of an item: score_key + its original number. */
export const qidOf = (key: string, item: { n?: number }, index: number) => `${key}${item.n ?? index + 1}`

export type Section =
  | { type: "explain"; title: string; time?: string; hint?: string; html: string }
  | { type: "cards"; title: string; time?: string; hint?: string; items: [string, string][] }
  | { type: "mcq"; key: string; title: string; time?: string; hint?: string; passage?: string; items: McqItem[] }
  | { type: "typed"; key: string; title: string; time?: string; hint?: string; passage?: string; short?: boolean; items: TypedItem[] }
  /** Error identification: each item's `opts` are the chunks of one sentence, `a` the wrong chunk. */
  | { type: "error"; key: string; title: string; time?: string; hint?: string; items: McqItem[] }
  /** Matching: every left side picks one of `choices` (all right sides, in a fixed shuffled order). */
  | { type: "match"; key: string; title: string; time?: string; hint?: string; choices: string[]; items: MatchItem[] }
  | { type: "order"; key: string; title: string; time?: string; hint?: string; items: OrderItem[] }
  | { type: "writing"; title: string; time?: string; hint?: string; placeholder?: string }

export type ScoredSection = Extract<Section, { key: string }>

export interface Lesson {
  /** Used in URLs and attempts.lesson_id, e.g. "19.1" or "6.1". */
  id: string
  /** Shown before the title, e.g. "Unit 1" or "19.1". */
  label: string
  courseId: string
  phase: number
  /** Short title for lists. */
  title: string
  /** One-line summary for lists. */
  desc: string
  /** Full title at the top of the lesson page. */
  heading: string
  sub: string
  sections: Section[]
}

/** A lesson as listed in the course (no content), from the lesson_overview view. */
export interface LessonSummary {
  id: string
  label: string
  phase: number
  title: string
  desc: string
  /** Number of auto-graded questions. */
  total: number
  published: boolean
  /** The teacher who made the lesson in the editor; null for curriculum lessons. */
  createdBy: string | null
}

export interface Phase { id: number; name: string; position: number; lessons: LessonSummary[] }

/** A course row: a school grade (lớp 6–9) or a standalone track. */
export type CourseInfo = Tables<"courses">

/** One course's outline: its phases and lessons, in order. */
export interface Course {
  id: string
  phases: Phase[]
  byId: Record<string, LessonSummary>
  /** Lesson ids in course order. */
  order: string[]
}

/** What the learner chose for one question, as saved in attempts.answers while working. */
export interface Response { given: string; chosen?: number[] }

/** One graded question, as stored in attempt_results.answers (graded by submit_attempt()). */
export interface Answer {
  ok: boolean
  q: string
  given: string
  correct: string
  tag?: string
  chosen?: number[]
}

export interface Score { ok: number; done: number; total: number }

type ItemRow = Tables<"section_items">
type SectionRow = Tables<"lesson_sections"> & { section_items: ItemRow[] }
/** Result of `lessons` selected with `lesson_sections(*), phases(course_id)`. */
export type LessonRow = Tables<"lessons"> & {
  lesson_sections: Tables<"lesson_sections">[]
  phases: Pick<Tables<"phases">, "course_id"> | null
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position
const opt = <T>(v: T | null) => v ?? undefined
// Lesson HTML is rendered with v-html and teachers can write it, so it is sanitised before display.
// Option texts and answers stay raw (they are compared when grading) and go through safeHtml() where shown.
export const safeHtml = (html: string) => DOMPurify.sanitize(html)
const safe = safeHtml
const safeOpt = (html: string | null) => (html == null ? undefined : safe(html))

/** Display form of an option or chunk: `c[a]t` underlines the "a" (pronunciation questions). Grading uses the raw text. */
export const markUnderline = (text: string) => safeHtml(text.replace(/\[([^\]]+)\]/g, "<u>$1</u>"))

function toSection(s: SectionRow): Section {
  const base = { title: s.title, time: opt(s.time_label), hint: safeOpt(s.hint) }
  const items = [...s.section_items].sort(byPosition)
  const key = s.score_key ?? ""
  switch (s.type) {
    case "explain":
      return { ...base, type: "explain", html: safe(s.body ?? "") }
    case "writing":
      return { ...base, type: "writing", placeholder: opt(s.placeholder) }
    case "cards":
      return { ...base, type: "cards", items: items.map(i => [safe(i.prompt ?? ""), safe(i.back ?? "")] as [string, string]) }
    case "mcq":
    case "error":
      return {
        ...base, type: s.type, key, ...(s.type === "mcq" ? { passage: safeOpt(s.body) } : {}),
        items: items.map((i, k) => ({
          n: k + 1, q: safe(i.prompt ?? ""), opts: i.options ?? [], a: (i.correct_option ?? 0) - 1, why: safeOpt(i.explanation), tag: opt(i.tag),
        })),
      }
    case "match":
      return {
        ...base, type: "match", key, choices: items[0]?.options ?? [],
        items: items.map((i, k) => ({ n: k + 1, q: safe(i.prompt ?? ""), a: i.back ?? "", why: safeOpt(i.explanation), tag: opt(i.tag) })),
      }
    case "typed":
      return {
        ...base, type: "typed", key, short: s.short_input, passage: safeOpt(s.body),
        items: items.map((i, k) => ({ n: k + 1, q: safe(i.prompt ?? ""), ans: i.answers ?? [], why: safeOpt(i.explanation), tag: opt(i.tag) })),
      }
    case "order":
      return {
        ...base, type: "order", key,
        items: items.map((i, k) => ({ n: k + 1, words: (i.words ?? []).map(w => w.trim()), prompt: opt(i.prompt), ans: i.answers ?? [], why: safeOpt(i.explanation), tag: opt(i.tag) })),
      }
  }
}

/** `items` come from lesson_items(), which hides the answer key from students. */
export function toLesson(row: LessonRow, items: ItemRow[]): Lesson {
  const bySection = new Map<string, ItemRow[]>()
  for (const i of items) bySection.set(i.section_id, [...(bySection.get(i.section_id) ?? []), i])
  return {
    id: row.id,
    label: row.label,
    courseId: row.phases?.course_id ?? "",
    phase: row.phase_id,
    title: row.title,
    desc: row.description,
    heading: row.heading,
    sub: row.subtitle,
    sections: [...row.lesson_sections]
      .sort(byPosition)
      .map(sec => toSection({ ...sec, section_items: bySection.get(sec.id) ?? [] })),
  }
}

/** Builds one course's outline from its phase rows and lesson_overview rows. */
export function toCourse(courseId: string, phases: Tables<"phases">[], overview: Views<"lesson_overview">[]): Course {
  const lessons: LessonSummary[] = [...overview]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(l => ({
      id: l.id ?? "",
      label: l.label ?? l.id ?? "",
      phase: l.phase_id ?? 0,
      title: l.title ?? "",
      desc: l.description ?? "",
      total: l.scored_items ?? 0,
      published: l.is_published ?? true,
      createdBy: l.created_by,
    }))
  return {
    id: courseId,
    phases: [...phases]
      .sort(byPosition)
      .map(p => ({ id: p.id, name: p.name, position: p.position, lessons: lessons.filter(l => l.phase === p.id) })),
    byId: Object.fromEntries(lessons.map(l => [l.id, l])),
    order: lessons.map(l => l.id),
  }
}

export const isScored = (s: Section): s is ScoredSection => "key" in s
export const lessonTotal = (lesson: Lesson) =>
  lesson.sections.reduce((n, s) => n + (isScored(s) ? s.items.length : 0), 0)

export function scoreOf(answers: Record<string, Answer>, total: number): Score {
  const vals = Object.values(answers)
  return { ok: vals.filter(a => a.ok).length, done: vals.length, total }
}

/** Whether the lesson came with its answer key (teachers, or a student whose results are out). */
export const hasAnswerKey = (lesson: Lesson) =>
  lesson.sections.some(s => isScored(s) && s.items.some(it =>
    "ans" in it ? it.ans.length > 0 : typeof it.a === "number" ? it.a >= 0 : it.a !== ""))

/**
 * Grades responses in the browser, the same way submit_attempt() does in the database.
 * Only used for a teacher's preview: students are graded on the server.
 */
export function gradeLocal(lesson: Lesson, responses: Record<string, Response>): Record<string, Answer> {
  const out: Record<string, Answer> = {}
  for (const s of lesson.sections) {
    if (!isScored(s)) continue
    s.items.forEach((it, i) => {
      const qid = qidOf(s.key, it, i)
      const given = responses[qid]?.given
      if (!given) return
      const tag = it.tag || ""
      if (s.type === "mcq" || s.type === "error") {
        const m = it as McqItem
        const correct = m.opts[m.a] ?? ""
        out[qid] = { ok: given === correct, q: s.type === "mcq" ? stripTags(m.q) : m.opts.join(" "), given, correct, tag }
      } else if (s.type === "match") {
        const m = it as MatchItem
        out[qid] = { ok: norm(given) === norm(m.a), q: stripTags(m.q), given, correct: m.a, tag }
      } else if (s.type === "typed") {
        const t = it as TypedItem
        out[qid] = { ok: t.ans.map(norm).includes(norm(given)), q: stripTags(t.q), given, correct: t.ans[0] ?? "", tag }
      } else {
        const o = it as OrderItem
        out[qid] = { ok: o.ans.map(norm).includes(norm(given)), q: o.prompt || tr("lesson.orderDefault"), given, correct: o.ans[0] ?? "", tag }
      }
    })
  }
  return out
}

/** Lower-cases and strips apostrophes/punctuation so typed answers compare loosely. */
export const norm = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[.,!?;:"“”]/g, "").replace(/\s+/g, " ").trim()

export const stripTags = (s: string) => s.replace(/<[^>]+>/g, "")

/** Shuffles a copy, retrying so the result differs from the input when possible. */
export function shuffled<T>(items: T[]): T[] {
  const a = items.slice()
  const orig = JSON.stringify(a)
  for (let t = 0; t < 10; t++) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j]!, a[i]!]
    }
    if (JSON.stringify(a) !== orig) break
  }
  return a
}

// Labels in the current language (i18n keys errorCategory.*, errorStatus.*, attemptStatus.*).
export const ERROR_CATEGORIES: Record<Enums<"error_category">, string> =
  labels("errorCategory", ["grammar", "vocabulary", "naturalness", "clarity", "logic", "cohesion"])
export const ERROR_STATUS: Record<Enums<"error_status">, string> = labels("errorStatus", ["open", "improving", "fixed"])
export const ATTEMPT_STATUS: Record<Enums<"attempt_status">, string> = labels("attemptStatus", ["in_progress", "submitted", "graded"])

/** How a student may use a lesson given to their class (mirrors private.can_work_lesson in the database). */
export type LessonAccess = "open" | "closed" | "locked"
export const accessOf = (s: { for_all: boolean; closed: boolean; due_at?: string | null }, picked: boolean): LessonAccess =>
  s.closed || isPastDue(s.due_at) ? "closed" : s.for_all || picked ? "open" : "locked"

/** The deadline has passed (the lesson closes itself within a minute; work stops at once). */
export const isPastDue = (due: string | null | undefined, now = Date.now()) => !!due && Date.parse(due) <= now

/** "còn 2 ngày" / "2 days left" until a deadline; "" once passed. */
export function timeLeft(due: string | null | undefined, now = Date.now()) {
  if (!due) return ""
  const min = Math.floor((Date.parse(due) - now) / 60000)
  if (min <= 0) return ""
  if (min < 60) return tr("time.minutesLeft", { n: min })
  if (min < 48 * 60) return tr("time.hoursLeft", { n: Math.floor(min / 60) })
  return tr("time.daysLeft", { n: Math.floor(min / 1440) })
}

/** Percent of correct answers from summed ok/done counts; null when nothing was answered. */
export const accuracyOf = (ok: number | null | undefined, done: number | null | undefined) =>
  done ? Math.round(((ok ?? 0) / done) * 100) : null

/** Inclusive row range for a 0-based page, for PostgREST `.range()`. */
export const pageRange = (page: number, size: number) => [page * size, page * size + size - 1] as const

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(currentLang() === "en" ? "en-GB" : "vi-VN", { dateStyle: "short", timeStyle: "short" }) : ""

/** A deterministic 32-bit hash of a string (FNV-1a), the seed for per-student shuffles. */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
/** Fisher–Yates with a seeded generator (mulberry32): the same seed always gives the same order. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let t = hash(seed)
  const rand = () => {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/**
 * The lesson as one student sees it when the class shuffles it: questions in each scored section and
 * multiple-choice options in a fixed order per student (`seed` = student id). Items keep their `n`,
 * so answers save and grade against the original questions; options are graded by their text.
 */
export function shuffleLesson(lesson: Lesson, seed: string): Lesson {
  return {
    ...lesson,
    sections: lesson.sections.map((s) => {
      if (!isScored(s)) return s
      const base = `${seed}|${lesson.id}|${s.key}`
      if (s.type === "mcq") {
        const items = s.items.map((it, i) => {
          const n = it.n ?? i + 1
          const opts = seededShuffle(it.opts, `${base}|${n}`)
          return { ...it, n, opts, a: it.a >= 0 ? opts.indexOf(it.opts[it.a]!) : -1 }
        })
        return { ...s, items: seededShuffle(items, base) }
      }
      // Error chunks keep their order (they form a sentence); only the questions move.
      if (s.type === "error") return { ...s, items: seededShuffle(s.items.map((it, i) => ({ ...it, n: it.n ?? i + 1 })), base) }
      if (s.type === "match") {
        const items = seededShuffle(s.items.map((it, i) => ({ ...it, n: it.n ?? i + 1 })), base)
        return { ...s, items, choices: seededShuffle(s.choices, `${base}|choices`) }
      }
      if (s.type === "typed") return { ...s, items: seededShuffle(s.items.map((it, i) => ({ ...it, n: it.n ?? i + 1 })), base) }
      return { ...s, items: seededShuffle(s.items.map((it, i) => ({ ...it, n: it.n ?? i + 1 })), base) }
    }),
  }
}
