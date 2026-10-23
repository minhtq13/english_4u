<script setup lang="ts">
// Sets another user's password through the manage-accounts edge function (admins: anyone but themselves;
// teachers: students of their classes). Starts from a random password the admin can overwrite;
// the new password stays visible until dismissed so it can be handed over.
const props = defineProps<{ userId: string; name: string }>()
const emit = defineEmits<{ done: [message: string]; failed: [message: string] }>()
const accounts = useAccounts()
const { t } = useI18n()

const open = ref(false)
const value = ref("")
const saved = ref("")
const busy = ref(false)

function start() {
  value.value = randomPassword()
  saved.value = ""
  open.value = true
}
async function save() {
  if (value.value.length < 6) return
  busy.value = true
  const { error } = await accounts.setPassword(props.userId, value.value)
  busy.value = false
  if (error) {
    emit("failed", error)
    return
  }
  saved.value = value.value
  open.value = false
  emit("done", t("password.setFor", { name: props.name }))
}
</script>

<template>
  <span class="set-pw">
    <template v-if="open">
      <input v-model="value" type="text" class="pw" autocomplete="off" spellcheck="false" :aria-label="$t('password.newFor', { name })" @keydown.enter.prevent="save">
      <button class="btn small primary" :disabled="busy || value.length < 6" :title="value.length < 6 ? $t('password.min6') : ''" @click="save">{{ busy ? "…" : $t("common.save") }}</button>
      <button class="btn small ghost" @click="open = false">{{ $t("common.cancel") }}</button>
    </template>
    <template v-else>
      <button class="btn small ghost" @click="start">{{ $t("password.change") }}</button>
      <span v-if="saved" class="small saved">{{ $t("password.new") }}: <code>{{ saved }}</code> <button class="x" :title="$t('password.hide')" @click="saved = ''">×</button></span>
    </template>
  </span>
</template>

<style scoped>
.set-pw { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.set-pw .btn { padding: 2px 10px; }
.pw { width: 130px; padding: 2px 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.saved code { font-size: .92rem; background: var(--accent-soft); padding: 1px 6px; border-radius: 4px; }
.x { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 0 2px; }
</style>
