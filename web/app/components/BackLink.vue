<script setup lang="ts">
defineProps<{ to: string; label: string }>()
</script>

<template>
  <NuxtLink :to="to" class="back-link">
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    {{ label }}
  </NuxtLink>
</template>

<style scoped>
.back-link { display: inline-flex; align-items: center; gap: 4px; margin: 0 0 10px -8px; padding: 4px 12px 4px 6px;
  border-radius: 999px; color: var(--muted); font-size: .9rem; font-weight: 500; text-decoration: none; }
.back-link:hover { background: var(--accent-soft); color: var(--accent); }
</style>
