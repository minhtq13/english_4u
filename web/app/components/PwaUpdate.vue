<script setup lang="ts">
// Service-worker status: a new version waits here until the user chooses to reload (never mid-lesson), and a
// notice shows when the device is offline, since every page needs the network for its data.
const { $pwa } = useNuxtApp()
const online = ref(true)
const dismissed = ref(false)
const sync = () => { online.value = navigator.onLine }
onMounted(() => { sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync) })
onBeforeUnmount(() => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync) })
</script>

<template>
  <div class="pwa-bar savebar" role="status" v-if="!online || ($pwa?.needRefresh && !dismissed)">
    <template v-if="!online">
      <Icon name="wifiOff" />
      <span>{{ $t("pwa.offline") }}</span>
    </template>
    <template v-else>
      <span>{{ $t("pwa.text") }}</span>
      <button class="btn primary" @click="$pwa?.updateServiceWorker()">{{ $t("pwa.reload") }}</button>
      <button class="btn" @click="dismissed = true">{{ $t("pwa.later") }}</button>
    </template>
  </div>
</template>

<style scoped>
.pwa-bar { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 60; display: flex; align-items: center;
  gap: 10px; flex-wrap: wrap; padding: 10px 14px; background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; box-shadow: 0 6px 24px rgba(0, 0, 0, .18); max-width: 520px; margin: 0 auto; }
.pwa-bar .btn { min-height: 44px; }
</style>
