import { computed, reactive, ref, watch, type Ref } from "vue"

/**
 * Pages a list that is already loaded whole (bounded by one person or one class) in the browser, for the Pager.
 * The list should be the filtered one: when it changes length the page is kept in range.
 */
export function usePaged<T>(list: Ref<T[]>, pageSize = 10) {
  const page = ref(0)
  watch(() => list.value.length, (n) => {
    if (page.value > 0 && page.value * pageSize >= n) page.value = Math.max(0, Math.ceil(n / pageSize) - 1)
  })
  const rows = computed(() => list.value.slice(page.value * pageSize, page.value * pageSize + pageSize))
  return reactive({ page, pageSize, total: computed(() => list.value.length), rows })
}
