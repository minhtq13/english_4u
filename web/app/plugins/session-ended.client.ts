// Any database request from a session that has ended (signed in elsewhere, idle, locked) fails with SQLSTATE PT401
// (private.session_alive). The Supabase client fetches through window.fetch at call time, so this wraps it once:
// such an answer fires the "session-ended" event, and useSessionGuard signs out at once with the reason.
export const SESSION_ENDED_EVENT = "session-ended"

export default defineNuxtPlugin(() => {
  const base = useRuntimeConfig().public.supabase.url
  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const res = await original(input, init)
    if (res.status === 401) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      if (url.startsWith(base)) {
        const body = await res.clone().json().catch(() => null) as { code?: string } | null
        if (body?.code === "PT401") window.dispatchEvent(new Event(SESSION_ENDED_EVENT))
      }
    }
    return res
  }
})
