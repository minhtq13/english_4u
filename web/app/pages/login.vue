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
    <div class="card panel">
      <div class="top">
        <span class="brand"><span class="mark"><Icon name="book" size="18" /></span>Grammar</span>
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
.login { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px; }
.panel { max-width: 420px; width: 100%; display: flex; flex-direction: column; gap: 18px; padding: 28px; margin: 0; }
.panel h1 { margin: 0; }
.panel p { margin: 0; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.05rem; }
.mark { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); }
.intro { display: flex; flex-direction: column; gap: 6px; }
.eyebrow { font-size: .78rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
.stack { gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: .88rem; font-weight: 500; }
.field input { min-height: 44px; }
.field input[aria-invalid="true"] { border-color: var(--bad); }
.pass { position: relative; display: flex; }
.pass input { padding-right: 46px; }
.eye { position: absolute; right: 2px; top: 2px; bottom: 2px; width: 40px; border: 0; border-radius: 6px; background: none; color: var(--muted);
  display: grid; place-items: center; cursor: pointer; }
.eye:hover { color: var(--text); background: var(--bg); }
.caps { display: inline-flex; align-items: center; gap: 4px; color: var(--warn); font-weight: 500; }
.stack .fb { margin: 0; }
.wide { text-align: center; padding: 12px 16px; min-height: 44px; }
.help { text-align: center; }
.divider { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: .8rem; }
.divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
@media (max-width: 480px) { .panel { padding: 22px 18px; } }
</style>
