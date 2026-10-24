import type { Tables } from "~/types/database.types"
import { isPastDue } from "./course"

/** How a lesson is given to a class, chosen in a panel before "Giao cho lớp" (class_lessons + class_lesson_students). */
export interface GiveSettings {
  /** ISO timestamp, or null for no deadline. */
  dueAt: string | null
  /** true: the whole class; false: only `studentIds`. */
  forAll: boolean
  studentIds: string[]
  showResults: boolean
  shuffle: boolean
}

/**
 * The same choices as the give form edits them: the deadline is a datetime-local value (local time, minutes),
 * "" for none. `studentIds` is kept while "whole class" is on, so switching back does not lose the picks.
 */
export interface GiveForm {
  due: string
  forAll: boolean
  studentIds: string[]
  showResults: boolean
  shuffle: boolean
}

export const emptyGiveForm = (): GiveForm => ({ due: "", forAll: true, studentIds: [], showResults: false, shuffle: false })

/** datetime-local value (local time) of an ISO timestamp. */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/** datetime-local value for `days` from now at 21:00 (the quick deadline buttons). */
export function inDays(days: number, now = Date.now()) {
  const d = new Date(now + days * 864e5)
  d.setHours(21, 0, 0, 0)
  return toLocalInput(d.toISOString())
}

const dueIso = (due: string) => (due ? new Date(due).toISOString() : null)

/** What the form stands for, as stored. */
export const settingsOf = (f: GiveForm): GiveSettings => ({
  dueAt: dueIso(f.due), forAll: f.forAll, studentIds: f.forAll ? [] : [...f.studentIds], showResults: f.showResults, shuffle: f.shuffle,
})

/** A lesson already given to a class, as a form: its class_lessons row and the students it is open to. */
export const formOf = (
  row: Pick<Tables<"class_lessons">, "due_at" | "for_all" | "show_results" | "shuffle">,
  studentIds: string[] = [],
): GiveForm => ({
  due: row.due_at ? toLocalInput(row.due_at) : "", forAll: row.for_all, studentIds: [...studentIds], showResults: row.show_results, shuffle: row.shuffle,
})

/** Whether two forms give a lesson differently. The picks only matter while "chosen students" is on. */
export const formChanged = (a: GiveForm, b: GiveForm) =>
  a.due !== b.due || a.forAll !== b.forAll || a.showResults !== b.showResults || a.shuffle !== b.shuffle
  || (!b.forAll && (a.studentIds.length !== b.studentIds.length || a.studentIds.some(id => !b.studentIds.includes(id))))

/**
 * What stops a form from being used, as an i18n key under classPage: a deadline already past (a deadline left
 * as it was, `saved`, is not checked again), or "chosen students" without any student.
 */
export function giveProblem(f: GiveForm, saved?: GiveForm | null): "dueInPast" | "setup.pickSome" | null {
  if (f.due && f.due !== saved?.due && isPastDue(dueIso(f.due))) return "dueInPast"
  if (!f.forAll && !f.studentIds.length) return "setup.pickSome"
  return null
}
