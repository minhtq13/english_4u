// Messages are our own (no user input), some contain <b>…</b> for v-html.
export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: "vi",
  warnHtmlMessage: false,
}))
