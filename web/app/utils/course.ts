import courseData from "~/data/course.json"
import type { Enums } from "~/types/database.types"

export interface McqItem { q: string; opts: string[]; a: number; why?: string; tag?: string }
export interface TypedItem { q: string; ans: string[]; why?: string; tag?: string }
export interface OrderItem { words: string; prompt?: string; alt?: string[]; why?: string; tag?: string }

export type Section =
  | { type: "explain"; title: string; time?: string; hint?: string; html: string }
  | { type: "cards"; title: string; time?: string; hint?: string; items: [string, string][] }
  | { type: "mcq"; key: string; title: string; time?: string; hint?: string; items: McqItem[] }
  | { type: "typed"; key: string; title: string; time?: string; hint?: string; short?: boolean; items: TypedItem[] }
  | { type: "order"; key: string; title: string; time?: string; hint?: string; items: OrderItem[] }
  | { type: "writing"; title: string; time?: string; hint?: string; placeholder?: string }

export type ScoredSection = Extract<Section, { key: string }>

export interface Lesson {
  id: string
  title: string
  desc: string
  sub: string
  fullTitle: string
  sections: Section[]
}

export interface Phase { name: string; lessons: Lesson[] }

/** One answered question, as stored in attempts.answers. The first attempt counts. */
export interface Answer {
  ok: boolean
  q: string
  given: string
  correct: string
  tag?: string
  chosen?: number[]
}

export interface Score { ok: number; done: number; total: number }

export const PHASES = (courseData as { phases: Phase[] }).phases
export const LESSONS: Record<string, Lesson> = Object.fromEntries(
  PHASES.flatMap(p => p.lessons.map(l => [l.id, l])),
)
export const LESSON_ORDER = PHASES.flatMap(p => p.lessons.map(l => l.id))

export const isScored = (s: Section): s is ScoredSection => "key" in s
export const lessonTotal = (lesson: Lesson) =>
  lesson.sections.reduce((n, s) => n + (isScored(s) ? s.items.length : 0), 0)

export function scoreOf(answers: Record<string, Answer>, total: number): Score {
  const vals = Object.values(answers)
  return { ok: vals.filter(a => a.ok).length, done: vals.length, total }
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

export const ERROR_CATEGORIES: Record<Enums<"error_category">, string> = {
  grammar: "Ngữ pháp lặp lại",
  vocabulary: "Từ vựng hạn chế",
  naturalness: "Diễn đạt chưa tự nhiên",
  clarity: "Ý chưa rõ ràng",
  logic: "Lập luận thiếu logic",
  cohesion: "Liên kết chưa tốt",
}

export const ERROR_STATUS: Record<Enums<"error_status">, string> = {
  open: "Đang mắc",
  improving: "Đang tiến bộ",
  fixed: "Đã sửa được",
}

export const ATTEMPT_STATUS: Record<Enums<"attempt_status">, string> = {
  in_progress: "Đang làm",
  submitted: "Chờ chấm",
  graded: "Đã chấm",
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : ""
