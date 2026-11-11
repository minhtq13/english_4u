import type { ExamQuestion, PartHints, ShuffleMode } from "./examGenerator"
import type { ExamInfo } from "./exportDocx"
import { PART_KEYS, SHUFFLE_MODES } from "./examGenerator"

// The exam being written on /teacher/exams/<id or new> is also kept in this browser (localStorage) as a working copy: a
// new exam that is not saved yet is found again after a reload, and the print page (/teacher/exams/print, another tab)
// lays out the same paper, edits not yet saved included. The saved exam sets themselves live in the exam_sets table.

export const DRAFT_KEY = "exam-draft-v1"

export interface DraftInfo { title: string; courseId: string; school: string; department: string; schoolYear: string; term: string; minutes: number }
export type SheetAt = "top" | "bottom" | "none"
export interface ExamDraft {
  /** The saved exam set being edited (exam_sets.id); null while the exam is new and not saved yet. */
  examId: string | null
  info: DraftInfo
  questions: ExamQuestion[]
  codesText: string
  mode: ShuffleMode
  sheetAt: SheetAt
  /** The instruction the author wrote under a part's title; a part without one prints the default. */
  partHints: PartHints
}

export const MAX_HINT_LENGTH = 300

/** Only the hints that mean something: known parts, text trimmed to one line, blanks dropped. */
export function cleanHints(raw: unknown): PartHints {
  const out: PartHints = {}
  if (!raw || typeof raw !== "object") return out
  for (const key of PART_KEYS) {
    const v = (raw as Record<string, unknown>)[key]
    const text = typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, MAX_HINT_LENGTH) : ""
    if (text) out[key] = text
  }
  return out
}

export const emptyInfo = (): DraftInfo => ({ title: "", courseId: "", school: "", department: "", schoolYear: "", term: "", minutes: 45 })

/** The saved draft with every field checked, or null when there is none (or storage is blocked or unreadable). */
export function readDraft(): ExamDraft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null")
    if (!raw || typeof raw !== "object") return null
    return {
      examId: typeof raw.examId === "string" ? raw.examId : null,
      info: { ...emptyInfo(), ...(raw.info && typeof raw.info === "object" ? raw.info : {}) },
      questions: Array.isArray(raw.questions) ? raw.questions : [],
      codesText: typeof raw.codesText === "string" ? raw.codesText : "101, 102, 103, 104",
      mode: SHUFFLE_MODES.includes(raw.mode) ? raw.mode : "all",
      sheetAt: ["top", "bottom", "none"].includes(raw.sheetAt) ? raw.sheetAt : "top",
      partHints: cleanHints(raw.partHints),
    }
  } catch {
    return null
  }
}

export function saveDraft(draft: ExamDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch { /* storage full or blocked: the draft just is not kept */ }
}

/** What the heading of the paper says, from the form. */
export const docInfoOf = (info: DraftInfo, grade: string, untitled: string, partHints: PartHints = {}): ExamInfo => ({
  title: info.title.trim() || untitled,
  grade,
  school: info.school.trim(),
  department: info.department.trim(),
  schoolYear: info.schoolYear.trim(),
  term: info.term.trim(),
  minutes: Math.max(1, Math.floor(Number(info.minutes) || 0)),
  partHints: cleanHints(partHints),
})
