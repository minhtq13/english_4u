// Which runtime errors are worth sending to the admin's error log, and how they are shortened. Pure, so it is tested alone.

export interface ErrorReport { msg: string; trace: string | null }

/** Noise that is not a bug of the app: a session that ended (handled by the sign-out), a lost connection, a cancelled request. */
const IGNORED = [/PT401/, /Phiên đăng nhập đã kết thúc/, /Failed to fetch/i, /NetworkError/i, /Load failed/i, /AbortError/, /ResizeObserver loop/i, /Importing a module script failed/i]

export function reportOf(err: unknown): ErrorReport | null {
  const e = err as { message?: unknown; stack?: unknown } | string | null | undefined
  const msg = typeof e === "string" ? e : typeof e?.message === "string" ? e.message : ""
  if (!msg.trim() || IGNORED.some(r => r.test(msg))) return null
  return { msg: msg.slice(0, 500), trace: typeof e === "object" && e && typeof e.stack === "string" ? e.stack.slice(0, 4000) : null }
}

/** Sends each distinct message once per page load, and at most `limit` messages in all, so a loop cannot flood the log. */
export function throttle(limit = 10) {
  const seen = new Set<string>()
  return (r: ErrorReport) => {
    if (seen.has(r.msg) || seen.size >= limit) return false
    seen.add(r.msg)
    return true
  }
}
