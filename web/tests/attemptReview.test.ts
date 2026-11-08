import { describe, expect, it } from "vitest"
import {
  reopenAttempt, deleteFeedback, editFeedback, nextAfterGrading, nextAfterSkip, queueLink, queuePosition, releaseAttempt, saveFeedback,
} from "~/utils/attemptReview"
import { memoryClient } from "./helpers/memoryClient"

describe("releasing and redoing", () => {
  it("marks a submitted attempt graded", async () => {
    const { client, tables } = memoryClient({ attempts: [{ id: "a1", status: "submitted" }] })
    expect(await releaseAttempt(client, "a1")).toBeNull()
    expect(tables.attempts![0]!.status).toBe("graded")
  })
  it("reports a refused release in the current language", async () => {
    const { client } = memoryClient({ attempts: [{ id: "a1" }] }, { fail: ["attempts.update"] })
    expect(await releaseAttempt(client, "a1")).toContain("attemptPage.releaseFailed")
  })
  it("reopens an attempt through one RPC", async () => {
    const calls: unknown[] = []
    const { client } = memoryClient({}, { rpc: { allow_redo: (args) => { calls.push(args) } } })
    expect(await reopenAttempt(client, "a1")).toBeNull()
    expect(calls).toEqual([{ target: "a1" }])
  })
})

describe("feedback", () => {
  const base = { attemptId: "a1", userId: "u1", lessonId: "6.1", body: "  Tốt  ", tags: ["grammar" as const] }
  it("saves the feedback and logs only the errors that have a note", async () => {
    const { client, tables } = memoryClient()
    const err = await saveFeedback(client, { ...base, newErrors: [{ category: "grammar", note: " thiếu s " }, { category: "grammar", note: "  " }] })
    expect(err).toBeNull()
    expect(tables.feedback).toEqual([{ attempt_id: "a1", body: "Tốt", error_tags: ["grammar"] }])
    expect(tables.error_log).toEqual([{ user_id: "u1", lesson_id: "6.1", category: "grammar", note: "thiếu s" }])
  })
  it("writes no error log when there is nothing to log", async () => {
    const { client, tables } = memoryClient()
    await saveFeedback(client, { ...base, newErrors: [] })
    expect(tables.error_log ?? []).toHaveLength(0)
  })
  it("reports a failed save", async () => {
    const { client } = memoryClient({}, { fail: ["feedback.insert"] })
    expect(await saveFeedback(client, { ...base, newErrors: [] })).toContain("common.notSaved")
  })
  it("edits and deletes earlier feedback", async () => {
    const { client, tables } = memoryClient({ feedback: [{ id: "f1", body: "a", error_tags: [] }] })
    expect(await editFeedback(client, "f1", " b ", ["grammar"])).toBeNull()
    expect(tables.feedback![0]).toMatchObject({ body: "b", error_tags: ["grammar"] })
    expect(await deleteFeedback(client, "f1")).toBeNull()
    expect(tables.feedback).toHaveLength(0)
  })
})

describe("the grading queue", () => {
  const waiting = ["a", "b", "c"]
  it("the attempt after grading is the oldest other one", () => {
    expect(nextAfterGrading(waiting, "a")).toBe("b")
    expect(nextAfterGrading(waiting, "c")).toBe("a")
    expect(nextAfterGrading(["a"], "a")).toBeNull()
  })
  it("skipping goes to the next in order, wrapping around", () => {
    expect(nextAfterSkip(waiting, "a")).toBe("b")
    expect(nextAfterSkip(waiting, "c")).toBe("a")
    expect(nextAfterSkip(["a"], "a")).toBeNull()
  })
  it("knows the place in the queue, 0 when absent", () => {
    expect(queuePosition(waiting, "b")).toBe(2)
    expect(queuePosition(waiting, "x")).toBe(0)
  })
  it("links an attempt inside its queue", () => {
    expect(queueLink("a1", "6.1", "c1")).toBe("/teacher/attempts/a1?queue=6.1&class=c1")
  })
})
