import type { Database } from "~/types/database.types"

/** No activity for this long signs out (the database ends the session after the same time, see end_idle_sessions). */
export const IDLE_MS = 10 * 60_000
/** Activity is reported at most this often (touch_session keeps the session alive in the database). */
const TOUCH_MS = 60_000
/** Why a session ended, as touch_session() says; each has a message under login.ended.*. */
export type SessionEnd = "replaced" | "idle" | "locked" | "signout" | "ended"

/**
 * Keeps the signed-in session in step with the database: one session per account (signing in elsewhere ends this
 * one), 10 minutes without activity, and locked accounts. Activity (pointer, keys, scroll) is reported through
 * touch_session() at most once a minute; when the database says the session is over, or the 10 minutes pass here,
 * the app signs out on this device and the login page says why. Mounted once, in the default layout.
 */
export function useSessionGuard() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { profile, myClass } = useProfile()
  let lastActive = Date.now()
  let lastTouch = 0
  let busy = false
  let ending = false

  async function end(reason: SessionEnd) {
    if (ending) return
    ending = true
    // The session is already gone in the database; only this device's tokens are cleared.
    await client.auth.signOut({ scope: "local" })
    profile.value = null
    myClass.value = null
    await navigateTo({ path: "/login", query: { ended: reason } })
    ending = false
  }

  async function check() {
    if (!user.value || busy || ending) return
    if (Date.now() - lastActive >= IDLE_MS) return end("idle")
    busy = true
    lastTouch = Date.now()
    const { data, error } = await client.rpc("touch_session")
    busy = false
    // A network error is not a reason to sign out; the next check tries again.
    if (!error && data && data !== "ok") await end(data as SessionEnd)
  }

  function active() {
    lastActive = Date.now()
    if (Date.now() - lastTouch >= TOUCH_MS) check()
  }
  const onVisible = () => { if (document.visibilityState === "visible") check() }
  const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    for (const e of EVENTS) window.addEventListener(e, active, { passive: true, capture: true })
    document.addEventListener("visibilitychange", onVisible)
    // Idle is noticed even without any event; the database check also catches a session ended elsewhere.
    timer = setInterval(() => { if (Date.now() - lastActive >= IDLE_MS) end("idle") }, 15_000)
    check()
  })
  onBeforeUnmount(() => {
    for (const e of EVENTS) window.removeEventListener(e, active, { capture: true })
    document.removeEventListener("visibilitychange", onVisible)
    clearInterval(timer)
  })
  // A new sign-in starts a fresh 10 minutes.
  watch(() => user.value?.sub, () => { lastActive = Date.now(); lastTouch = 0 })
}
