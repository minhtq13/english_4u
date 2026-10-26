<script setup lang="ts">
import type { SessionEnd } from "~/composables/useSessionGuard"

// Shown over the page when the session has ended (signed in elsewhere, 10 minutes idle, locked): why, and the way
// back to the login page. The session is already gone, so closing it in any way leads to signing in again.
const props = defineProps<{ reason: SessionEnd }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => emit("close"))
const titleId = useId()
const icon = computed(() => (props.reason === "locked" ? "lock" : props.reason === "idle" ? "clock" : "users"))
</script>

<template>
  <div class="overlay">
    <div ref="dialog" class="dialog" role="alertdialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="`${titleId}-body`">
      <span class="mark" :class="reason"><Icon :name="icon" size="22" /></span>
      <h2 :id="titleId">{{ $t(`sessionEnded.title.${reason}`) }}</h2>
      <p :id="`${titleId}-body`" class="muted">{{ $t(`login.ended.${reason}`) }}</p>
      <button class="btn primary" @click="emit('close')">{{ $t("sessionEnded.signIn") }}</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 90; background: rgba(0, 0, 0, .5); display: grid; place-items: center; padding: 16px; }
.dialog { width: 100%; max-width: 420px; background: var(--card); border-radius: 14px; box-shadow: 0 12px 40px rgba(0, 0, 0, .3);
  padding: 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
.dialog h2 { margin: 4px 0 0; }
.dialog p { margin: 0 0 8px; }
.dialog .btn { width: 100%; text-align: center; }
.mark { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: var(--warn-soft); color: var(--warn); }
.mark.locked { background: var(--bad-soft); color: var(--bad); }
</style>
