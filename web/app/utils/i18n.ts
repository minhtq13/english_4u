import type { Ref } from "vue"

// Translation for plain functions outside components (status labels, dates, "3 hours left").
// Wired to the app's vue-i18n instance by app/plugins/lang.client.ts. Reads go through vue-i18n's reactive
// locale, so templates that use these re-render when the language changes.
type Translate = (key: string, params?: Record<string, unknown>) => string
let translate: Translate = key => key
let locale: Ref<string> | null = null

export function setTranslator(t: Translate, current: Ref<string>) {
  translate = t
  locale = current
}
export const tr: Translate = (key, params) => translate(key, params)
export const currentLang = () => locale?.value ?? "vi"

/** A record whose values are translated on read: `labels("role", ["student"]).student` → tr("role.student"). */
export function labels<K extends string>(prefix: string, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>
  for (const k of keys) Object.defineProperty(out, k, { get: () => tr(`${prefix}.${k}`), enumerable: true })
  return out
}

/** Database names written in Vietnamese ("Lớp 6", "Học kỳ 1") shown in English when English is chosen. */
export function localName(name: string | null | undefined): string {
  const n = name ?? ""
  if (currentLang() !== "en") return n
  return n.replace(/^Lớp (\d+)/, "Grade $1").replace(/^Học kỳ (\d+)/, "Term $1").replace(/^Ngữ pháp nâng cao/, "Advanced grammar")
}
