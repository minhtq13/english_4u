---
paths:
  - "web/app/**"
  - "web/i18n/**"
---

# Every new UI string ships in both languages

The app runs in Vietnamese and English (`LangSwitch`). Anything a user reads that you add or change goes through i18n in the same change, never as literal text in a template or script.

- **Text** is a key in both `web/i18n/locales/vi.json` and `en.json`: `$t()` in templates, `t()` from `useI18n()` in `<script setup>`, `tr()` in plain utils and composables. This covers labels, buttons, placeholders, `title` / `aria-label`, empty states, counts, and success or error messages.
- **Label maps** that must follow the language are built with `labels(prefix, keys)`. Seeded course and phase names go through `localName()`.
- **Database and edge-function messages** stay Vietnamese in SQL, and each new `raise exception` gets an English pattern in `web/app/utils/serverErrors.ts`, shown through `errorText()`.
- **Done means:**
  - `npm test` passes. `tests/i18n.test.ts` fails when a literal key used in `app/` is missing from either locale, or when the locales drift apart.
  - You have opened the new or changed screens with the `lang=en` cookie, and every string switches.
- **Keys built at runtime** (`` t(`x.${k}`) ``, `nav.${key}`) are not seen by the test. Check each value exists in both files yourself.
