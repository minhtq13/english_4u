import type { Json, Tables } from "~/types/database.types"

// Reading one row of the audit log for an admin: who did it, to what, and the details, as i18n keys + parameters
// (so it reads right in either language). Names are looked up by the page (profiles, classes) and passed in.

export type AuditRow = Pick<Tables<"audit_log">, "id" | "at" | "actor" | "action" | "target" | "detail">

export const AUDIT_ACTIONS = [
  "role_changed", "account_locked", "account_unlocked", "class_changed", "account_deleted", "class_code_changed", "class_deleted", "class_promoted",
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

const CLASS_ACTIONS = new Set<string>(["class_code_changed", "class_deleted", "class_promoted"])

/** Whether the row's target is a class (otherwise it is a person). */
export const targetsClass = (action: string) => CLASS_ACTIONS.has(action)

const obj = (j: Json): Record<string, Json | undefined> => (j && typeof j === "object" && !Array.isArray(j) ? j : {})
const str = (v: Json | undefined) => (typeof v === "string" ? v : "")

/** Ids in a row that the page must name: people (actor, person targets) and classes (class targets, class moves). */
export function idsToName(rows: readonly AuditRow[]) {
  const people = new Set<string>()
  const classes = new Set<string>()
  for (const r of rows) {
    if (r.actor) people.add(r.actor)
    if (r.target) (targetsClass(r.action) ? classes : people).add(r.target)
    const d = obj(r.detail)
    for (const k of ["from", "to"]) if ((r.action === "class_changed" || r.action === "class_promoted") && str(d[k])) classes.add(str(d[k]))
  }
  return { people: [...people], classes: [...classes] }
}

export interface AuditView { action: string; actor: string; target: string; detail: { key: string; params: Record<string, string | number> } | null }

/** `people` and `classes` map an id to a display name; an id nobody knows any more shows as "?". */
export function auditView(r: AuditRow, people: ReadonlyMap<string, string>, classes: ReadonlyMap<string, string>): AuditView {
  const d = obj(r.detail)
  const cls = (id: string) => (id ? classes.get(id) ?? "?" : "–")
  const target = targetsClass(r.action)
    ? (r.action === "class_deleted" ? str(d.name) : "") || classes.get(r.target ?? "") || str(d.name) || "?"
    : (r.action === "account_deleted" ? str(d.name) || str(d.username) || str(d.email) : "") || people.get(r.target ?? "") || "?"
  let detail: AuditView["detail"] = null
  if (r.action === "role_changed") detail = { key: "audit.detail.role", params: { from: str(d.from), to: str(d.to) } }
  else if (r.action === "class_changed") detail = { key: "audit.detail.move", params: { from: cls(str(d.from)), to: cls(str(d.to)) } }
  else if (r.action === "class_promoted") detail = { key: "audit.detail.promoted", params: { n: typeof d.students === "number" ? d.students : 0, to: cls(str(d.to)) } }
  else if (r.action === "account_deleted") detail = { key: "audit.detail.deleted", params: { role: str(d.role), login: str(d.username) || str(d.email) } }
  return { action: r.action, actor: r.actor ? people.get(r.actor) ?? "?" : "", target, detail }
}
