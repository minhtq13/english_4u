import type { Database } from "~/types/database.types"
import { reportOf, throttle } from "~/utils/errorReport"

// Runtime errors of the page (a Vue error, an uncaught error, an unhandled promise) go to the admin's error log
// through the log_client_error() RPC (migration 56). Only for a signed-in person; failing to log is never shown.
export default defineNuxtPlugin((nuxtApp) => {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const allow = throttle()

  function send(err: unknown) {
    const r = reportOf(err)
    if (!r || !user.value || !allow(r)) return
    Promise.resolve(client.rpc("log_client_error", { msg: r.msg, trace: r.trace ?? undefined, page: location.pathname, agent: navigator.userAgent })).catch(() => {})
  }

  const previous = nuxtApp.vueApp.config.errorHandler
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    send(err)
    if (previous) previous(err, instance, info)
    else console.error(err)
  }
  window.addEventListener("error", e => send(e.error ?? e.message))
  window.addEventListener("unhandledrejection", e => send(e.reason))
})
