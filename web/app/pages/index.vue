<script setup lang="ts">
import type { IconName } from "~/components/Icon.vue"

// The public landing page. It is the only page rendered on the server: prerendered to static HTML at build time
// (routeRules in nuxt.config.ts), so search engines and link previews read its text. It must not touch the session
// or browser-only APIs while rendering; someone signed in is sent on to their home by access.global.ts.
// Everything is visible in the prerendered HTML: motion (scroll reveal) is armed only after mount, and not at all
// when the person asked for reduced motion.
definePageMeta({ layout: false })
const { t, locale } = useI18n()

// The public address (runtimeConfig.public.siteUrl); without it the page still works, just without absolute links.
const SITE = String(useRuntimeConfig().public.siteUrl || "").replace(/\/$/, "")

useSeoMeta({
  title: () => t("landing.pageTitle"),
  description: () => t("landing.metaDescription"),
  ogTitle: () => t("landing.pageTitle"),
  ogDescription: () => t("landing.metaDescription"),
  ogType: "website",
  ogSiteName: "English 4U",
  ogLocale: "vi_VN",
  ogImage: SITE ? `${SITE}/og.png` : "/og.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: () => t("landing.pageTitle"),
  twitterCard: "summary_large_image",
})
useHead({ link: SITE ? [{ rel: "canonical", href: `${SITE}/` }] : [] })

// The HTML was made in Vietnamese. When the "lang" cookie asks for English, the text changes during hydration but some
// attributes would not, so once mounted the page renders itself again in the chosen language.
const mounted = ref(false)
const renderKey = computed(() => (mounted.value ? locale.value : "vi"))

// Scroll reveal: blocks with .reveal fade up once when they come into view.
const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
function arm() {
  observer?.disconnect()
  observer = null
  const el = root.value
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return
  el.classList.add("armed")
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); observer?.unobserve(e.target) }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
  el.querySelectorAll(".reveal:not(.in)").forEach(n => observer!.observe(n))
}
onMounted(() => { mounted.value = true; nextTick(arm) })
watch(renderKey, () => nextTick(arm))
onBeforeUnmount(() => observer?.disconnect())

// The example question is real: pick an answer and see the same feedback a lesson gives.
const OPTIONS = ["go", "goes", "going"]
const picked = ref<string | null>(null)
const solved = computed(() => picked.value === "goes")

const year = new Date().getFullYear()
const facts = ["a", "b", "c", "d"] as const
// Grammar terms are the learning content itself, so they stay in English in both languages.
const TOPICS = ["Present simple", "Present continuous", "Past simple", "Comparatives", "Future with will", "Passive voice", "Reported speech",
  "Conditionals", "Relative clauses", "Phrasal verbs", "Wishes", "Modal verbs", "V-ing / to V", "Linking words"]
const studentItems: { key: string; icon: IconName; tone: string; big?: boolean }[] = [
  { key: "grading", icon: "checkCircle", tone: "ok", big: true },
  { key: "streak", icon: "flame", tone: "orange" },
  { key: "badges", icon: "award", tone: "purple" },
  { key: "review", icon: "layers", tone: "accent" },
  { key: "practice", icon: "target", tone: "bad" },
  { key: "phone", icon: "smartphone", tone: "warn", big: true },
]
const teacherItems: { key: string; icon: IconName }[] = [
  { key: "assign", icon: "calendar" },
  { key: "gradebook", icon: "sheet" },
  { key: "exams", icon: "printer" },
  { key: "marks", icon: "graduationCap" },
]
const courses = ["g6", "g7", "g8", "g9", "b1b2"] as const
const trust: { key: string; icon: IconName }[] = [{ key: "one", icon: "lock" }, { key: "two", icon: "eyeOff" }, { key: "three", icon: "shield" }]
const faqs = [1, 2, 3, 4] as const
</script>

<template>
  <div :key="renderKey" ref="root" class="landing">
    <a href="#content" class="skip-link">{{ $t("nav.skipToContent") }}</a>
    <header class="topbar">
      <div class="wrap bar-in">
        <NuxtLink to="/" class="brand" aria-label="English 4U"><BrandLogo /></NuxtLink>
        <nav class="links" :aria-label="$t('landing.nav.menu')">
          <a href="#features">{{ $t("landing.nav.features") }}</a>
          <a href="#teachers">{{ $t("landing.nav.teachers") }}</a>
          <a href="#curriculum">{{ $t("landing.nav.curriculum") }}</a>
          <a href="#faq">{{ $t("landing.nav.faq") }}</a>
        </nav>
        <div class="actions">
          <ClientOnly>
            <span class="prefs"><LangSwitch /><ThemeSwitch class="theme-sw" /></span>
            <template #fallback><span class="prefs" aria-hidden="true" /></template>
          </ClientOnly>
          <NuxtLink to="/login" class="btn primary sm signin"><Icon name="logIn" size="16" />{{ $t("landing.nav.signIn") }}</NuxtLink>
        </div>
      </div>
    </header>

    <main id="content" tabindex="-1">
      <!-- Hero -->
      <section class="hero">
        <div class="deco" aria-hidden="true">
          <span class="shape s-circle" /><span class="shape s-tri" /><span class="shape s-ring" /><span class="shape s-pill" />
          <svg class="shape s-wave" viewBox="0 0 120 24"><path d="M2 12q10-14 20 0t20 0 20 0 20 0 20 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" /></svg>
          <svg class="shape s-star" viewBox="0 0 24 24"><path d="M12 1.5l2.6 7.1 7.4.5-5.8 4.7 1.9 7.2L12 17l-6.1 4 1.9-7.2L2 9.1l7.4-.5z" fill="currentColor" /></svg>
        </div>
        <div class="wrap hero-in">
          <div class="hero-text">
            <p class="pill"><Icon name="sparkles" size="16" />{{ $t("landing.hero.eyebrow") }}</p>
            <h1>{{ $t("landing.hero.titleA") }} <span class="hl">{{ $t("landing.hero.titleB") }}</span></h1>
            <p class="lead">{{ $t("landing.hero.lead") }}</p>
            <div class="cta">
              <NuxtLink to="/login" class="btn primary lg big">{{ $t("landing.hero.cta") }}<Icon name="arrowRight" size="18" /></NuxtLink>
              <a href="#features" class="btn lg big ghost-solid">{{ $t("landing.hero.ctaMore") }}</a>
            </div>
            <ul class="points">
              <li><Icon name="check" size="16" />{{ $t("landing.hero.point1") }}</li>
              <li><Icon name="check" size="16" />{{ $t("landing.hero.point2") }}</li>
              <li><Icon name="check" size="16" />{{ $t("landing.hero.point3") }}</li>
            </ul>
          </div>

          <figure class="demo" :aria-label="$t('landing.demo.label')">
            <div class="demo-card" :class="{ solved }">
              <div class="demo-top">
                <span class="time">{{ $t("landing.demo.unit") }}</span>
                <span class="try">{{ $t("landing.tryIt") }}</span>
              </div>
              <p class="demo-q">{{ $t("landing.demo.question") }}</p>
              <div class="demo-opts" role="group" :aria-label="$t('landing.demoHint')">
                <button
                  v-for="o in OPTIONS" :key="o" type="button" class="opt"
                  :class="{ right: picked === o && o === 'goes', wrong: picked === o && o !== 'goes', dim: solved && o !== 'goes' }"
                  :aria-pressed="picked === o" :disabled="solved" @click="picked = o"
                >{{ o }}<Icon v-if="picked === o && o === 'goes'" name="check" size="16" /><Icon v-else-if="picked === o" name="x" size="16" /></button>
              </div>
              <div class="demo-fb" aria-live="polite">
                <p v-if="solved" class="fb ok"><Icon name="checkCircle" size="16" /> {{ $t("landing.demo.right") }}</p>
                <p v-else-if="picked" class="fb no"><Icon name="alert" size="16" /> {{ $t("landing.demoWrong") }}</p>
                <p v-else class="fb hint-fb">{{ $t("landing.demoHint") }}</p>
              </div>
              <div class="progress">
                <span class="small muted">{{ $t("landing.demo.progress") }}</span>
                <span class="track"><span class="fill" :class="{ more: solved }" /></span>
                <b class="small">{{ solved ? "80%" : "72%" }}</b>
              </div>
              <div v-if="solved" class="demo-next">
                <NuxtLink to="/login" class="btn primary sm">{{ $t("landing.demoCta") }}<Icon name="arrowRight" size="16" /></NuxtLink>
                <button type="button" class="btn ghost sm" @click="picked = null">{{ $t("landing.demoAgain") }}</button>
              </div>
            </div>
            <span class="float streak"><Icon name="flame" size="18" />{{ $t("landing.demo.streak") }}</span>
            <span class="float award"><Icon name="award" size="18" />{{ $t("landing.demo.badge") }}</span>
          </figure>
        </div>
      </section>

      <!-- Marquee of topics -->
      <section class="marquee" :aria-label="$t('landing.marqueeLabel')">
        <div class="track-m" aria-hidden="true">
          <span v-for="(w, i) in [...TOPICS, ...TOPICS]" :key="i" class="chip-m" :class="`c${i % 5}`">{{ w }}</span>
        </div>
        <ul class="sr-only"><li v-for="w in TOPICS" :key="w">{{ w }}</li></ul>
      </section>

      <!-- Facts -->
      <section class="facts-wrap">
        <div class="wrap">
          <ul class="facts reveal">
            <li v-for="f in facts" :key="f">
              <b>{{ $t(`landing.facts.${f}.v`) }}</b>
              <span>{{ $t(`landing.facts.${f}.l`) }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Students: bento -->
      <section id="features" class="section">
        <div class="wrap">
          <header class="sec-head reveal">
            <p class="eyebrow">{{ $t("landing.students.eyebrow") }}</p>
            <h2>{{ $t("landing.students.title") }}</h2>
            <p class="sec-lead">{{ $t("landing.students.lead") }}</p>
          </header>
          <ul class="bento">
            <li v-for="(i, n) in studentItems" :key="i.key" class="tile reveal" :class="[i.tone, { big: i.big }]" :style="{ '--d': `${n * 70}ms` }">
              <span class="ico"><Icon :name="i.icon" size="26" /></span>
              <h3>{{ $t(`landing.students.items.${i.key}.title`) }}</h3>
              <p>{{ $t(`landing.students.items.${i.key}.text`) }}</p>
            </li>
          </ul>
        </div>
      </section>

      <!-- Teachers -->
      <section id="teachers" class="section alt">
        <div class="wrap teach">
          <header class="sec-head left reveal">
            <p class="eyebrow">{{ $t("landing.teachers.eyebrow") }}</p>
            <h2>{{ $t("landing.teachers.title") }}</h2>
            <p class="sec-lead">{{ $t("landing.teachers.lead") }}</p>
          </header>
          <ul class="grid two">
            <li v-for="(i, n) in teacherItems" :key="i.key" class="feature row-f reveal" :style="{ '--d': `${n * 80}ms` }">
              <span class="ico-sq"><Icon :name="i.icon" size="22" /></span>
              <span>
                <h3>{{ $t(`landing.teachers.items.${i.key}.title`) }}</h3>
                <p>{{ $t(`landing.teachers.items.${i.key}.text`) }}</p>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Curriculum -->
      <section id="curriculum" class="section">
        <div class="wrap">
          <header class="sec-head reveal">
            <p class="eyebrow">{{ $t("landing.curriculum.eyebrow") }}</p>
            <h2>{{ $t("landing.curriculum.title") }}</h2>
            <p class="sec-lead">{{ $t("landing.curriculum.lead") }}</p>
          </header>
          <ul class="courses">
            <li v-for="(c, i) in courses" :key="c" class="course reveal" :class="`k${i}`" :style="{ '--d': `${i * 70}ms` }">
              <b class="course-name">{{ $t(`landing.curriculum.${c}.name`) }}</b>
              <p>{{ $t(`landing.curriculum.${c}.topics`) }}</p>
            </li>
          </ul>
        </div>
      </section>

      <!-- How to start -->
      <section class="section alt">
        <div class="wrap">
          <header class="sec-head reveal">
            <p class="eyebrow">{{ $t("landing.steps.eyebrow") }}</p>
            <h2>{{ $t("landing.steps.title") }}</h2>
          </header>
          <ol class="steps">
            <li v-for="n in 3" :key="n" class="reveal" :style="{ '--d': `${n * 90}ms` }">
              <span class="num" aria-hidden="true">{{ n }}</span>
              <h3>{{ $t(`landing.steps.s${n}.title`) }}</h3>
              <p>{{ $t(`landing.steps.s${n}.text`) }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- Trust -->
      <section class="section">
        <div class="wrap">
          <div class="trust reveal">
            <h2>{{ $t("landing.trust.title") }}</h2>
            <ul>
              <li v-for="i in trust" :key="i.key">
                <span class="ico on-dark"><Icon :name="i.icon" size="20" /></span>
                <span><b>{{ $t(`landing.trust.${i.key}.title`) }}</b><small>{{ $t(`landing.trust.${i.key}.text`) }}</small></span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section id="faq" class="section">
        <div class="wrap narrow">
          <header class="sec-head reveal">
            <h2>{{ $t("landing.faq.title") }}</h2>
          </header>
          <div class="faq">
            <details v-for="n in faqs" :key="n" class="reveal" :style="{ '--d': `${n * 60}ms` }">
              <summary>{{ $t(`landing.faq.q${n}`) }}<Icon name="chevronDown" size="18" /></summary>
              <p>{{ $t(`landing.faq.a${n}`) }}</p>
            </details>
          </div>
        </div>
      </section>

      <!-- Final call -->
      <section class="section final-wrap">
        <div class="wrap">
          <div class="final reveal">
            <span class="shape f1" aria-hidden="true" /><span class="shape f2" aria-hidden="true" />
            <h2>{{ $t("landing.final.title") }}</h2>
            <p>{{ $t("landing.final.text") }}</p>
            <NuxtLink to="/login" class="btn lg light">{{ $t("landing.final.cta") }}<Icon name="arrowRight" size="18" /></NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="wrap foot-in">
        <BrandLogo />
        <p class="small muted">{{ $t("landing.footer.tagline") }}</p>
        <p class="small muted">{{ $t("landing.footer.rights", { year }) }}</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing { min-height: 100vh; background: var(--bg); overflow-x: clip; font-family: var(--font); }
#content:focus { outline: none; }
.wrap { max-width: 1160px; margin: 0 auto; padding: 0 var(--space-xl); }
.wrap.narrow { max-width: 760px; }

/* The menu links and the "see the features" button glide to their section; the sticky bar must not cover the heading. */
:global(html:has(.landing)) { scroll-behavior: smooth; }
.landing section[id] { scroll-margin-top: 72px; }
@media (prefers-reduced-motion: reduce) { :global(html:has(.landing)) { scroll-behavior: auto; } }

/* Scroll reveal: only once armed (after mount, motion allowed); otherwise everything is simply there. */
.armed .reveal { opacity: 0; transform: translateY(22px); transition: opacity .6s ease var(--d, 0ms), transform .6s cubic-bezier(.2, .8, .2, 1) var(--d, 0ms); }
.armed .reveal.in { opacity: 1; transform: none; }

/* Top bar */
.topbar { position: sticky; top: 0; z-index: var(--z-nav); background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }
.bar-in { display: flex; align-items: center; gap: var(--space-lg); min-height: 64px; }
.brand { color: var(--text); text-decoration: none; font-size: 1.1rem; }
.links { display: flex; gap: var(--space-xs); margin-left: var(--space-lg); }
.links a { color: var(--muted); text-decoration: none; font-weight: var(--fw-medium); font-size: var(--fs-sm); padding: 6px var(--space-md); border-radius: var(--radius-full); }
.links a:hover { color: var(--text); background: var(--card); }
.actions { display: flex; align-items: center; gap: var(--space-md); margin-left: auto; }
.prefs { display: inline-flex; align-items: center; gap: 6px; min-width: 120px; min-height: 26px; }
.signin { display: inline-flex; align-items: center; gap: 6px; }

/* Hero */
.hero { position: relative; padding: clamp(48px, 8vw, 96px) 0 clamp(64px, 8vw, 104px); overflow: hidden;
  background:
    radial-gradient(900px 480px at 85% -10%, color-mix(in srgb, var(--purple) 16%, transparent), transparent 70%),
    radial-gradient(700px 420px at -5% 90%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%),
    radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--text) 9%, transparent) 1px, transparent 0) 0 0 / 22px 22px; }
.deco { position: absolute; inset: 0; pointer-events: none; }
.shape { position: absolute; display: block; animation: drift 9s ease-in-out infinite; }
.s-circle { width: 56px; height: 56px; border-radius: 50%; background: var(--orange); opacity: .85; top: 44%; left: -14px; }
.s-tri { width: 0; height: 0; border-left: 22px solid transparent; border-right: 22px solid transparent; border-bottom: 38px solid var(--purple); top: 62%; left: 46%; opacity: .75; animation-delay: -3s; transform: rotate(12deg); }
.s-ring { width: 64px; height: 64px; border-radius: 50%; border: 10px solid var(--ok); opacity: .7; bottom: 5%; left: 52%; animation-delay: -5s; }
.s-pill { width: 90px; height: 28px; border-radius: 999px; background: var(--accent); opacity: .22; top: 10%; right: 38%; transform: rotate(-18deg); animation-delay: -2s; }
.s-wave { width: 120px; height: 24px; color: var(--orange); opacity: .8; top: 8%; right: 4%; animation-delay: -6s; }
.s-star { width: 34px; height: 34px; color: var(--warn); opacity: .85; bottom: 12%; right: 8%; animation-delay: -4s; }
@keyframes drift { 50% { transform: translateY(-14px) rotate(6deg); } }
.hero-in { position: relative; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: clamp(32px, 6vw, 72px); align-items: center; }
.pill { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 var(--space-lg); padding: 6px 14px; border-radius: var(--radius-full);
  background: var(--card); border: 1.5px solid var(--edge); color: var(--accent); font-size: var(--fs-sm); font-weight: var(--fw-semibold); box-shadow: 0 3px 0 var(--edge); }
.hero h1 { font-size: var(--fs-display); line-height: 1.02; letter-spacing: -.02em; margin: 0 0 var(--space-lg); font-weight: var(--fw-heavy); }
.hl { position: relative; display: inline-block; color: var(--accent); z-index: 0; }
.hl::after { content: ""; position: absolute; left: 0; right: 0; bottom: .02em; height: .26em; border-radius: 999px; z-index: -1;
  background: color-mix(in srgb, var(--orange) 45%, transparent); transform: rotate(-1deg); }
.lead { font-size: var(--fs-md); color: var(--muted); margin: 0 0 var(--space-xl); max-width: 34em; }
.cta { display: flex; gap: var(--space-md); flex-wrap: wrap; }
.cta .btn { display: inline-flex; align-items: center; gap: var(--space-sm); }
.btn.big { padding: 14px 26px; font-size: var(--fs-md); font-weight: var(--fw-bold); border-radius: var(--radius-lg); }
.btn.primary.big { box-shadow: 0 5px 0 var(--accent-edge), var(--shadow-accent); }
.btn.primary.big:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 7px 0 var(--accent-edge), var(--shadow-accent); }
.btn.primary.big:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 1px 0 var(--accent-edge); }
.ghost-solid { background: var(--card); border: 1.5px solid var(--edge); box-shadow: 0 4px 0 var(--edge); }
.ghost-solid:hover { transform: translateY(-2px); }
.points { list-style: none; display: flex; flex-wrap: wrap; gap: var(--space-sm) var(--space-xl); padding: 0; margin: var(--space-xl) 0 0; color: var(--muted); font-size: var(--fs-sm); }
.points li { display: inline-flex; align-items: center; gap: 6px; }
.points :deep(svg) { color: var(--ok); }

/* The example question */
.demo { position: relative; margin: 0; padding: var(--space-xl) var(--space-lg); }
.demo-card { background: var(--card); border: 2px solid var(--edge); border-radius: var(--radius-xl); padding: var(--space-xl); box-shadow: 0 8px 0 var(--edge), var(--shadow-lg);
  transform: rotate(-1.5deg); transition: transform .3s ease; }
.demo-card:hover, .demo-card:focus-within { transform: rotate(0); }
.demo-card.solved { border-color: var(--ok); box-shadow: 0 8px 0 color-mix(in srgb, var(--ok) 55%, var(--edge)), var(--shadow-lg); }
.demo-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); }
.demo-top .time { margin: 0; }
.try { font-size: var(--fs-xs); font-weight: var(--fw-bold); color: var(--orange); background: var(--orange-soft); padding: 2px 10px; border-radius: var(--radius-full); }
.demo-q { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: var(--fw-bold); line-height: 1.25; margin: var(--space-md) 0; }
.demo-opts { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
.opt { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: var(--fs-md); font-weight: var(--fw-semibold); cursor: pointer; color: var(--text);
  border: 2px solid var(--edge); border-radius: var(--radius-md); padding: 8px 20px; background: var(--card); box-shadow: 0 3px 0 var(--edge);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast); }
.opt:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--accent); box-shadow: 0 5px 0 var(--accent); }
.opt:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 1px 0 var(--edge); }
.opt:focus-visible { outline: none; box-shadow: 0 3px 0 var(--edge), var(--focus-ring); }
.opt.right { border-color: var(--ok); background: var(--ok-soft); color: var(--ok); box-shadow: 0 3px 0 var(--ok); animation: pop .35s ease; }
.opt.wrong { border-color: var(--bad); background: var(--bad-soft); color: var(--bad); box-shadow: 0 3px 0 var(--bad); animation: shake .35s ease; }
.opt.dim { opacity: .55; }
.opt:disabled { cursor: default; }
@keyframes pop { 50% { transform: scale(1.1); } }
@keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.demo-fb { min-height: 48px; margin-top: var(--space-md); }
.demo-fb .fb { display: flex; align-items: center; gap: 6px; margin: 0; }
.hint-fb { background: var(--accent-soft); color: var(--accent); }
.progress { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-sm); margin-top: var(--space-lg); }
.track { height: 10px; border-radius: var(--radius-full); background: var(--line); overflow: hidden; }
.fill { display: block; height: 100%; width: 72%; border-radius: inherit; background: linear-gradient(90deg, var(--accent), var(--purple)); transition: width .8s cubic-bezier(.2, .8, .2, 1); }
.fill.more { width: 80%; }
.demo-next { display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-top: var(--space-lg); }
.demo-next .btn { display: inline-flex; align-items: center; gap: 6px; }
.float { position: absolute; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-full); background: var(--card);
  border: 2px solid var(--edge); box-shadow: 0 3px 0 var(--edge); font-size: var(--fs-sm); font-weight: var(--fw-bold); animation: bob 4s ease-in-out infinite; }
.float.streak { top: 0; right: 0; color: var(--orange); }
.float.award { bottom: 0; left: 0; color: var(--purple); animation-delay: -2s; }
@keyframes bob { 50% { transform: translateY(-6px); } }

/* Marquee */
.marquee { overflow: hidden; border-block: 2px solid var(--edge); background: var(--card); padding: var(--space-md) 0;
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
.track-m { display: flex; width: max-content; gap: var(--space-md); animation: marquee 48s linear infinite; }
.marquee:hover .track-m { animation-play-state: paused; }
.chip-m { white-space: nowrap; font-weight: var(--fw-bold); font-size: var(--fs-sm); padding: 8px 18px; border-radius: var(--radius-full); }
.chip-m.c0 { background: var(--accent-soft); color: var(--accent); }
.chip-m.c1 { background: var(--orange-soft); color: var(--orange); }
.chip-m.c2 { background: var(--purple-soft); color: var(--purple); }
.chip-m.c3 { background: var(--ok-soft); color: var(--ok); }
.chip-m.c4 { background: var(--warn-soft); color: var(--warn); }
@keyframes marquee { to { transform: translateX(calc(-50% - var(--space-md) / 2)); } }

/* Facts */
.facts-wrap { padding: clamp(40px, 6vw, 64px) 0 0; }
.facts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-lg); }
.facts li { display: flex; flex-direction: column; gap: 4px; padding: var(--space-lg) var(--space-xl); border-radius: var(--radius-lg); background: var(--card); border: 2px solid var(--edge); box-shadow: 0 4px 0 var(--edge); }
.facts b { font-family: var(--font-display); font-size: 2.6rem; line-height: 1; font-weight: var(--fw-heavy); color: var(--accent); }
.facts li:nth-child(2) b { color: var(--orange); }
.facts li:nth-child(3) b { color: var(--purple); }
.facts li:nth-child(4) b { color: var(--ok); }
.facts span { color: var(--muted); font-size: var(--fs-sm); line-height: 1.45; }

/* Sections */
.section { padding: clamp(56px, 8vw, 104px) 0; }
.section.alt { background: var(--card); border-block: 2px solid var(--edge); }
.sec-head { text-align: center; max-width: 680px; margin: 0 auto var(--space-2xl); }
.sec-head.left { text-align: left; margin: 0; }
.eyebrow { display: inline-block; margin: 0 0 var(--space-md); padding: 4px 14px; border-radius: var(--radius-full); background: var(--accent-soft); color: var(--accent);
  font-size: var(--fs-xs); font-weight: var(--fw-bold); letter-spacing: .08em; text-transform: uppercase; }
.section h2 { font-size: clamp(2rem, 4.2vw, 2.9rem); line-height: 1.1; letter-spacing: -.01em; margin: 0 0 var(--space-md); font-weight: var(--fw-heavy); }
.sec-lead { color: var(--muted); font-size: var(--fs-md); margin: 0; }

/* Bento */
.bento { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: minmax(210px, auto); gap: var(--space-lg); }
.tile { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; padding: var(--space-xl); border-radius: var(--radius-xl);
  border: 2px solid var(--edge); box-shadow: 0 5px 0 var(--edge); transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
.tile.big { grid-column: span 2; }
@media (hover: hover) { .tile:hover { transform: translateY(-4px) rotate(-.4deg); box-shadow: 0 9px 0 var(--edge); } }
.tile .ico { position: absolute; top: var(--space-lg); left: var(--space-lg); display: grid; place-items: center; width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--card); box-shadow: 0 3px 0 var(--edge); }
.tile::after { content: ""; position: absolute; right: -34px; top: -34px; width: 130px; height: 130px; border-radius: 50%; background: currentColor; opacity: .1; }
.tile.big::after { width: 190px; height: 190px; right: -50px; top: -50px; }
.tile h3 { font-family: var(--font-display); font-size: var(--fs-lg); line-height: 1.15; margin: 0; color: var(--text); }
.tile p { margin: 0; color: color-mix(in srgb, var(--text) 78%, transparent); font-size: var(--fs-sm); max-width: 32em; }
.tile.ok { background: var(--ok-soft); color: var(--ok); }
.tile.orange { background: var(--orange-soft); color: var(--orange); }
.tile.purple { background: var(--purple-soft); color: var(--purple); }
.tile.accent { background: var(--accent-soft); color: var(--accent); }
.tile.bad { background: var(--bad-soft); color: var(--bad); }
.tile.warn { background: var(--warn-soft); color: var(--warn); }

.grid { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-lg); }
.grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feature { background: var(--bg); border: 2px solid var(--edge); border-radius: var(--radius-lg); padding: var(--space-xl); box-shadow: 0 4px 0 var(--edge); transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
@media (hover: hover) { .feature:hover { transform: translateY(-3px); box-shadow: 0 7px 0 var(--edge); } }
.feature h3 { margin: 0 0 6px; font-family: var(--font-display); font-size: var(--fs-md); font-weight: var(--fw-bold); }
.feature p { margin: 0; color: var(--muted); }
.row-f { display: flex; gap: var(--space-lg); align-items: flex-start; }
.ico-sq { display: inline-grid; place-items: center; width: 48px; height: 48px; border-radius: var(--radius-md); flex: none; background: var(--accent); color: var(--on-accent); box-shadow: 0 3px 0 var(--accent-edge); }
.teach { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: clamp(32px, 5vw, 64px); align-items: center; }

/* Courses */
.courses { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-md); }
.course { border-radius: var(--radius-lg); padding: var(--space-xl) var(--space-lg); border: 2px solid var(--edge); box-shadow: 0 5px 0 var(--edge); transition: transform var(--transition-fast); }
@media (hover: hover) { .course:hover { transform: translateY(-4px) rotate(-1deg); } }
.course.k0 { background: var(--accent-soft); } .course.k1 { background: var(--purple-soft); } .course.k2 { background: var(--orange-soft); }
.course.k3 { background: var(--ok-soft); } .course.k4 { background: var(--warn-soft); }
.course-name { display: block; font-family: var(--font-display); font-size: var(--fs-xl); line-height: 1; font-weight: var(--fw-heavy); margin-bottom: var(--space-sm); }
.course p { margin: 0; color: color-mix(in srgb, var(--text) 78%, transparent); font-size: var(--fs-sm); }

/* Steps */
.steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-xl); position: relative; }
.steps li { position: relative; text-align: center; padding: 0 var(--space-md); }
.steps li:not(:last-child)::after { content: ""; position: absolute; top: 28px; left: calc(50% + 44px); right: calc(-50% + 44px); border-top: 4px dotted var(--edge); }
.num { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: var(--accent); color: var(--on-accent);
  font-family: var(--font-display); font-size: var(--fs-xl); font-weight: var(--fw-heavy); box-shadow: 0 4px 0 var(--accent-edge); position: relative; z-index: 1; }
.steps li:nth-child(2) .num { background: var(--orange); color: var(--card); box-shadow: 0 4px 0 color-mix(in srgb, var(--orange) 65%, #000); }
.steps li:nth-child(3) .num { background: var(--ok); color: var(--card); box-shadow: 0 4px 0 color-mix(in srgb, var(--ok) 65%, #000); }
.steps h3 { margin: var(--space-lg) 0 6px; font-family: var(--font-display); font-size: var(--fs-md); }
.steps p { margin: 0; color: var(--muted); }

/* Trust */
.trust { border-radius: var(--radius-xl); padding: clamp(28px, 5vw, 52px); color: #fff; border: 2px solid color-mix(in srgb, var(--accent) 40%, #000); box-shadow: 0 8px 0 color-mix(in srgb, var(--accent) 40%, #000);
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 38%, #0b1430) 0%, color-mix(in srgb, var(--purple) 34%, #120c2e) 100%); }
.trust h2 { color: #fff; text-align: center; }
.trust ul { list-style: none; padding: 0; margin: var(--space-xl) 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-xl); }
.trust li { display: flex; gap: var(--space-md); align-items: flex-start; }
.trust b { display: block; margin-bottom: var(--space-xs); }
.trust small { display: block; color: rgba(255, 255, 255, .82); font-size: var(--fs-sm); line-height: 1.55; }
.ico.on-dark { display: inline-grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(255, 255, 255, .14); color: #fff; }

/* FAQ */
.faq { display: flex; flex-direction: column; gap: var(--space-md); }
.faq details { background: var(--card); border: 2px solid var(--edge); border-radius: var(--radius-lg); padding: 0 var(--space-xl); box-shadow: 0 4px 0 var(--edge); }
.faq details[open] { border-color: var(--accent); box-shadow: 0 4px 0 var(--accent); }
.faq summary { display: flex; justify-content: space-between; align-items: center; gap: var(--space-md); padding: var(--space-lg) 0; cursor: pointer; font-weight: var(--fw-semibold); list-style: none; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary :deep(svg) { flex: none; color: var(--muted); transition: transform var(--transition-fast); }
.faq details[open] summary :deep(svg) { transform: rotate(180deg); color: var(--accent); }
.faq summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: var(--radius-sm); }
.faq details p { margin: 0 0 var(--space-lg); color: var(--muted); }

/* Final call */
.final-wrap { padding-top: 0; }
.final { position: relative; overflow: hidden; text-align: center; border-radius: var(--radius-xl); padding: clamp(40px, 7vw, 76px) var(--space-xl); color: var(--on-accent);
  background: radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--accent) 70%, #fff) 0%, var(--accent) 45%, var(--accent-edge) 100%); box-shadow: 0 8px 0 var(--accent-edge), var(--shadow-accent); }
.final h2 { color: inherit; margin-bottom: var(--space-sm); font-size: clamp(2rem, 4.4vw, 3rem); }
.final p { margin: 0 0 var(--space-xl); opacity: .92; font-size: var(--fs-md); }
.final .shape { opacity: .22; background: #fff; }
.final .f1 { width: 180px; height: 180px; border-radius: 50%; left: -50px; bottom: -70px; }
.final .f2 { width: 90px; height: 90px; border-radius: 22px; right: 8%; top: -30px; transform: rotate(24deg); animation-delay: -4s; }
.btn.light { display: inline-flex; align-items: center; gap: var(--space-sm); background: var(--on-accent); color: var(--accent); border-color: transparent; font-weight: var(--fw-bold);
  padding: 14px 28px; box-shadow: 0 5px 0 rgba(0, 0, 0, .25); position: relative; }
.btn.light:hover { transform: translateY(-2px); filter: none; border-color: transparent; }

.footer { border-top: 2px solid var(--edge); padding: var(--space-2xl) 0; }
.foot-in { display: flex; align-items: center; gap: var(--space-md) var(--space-xl); flex-wrap: wrap; }
.foot-in p { margin: 0; }
.foot-in p:last-child { margin-left: auto; }

@media (max-width: 980px) {
  .links { display: none; }
  .hero-in, .teach { grid-template-columns: 1fr; }
  .demo { max-width: 520px; width: 100%; justify-self: center; }
  .facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bento { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .courses { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .course:last-child { grid-column: 1 / -1; }
  .trust ul { grid-template-columns: 1fr; }
  .steps li:not(:last-child)::after { display: none; }
  .s-pill, .s-wave { display: none; }
}
@media (max-width: 640px) {
  .wrap { padding: 0 var(--space-lg); }
  .bar-in { gap: var(--space-sm); }
  .prefs { min-width: 0; }
  .prefs :deep(.theme-sw) { display: none; }
  .bento, .grid.two, .steps { grid-template-columns: 1fr; }
  .tile.big { grid-column: auto; }
  .bento { grid-auto-rows: minmax(190px, auto); }
  .cta .btn { flex: 1 1 100%; justify-content: center; }
  .demo { padding: var(--space-xl) var(--space-xs); }
  .faq details { padding: 0 var(--space-lg); }
  .foot-in p:last-child { margin-left: 0; }
  .s-circle, .s-ring { opacity: .4; }
  .s-circle { top: 3%; left: auto; right: 6%; }
  .s-ring { left: auto; right: 4%; bottom: 2%; }
  .facts b { font-size: 2.1rem; }
}
@media (prefers-reduced-motion: reduce) {
  .shape, .float, .track-m { animation: none; }
  .track-m { flex-wrap: wrap; width: auto; justify-content: center; padding: 0 var(--space-lg); }
  .track-m .chip-m:nth-child(n + 15) { display: none; }
  .marquee { mask-image: none; -webkit-mask-image: none; }
  .tile:hover, .feature:hover, .course:hover, .demo-card { transform: none; }
  .opt.right, .opt.wrong { animation: none; }
}
</style>
