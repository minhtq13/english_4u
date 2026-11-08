/**
 * Two-click confirmation for a destructive button: the first click `arm`s it under a key (the button then asks
 * again), the second click within 4 seconds goes through. `arm(key)` is true when this click is the confirming one.
 */
export function useTwoClick(windowMs = 4000) {
  const armed = ref<string | null>(null)
  function arm(key: string) {
    if (armed.value === key) {
      armed.value = null
      return true
    }
    armed.value = key
    setTimeout(() => { if (armed.value === key) armed.value = null }, windowMs)
    return false
  }
  return { armed, arm }
}
