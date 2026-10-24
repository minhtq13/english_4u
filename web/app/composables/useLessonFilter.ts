import type { Ref } from "vue"
import type { Course, LessonSummary, Phase } from "~/utils/course"

export interface LessonStatusOption { key: string; label: string }

/**
 * Search, kind, term, author and a page-specific status (`match`) over a course outline, paged in the browser.
 * `groups` holds the lessons of the current page under their phases, in course order.
 */
export function useLessonFilter(
  outline: Ref<Course | null | undefined>,
  opts: { match?: (l: LessonSummary, status: string) => boolean; pageSize?: number } = {},
) {
  const user = useSupabaseUser()
  const size = opts.pageSize ?? 15
  const state = reactive({ q: "", kind: "", author: "", phase: "" as number | "", status: "", page: 0 })

  const filtered = computed<LessonSummary[]>(() => {
    const o = outline.value
    if (!o) return []
    const term = fold(state.q.trim())
    const me = user.value?.sub
    return o.order.map(id => o.byId[id]!).filter(l =>
      (!term || fold(`${l.label} ${l.title} ${l.desc}`).includes(term))
      && (!state.kind || lessonKind(l) === state.kind)
      && (state.phase === "" || l.phase === state.phase)
      && (!state.author
        || (state.author === "builtin" && !l.createdBy)
        || (state.author === "teacher" && !!l.createdBy)
        || (state.author === "mine" && !!me && l.createdBy === me))
      && (!state.status || !opts.match || opts.match(l, state.status)))
  })

  // A new filter starts on the first page; a shorter list (a lesson deleted) never leaves an empty page.
  watch(() => [state.q, state.kind, state.author, state.phase, state.status], () => { state.page = 0 })
  watch(() => filtered.value.length, (n) => {
    if (state.page > 0 && state.page * size >= n) state.page = Math.max(0, Math.ceil(n / size) - 1)
  })

  const groups = computed<Phase[]>(() => {
    const o = outline.value
    if (!o) return []
    const shown = new Set(filtered.value.slice(state.page * size, state.page * size + size).map(l => l.id))
    return o.phases.map(p => ({ ...p, lessons: p.lessons.filter(l => shown.has(l.id)) })).filter(p => p.lessons.length)
  })
  const active = computed(() => !!(state.q.trim() || state.kind || state.author || state.phase !== "" || state.status))
  function reset() {
    Object.assign(state, { q: "", kind: "", author: "", phase: "", status: "", page: 0 })
  }

  return reactive({ ...toRefs(state), pageSize: size, total: computed(() => filtered.value.length), groups, active, reset })
}

export type LessonFilter = ReturnType<typeof useLessonFilter>
