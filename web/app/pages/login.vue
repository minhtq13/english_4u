<script setup lang="ts">
definePageMeta({ layout: false })
const { t } = useI18n()
useHead({ title: () => t("login.pageTitle") })

const client = useSupabaseClient()
const user = useSupabaseUser()
const pending = ref(false)
const error = ref("")
const login = ref("")
const password = ref("")
const showPassword = ref(false)
const capsLock = ref(false)
const loginInput = ref<HTMLInputElement | null>(null)
const passwordInput = ref<HTMLInputElement | null>(null)
/** The Google button is behind a flag (runtimeConfig.public.enableGoogleLogin, NUXT_PUBLIC_ENABLE_GOOGLE_LOGIN). */
const googleLogin = String(useRuntimeConfig().public.enableGoogleLogin) === "true"
const canSubmit = computed(() => !pending.value && !!login.value.trim() && !!password.value)

onMounted(() => loginInput.value?.focus())
// A message about the last attempt goes away as soon as they change what they typed.
watch([login, password], () => { error.value = "" })
const onKey = (e: KeyboardEvent) => { capsLock.value = e.getModifierState?.("CapsLock") ?? false }

watch(user, (u) => { if (u) navigateTo("/") }, { immediate: true })

// Why the last session ended, when the app signed out by itself (useSessionGuard).
const route = useRoute()
const ENDED = ["replaced", "idle", "locked", "signout", "ended"]
const ended = computed(() => (typeof route.query.ended === "string" && ENDED.includes(route.query.ended) ? route.query.ended : ""))

// Students (and teachers given an account) sign in with the username and password from their teacher.
async function signInWithPassword() {
  if (!login.value.trim() || !password.value) return
  pending.value = true
  error.value = ""
  const { error: e } = await client.auth.signInWithPassword({ email: loginEmail(login.value), password: password.value })
  pending.value = false
  if (e) {
    error.value = /banned/i.test(e.message) ? t("login.locked") : t("login.wrong")
    // Back to the password, selected, so the next try is one keystroke away.
    nextTick(() => passwordInput.value?.select())
  }
}

async function signInWithGoogle() {
  pending.value = true
  error.value = ""
  const { error: e } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/confirm` },
  })
  if (e) {
    error.value = t("login.googleFailed", { msg: e.message })
    pending.value = false
  }
}
</script>

<template>
  <main class="login">
    <aside class="hero" aria-hidden="false">
      <BrandLogo class="hero-logo" />
      <p class="slogan">{{ $t("login.slogan") }}</p>
      <svg class="art" viewBox="0 0 240 150" aria-hidden="true">
        <rect x="30" y="40" width="180" height="96" rx="14" fill="var(--card)" stroke="var(--line)" />
        <path d="M120 54v70M52 56a3 3 0 0 1 3-3h30a30 30 0 0 1 35 29 30 30 0 0 1 35-29h30a3 3 0 0 1 3 3v62a3 3 0 0 1-3 3h-34a20 20 0 0 0-31 14 20 20 0 0 0-31-14H55a3 3 0 0 1-3-3z"
          fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="150" y="8" width="64" height="30" rx="14" fill="var(--purple)" />
        <path d="M168 38l-6 10 14-10z" fill="var(--purple)" />
        <text x="182" y="28" text-anchor="middle" font-size="14" font-weight="700" fill="var(--card)">A+</text>
        <circle cx="34" cy="30" r="9" fill="var(--orange)" />
        <circle cx="52" cy="14" r="5" fill="var(--ok)" />
      </svg>
    </aside>
    <div class="card panel">
      <div class="top">
        <NuxtLink to="/" class="home-link"><Icon name="chevronLeft" size="16" />{{ $t("login.backHome") }}</NuxtLink>
        <span class="prefs"><LangSwitch /><ThemeSwitch /></span>
      </div>
      <div class="intro">
        <p class="eyebrow">{{ $t("login.eyebrow") }}</p>
        <h1>{{ $t("login.title") }}</h1>
        <p class="muted">{{ $t("login.intro") }}</p>
      </div>
      <p v-if="ended && !error" class="fb key" role="status">{{ $t(`login.ended.${ended}`) }}</p>

      <form class="stack" novalidate @submit.prevent="signInWithPassword">
        <label class="field" for="login-user">{{ $t("login.username") }}
          <input
            id="login-user" ref="loginInput" v-model="login" type="text" autocomplete="username" autocapitalize="off" autocorrect="off"
            spellcheck="false" inputmode="text" enterkeyhint="next" :aria-invalid="!!error" :aria-describedby="error ? 'login-error' : undefined"
            :placeholder="$t('login.usernameExample')" @keydown.enter.prevent="passwordInput?.focus()"
          >
        </label>
        <div class="field">
          <label for="login-pass">{{ $t("login.password") }}</label>
          <span class="pass">
            <input
              id="login-pass" ref="passwordInput" v-model="password" :placeholder="$t('login.passwordPlaceholder')" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"
              enterkeyhint="go" :aria-invalid="!!error" :aria-describedby="error ? 'login-error' : undefined" @keydown="onKey" @keyup="onKey" @blur="capsLock = false"
            >
            <button
              type="button" class="eye" :aria-pressed="showPassword" :aria-label="$t(showPassword ? 'login.hidePassword' : 'login.showPassword')"
              :title="$t(showPassword ? 'login.hidePassword' : 'login.showPassword')" @click="showPassword = !showPassword"
            ><Icon :name="showPassword ? 'eyeOff' : 'eye'" size="18" /></button>
          </span>
          <span v-if="capsLock" class="small caps" role="status"><Icon name="lock" size="14" /> {{ $t("login.capsLock") }}</span>
        </div>
        <p v-if="error" id="login-error" class="fb no" role="alert">{{ error }}</p>
        <button class="btn primary wide" :disabled="!canSubmit">
          {{ pending ? $t("login.signingIn") : $t("login.signIn") }}
        </button>
      </form>

      <template v-if="googleLogin">
        <div class="divider"><span>{{ $t("login.staff") }}</span></div>
        <button class="btn wide" :disabled="pending" @click="signInWithGoogle">{{ $t("login.google") }}</button>
      </template>
      <p v-else class="help small muted">{{ $t("login.forgot") }}</p>
    </div>
  </main>
</template>

<style scoped>
.prefs { display: flex; align-items: center; gap: 6px; }
.home-link { display: inline-flex; align-items: center; gap: 2px; margin-left: -6px; padding: 4px 10px 4px 4px; border-radius: var(--radius-full);
  color: var(--muted); font-size: var(--fs-sm); font-weight: var(--fw-medium); text-decoration: none; }
.home-link:hover { background: var(--accent-soft); color: var(--accent); }
.login { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; gap: clamp(32px, 6vw, 88px); padding: var(--space-xl) var(--space-lg);
  background: linear-gradient(135deg, var(--bg) 0%, var(--accent-soft) 55%, var(--purple-soft) 100%); }
.hero { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-xl); width: min(340px, 100%); flex: none; }
.hero-logo { font-size: 1.3rem; }
.slogan { margin: 0; font-size: var(--fs-xl); font-weight: var(--fw-heavy); letter-spacing: -.02em; line-height: 1.35; text-wrap: balance; }
.art { width: min(300px, 100%); height: auto; }
.panel { max-width: 440px; width: 100%; display: flex; flex-direction: column; gap: 18px; padding: 32px; margin: 0; border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); border-color: transparent; }
.panel h1 { margin: 0; }
.panel p { margin: 0; }
.top { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.intro { display: flex; flex-direction: column; gap: 6px; }
.eyebrow { font-size: var(--fs-xs); font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
.stack { gap: var(--space-lg); }
.field { display: flex; flex-direction: column; gap: 6px; font-size: var(--fs-sm); font-weight: 500; }
.field input { min-height: 44px; }
.field input[aria-invalid="true"] { border-color: var(--bad); }
.pass { position: relative; display: flex; }
.pass input { padding-right: 46px; }
.eye { position: absolute; right: 2px; top: 2px; bottom: 2px; width: 40px; border: 0; border-radius: var(--radius-sm); background: none; color: var(--muted);
  display: grid; place-items: center; cursor: pointer; }
.eye:hover { color: var(--text); background: var(--bg); }
.caps { display: inline-flex; align-items: center; gap: var(--space-xs); color: var(--warn); font-weight: 500; }
.stack .fb { margin: 0; }
.wide { text-align: center; padding: 12px 16px; min-height: 44px; }
.help { text-align: center; }
.divider { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: var(--fs-xs); }
.divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
@media (max-width: 800px) {
  .login { flex-direction: column; justify-content: flex-start; gap: var(--space-lg); padding: var(--space-lg) var(--space-md); }
  .hero { width: 100%; max-width: 420px; flex-direction: row; flex-wrap: wrap; align-items: center; gap: var(--space-sm) var(--space-md); }
  .slogan { font-size: 1rem; flex-basis: 100%; }
  .art { display: none; }
}
@media (max-width: 480px) { .panel { padding: 22px 18px; } }
</style>
