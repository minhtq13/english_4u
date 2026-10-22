import type { Database, Enums, Json } from "~/types/database.types"
import type { Answer, Lesson } from "~/utils/course"

type SaveState = "idle" | "saving" | "saved" | "error"

/**
 * The signed-in learner's attempt at one lesson: loads it, records answers and the
 * writing task, and saves to Supabase (debounced, one write at a time).
 */
export function useAttempt(lesson: Lesson) {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const total = lessonTotal(lesson)

  const state = reactive({
    loaded: false,
    id: null as string | null,
    answers: {} as Record<string, Answer>,
    writing: "",
    status: "in_progress" as Enums<"attempt_status">,
    save: "idle" as SaveState,
  })
  const score = computed(() => scoreOf(state.answers, total))

  async function load() {
    const userId = user.value?.sub
    if (!userId) return
    const { data } = await client
      .from("attempts")
      .select("id, answers, writing, status")
      .eq("lesson_id", lesson.id)
      .eq("user_id", userId)
      .maybeSingle()
    if (data) {
      state.id = data.id
      state.answers = (data.answers ?? {}) as unknown as Record<string, Answer>
      state.writing = data.writing
      state.status = data.status
    }
    state.loaded = true
  }

  let dirty = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let chain: Promise<void> = Promise.resolve()

  async function write() {
    if (!dirty || !user.value?.sub) return
    dirty = false
    const { data, error } = await client
      .from("attempts")
      .upsert(
        {
          user_id: user.value.sub,
          lesson_id: lesson.id,
          answers: state.answers as unknown as Json,
          writing: state.writing,
          score: score.value as unknown as Json,
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
    dirty = true
    state.save = "saving"
    clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  function record(qid: string, answer: Answer) {
    if (qid in state.answers) return // the first attempt counts
    state.answers = { ...state.answers, [qid]: answer }
    schedule()
  }

  function setWriting(text: string) {
    state.writing = text
    schedule(1000)
  }

  async function submit() {
    await flush()
    if (!state.id) return false
    const { error } = await client.from("attempts").update({ status: "submitted" }).eq("id", state.id)
    if (error) return false
    state.status = "submitted"
    return true
  }

  async function reset() {
    clearTimeout(timer)
    dirty = false
    state.answers = {}
    state.writing = ""
    if (!state.id) return
    await chain
    const { error } = await client
      .from("attempts")
      .update({ answers: {}, writing: "", score: {}, status: "in_progress" })
      .eq("id", state.id)
    state.status = "in_progress"
    state.save = error ? "error" : "saved"
  }

  return { state, score, total, load, record, setWriting, flush, submit, reset }
}
