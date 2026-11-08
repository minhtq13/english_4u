import type { Tables } from "~/types/database.types"

// What a notification says. The database stores only the kind and its parameters; the app words them in the
// reader's language (i18n keys `notifications.kind.<kind>`), so a notice reads right after the language is switched.

export type NotificationRow = Pick<Tables<"notifications">, "id" | "kind" | "params" | "link" | "read_at" | "created_at">

/** The lesson a notification is about, when it has one. */
export function lessonOf(n: Pick<NotificationRow, "params">): string | null {
  const p = n.params
  return p && typeof p === "object" && !Array.isArray(p) && typeof p.lesson_id === "string" ? p.lesson_id : null
}

/** The deadline in a "due soon" notice, as an ISO time. */
export function dueOf(n: Pick<NotificationRow, "params">): string | null {
  const p = n.params
  return p && typeof p === "object" && !Array.isArray(p) && typeof p.due_at === "string" ? p.due_at : null
}

export const unreadCount = (rows: readonly Pick<NotificationRow, "read_at">[]) => rows.filter(r => !r.read_at).length

/** Where a notification leads: its link, kept to this site's own paths (a stored link is never followed off-site). */
export const safeLink = (link: string | null | undefined) => (link && /^\/(?!\/)/.test(link) ? link : "/")
