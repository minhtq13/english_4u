import { nextTick, onBeforeUnmount, onMounted, type Ref } from "vue"

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
/** Open dialogs, newest last: only the top one answers keys, and the page stays locked until the last one closes. */
const stack: symbol[] = []

/**
 * What every popup needs while it is mounted: Escape closes it, the page behind does not scroll, focus moves onto the
 * dialog (so a screen reader reads its title) and Tab stays inside, and focus goes back to what opened it once it closes.
 * `root` is the element with role="dialog" (give it tabindex="-1").
 */
export function useDialog(root: Ref<HTMLElement | null>, close: () => void) {
  let opener: HTMLElement | null = null
  const me = Symbol("dialog")

  function onKey(e: KeyboardEvent) {
    if (stack.at(-1) !== me) return
    if (e.key === "Escape") {
      close()
      return
    }
    if (e.key !== "Tab" || !root.value) return
    const items = [...root.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null)
    if (!items.length) {
      e.preventDefault()
      return
    }
    const first = items[0]!
    const last = items.at(-1)!
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root.value)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  onMounted(async () => {
    opener = document.activeElement as HTMLElement | null
    document.addEventListener("keydown", onKey)
    if (stack.push(me) === 1) document.body.style.overflow = "hidden"
    await nextTick()
    root.value?.focus({ preventScroll: true })
  })
  onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKey)
    stack.splice(stack.indexOf(me), 1)
    if (!stack.length) document.body.style.overflow = ""
    if (opener?.isConnected) opener.focus({ preventScroll: true })
  })
}
