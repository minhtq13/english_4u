import type { Answer, Lesson, Response } from "./course"
import { isScored, qidOf } from "./course"

// Where a student stands inside one lesson while working on it (which sections are done), and how a submitted
// lesson scored per section. Pure, so the page, the submit summary and the result screen agree.

export type SectionState = "done" | "partial" | "empty"
export interface SectionProgress {
  index: number
  title: string
  /** An auto-graded section: counts toward "blanks left". The writing task and explanations do not. */
  scored: boolean
  total: number
  answered: number
  state: SectionState
}

/** Per section: how many of its questions have an answer (the writing task counts as one when it has text). */
export function sectionProgress(lesson: Lesson, responses: Record<string, Response>, writing = ""): SectionProgress[] {
  return lesson.sections.flatMap((s, index): SectionProgress[] => {
    let total = 0
    let answered = 0
    if (isScored(s)) {
      total = s.items.length
      answered = s.items.filter((it, i) => !!responses[qidOf(s.key, it, i)]?.given).length
    } else if (s.type === "writing") {
      total = 1
      answered = writing.trim() ? 1 : 0
    } else {
      return []
    }
    return [{
      index, title: s.title, scored: isScored(s), total, answered,
      state: answered === 0 ? "empty" : answered >= total ? "done" : "partial",
    }]
  })
}

/** Auto-graded questions still blank, in total. */
export const blanksLeft = (progress: readonly SectionProgress[]) =>
  progress.reduce((n, p) => n + (p.scored ? p.total - p.answered : 0), 0)

/** The first section (by index) with a blank auto-graded question; null when everything is answered. */
export const firstBlankSection = (progress: readonly SectionProgress[]) =>
  progress.find(p => p.scored && p.answered < p.total)?.index ?? null

export interface SectionScore { index: number; title: string; ok: number; total: number; percent: number }

/** The score of each auto-graded section from the graded answers. */
export function sectionScores(lesson: Lesson, results: Record<string, Answer>): SectionScore[] {
  return lesson.sections.flatMap((s, index): SectionScore[] => {
    if (!isScored(s)) return []
    const ok = s.items.filter((it, i) => results[qidOf(s.key, it, i)]?.ok).length
    return [{ index, title: s.title, ok, total: s.items.length, percent: s.items.length ? Math.round((ok / s.items.length) * 100) : 0 }]
  })
}

export interface WrongAnswer { qid: string; section: number; sectionTitle: string; q: string; given: string; correct: string }

/** The questions answered wrongly (or left blank), in lesson order, for the "only what I got wrong" view. */
export function wrongAnswers(lesson: Lesson, results: Record<string, Answer>): WrongAnswer[] {
  return lesson.sections.flatMap((s, section) => {
    if (!isScored(s)) return []
    return s.items.flatMap((it, i) => {
      const qid = qidOf(s.key, it, i)
      const a = results[qid]
      return a && !a.ok ? [{ qid, section, sectionTitle: s.title, q: a.q, given: a.given, correct: a.correct }] : []
    })
  })
}
