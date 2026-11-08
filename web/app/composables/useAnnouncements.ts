import type { Database, Tables } from "~/types/database.types"
import { tr } from "~/utils/i18n"
import { errorText } from "~/utils/serverErrors"

export type Announcement = Pick<Tables<"class_announcements">, "id" | "body" | "created_at" | "author_id">

/** A class's announcements, newest first: read by its students and teachers, posted and deleted by the teachers (RLS). */
export function useAnnouncements(classId: Ref<string | null | undefined> | string) {
  const client = useSupabaseClient<Database>()
  const id = () => (typeof classId === "string" ? classId : classId.value)
  const rows = shallowRef<Announcement[]>([])
  const loaded = ref(false)

  async function load(limit = 5) {
    const cid = id()
    if (!cid) { rows.value = []; loaded.value = true; return }
    const { data } = await client.from("class_announcements").select("id, body, created_at, author_id")
      .eq("class_id", cid).order("created_at", { ascending: false }).limit(limit)
    rows.value = data ?? []
    loaded.value = true
  }

  /** Posts a message; returns an error message in the current language, or null. */
  async function post(body: string) {
    const cid = id()
    if (!cid || !body.trim()) return null
    const { error } = await client.from("class_announcements").insert({ class_id: cid, body: body.trim() })
    if (error) return tr("common.notSaved", { msg: errorText(error.message) })
    await load()
    return null
  }

  async function remove(announcement: string) {
    const { error } = await client.from("class_announcements").delete().eq("id", announcement)
    if (error) return tr("editor.notDeleted", { msg: errorText(error.message) })
    rows.value = rows.value.filter(r => r.id !== announcement)
    return null
  }

  return { rows, loaded, load, post, remove }
}
