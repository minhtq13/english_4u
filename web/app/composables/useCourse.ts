import type { Database } from "~/types/database.types"
import type { Course, CourseInfo, Lesson, LessonRow } from "~/utils/course"

/** Courses, course outlines (cached for the session) and full lessons, read from Supabase. */
export function useCourse() {
  const client = useSupabaseClient<Database>()
  const courses = useState<CourseInfo[] | null>("courses", () => null)
  const outlines = useState<Record<string, Course>>("course-outlines", () => ({}))

  async function listCourses(force = false) {
    if (courses.value && !force) return courses.value
    const { data, error } = await client.from("courses").select("*").order("position")
    if (error) throw error
    courses.value = data
    return data
  }

  /** Phases and lessons of one course. */
  async function load(courseId: string, force = false) {
    const cached = outlines.value[courseId]
    if (cached && !force) return cached
    const [phases, overview] = await Promise.all([
      client.from("phases").select("*").eq("course_id", courseId),
      client.from("lesson_overview").select("*").eq("course_id", courseId),
    ])
    if (phases.error) throw phases.error
    if (overview.error) throw overview.error
    const outline = toCourse(courseId, phases.data, overview.data)
    outlines.value = { ...outlines.value, [courseId]: outline }
    return outline
  }

  /** Questions come through lesson_items(), which leaves out the answers until the reader may see them. */
  async function getLesson(id: string): Promise<Lesson | null> {
    const [lesson, items] = await Promise.all([
      client.from("lessons").select("*, lesson_sections(*), phases(course_id)").eq("id", id).maybeSingle(),
      client.rpc("lesson_items", { lesson: id }),
    ])
    if (lesson.error) throw lesson.error
    if (items.error) throw items.error
    return lesson.data ? toLesson(lesson.data as LessonRow, items.data ?? []) : null
  }

  return { courses, listCourses, load, getLesson }
}
