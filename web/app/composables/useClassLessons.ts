import type { Database } from "~/types/database.types"
import type { ClassLessonSetting } from "~/utils/attemptOutcome"
import type { GiveSettings } from "~/utils/classLesson"
import type { ClassLessonState, SettingPatch } from "~/utils/classLessonStore"
import { isClosed } from "~/utils/attemptOutcome"
import {
  closeLesson, dueAfterReopen, giveLesson, lessonsOfClass, releaseResults, setStudentPicked, takeBackLesson, updateSettings,
} from "~/utils/classLessonStore"

/**
 * The lessons given to one class, kept in step with the database as the teacher changes them: read, give, take
 * back, close/reopen, deadline, who may work, results at submit, shuffle, release results. The reads and writes are
 * in `~/utils/classLessonStore`; this holds the state a page shows. RLS limits writes to the class's teachers
 * (and admins). Every action returns an error message (already in the current language) or null.
 */
export function useClassLessons(classId: string) {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  /** Lessons given to the class → their settings. */
  const settings = shallowRef(new Map<string, ClassLessonSetting>())
  /** For lessons not open to the whole class: the students it is open to. */
  const picks = shallowRef(new Map<string, Set<string>>())

  const patch = (lessonId: string, p: Partial<ClassLessonSetting>) => {
    settings.value = new Map(settings.value).set(lessonId, { ...settings.value.get(lessonId)!, ...p })
  }

  async function load() {
    const loaded = await lessonsOfClass(client, classId)
    settings.value = loaded.settings
    picks.value = loaded.picks
  }

  const stateOf = (lessonId: string): ClassLessonState => {
    const s = settings.value.get(lessonId)
    return !s ? "notGiven" : isClosed(s) ? "closed" : "open"
  }

  async function give(lessonId: string, s: GiveSettings) {
    const { given, error } = await giveLesson(client, classId, lessonId, s, user.value?.sub)
    if (given) {
      settings.value = new Map(settings.value).set(lessonId, {
        show_results: s.showResults, for_all: s.forAll, closed: false, due_at: s.dueAt, shuffle: s.shuffle, time_limit_min: s.timeLimit,
      })
      if (!s.forAll && !error) picks.value = new Map(picks.value).set(lessonId, new Set(s.studentIds))
    }
    return error
  }

  async function takeBack(lessonId: string) {
    const error = await takeBackLesson(client, classId, lessonId)
    if (!error) {
      const next = new Map(settings.value)
      next.delete(lessonId)
      settings.value = next
    }
    return error
  }

  async function update(lessonId: string, p: SettingPatch) {
    const error = await updateSettings(client, classId, lessonId, p)
    if (!error) patch(lessonId, p)
    return error
  }

  /** Closing submits the work in progress (`submitted` = how many); reopening drops a deadline already passed. */
  async function setClosed(lessonId: string, close: boolean) {
    const r = await closeLesson(client, classId, lessonId, close)
    if (!r.error) patch(lessonId, close ? { closed: true } : { closed: false, due_at: dueAfterReopen(settings.value.get(lessonId)?.due_at) })
    return r
  }

  async function togglePick(lessonId: string, studentId: string) {
    const set = new Set(picks.value.get(lessonId) ?? [])
    const on = !set.has(studentId)
    const error = await setStudentPicked(client, classId, lessonId, studentId, on)
    if (!error) {
      if (on) set.add(studentId)
      else set.delete(studentId)
      picks.value = new Map(picks.value).set(lessonId, set)
    }
    return error
  }

  /** Marks every submitted attempt of the lesson in the class graded (`released` = how many). */
  const release = (lessonId: string) => releaseResults(client, classId, lessonId)

  return { settings, picks, load, stateOf, give, takeBack, update, setClosed, togglePick, release }
}
