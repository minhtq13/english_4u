export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: true },
  // Everything sits behind a login, so the app renders in the browser only.
  ssr: false,
  modules: ["@nuxtjs/supabase", "@nuxtjs/i18n", "@vite-pwa/nuxt"],
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "vi" },
      // The theme chosen in ThemeSwitch (useTheme), applied before the app starts so a dark choice never flashes light.
      script: [{ innerHTML: "try{var t=document.cookie.match(/(?:^|; )theme=(light|dark)/);if(t)document.documentElement.dataset.theme=t[1]}catch(e){}" }],
      title: "Ngữ pháp tiếng Anh",
      meta: [
        { name: "theme-color", content: "#f5f6f8", media: "(prefers-color-scheme: light)" },
        { name: "theme-color", content: "#14171d", media: "(prefers-color-scheme: dark)" },
        { name: "description", content: "Ngữ pháp tiếng Anh THCS lớp 6–9 và lộ trình B1 → B2, 30 phút mỗi ngày." },
      ],
      link: [
        { rel: "icon", href: "/favicon_io/favicon.ico", sizes: "any" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon_io/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon_io/favicon-16x16.png" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/favicon_io/apple-touch-icon.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
        },
      ],
    },
  },

  // Feature flag: the "sign in with Google" button on the login page. Off for now; turn it on with
  // NUXT_PUBLIC_ENABLE_GOOGLE_LOGIN=true (or here). It only shows or hides the button: the Google provider itself is
  // switched in Supabase (Authentication → Providers), and `signInWithGoogle` stays in the page.
  runtimeConfig: { public: { enableGoogleLogin: false } },

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

  // Installable app. The service worker precaches only the app shell (built JS/CSS/icons); no data is ever cached, since
  // everything is behind a login and RLS, and lessons must never be served stale or to the wrong account. Supabase
  // requests always go to the network. A new version waits until the user taps "reload" (PwaUpdate), so a student is
  // never reloaded in the middle of a lesson.
  pwa: {
    registerType: "prompt",
    manifest: {
      name: "Ngữ pháp tiếng Anh",
      short_name: "English 4U",
      description: "Ngữ pháp tiếng Anh THCS lớp 6–9 và lộ trình B1 → B2.",
      lang: "vi",
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: "#f5f6f8",
      background_color: "#f5f6f8",
      icons: [
        { src: "/favicon_io/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/favicon_io/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,png,ico,svg,woff2}"],
      globIgnores: ["**/favicon_io/android-chrome-512x512.png"],
      // The SPA shell is served by Nitro, not a static file, so there is no HTML to fall back to: page loads always use the network.
      navigateFallback: null,
      cleanupOutdatedCaches: true,
    },
    client: { installPrompt: true },
    devOptions: { enabled: false },
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
