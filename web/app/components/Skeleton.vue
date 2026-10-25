<script setup lang="ts">
// Placeholder while a page or panel loads: grey bars where the content will be, so it does not jump in.
// Screen readers hear "loading" once (role=status). The shimmer stops when the device asks for reduced motion.
withDefaults(defineProps<{ rows?: number; card?: boolean }>(), { rows: 4, card: true })
</script>

<template>
  <div class="skeleton" :class="{ card }" role="status">
    <span class="sr-only">{{ $t("common.loading") }}</span>
    <div v-for="i in rows" :key="i" class="sk-row" aria-hidden="true">
      <span class="bar title" :style="{ width: `${55 + ((i * 17) % 35)}%` }" />
      <span class="bar line" :style="{ width: `${35 + ((i * 29) % 40)}%` }" />
    </div>
  </div>
</template>

<style scoped>
.skeleton { display: flex; flex-direction: column; }
.sk-row { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; border-top: 1px solid var(--line); }
.sk-row:first-of-type { border-top: 0; padding-top: 0; }
.bar { display: block; border-radius: 6px; background: linear-gradient(90deg, var(--line) 25%, var(--bg) 50%, var(--line) 75%);
  background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; }
.title { height: 14px; }
.line { height: 10px; opacity: .7; }
@keyframes shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
@media (prefers-reduced-motion: reduce) { .bar { animation: none; } }
</style>
