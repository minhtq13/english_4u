import { describe, expect, it } from "vitest"
import { addPoint, createColumn, deleteColumn, loadClassScores, saveAttendance, saveEntries, undoPoint } from "~/utils/classScoreStore"
import { memoryClient } from "./helpers/memoryClient"

const opts = { autoId: ["class_sessions", "participation_points", "score_columns"] }

describe("classScoreStore", () => {
  it("saving attendance twice on one day keeps one session and updates the status", async () => {
    const { client, tables } = memoryClient({}, opts)
    const first = await saveAttendance(client, "c1", "2026-11-20", 1, [{ student_id: "a", status: "present" }, { student_id: "b", status: "absent" }])
    expect(first.error).toBeNull()
    const again = await saveAttendance(client, "c1", "2026-11-20", 1, [{ student_id: "b", status: "excused" }])
    expect(again.session?.id).toBe(first.session?.id)
    expect(tables.class_sessions).toHaveLength(1)
    expect(tables.attendance!.find(r => r.student_id === "b")?.status).toBe("excused")
    expect(tables.attendance).toHaveLength(2)
  })

  it("a point can be undone, and undoing what RLS hides reports it", async () => {
    const { client, tables } = memoryClient({}, opts)
    const { row } = await addPoint(client, "c1", "a", 1, "  good answer ")
    expect(row?.note).toBe("good answer")
    expect(await undoPoint(client, row!.id)).toBeNull()
    expect(tables.participation_points).toHaveLength(0)
    expect(await undoPoint(client, row!.id)).not.toBeNull()
  })

  it("marks are stored, changed and cleared per student", async () => {
    const { client, tables } = memoryClient({}, opts)
    const { row } = await createColumn(client, "c1", { kind: "oral", title: " KT 1 ", held_on: "2026-11-20", term: 1 })
    expect(row?.title).toBe("KT 1")
    await saveEntries(client, row!.id, new Map([["a", 8], ["b", 5]]))
    await saveEntries(client, row!.id, new Map([["a", 9], ["b", null]]))
    expect(tables.score_entries).toEqual([{ column_id: row!.id, student_id: "a", score: 9 }])
    const data = await loadClassScores(client, "c1", 1)
    expect(data.columns.map(c => c.id)).toEqual([row!.id])
    expect(data.entries).toHaveLength(1)
    expect(await deleteColumn(client, row!.id)).toBeNull()
  })

  it("a column needs a title", async () => {
    const { client } = memoryClient({}, opts)
    const { error } = await createColumn(client, "c1", { kind: "homework", title: " ", held_on: "2026-11-20", term: 1 })
    expect(error).toBeTruthy()
  })
})
