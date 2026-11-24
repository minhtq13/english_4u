// Which blocks of a page are folded (the exam builder's cards and parts). A person's convenience only, so it lives in this
// browser (localStorage) and the page opens as it was left; the state is shared by every block through `useState`.
const KEY = "folds-v1"

export function useFolds() {
  const state = useState<Record<string, boolean>>("folds", () => ({}))
  const loaded = useState("folds-loaded", () => false)
  if (import.meta.client && !loaded.value) {
    loaded.value = true
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}")
      if (raw && typeof raw === "object") state.value = Object.fromEntries(Object.entries(raw).filter(([, v]) => v === true)) as Record<string, boolean>
    } catch { /* storage blocked or unreadable: everything starts open */ }
  }
  function remember() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.value))
    } catch { /* storage full or blocked: the choice just is not kept */ }
  }
  const isFolded = (id: string) => !!state.value[id]
  function toggle(id: string) {
    state.value = { ...state.value, [id]: !state.value[id] }
    remember()
  }
  /** Folds or opens a whole list of blocks at once. */
  function setAll(ids: readonly string[], folded: boolean) {
    const next = { ...state.value }
    for (const id of ids) {
      if (folded) next[id] = true
      else delete next[id]
    }
    state.value = next
    remember()
  }
  return { isFolded, toggle, setAll }
}
