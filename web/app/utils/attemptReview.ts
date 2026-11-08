import type { Database, Enums, Tables } from "~/types/database.types"
import type { Client, Failure } from "./classLessonStore"
import { tr } from "./i18n"
import { errorText } from "./serverErrors"

// What a teacher does with one submitted attempt: read it with everything around it, release its result, let the
// student redo it, write feedback and the errors it showed, edit or delete earlier feedback, and walk the queue
// of a class's waiting work. The attempt page only shows these and holds what is being typed. The seam is the
// Supabase client; every write returns an error message (already in the current language) or null.

type Cols<T extends keyof Database["public"]["Tables"]> = Tables<T>
export type AttemptWithStudent = Cols<"attempts"> & {
  profiles: Pick<Cols<"profiles">, "id" | "full_name" | "username" | "email"> | null
}
export interface AttemptReview {
  attempt: AttemptWithStudent
  feedback: Cols<"feedback">[]
  errors: Cols<"error_log">[]
  /** The graded answers (`attempt_results`); null while the attempt is not submitted. */
  results: Record<string, unknown> | null
}

const fail = (key: string, e: { message: string } | null): Failure => (e ? tr(key, { msg: errorText(e.message) }) : null)

/** The attempt, its student, earlier feedback, the student's logged errors and the graded answers; null when it does not exist. */
export async function readAttempt(client: Client, attemptId: string): Promise<AttemptReview | null> {
  const { data } = await client.from("attempts").select("*, profiles(id, full_name, username, email)").eq("id", attemptId).maybeSingle()
  if (!data) return null
  const [f, e, r] = await Promise.all([
    client.from("feedback").select("*").eq("attempt_id", attemptId).order("created_at", { ascending: false }),
    client.from("error_log").select("*").eq("user_id", data.user_id),
    client.from("attempt_results").select("answers").eq("attempt_id", attemptId).maybeSingle(),
  ])
  return {
    attempt: data as AttemptWithStudent,
    feedback: f.data ?? [],
    errors: e.data ?? [],
    results: r.data ? (r.data.answers as Record<string, unknown>) : null,
  }
}

/** The errors logged for one student. */
export async function readErrors(client: Client, userId: string) {
  const { data } = await client.from("error_log").select("*").eq("user_id", userId)
  return data ?? []
}

/** Marks a submitted attempt graded, which is what lets the student see the result. */
export async function releaseAttempt(client: Client, attemptId: string): Promise<Failure> {
  const { error } = await client.from("attempts").update({ status: "graded" }).eq("id", attemptId)
  return fail("attemptPage.releaseFailed", error)
}

/** Reopens a submitted attempt for the student. One transaction: the graded results go and the attempt reopens together. */
export async function reopenAttempt(client: Client, attemptId: string): Promise<Failure> {
  const { error } = await client.rpc("allow_redo", { target: attemptId })
  return fail("attemptPage.redoFailed", error)
}

export interface FeedbackInput {
  attemptId: string
  userId: string
  lessonId: string
  body: string
  tags: string[]
  /** Errors to log for the student; rows without a note are ignored. */
  newErrors: { category: Enums<"error_category">; note: string }[]
}

/** Writes feedback on an attempt and logs the errors it showed. */
export async function saveFeedback(client: Client, f: FeedbackInput): Promise<Failure> {
  const { error } = await client.from("feedback").insert({ attempt_id: f.attemptId, body: f.body.trim(), error_tags: f.tags })
  const rows = f.newErrors.filter(e => e.note.trim()).map(e => ({
    user_id: f.userId, lesson_id: f.lessonId, category: e.category, note: e.note.trim(),
  }))
  const logged = rows.length ? await client.from("error_log").insert(rows) : { error: null }
  return fail("common.notSaved", error ?? logged.error)
}

export async function editFeedback(client: Client, id: string, body: string, tags: string[]): Promise<Failure> {
  const { error } = await client.from("feedback").update({ body: body.trim(), error_tags: tags }).eq("id", id)
  return fail("common.notChanged", error)
}

export async function deleteFeedback(client: Client, id: string): Promise<Failure> {
  const { error } = await client.from("feedback").delete().eq("id", id)
  return fail("editor.notDeleted", error)
}

// ---------------------------------------------------------------- the grading queue ("chấm lần lượt")

/** Ids of one class's attempts at one lesson still waiting for grading, oldest submission first. */
export async function waitingAttempts(client: Client, lessonId: string, classId: string) {
  const { data } = await client.from("attempts")
    .select("id, profiles!inner(class_id)")
    .eq("lesson_id", lessonId).eq("status", "submitted").eq("profiles.class_id", classId)
    .order("submitted_at", { ascending: true })
  return (data ?? []).map(r => r.id)
}

/** The page of one attempt inside a queue (?queue=<lesson>&class=<class>). */
export const queueLink = (attemptId: string, lessonId: string, classId: string) =>
  `/teacher/attempts/${attemptId}?queue=${encodeURIComponent(lessonId)}&class=${classId}`

/** After grading `current`: the oldest still waiting (`current` itself no longer counts), or null when the queue is done. */
export const nextAfterGrading = (waiting: readonly string[], current: string) => waiting.find(id => id !== current) ?? null

/** Skipping `current` without grading: the one after it in submission order, wrapping to the oldest other one. */
export const nextAfterSkip = (waiting: readonly string[], current: string) =>
  waiting[waiting.indexOf(current) + 1] ?? waiting.find(id => id !== current) ?? null

/** 1-based place of `current` in the queue, 0 when it is not in it. */
export const queuePosition = (waiting: readonly string[], current: string) => waiting.indexOf(current) + 1
