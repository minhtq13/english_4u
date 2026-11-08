import { describe, expect, it } from "vitest"
import {
  closeLesson, dueAfterReopen, giveLesson, givenInClasses, lessonForStudent, lessonsForStudent, lessonsOfClass,
  lessonsShowingResults, takeBackLesson, whoMayWork,
} from "~/utils/classLessonStore"
import { memoryClient } from "./helpers/memoryClient"

const unique = { class_lessons: ["class_id", "lesson_id"] }
const lesson = (over: Record<string, unknown> = {}) => ({
  class_id: "c1", lesson_id: "6.1", for_all: true, closed: false, due_at: null, show_results: false, shuffle: false, ...over,
})
const FUTURE = new Date(Date.now() + 864e5).toISOString()
const PAST = new Date(Date.now() - 864e5).toISOString()

describe("giveLesson / takeBackLesson", () => {
  it("gives a lesson to the whole class", async () => {
    const { client, tables } = memoryClient({}, { unique })
    expect(await giveLesson(client, "c1", "6.1", { forAll: true, showResults: true }, "t1")).toEqual({ given: true, error: null })
    expect(tables.class_lessons).toHaveLength(1)
    expect(tables.class_lessons![0]).toMatchObject({ class_id: "c1", lesson_id: "6.1", show_results: true, unlocked_by: "t1" })
    expect(tables.class_lesson_students ?? []).toHaveLength(0)
  })
  it("gives a lesson to chosen students: the row and their picks", async () => {
    const { client, tables } = memoryClient({}, { unique })
    await giveLesson(client, "c1", "6.1", { forAll: false, studentIds: ["a", "b"] })
    expect(tables.class_lesson_students!.map(r => r.student_id)).toEqual(["a", "b"])
  })
  it("refuses to give a lesson twice and writes no picks", async () => {
    const { client, tables } = memoryClient({ class_lessons: [lesson()] }, { unique })
    const r = await giveLesson(client, "c1", "6.1", { forAll: false, studentIds: ["a"] })
    expect(r.given).toBe(false)
    expect(r.error).toBeTruthy()
    expect(tables.class_lesson_students ?? []).toHaveLength(0)
  })
  it("a failure on the picks still leaves the lesson given", async () => {
    const { client, tables } = memoryClient({}, { unique, fail: ["class_lesson_students.insert"] })
    const r = await giveLesson(client, "c1", "6.1", { forAll: false, studentIds: ["a"] })
    expect(r.given).toBe(true)
    expect(r.error).toBeTruthy()
    expect(tables.class_lessons).toHaveLength(1)
  })
  it("takes a lesson back, and says so when nothing was deleted", async () => {
    const { client, tables } = memoryClient({ class_lessons: [lesson()] })
    expect(await takeBackLesson(client, "c1", "6.1")).toBeNull()
    expect(tables.class_lessons).toHaveLength(0)
    expect(await takeBackLesson(client, "c1", "6.1")).toBeTruthy()
  })
})

describe("closing", () => {
  it("returns how many attempts were submitted", async () => {
    const { client } = memoryClient({}, { rpc: { close_class_lesson: () => 3 } })
    expect(await closeLesson(client, "c1", "6.1", true)).toEqual({ error: null, submitted: 3 })
  })
  it("drops a deadline already passed when reopening, keeps a future one", () => {
    expect(dueAfterReopen(PAST)).toBeNull()
    expect(dueAfterReopen(FUTURE)).toBe(FUTURE)
    expect(dueAfterReopen(null)).toBeNull()
  })
})

describe("reads for a teacher", () => {
  const seed = {
    class_lessons: [lesson(), lesson({ lesson_id: "6.2", for_all: false }), lesson({ class_id: "c2", closed: true })],
    class_lesson_students: [
      { class_id: "c1", lesson_id: "6.2", student_id: "a" }, { class_id: "c1", lesson_id: "6.2", student_id: "b" },
      { class_id: "c2", lesson_id: "6.1", student_id: "z" },
    ],
  }
  it("lists the lessons of one class with who may work", async () => {
    const { client } = memoryClient(seed)
    const { settings, picks } = await lessonsOfClass(client, "c1")
    expect([...settings.keys()]).toEqual(["6.1", "6.2"])
    expect(settings.get("6.2")?.for_all).toBe(false)
    expect([...(picks.get("6.2") ?? [])]).toEqual(["a", "b"])
    expect(picks.has("6.1")).toBe(false)
  })
  it("reads one lesson across classes as forms, closed ones locked", async () => {
    const { client } = memoryClient(seed)
    const out = await givenInClasses(client, "6.1", ["c1", "c2", "c3"])
    expect([...out.keys()]).toEqual(["c1", "c2"])
    expect(out.get("c1")?.locked).toBe(false)
    expect(out.get("c2")?.locked).toBe(true)
    expect(out.get("c2")?.form.studentIds).toEqual(["z"])
  })
  it("says who may work on one lesson, the whole class when it is not given", async () => {
    const { client } = memoryClient(seed)
    expect(await whoMayWork(client, "c1", "6.2")).toMatchObject({ forAll: false, pickedIds: new Set(["a", "b"]) })
    expect(await whoMayWork(client, "c1", "9.9")).toMatchObject({ forAll: true })
  })
})

describe("reads for a student", () => {
  const seed = {
    class_lessons: [lesson({ show_results: true }), lesson({ lesson_id: "6.2", for_all: false }), lesson({ lesson_id: "6.3", due_at: PAST })],
    class_lesson_students: [{ class_id: "c1", lesson_id: "6.2", student_id: "a" }],
  }
  it("tells which lessons a student was picked for", async () => {
    const { client } = memoryClient(seed)
    const { settings, picked } = await lessonsForStudent(client, "c1", "a")
    expect(settings.size).toBe(3)
    expect([...picked]).toEqual(["6.2"])
  })
  it("works out access: open to all, locked unless picked, closed past the deadline, locked when not given", async () => {
    const { client } = memoryClient(seed)
    expect((await lessonForStudent(client, "c1", "6.1", "a")).access).toBe("open")
    expect((await lessonForStudent(client, "c1", "6.2", "a")).access).toBe("open")
    expect((await lessonForStudent(client, "c1", "6.2", "b")).access).toBe("locked")
    expect((await lessonForStudent(client, "c1", "6.3", "a")).access).toBe("closed")
    expect((await lessonForStudent(client, "c1", "9.9", "a")).access).toBe("locked")
  })
  it("finds the lessons whose results show at once", async () => {
    const { client } = memoryClient(seed)
    expect([...await lessonsShowingResults(client, "c1")]).toEqual(["6.1"])
  })
})
