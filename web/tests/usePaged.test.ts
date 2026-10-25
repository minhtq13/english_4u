import { describe, expect, it } from "vitest"
import { effectScope, nextTick, ref } from "vue"
import { usePaged } from "~/composables/usePaged"

describe("usePaged", () => {
  it("slices pages and stays in range when the list shrinks", async () => {
    const list = ref(Array.from({ length: 25 }, (_, i) => i))
    const scope = effectScope()
    const paged = scope.run(() => usePaged(list, 10))!
    expect(paged.rows).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    paged.page = 2
    expect(paged.rows).toEqual([20, 21, 22, 23, 24])
    list.value = list.value.slice(0, 12)
    await nextTick()
    expect(paged.page).toBe(1)
    expect(paged.rows).toEqual([10, 11])
    list.value = []
    await nextTick()
    expect([paged.page, paged.total, paged.rows]).toEqual([0, 0, []])
    scope.stop()
  })
})
