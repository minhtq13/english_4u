<script setup lang="ts">
// A short confetti fall (CSS only, styles in main.css; hidden for prefers-reduced-motion). Shown for 2.5 s, then gone.
const emit = defineEmits<{ done: [] }>()
const COLORS = ["var(--accent)", "var(--ok)", "var(--purple)", "var(--orange)", "var(--warn)"]
const pieces = Array.from({ length: 36 }, (_, i) => ({
  x: `${Math.round(((i * 37) % 100) + (i % 3))}%`,
  d: `${((i * 53) % 60) / 100}s`,
  c: COLORS[i % COLORS.length],
}))
onMounted(() => setTimeout(() => emit("done"), 2500))
</script>

<template>
  <div class="confetti" aria-hidden="true">
    <i v-for="(p, i) in pieces" :key="i" :style="{ '--x': p.x, '--d': p.d, '--c': p.c }" />
  </div>
</template>
