import type { Database, Enums, Tables } from "~/types/database.types"

export type Role = Enums<"app_role">

/** Where each role lands after signing in. */
export const homeFor = (role: Role | undefined) => (role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/")

export const ROLE_LABEL: Record<Role, string> = labels("role", ["student", "teacher", "admin"])

type ClassRow = Tables<"classes"> & { courses: Pick<Tables<"courses">, "id" | "name"> | null }

/** The signed-in person's profile row, role and (for students) class. */
export function useProfile() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const profile = useState<Tables<"profiles"> | null>("profile", () => null)
  const myClass = useState<ClassRow | null>("my-class", () => null)

  async function refresh(force = false) {
    const id = user.value?.sub
    if (!id) {
      profile.value = null
      myClass.value = null
      return null
    }
    if (!force && profile.value?.id === id) return profile.value
    const { data } = await client.from("profiles").select("*").eq("id", id).maybeSingle()
    profile.value = data
    myClass.value = null
    if (data?.class_id) {
      const { data: cls } = await client.from("classes").select("*, courses(id, name)").eq("id", data.class_id).maybeSingle()
      myClass.value = cls as ClassRow | null
    }
    return data
  }

  /** Student joins a class with the code the teacher gave them. Returns an error message or null. */
  async function joinClass(code: string) {
    const { error } = await client.rpc("join_class", { code })
    if (error) return error.message
    await refresh(true)
    return null
  }

  const role = computed(() => profile.value?.role)
  const isAdmin = computed(() => role.value === "admin")
  const isTeacher = computed(() => role.value === "teacher")
  const isStudent = computed(() => role.value === "student")
  return { profile, myClass, role, isAdmin, isTeacher, isStudent, refresh, joinClass }
}
