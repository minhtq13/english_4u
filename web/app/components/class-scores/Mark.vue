<script setup lang="ts">
import { scoreBand, scoreText } from "~/utils/classScores"

// One 0-10 mark as a small pill, coloured by band like the gradebook's cells. The number is always printed, so the
// colour is never the only signal.
defineProps<{ value: number | null }>()
</script>

<template>
  <span :class="['mark', scoreBand(value)]">{{ scoreText(value) }}</span>
</template>

<style scoped>
.mark { display: inline-block; min-width: 3em; padding: 2px 10px; border-radius: var(--radius-full); text-align: center;
  font-weight: 600; font-variant-numeric: tabular-nums; }
.good { background: var(--ok-soft); color: var(--ok); }
.mid { background: var(--warn-soft); color: var(--warn); }
.low { background: var(--bad-soft); color: var(--bad); }
.none { color: var(--muted); font-weight: 400; }
</style>
