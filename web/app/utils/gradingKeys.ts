// Keyboard shortcuts of the attempt page when a teacher grades: Ctrl/⌘+Enter saves the feedback (works while typing),
// and outside a text field J / K go to the next / previous attempt in the queue and 1–6 tick the error tags.

export type GradingAction = { type: "save" } | { type: "next" } | { type: "previous" } | { type: "tag"; index: number } | null

export interface KeyLike { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }

/** Whether the event came from somewhere the teacher is typing. */
export const isTyping = (el: { tagName?: string; isContentEditable?: boolean } | null | undefined) =>
  !!el && (el.isContentEditable === true || ["INPUT", "TEXTAREA", "SELECT"].includes((el.tagName ?? "").toUpperCase()))

export function gradingAction(e: KeyLike, typing: boolean, tagCount = 6): GradingAction {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.altKey) return { type: "save" }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return null
  const k = e.key.toLowerCase()
  if (k === "j") return { type: "next" }
  if (k === "k") return { type: "previous" }
  const n = Number(k)
  if (Number.isInteger(n) && n >= 1 && n <= tagCount) return { type: "tag", index: n - 1 }
  return null
}
