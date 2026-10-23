/** The current language and a switch that remembers the choice for a year. */
export function useLang() {
  const { locale, setLocale } = useI18n()
  const cookie = useCookie<string | null>("lang", { maxAge: 365 * 24 * 3600, sameSite: "lax" })
  async function setLang(code: "vi" | "en") {
    cookie.value = code
    await setLocale(code)
  }
  return { locale, setLang }
}
