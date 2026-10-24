import { describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, ref } from "vue"
import { useServerList, type PageResult } from "~/composables/useServerList"

/** A fetch whose answers the test releases by hand, in any order. */
function controlled() {
  const pending: { range: readonly [number, number]; resolve: (r: PageResult<string>) => void }[] = []
  const fetch = (range: readonly [number, number]) => new Promise<PageResult<string>>(resolve => pending.push({ range, resolve }))
  return { fetch, pending }
}
const page = (rows: string[], count = rows.length): PageResult<string> => ({ data: rows, count, error: null })

describe("useServerList", () => {
  it("keeps the latest answer when an older, slower one arrives after it", async () => {
    const { fetch, pending } = controlled()
    const list = effectScope().run(() => useServerList(fetch, { pageSize: 10 }))!
    const first = list.load()
    const second = list.load()
    pending[1]!.resolve(page(["new"]))
    await second
    pending[0]!.resolve(page(["old"]))
    await first
    expect(list.rows).toEqual(["new"])
  })

  it("asks for the page's rows and goes back to the first page when a filter changes", async () => {
    vi.useFakeTimers()
    const { fetch, pending } = controlled()
    const term = ref("")
    const list = effectScope().run(() => useServerList(fetch, { pageSize: 25, filters: [term] }))!
    list.page = 2
    await nextTick()
    expect(pending.at(-1)!.range).toEqual([50, 74])
    term.value = "an"
    await nextTick()
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(list.page).toBe(0)
    expect(pending.at(-1)!.range).toEqual([0, 24])
    vi.useRealTimers()
  })

  it("keeps the rows on screen and reports a failed load", async () => {
    const { fetch, pending } = controlled()
    const list = effectScope().run(() => useServerList(fetch, { pageSize: 10 }))!
    const ok = list.load()
    pending[0]!.resolve(page(["a", "b"], 12))
    await ok
    const bad = list.load()
    pending[1]!.resolve({ data: null, count: null, error: { message: "network down" } })
    await bad
    expect(list.rows).toEqual(["a", "b"])
    expect(list.total).toBe(12)
    expect(list.error).toBe("network down")
  })
})
