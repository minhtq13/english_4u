<script setup lang="ts">
// Every signed-in user changes their own password here. Accounts that already have a password confirm
// the current one first (checked by signing in with it); Google-only accounts can set a first password.
const { t } = useI18n()
useHead({ title: () => t("account.pageTitle") })

const client = useSupabaseClient()
const user = useSupabaseUser()
const { profile, myClass, role } = useProfile()

/** The account signs in with a password (username accounts, or a Google account that set one). */
const hasPassword = computed(() => {
  const providers = (user.value?.app_metadata as { providers?: string[] } | undefined)?.providers ?? []
  return providers.includes("email")
})

const current = ref("")
const next = ref("")
const again = ref("")
const pending = ref(false)
const message = ref("")
const error = ref("")

const problem = computed(() => {
  if (next.value && next.value.length < 6) return t("account.tooShort")
  if (again.value && again.value !== next.value) return t("account.mismatch")
  return ""
})
const ready = computed(() => (!hasPassword.value || current.value) && next.value.length >= 6 && next.value === again.value)

async function save() {
  if (!ready.value || !profile.value) return
  pending.value = true
  message.value = error.value = ""
  if (hasPassword.value) {
    const { error: e } = await client.auth.signInWithPassword({
      email: loginEmail(profile.value.username || profile.value.email),
      password: current.value,
    })
    if (e) {
      pending.value = false
      error.value = t("account.wrongCurrent")
      return
    }
  }
  const { error: e } = await client.auth.updateUser({ password: next.value })
  pending.value = false
  if (e) {
    error.value = /different from the old/i.test(e.message)
      ? t("account.sameAsOld")
      : /weak|short|characters/i.test(e.message)
        ? t("account.weak")
        : t("account.failed", { msg: e.message })
    return
  }
  current.value = next.value = again.value = ""
  message.value = hasPassword.value ? t("account.changed") : t("account.set", { email: profile.value.email })
}
</script>

<template>
  <div>
    <h1>{{ $t("account.title") }}</h1>
    <section class="card info">
      <div><span class="muted small">{{ $t("account.name") }}</span><b>{{ profile?.full_name || "-" }}</b></div>
      <div><span class="muted small">{{ $t("account.login") }}</span><b>{{ profile ? loginOf(profile) : "" }}</b></div>
      <div><span class="muted small">{{ $t("account.role") }}</span><b>{{ role ? ROLE_LABEL[role] : "" }}<template v-if="myClass"> · {{ $t("nav.classBadge", { name: myClass.name }) }}</template></b></div>
      <div><span class="muted small">{{ $t("lang.label") }}</span><LangSwitch /></div>
      <div><span class="muted small">{{ $t("theme.label") }}</span><ThemeSwitch /></div>
    </section>

    <section class="card">
      <h2>{{ hasPassword ? $t("account.change") : $t("account.setTitle") }}</h2>
      <p v-if="!hasPassword" class="hint">{{ $t("account.googleHint") }}</p>
      <form class="stack form" @submit.prevent="save">
        <label v-if="hasPassword" class="field">{{ $t("account.current") }}
          <input v-model="current" type="password" autocomplete="current-password">
        </label>
        <label class="field">{{ $t("account.new") }} <span class="muted">{{ $t("account.min6") }}</span>
          <input v-model="next" type="password" autocomplete="new-password">
        </label>
        <label class="field">{{ $t("account.again") }}
          <input v-model="again" type="password" autocomplete="new-password">
        </label>
        <p v-if="problem" class="small bad">{{ problem }}</p>
        <div>
          <button class="btn primary" :disabled="pending || !ready">
            {{ pending ? $t("common.saving") : hasPassword ? $t("account.change") : $t("account.setTitle") }}
          </button>
        </div>
      </form>
      <p v-if="message" class="fb ok">{{ message }}</p>
      <p v-if="error" class="fb no">{{ error }}</p>
      <p v-if="role === 'student'" class="hint forgot">{{ $t("account.forgot") }}</p>
    </section>
  </div>
</template>

<style scoped>
.info { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.info div { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.form { max-width: 360px; }
.field { display: flex; flex-direction: column; gap: 4px; font-size: .88rem; font-weight: 500; }
.field .muted { font-weight: 400; }
.bad { color: var(--bad); margin: 0; }
.forgot { margin: 12px 0 0; }
</style>
