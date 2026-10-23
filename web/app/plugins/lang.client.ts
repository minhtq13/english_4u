// Applies the saved language ("lang" cookie, Vietnamese by default) before the first render, keeps
// <html lang> in step, and hands the translator to plain utils (app/utils/i18n.ts).
export default defineNuxtPlugin(async (nuxtApp) => {
  const i18n = nuxtApp.$i18n
  const saved = useCookie<string | null>("lang")
  if (saved.value === "en" || saved.value === "vi") await i18n.setLocale(saved.value)
  setTranslator((key, params) => i18n.t(key, params ?? {}), i18n.locale)
  watch(i18n.locale, (l) => { document.documentElement.lang = l }, { immediate: true })
})
