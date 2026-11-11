import Sortable from "sortablejs"
import type { Directive } from "vue"

// `v-sortable` on a list: its items can be dragged to a new place with the mouse or a finger. The directive only reports
// where an item was dragged from and to; the page changes its data, and Vue renders the new order. (Sortable moves the
// element itself, so it is put back first: Vue and the DOM must never disagree about where things are.)
// Dragging starts only from `handle` (a grip), so text inside the items stays selectable and nested lists do not clash.

export interface SortableOptions {
  /** CSS selector of the grip that starts a drag. */
  handle: string
  /** CSS selector of the items that can be moved: the direct children of the list, and nothing else sits in the list. */
  item: string
  /** Called with the place the item was dragged from and to (0-based among the items). */
  onMove: (from: number, to: number) => void
  disabled?: boolean
}
type State = { sortable: Sortable; opts: SortableOptions }
type ListEl = HTMLElement & { __sortable?: State }

export const vSortable: Directive<ListEl, SortableOptions> = {
  mounted(el, { value }) {
    const state = { opts: value } as State
    state.sortable = Sortable.create(el, {
      handle: value.handle,
      draggable: value.item,
      animation: 150,
      // The browser's own drag and drop does not work on touch screens; Sortable's pointer version does everywhere.
      forceFallback: true,
      fallbackTolerance: 3,
      ghostClass: "drag-ghost",
      chosenClass: "drag-chosen",
      disabled: !!value.disabled,
      onEnd(evt) {
        const { item, from, oldIndex, newIndex } = evt
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
        from.removeChild(item)
        from.insertBefore(item, from.children[oldIndex] ?? null)
        state.opts.onMove(oldIndex, newIndex)
      },
    })
    el.__sortable = state
  },
  updated(el, { value }) {
    const state = el.__sortable
    if (!state) return
    state.opts = value
    state.sortable.option("disabled", !!value.disabled)
  },
  unmounted(el) {
    el.__sortable?.sortable.destroy()
    delete el.__sortable
  },
}
