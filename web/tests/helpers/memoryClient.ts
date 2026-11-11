import type { Client } from "~/utils/classLessonStore"

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string } | null }

/**
 * An in-memory stand-in for the Supabase client, for the modules that read and write tables. It understands the
 * calls those modules make: from().select / insert / update / delete, chained with eq / in, `.select()` after a
 * delete, `maybeSingle()`, and rpc(). `unique` lists the key columns of a table: inserting the same key twice fails
 * as the database would. `autoId` lists tables whose inserted rows get an `id` when they bring none (a uuid default).
 * Insert and update give the written rows back when `.select()` is chained. `fail` is "table.op" (e.g. "class_lessons.insert") to make that call return an error.
 */
export function memoryClient(
  seed: Record<string, Row[]> = {},
  opts: { unique?: Record<string, string[]>; fail?: string[]; rpc?: Record<string, (args: Row) => unknown>; autoId?: string[] } = {},
) {
  const tables: Record<string, Row[]> = Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.map(r => ({ ...r }))]))
  const rows = (t: string) => (tables[t] ??= [])
  const log: string[] = []

  const from = (table: string) => {
    const query = (op: string, run: (filtered: Row[]) => Result) => {
      const filters: ((r: Row) => boolean)[] = []
      let single = false
      let returning = false
      const q = {
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        in: (c: string, vs: unknown[]) => { filters.push(r => vs.includes(r[c])); return q },
        order: () => q,
        select: () => { returning = true; return q },
        maybeSingle: () => { single = true; return q },
        then: (resolve: (r: Result) => unknown) => {
          log.push(`${table}.${op}`)
          if (opts.fail?.includes(`${table}.${op}`)) return resolve({ data: null, error: { message: "boom" } })
          const res = run(rows(table).filter(r => filters.every(f => f(r))))
          if (op === "select" || returning) res.data = single ? ((res.data as Row[])[0] ?? null) : res.data
          else if (op === "delete" || op === "update" || op === "insert") res.data = null
          return resolve(res)
        },
      }
      return q
    }
    return {
      select: (cols = "*") => query("select", filtered => ({
        data: filtered.map(r => (cols.startsWith("*") ? { ...r } : Object.fromEntries(cols.split(",").map(c => c.trim()).map(c => [c, r[c]])))),
        error: null,
      })),
      insert: (input: Row | Row[]) => query("insert", () => {
        const list = Array.isArray(input) ? input : [input]
        const key = opts.unique?.[table]
        for (const r of list) {
          if (key && rows(table).some(x => key.every(k => x[k] === r[k]))) return { data: null, error: { message: `duplicate key value violates unique constraint on ${table}` } }
        }
        const stored = list.map(r => ({ ...(opts.autoId?.includes(table) && r.id === undefined ? { id: crypto.randomUUID() } : {}), ...r }))
        rows(table).push(...stored)
        return { data: stored.map(r => ({ ...r })), error: null }
      }),
      update: (patch: Row) => query("update", (filtered) => {
        for (const r of filtered) Object.assign(r, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)))
        return { data: filtered.map(r => ({ ...r })), error: null }
      }),
      delete: () => query("delete", (filtered) => {
        tables[table] = rows(table).filter(r => !filtered.includes(r))
        return { data: filtered.map(r => ({ ...r })), error: null }
      }),
    }
  }

  const rpc = async (name: string, args: Row) => ({ data: opts.rpc?.[name]?.(args) ?? null, error: opts.fail?.includes(`rpc.${name}`) ? { message: "boom" } : null })

  return { client: { from, rpc } as unknown as Client, tables, log }
}
