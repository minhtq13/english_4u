import { onScopeDispose, reactive, ref, shallowRef, watch, type WatchSource } from "vue"
import { pageRange } from "~/utils/course"
import { errorText } from "~/utils/serverErrors"

/** One page as PostgREST returns it with `{ count: "exact" }`. */
export interface PageResult<T> { data: T[] | null; count: number | null; error: { message: string } | null }

/**
 * A list that grows with users or time, read one page at a time from the database (the Pager drives `page`).
 * `fetch` builds the query for the inclusive row range it is given, with the page's filters applied in it.
 * When a filter in `filters` changes, the list waits `debounce` ms and goes back to the first page; only the
 * answer to the latest request is shown, so a slower older one never overwrites a newer one.
 * A failed load keeps the rows on screen and sets `error` (in the current language).
 */
export function useServerList<T>(
  fetch: (range: readonly [number, number]) => PromiseLike<PageResult<T>>,
  opts: { pageSize: number; filters?: WatchSource[]; debounce?: number },
) {
  const rows = shallowRef<T[]>([])
  const total = ref(0)
  const page = ref(0)
  const error = ref("")
  const loading = ref(false)

  let latest = 0
  async function load() {
    const mine = ++latest
    loading.value = true
    const r = await fetch(pageRange(page.value, opts.pageSize))
    if (mine !== latest) return
    loading.value = false
    error.value = r.error ? errorText(r.error.message) : ""
    if (r.error) return
    rows.value = r.data ?? []
    total.value = r.count ?? 0
  }

  /** Loads the first page again (filters changed, or rows were added or removed). */
  async function reload() {
    if (page.value === 0) await load()
    else page.value = 0 // the page watcher loads it
  }

  watch(page, load)
  let timer: ReturnType<typeof setTimeout> | undefined
  if (opts.filters?.length) {
    watch(opts.filters, () => {
      clearTimeout(timer)
      timer = setTimeout(reload, opts.debounce ?? 300)
    })
  }
  onScopeDispose(() => clearTimeout(timer))

  return reactive({ rows, total, page, pageSize: opts.pageSize, error, loading, load, reload })
}
