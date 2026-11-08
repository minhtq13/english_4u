<script setup lang="ts">
const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toasts" aria-live="polite" aria-atomic="false">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind" :role="t.kind === 'error' ? 'alert' : 'status'">
      <Icon :name="t.kind === 'ok' ? 'check' : 'x'" size="16" />
      <span class="text">{{ t.text }}</span>
      <button type="button" class="x" :aria-label="$t('toast.dismiss')" @click="dismiss(t.id)"><Icon name="x" size="14" /></button>
    </div>
  </div>
</template>

<style scoped>
.toasts { position: fixed; left: 12px; right: 12px; bottom: 76px; z-index: 70; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
@media (min-width: 901px) { .toasts { bottom: 20px; left: 244px; } }
.toast { pointer-events: auto; display: flex; align-items: center; gap: 10px; max-width: 520px; padding: 10px 14px; border-radius: 12px;
  background: var(--card); border: 1px solid var(--line); box-shadow: 0 6px 24px rgba(0, 0, 0, .2); }
.toast.ok { border-color: var(--ok); color: var(--ok); }
.toast.error { border-color: var(--bad); color: var(--bad); }
.text { color: var(--text); }
.x { background: none; border: 0; padding: 4px; color: var(--muted); cursor: pointer; min-width: 28px; min-height: 28px; }
</style>
