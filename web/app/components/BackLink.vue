<script setup lang="ts">
defineProps<{ to: string; label: string }>()
</script>

<template>
  <NuxtLink :to="to" class="back-link">
    <Icon name="chevronLeft" size="16" />
    {{ label }}
  </NuxtLink>
</template>

<style scoped>
.back-link { display: inline-flex; align-items: center; gap: var(--space-xs); margin: 0 0 10px -8px; padding: 4px 12px 4px 6px;
  border-radius: var(--radius-full); color: var(--muted); font-size: var(--fs-sm); font-weight: 500; text-decoration: none; }
.back-link:hover { background: var(--accent-soft); color: var(--accent); }
</style>
