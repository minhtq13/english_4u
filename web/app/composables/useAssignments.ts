import type { Database, Tables } from "~/types/database.types"

type ClassRow = Pick<Tables<"classes">, "id" | "name">

/**
 * Which classes of one grade each lesson is assigned to (class_lessons), with assign / take back.
 * RLS scopes it: teachers get and change their own classes, admins every class.
 */
export function useAssignments() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const classes = shallowRef<ClassRow[]>([])
  const assigned = ref(new Set<string>())
  const busy = ref<string | null>(null)
  const error = ref("")
  const key = (classId: string, lessonId: string) => `${classId}|${lessonId}`

  async function load(courseId: string, lessonIds?: string[]) {
    const { data: cls } = await client.from("classes").select("id, name").eq("course_id", courseId).order("name")
    const list = cls ?? []
    const ids = list.map(c => c.id)
    let rows: { class_id: string; lesson_id: string }[] = []
    if (ids.length) {
      let q = client.from("class_lessons").select("class_id, lesson_id").in("class_id", ids)
      if (lessonIds) q = q.in("lesson_id", lessonIds)
      rows = (await q).data ?? []
    }
    // Both are set together, so a chip never shows "not assigned" while the assignments are still loading.
    assigned.value = new Set(rows.map(r => key(r.class_id, r.lesson_id)))
    classes.value = list
  }

  const isAssigned = (classId: string, lessonId: string) => assigned.value.has(key(classId, lessonId))
  const classesOf = (lessonId: string) => classes.value.filter(c => isAssigned(c.id, lessonId))

  async function toggle(classId: string, lessonId: string) {
    const k = key(classId, lessonId)
    const on = assigned.value.has(k)
    busy.value = k
    error.value = ""
    const failure = on
      ? await takeBackLesson(client, classId, lessonId)
      : (await giveLesson(client, classId, lessonId, {}, user.value?.sub)).error
    busy.value = null
    if (failure) {
      error.value = failure
      return
    }
    const next = new Set(assigned.value)
    if (on) next.delete(k)
    else next.add(k)
    assigned.value = next
  }

  return { classes, assigned, busy, error, load, isAssigned, classesOf, toggle, key }
}

export type Assignments = ReturnType<typeof useAssignments>
