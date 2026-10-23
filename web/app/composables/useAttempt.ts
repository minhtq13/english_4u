import type { Database, Enums, Json } from "~/types/database.types"
import type { Answer, Lesson, Response, Score } from "~/utils/course"

type SaveState = "idle" | "saving" | "saved" | "error"

/**
 * The signed-in learner's attempt at one lesson: loads it, saves their choices and the
 * writing task (debounced, one write at a time), and submits it once for grading on the server.
 * Results (right/wrong, correct answers) only arrive once released: right after submitting when the
 * class shows results immediately, otherwise after the teacher grades.
 */
export function useAttempt(lesson: Lesson, options: { preview?: boolean } = {}) {
  /** Preview (teachers): answers are checked on screen right away and never saved. */
  const preview = !!options.preview
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const total = lessonTotal(lesson)

  const state = reactive({
    loaded: false,
    id: null as string | null,
    responses: {} as Record<string, Response>,
    writing: "",
    status: "in_progress" as Enums<"attempt_status">,
    /** Server score, set once submitted. */
    score: null as Score | null,
    /** Graded answers from attempt_results; null until released. */
    released: null as Record<string, Answer> | null,
    save: "idle" as SaveState,
    /** The lesson is closed, or not open to this student: nothing can be saved. */
    blocked: false,
  })

  /** Graded answers to show: the teacher's live preview, or the released results. */
  const results = computed(() => (preview ? gradeLocal(lesson, state.responses) : state.released))
  const score = computed(() => (preview || !state.score ? scoreOf(results.value ?? {}, total) : state.score))
  /** Once submitted, nothing can change. */
  const locked = computed(() => !preview && (state.status !== "in_progress" || state.blocked))
  const answered = computed(() => Object.keys(state.responses).length)

  async function loadResults() {
    if (!state.id) return
    const { data } = await client.from("attempt_results").select("answers").eq("attempt_id", state.id).maybeSingle()
    state.released = data ? (data.answers as unknown as Record<string, Answer>) : null
  }

  async function load() {
    const userId = user.value?.sub
    if (!userId || preview) {
      state.loaded = true
      return
    }
    const { data } = await client
      .from("attempts")
      .select("id, answers, writing, status, score")
      .eq("lesson_id", lesson.id)
      .eq("user_id", userId)
      .maybeSingle()
    if (data) {
      state.id = data.id
      state.responses = (data.answers ?? {}) as unknown as Record<string, Response>
      state.writing = data.writing
      state.status = data.status
      if (data.status !== "in_progress") {
        state.score = data.score as unknown as Score
        await loadResults()
      }
    }
    state.loaded = true
  }

  let dirty = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let chain: Promise<void> = Promise.resolve()

  async function write() {
    if (!dirty || !user.value?.sub || locked.value) return
    dirty = false
    const { data, error } = await client
      .from("attempts")
      .upsert(
        {
          user_id: user.value.sub,
          lesson_id: lesson.id,
          answers: state.responses as unknown as Json,
          writing: state.writing,
        },
        { onConflict: "user_id,lesson_id" },
      )
      .select("id, status")
      .single()
    if (error) {
      dirty = true
      state.save = "error"
      return
    }
    state.id = data.id
    state.status = data.status
    state.save = dirty ? "saving" : "saved"
  }

  /** Writes any pending change now; resolves once it is stored (or failed). */
  function flush() {
    clearTimeout(timer)
    chain = chain.then(write)
    return chain
  }

  function schedule(delay = 700) {
    if (preview || locked.value) return
    dirty = true
    state.save = "saving"
    clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  /** Sets (or with null clears) the learner's choice; it can change until the lesson is submitted. */
  function respond(qid: string, response: Response | null) {
    if (locked.value) return
    const next = { ...state.responses }
    if (response) next[qid] = response
    else delete next[qid]
    state.responses = next
    schedule()
  }

  function setWriting(text: string) {
    if (locked.value) return
    state.writing = text
    schedule(1000)
  }

  /** Grades and submits on the server. Returns an error message, or null when submitted. */
  async function submit() {
    if (preview) return null
    if (!state.id) dirty = true // nothing saved yet: create the attempt first
    await flush()
    if (!state.id) return tr("lesson.notSavedRetry")
    const { data, error } = await client.rpc("submit_attempt", { lesson: lesson.id })
    if (error) return error.message
    state.status = data.status
    state.score = data.score as unknown as Score
    await loadResults()
    return null
  }

  return { state, results, score, total, answered, locked, preview, load, respond, setWriting, flush, submit }
}
