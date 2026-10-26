import { onBeforeUnmount, ref, watch, type Ref } from "vue"

/** What a student tried while working on a lesson; each has a message under antiCheat.blocked.*. */
export type BlockedAction = "copy" | "paste" | "print" | "menu" | "drag"

/** Ctrl / ⌘ + P (print), S (save the page) and U (view the source): the shortcuts that take the questions away. */
export function isBlockedShortcut(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && ["p", "s", "u"].includes(e.key.toLowerCase())
}

const EVENTS: [string, BlockedAction][] = [
  ["copy", "copy"], ["cut", "copy"], ["paste", "paste"], ["contextmenu", "menu"], ["dragstart", "drag"], ["drop", "drag"],
]

/**
 * While a student works on a lesson (`on`): the questions under `root` cannot be selected, copied, cut, dragged out or
 * opened in the context menu, nothing can be pasted into the answers, print / save / view-source shortcuts do nothing,
 * and the page is not machine-translated (`translate="no"`; the `exam-mode` class on <html> carries the CSS, which also
 * hides the page when printed from the browser menu). This only discourages: a phone camera still works, which is what
 * ExamWatermark is for. `blocked` names the last thing refused, for a short notice (at most every 3 seconds).
 */
export function useAntiCheat(root: Ref<HTMLElement | null>, on: Ref<boolean>) {
  const blocked = ref<BlockedAction | null>(null)
  let shownAt = 0
  let clear: ReturnType<typeof setTimeout> | undefined

  function refuse(e: Event, what: BlockedAction) {
    e.preventDefault()
    if (Date.now() - shownAt < 3000) return
    shownAt = Date.now()
    blocked.value = what
    clearTimeout(clear)
    clear = setTimeout(() => { blocked.value = null }, 3000)
  }
  const handlers = EVENTS.map(([type, what]) => [type, (e: Event) => refuse(e, what)] as const)
  const onKey = (e: KeyboardEvent) => { if (isBlockedShortcut(e)) refuse(e, "print") }

  let bound: HTMLElement | null = null
  function stop() {
    for (const [type, h] of handlers) bound?.removeEventListener(type, h)
    bound = null
    document.removeEventListener("keydown", onKey, true)
    document.documentElement.classList.remove("exam-mode")
    document.documentElement.removeAttribute("translate")
  }
  function start(el: HTMLElement) {
    stop()
    bound = el
    for (const [type, h] of handlers) el.addEventListener(type, h)
    document.addEventListener("keydown", onKey, true)
    document.documentElement.classList.add("exam-mode")
    document.documentElement.setAttribute("translate", "no")
  }

  watch([root, on], ([el, enabled]) => { if (el && enabled) start(el); else stop() }, { immediate: true, flush: "post" })
  onBeforeUnmount(() => {
    stop()
    clearTimeout(clear)
  })
  return { blocked }
}
