/** Light, dark, or whatever the device uses. */
export type Theme = "light" | "dark" | "system"

/**
 * The colour theme, remembered for a year in the "theme" cookie. It is applied as `data-theme` on <html>, which the
 * tokens in main.css read; "system" removes it so prefers-color-scheme decides. An inline script in nuxt.config.ts
 * applies the cookie before the app starts, so a dark choice never flashes light.
 */
export function useTheme() {
  const cookie = useCookie<Theme | null>("theme", { maxAge: 365 * 24 * 3600, sameSite: "lax" })
  const theme = computed<Theme>(() => (cookie.value === "light" || cookie.value === "dark" ? cookie.value : "system"))
  function setTheme(t: Theme) {
    cookie.value = t
    if (t === "system") delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
  }
  return { theme, setTheme }
}
