import { describe, expect, it } from "vitest"
import { updateGivenLesson } from "~/composables/useClassLessons"
import {
  emptyGiveForm, formChanged, formOf, giveProblem, inDays, settingsOf, toLocalInput, type GiveForm,
} from "~/utils/classLesson"

const form = (init: Partial<GiveForm> = {}): GiveForm => ({ ...emptyGiveForm(), ...init })
const future = (days: number) => toLocalInput(new Date(Date.now() + days * 864e5).toISOString())

describe("deadline helpers", () => {
  it("the quick buttons set 21:00 on a later day", () => {
    const now = Date.parse("2026-10-24T05:00:00Z")
    const v = inDays(3, now)
    expect(v).toMatch(/^\d{4}-\d\d-\d\dT21:00$/)
    expect(Date.parse(v) - now).toBeGreaterThan(2 * 864e5)
    expect(Date.parse(v) - now).toBeLessThan(4 * 864e5)
  })
  it("a stored deadline survives a trip through the form", () => {
    const iso = "2026-10-25T14:30:00.000Z"
    const row = { due_at: iso, for_all: true, show_results: false, shuffle: true }
    expect(settingsOf(formOf(row)).dueAt).toBe(iso)
    expect(settingsOf(formOf({ ...row, due_at: null })).dueAt).toBeNull()
  })
})

describe("settingsOf", () => {
  it("drops the picks while the whole class is chosen, and keeps them otherwise", () => {
    expect(settingsOf(form({ forAll: true, studentIds: ["a"] })).studentIds).toEqual([])
    expect(settingsOf(form({ forAll: false, studentIds: ["a"] })).studentIds).toEqual(["a"])
  })
})

describe("formChanged", () => {
  it("sees a different deadline or option", () => {
    expect(formChanged(form(), form())).toBe(false)
    expect(formChanged(form(), form({ due: future(1) }))).toBe(true)
    expect(formChanged(form(), form({ showResults: true }))).toBe(true)
    expect(formChanged(form(), form({ shuffle: true }))).toBe(true)
    expect(formChanged(form(), form({ forAll: false, studentIds: ["a"] }))).toBe(true)
  })
  it("compares the picks only while chosen students is on", () => {
    expect(formChanged(form({ studentIds: ["a"] }), form({ studentIds: ["b"] }))).toBe(false)
    expect(formChanged(form({ forAll: false, studentIds: ["a", "b"] }), form({ forAll: false, studentIds: ["b", "a"] }))).toBe(false)
    expect(formChanged(form({ forAll: false, studentIds: ["a"] }), form({ forAll: false, studentIds: ["b"] }))).toBe(true)
  })
})

describe("giveProblem", () => {
  it("refuses a new deadline in the past, but not one left as it was", () => {
    const past = toLocalInput(new Date(Date.now() - 864e5).toISOString())
    expect(giveProblem(form({ due: past }))).toBe("dueInPast")
    expect(giveProblem(form({ due: past }), form({ due: past }))).toBeNull()
    expect(giveProblem(form({ due: future(1) }))).toBeNull()
  })
  it("wants at least one student when only chosen students may work", () => {
    expect(giveProblem(form({ forAll: false }))).toBe("setup.pickSome")
    expect(giveProblem(form({ forAll: false, studentIds: ["a"] }))).toBeNull()
  })
})

/** A client that records what is written, and fails the call named in `failOn` ("class_lessons.update"). */
function fakeClient(failOn = "") {
  const calls: { table: string; op: string; args: unknown[]; filters: unknown[][] }[] = []
  const chain = (table: string, op: string, args: unknown[]) => {
    const rec = { table, op, args, filters: [] as unknown[][] }
    calls.push(rec)
    const q = {
      eq: (...a: unknown[]) => { rec.filters.push(["eq", ...a]); return q },
      in: (...a: unknown[]) => { rec.filters.push(["in", ...a]); return q },
      then: (resolve: (r: { error: { message: string } | null }) => void) => resolve({ error: failOn === `${table}.${op}` ? { message: "boom" } : null }),
    }
    return q
  }
  const from = (table: string) => ({
    update: (p: unknown) => chain(table, "update", [p]),
    insert: (r: unknown) => chain(table, "insert", [r]),
    delete: () => chain(table, "delete", []),
  })
  return { calls, client: { from } as never }
}

describe("updateGivenLesson", () => {
  it("writes nothing when nothing changed", async () => {
    const { client, calls } = fakeClient()
    expect(await updateGivenLesson(client, "c1", "6.1", form(), form())).toBeNull()
    expect(calls).toEqual([])
  })
  it("writes only the fields that changed", async () => {
    const { client, calls } = fakeClient()
    const due = future(2)
    await updateGivenLesson(client, "c1", "6.1", form(), form({ due, shuffle: true }))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ table: "class_lessons", op: "update", filters: [["eq", "class_id", "c1"], ["eq", "lesson_id", "6.1"]] })
    expect(calls[0]!.args[0]).toEqual({ due_at: new Date(due).toISOString(), shuffle: true })
  })
  it("clears the deadline", async () => {
    const { client, calls } = fakeClient()
    await updateGivenLesson(client, "c1", "6.1", form({ due: future(1) }), form())
    expect(calls[0]!.args[0]).toEqual({ due_at: null })
  })
  it("adds and removes the chosen students", async () => {
    const { client, calls } = fakeClient()
    await updateGivenLesson(client, "c1", "6.1", form({ forAll: false, studentIds: ["a", "b"] }), form({ forAll: false, studentIds: ["b", "c"] }))
    expect(calls.map(c => `${c.table}.${c.op}`)).toEqual(["class_lesson_students.insert", "class_lesson_students.delete"])
    expect(calls[0]!.args[0]).toEqual([{ class_id: "c1", lesson_id: "6.1", student_id: "c" }])
    expect(calls[1]!.filters).toContainEqual(["in", "student_id", ["a"]])
  })
  it("leaves the picks alone once the whole class may work", async () => {
    const { client, calls } = fakeClient()
    await updateGivenLesson(client, "c1", "6.1", form({ forAll: false, studentIds: ["a"] }), form({ forAll: true, studentIds: ["a", "b"] }))
    expect(calls.map(c => `${c.table}.${c.op}`)).toEqual(["class_lessons.update"])
    expect(calls[0]!.args[0]).toEqual({ for_all: true })
  })
  it("stops at the first failure and reports it", async () => {
    const { client, calls } = fakeClient("class_lessons.update")
    const error = await updateGivenLesson(client, "c1", "6.1", form(), form({ shuffle: true, forAll: false, studentIds: ["a"] }))
    expect(error).not.toBeNull()
    expect(calls).toHaveLength(1)
  })
})
