import type { Database } from "~/types/database.types"
import type { NotificationRow } from "~/utils/notifications"
import { unreadCount } from "~/utils/notifications"

const COLUMNS = "id, kind, params, link, read_at, created_at"
const POLL_MS = 60_000

/**
 * The signed-in student's notifications (newest 40) and how many are unread. Refreshed when the tab becomes visible
 * again and once a minute while it is. Reading and deleting are the person's own rows only (RLS); the rows are written
 * by database triggers.
 */
export function useNotifications() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const rows = useState<NotificationRow[]>("notifications", () => [])
  const loaded = useState("notifications-loaded", () => false)
  const unread = computed(() => unreadCount(rows.value))

  async function load() {
    const { data } = await client.from("notifications").select(COLUMNS).order("created_at", { ascending: false }).limit(40)
    rows.value = (data ?? []) as NotificationRow[]
    loaded.value = true
  }

  async function markRead(ids: string[]) {
    if (!ids.length) return
    const at = new Date().toISOString()
    const { error } = await client.from("notifications").update({ read_at: at }).in("id", ids)
    if (!error) rows.value = rows.value.map(r => (ids.includes(r.id) ? { ...r, read_at: r.read_at ?? at } : r))
  }
  const markAllRead = () => markRead(rows.value.filter(r => !r.read_at).map(r => r.id))

  async function remove(id: string) {
    const { error } = await client.from("notifications").delete().eq("id", id)
    if (!error) rows.value = rows.value.filter(r => r.id !== id)
  }

  /**
   * Keeps the list fresh while the component that calls this is mounted: a Realtime message when a row is added to
   * this person's notifications, and a poll once a minute as a fallback when the connection drops.
   */
  function keepFresh() {
    let timer: ReturnType<typeof setInterval> | undefined
    let channel: ReturnType<typeof client.channel> | undefined
    const tick = () => { if (document.visibilityState === "visible") load() }
    let closed = false
    onMounted(async () => {
      load()
      timer = setInterval(tick, POLL_MS)
      document.addEventListener("visibilitychange", tick)
      const me = user.value?.sub
      if (!me) return
      try {
        // Realtime applies RLS with the token the socket holds: give it the signed-in one before subscribing, or it
        // may still hold the anonymous key and never deliver this person's rows.
        const { data } = await client.auth.getSession()
        if (data.session) await client.realtime.setAuth(data.session.access_token)
        if (closed) return
        // One channel per component instance (the sidebar and the phone header each have a bell): a channel name is
        // shared by everyone who asks for it, and callbacks cannot be added to one that is already subscribed.
        channel = client.channel(`notifications-${me}-${Math.random().toString(36).slice(2)}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me}` }, () => load())
          .subscribe()
      } catch { /* the minute poll still keeps the list fresh */ }
    })
    onBeforeUnmount(() => {
      closed = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", tick)
      if (channel) client.removeChannel(channel)
    })
  }

  return { rows, loaded, unread, load, markRead, markAllRead, remove, keepFresh }
}
