<script setup lang="ts">
// The product mark: an open book in the accent colour with the name beside it.
</script>

<template>
  <span class="logo">
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M16 10v13M7 9.5a.8.8 0 0 1 .8-.8h4.4A3.8 3.8 0 0 1 16 12.5a3.8 3.8 0 0 1 3.8-3.8h4.4a.8.8 0 0 1 .8.8v11.4a.8.8 0 0 1-.8.8h-5a2.6 2.6 0 0 0-2.6 2.6 2.6 2.6 0 0 0-2.6-2.6h-5a.8.8 0 0 1-.8-.8z"
        fill="none" stroke="var(--on-accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span class="word">English <b>4U</b></span>
  </span>
</template>

<style scoped>
.logo { white-space: nowrap; display: inline-flex; align-items: center; gap: var(--space-sm); }
.word { font-weight: 600; letter-spacing: -.01em; }
.word b { color: var(--accent); font-weight: 700; }
</style>
