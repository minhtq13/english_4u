<script setup lang="ts">
definePageMeta({ roles: ["student"] })
const { t } = useI18n()
useHead({ title: () => t("join.pageTitle") })

const { profile, myClass, joinClass } = useProfile()
const code = ref("")
const pending = ref(false)
const error = ref("")

async function submit() {
  if (!code.value.trim()) return
  pending.value = true
  error.value = errorText(await joinClass(code.value))
  pending.value = false
  if (!error.value) await navigateTo("/")
}
</script>

<template>
  <div class="join">
    <div v-if="profile?.class_id" class="card">
      <h1>{{ $t("join.already", { name: myClass?.name }) }}</h1>
      <p class="muted">{{ $t("join.askToMove") }}</p>
      <NuxtLink to="/" class="btn primary">{{ $t("join.toRoadmap") }}</NuxtLink>
    </div>
    <form v-else class="card" @submit.prevent="submit">
      <h1>{{ $t("join.title") }}</h1>
      <p class="muted" v-html="$t('join.intro')" />
      <div class="row">
        <input
          id="join-code"
          v-model="code"
          type="text"
          class="code"
          maxlength="12"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          :placeholder="$t('join.code')"
        >
        <button class="btn primary" :disabled="pending || !code.trim()">{{ pending ? $t("join.checking") : $t("join.submit") }}</button>
      </div>
      <p v-if="error" class="fb no">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.join { max-width: 480px; margin: 40px auto 0; }
.join h1 { margin-bottom: 8px; }
.join p { margin: 0 0 14px; }
.code { text-transform: uppercase; letter-spacing: .2em; font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
