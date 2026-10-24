import type { Database } from "~/types/database.types"
import type { GiveForm } from "~/utils/classLesson"

/** What the editor does with one class of the lesson's grade when the lesson is saved. */
export interface ClassPlan {
  classId: string
  name: string
  /** The lesson is already given to this class (editing): it stays given, and its settings can change. */
  existing: boolean
  /** Already given and closed or past its deadline: reopened and rescheduled on the class page, not here. */
  locked: boolean
  /** The lesson will be given to this class (or already is). */
  on: boolean
  /** The settings are unfolded. */
  open: boolean
  form: GiveForm
  /** The form as it was loaded for an existing assignment, to write only what changed. */
  saved: GiveForm | null
  /** The class's students, for "chosen students"; null until needed. */
  students: { id: string; name: string }[] | null
}

/**
 * Giving a lesson to classes from the lesson editor: one plan per class of the lesson's grade, each with the
 * same settings as the class page's give panel (deadline, who, results at submit, shuffle). Nothing is written
 * until `apply()` runs after the lesson is saved. A lesson already given to a class keeps its assignment (taking
 * it back is on the class page) and its settings can be changed; other classes are given the lesson when ticked.
 */
export function useLessonGiving() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const plans = ref<ClassPlan[]>([])
  /** Assignments loaded for an existing lesson, by class. */
  const given = shallowRef(new Map<string, { form: GiveForm; locked: boolean }>())
  /** A class to tick from the start (the class page's "new lesson"), and one student to give it to alone (a review sheet). */
  const wanted = { classId: "", studentId: "" }

  const loadingStudents = new Set<string>()
  async function ensureStudents(plan: ClassPlan) {
    if (plan.students || loadingStudents.has(plan.classId)) return
    loadingStudents.add(plan.classId)
    const { data } = await client.from("student_progress").select("user_id, full_name, username, email").eq("class_id", plan.classId).order("full_name")
    plan.students = (data ?? []).map(s => ({ id: s.user_id ?? "", name: s.full_name || s.username || s.email || "?" }))
    loadingStudents.delete(plan.classId)
  }
  // Choosing "chosen students" on a class needs its students, whenever that is chosen.
  watch(() => plans.value.map(p => p.on && !p.form.forAll), () => {
    for (const p of plans.value) if (p.on && !p.form.forAll) ensureStudents(p)
  })

  function create(c: { id: string; name: string }): ClassPlan {
    const old = given.value.get(c.id)
    const base = { classId: c.id, name: c.name, students: null }
    if (old) return { ...base, existing: true, locked: old.locked, on: true, open: false, form: { ...old.form, studentIds: [...old.form.studentIds] }, saved: old.form }
    const form = emptyGiveForm()
    const chosen = wanted.classId === c.id
    if (chosen && wanted.studentId) Object.assign(form, { forAll: false, studentIds: [wanted.studentId] })
    return { ...base, existing: false, locked: false, on: chosen, open: chosen, form, saved: null }
  }

  /** The classes of the lesson's grade. Plans of classes still listed keep what the teacher chose. */
  function setClasses(list: { id: string; name: string }[]) {
    const keep = new Map(plans.value.map(p => [p.classId, p]))
    plans.value = list.map(c => keep.get(c.id) ?? create(c))
  }

  /** Ticks `classId` from the start; with `studentId`, gives the lesson to that student only. */
  function want(classId: string, studentId = "") {
    Object.assign(wanted, { classId, studentId })
  }

  /** An existing lesson: which classes have it, with their settings and chosen students. */
  async function loadGiven(lessonId: string, classIds: string[]) {
    if (!classIds.length) return
    const [rows, picks] = await Promise.all([
      client.from("class_lessons").select("class_id, due_at, for_all, show_results, shuffle, closed").eq("lesson_id", lessonId).in("class_id", classIds),
      client.from("class_lesson_students").select("class_id, student_id").eq("lesson_id", lessonId).in("class_id", classIds),
    ])
    const map = new Map<string, { form: GiveForm; locked: boolean }>()
    for (const r of rows.data ?? []) {
      const ids = (picks.data ?? []).filter(p => p.class_id === r.class_id).map(p => p.student_id)
      map.set(r.class_id, { form: formOf(r, ids), locked: isClosed(r) })
    }
    given.value = map
    plans.value = plans.value.map(p => (map.has(p.classId) ? create({ id: p.classId, name: p.name }) : p))
  }

  function toggle(plan: ClassPlan) {
    if (plan.existing) return
    plan.on = !plan.on
    plan.open = plan.on
  }

  function unfold(plan: ClassPlan) {
    plan.open = !plan.open
  }

  /** The same deadline, results and shuffle choices for every other class that is given or can still change. */
  function copyToOthers(from: ClassPlan) {
    for (const p of plans.value) {
      if (p === from || !p.on || p.locked) continue
      Object.assign(p.form, { due: from.form.due, showResults: from.form.showResults, shuffle: from.form.shuffle })
    }
  }

  /** Whether `apply()` has anything to do. */
  const pending = computed(() => plans.value.some(p => p.on && !p.locked && (!p.existing || formChanged(p.saved!, p.form))))

  /** What stops the plans from being used, in the current language, one line per class. */
  function problems() {
    return plans.value.filter(p => p.on && !p.locked).flatMap((p) => {
      const key = giveProblem(p.form, p.saved)
      return key ? [`${p.name}: ${tr(`classPage.${key}`)}`] : []
    })
  }

  /**
   * Gives the lesson to the ticked classes and writes the changed settings of the ones it already had. Returns the
   * errors, one per class. A class that went through counts as given from then on, so trying again after a failure
   * on another class never gives the lesson twice.
   */
  async function apply(lessonId: string) {
    const errors: string[] = []
    for (const p of plans.value.filter(x => x.on && !x.locked)) {
      const copy = (): GiveForm => ({ ...p.form, studentIds: [...p.form.studentIds] })
      let error: string | null
      if (p.existing) {
        if (!formChanged(p.saved!, p.form)) continue
        error = await updateGivenLesson(client, p.classId, lessonId, p.saved!, p.form)
        if (!error) p.saved = copy()
      } else {
        const r = await giveLesson(client, p.classId, lessonId, settingsOf(p.form), user.value?.sub)
        error = r.error
        // Given, but the chosen students were not stored: the retry adds them.
        if (r.given) Object.assign(p, { existing: true, saved: error ? { ...copy(), studentIds: [] } : copy() })
      }
      if (error) errors.push(`${p.name}: ${error}`)
    }
    return errors
  }

  return reactive({ plans, pending, setClasses, want, loadGiven, toggle, unfold, ensureStudents, copyToOthers, problems, apply })
}
