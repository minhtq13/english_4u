export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: true },
  // Everything sits behind a login, so the app renders in the browser only.
  ssr: false,
  modules: ["@nuxtjs/supabase", "@nuxtjs/i18n"],
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "vi" },
      title: "Ngữ pháp tiếng Anh",
      meta: [{ name: "description", content: "Ngữ pháp tiếng Anh THCS lớp 6–9 và lộ trình B1 → B2, 30 phút mỗi ngày." }],
      link: [
        { rel: "icon", href: "/favicon_io/favicon.ico", sizes: "any" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon_io/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon_io/favicon-16x16.png" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/favicon_io/apple-touch-icon.png" },
        { rel: "manifest", href: "/favicon_io/site.webmanifest" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
        },
      ],
    },
  },

  // Vietnamese by default, English on request. The choice lives in the "lang" cookie (app/plugins/lang.client.ts);
  // URLs stay the same in both languages. Messages: i18n/locales/*.json.
  i18n: {
    defaultLocale: "vi",
    strategy: "no_prefix",
    detectBrowserLanguage: false,
    locales: [
      { code: "vi", language: "vi-VN", name: "Tiếng Việt", file: "vi.json" },
      { code: "en", language: "en-US", name: "English", file: "en.json" },
    ],
    vueI18n: "./i18n.config.ts",
    // Some messages hold <b>…</b> for v-html; they are ours, so HTML in messages is allowed.
    compilation: { strictMessage: false, escapeHtml: false },
  },

  vite: {
    plugins: [
      {
        // Vite's dependency scan reads @nuxtjs/i18n's runtime before Nuxt rewrites its `#components` import (a
        // virtual alias), fails on it and skips pre-bundling. Nuxt rewrites the import in every real transform.
        name: "scan-skip-components-alias",
        enforce: "pre",
        resolveId: (id) => (id === "#components" ? { id, external: true } : null),
      },
    ],
  },

  supabase: {
    // URL and key come from SUPABASE_URL / SUPABASE_KEY.
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      saveRedirectToCookie: true,
    },
  },
})
