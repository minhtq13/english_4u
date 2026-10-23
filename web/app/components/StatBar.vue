<script setup lang="ts">
// A single-series meter: a thin bar on a track with the value printed beside it in ink.
const props = defineProps<{
  /** 0–100, or null when there is no data yet. */
  value: number | null
  /** Text shown beside the bar; defaults to "<value>%". */
  text?: string
  /** Hover tooltip. */
  title?: string
}>()
const width = computed(() => `${Math.max(0, Math.min(100, props.value ?? 0))}%`)
</script>

<template>
  <span class="meter" :title="title">
    <span class="track"><span v-if="value !== null" class="fill" :style="{ width }" /></span>
    <span class="num">{{ value === null ? "-" : (text ?? `${value}%`) }}</span>
  </span>
</template>

<style scoped>
.meter { display: inline-flex; align-items: center; gap: 8px; width: 100%; min-width: 96px; }
.track { flex: 1; height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; }
.fill { display: block; height: 100%; border-radius: 4px; background: var(--accent); }
.num { flex: none; min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums; font-size: .9rem; color: var(--text); }
</style>
