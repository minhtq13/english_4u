import type { Database, Tables } from "~/types/database.types"

/** The signed-in person's profile row (role decides access to /admin). */
export function useProfile() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const profile = useState<Tables<"profiles"> | null>("profile", () => null)

  async function refresh() {
    const id = user.value?.sub
    if (!id) {
      profile.value = null
      return null
    }
    if (profile.value?.id === id) return profile.value
    const { data } = await client.from("profiles").select("*").eq("id", id).maybeSingle()
    profile.value = data
    return data
  }

  const isAdmin = computed(() => profile.value?.role === "admin")
  return { profile, isAdmin, refresh }
}
