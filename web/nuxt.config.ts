export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: true },
  // Everything sits behind a login, so the app renders in the browser only.
  ssr: false,
  modules: ["@nuxtjs/supabase"],
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "vi" },
      title: "Grammar B1→B2",
      meta: [{ name: "description", content: "Lộ trình ngữ pháp tiếng Anh B1 → B2, 30 phút mỗi ngày." }],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
        },
      ],
    },
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
