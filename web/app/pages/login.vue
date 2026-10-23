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

watch(user, (u) => { if (u) navigateTo("/") }, { immediate: true })

// Students (and teachers given an account) sign in with the username and password from their teacher.
async function signInWithPassword() {
  if (!login.value.trim() || !password.value) return
  pending.value = true
  error.value = ""
  const { error: e } = await client.auth.signInWithPassword({ email: loginEmail(login.value), password: password.value })
  pending.value = false
  if (e) {
    error.value = /banned/i.test(e.message) ? t("login.locked") : t("login.wrong")
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
      <div class="top"><p class="eyebrow">{{ $t("login.eyebrow") }}</p><LangSwitch /></div>
      <h1>{{ $t("login.title") }}</h1>
      <p class="muted">{{ $t("login.intro") }}</p>

      <form class="stack" @submit.prevent="signInWithPassword">
        <label class="field">{{ $t("login.username") }}
          <input v-model="login" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" :placeholder="$t('login.usernameExample')">
        </label>
        <label class="field">{{ $t("login.password") }}
          <input v-model="password" type="password" autocomplete="current-password">
        </label>
        <button class="btn primary wide" :disabled="pending || !login.trim() || !password">
          {{ pending ? $t("login.signingIn") : $t("login.signIn") }}
        </button>
      </form>
      <p v-if="error" class="fb no">{{ error }}</p>

      <div class="divider"><span>{{ $t("login.staff") }}</span></div>
      <button class="btn wide" :disabled="pending" @click="signInWithGoogle">{{ $t("login.google") }}</button>
    </div>
  </main>
</template>

<style scoped>
.login { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
.panel { max-width: 420px; width: 100%; display: flex; flex-direction: column; gap: 14px; padding: 28px; }
.panel h1 { margin: 0; }
.panel p { margin: 0; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.eyebrow { font-size: .78rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
.field { display: flex; flex-direction: column; gap: 4px; font-size: .88rem; font-weight: 500; }
.wide { text-align: center; padding: 10px 16px; }
.divider { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: .8rem; }
.divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
</style>
