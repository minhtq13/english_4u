import { CUSTOM_VARS, DEFAULT_ACCENT, customAccent, isAccent, isHex, packAccent, type AccentKey } from "~/utils/accents"

/**
 * The primary colour, remembered for a year and applied as `data-accent` on <html>, which the tokens in main.css read
 * (the default blue sets none). A preset is the cookie "accent" = its key. A colour of the person's own is "accent" =
 * "custom" plus "accentHex" (what they picked) and "accentVars" (the six colours worked out from it, so the inline
 * script in nuxt.config.ts can apply them before the app starts and a chosen colour never flashes blue first).
 */
export function useAccent() {
  const opts = { maxAge: 365 * 24 * 3600, sameSite: "lax" as const }
  const cookie = useCookie<string | null>("accent", opts)
  const hexCookie = useCookie<string | null>("accentHex", opts)
  const varsCookie = useCookie<string | null>("accentVars", opts)
  const isCustom = computed(() => cookie.value === "custom" && isHex(hexCookie.value ?? ""))
  const accent = computed<AccentKey | "custom">(() => (isCustom.value ? "custom" : isAccent(cookie.value) ? cookie.value : DEFAULT_ACCENT))
  const customHex = computed(() => (isCustom.value ? hexCookie.value! : ""))

  function clearCustomVars() {
    for (const v of CUSTOM_VARS) document.documentElement.style.removeProperty(v)
  }
  function setAccent(key: AccentKey) {
    cookie.value = key
    hexCookie.value = null
    varsCookie.value = null
    clearCustomVars()
    if (key === DEFAULT_ACCENT) delete document.documentElement.dataset.accent
    else document.documentElement.dataset.accent = key
  }
  /** `hex` is "#rrggbb"; anything else is ignored. */
  function setCustom(hex: string) {
    const h = hex.trim().toLowerCase()
    if (!isHex(h)) return
    const c = customAccent(h)
    const pack = packAccent(c)
    pack.split(".").forEach((v, i) => document.documentElement.style.setProperty(CUSTOM_VARS[i]!, `#${v}`))
    document.documentElement.dataset.accent = "custom"
    cookie.value = "custom"
    hexCookie.value = h
    varsCookie.value = pack
  }
  return { accent, customHex, setAccent, setCustom }
}
