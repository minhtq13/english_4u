<script setup lang="ts">
import type { TrendPoint } from "~/utils/scoreTrend"
import { chartCoords } from "~/utils/scoreTrend"

// A student's scores over time as a small line chart (plain SVG), with the same numbers in a table for screen readers.
const props = defineProps<{ points: TrendPoint[] }>()
const W = 560
const H = 180
const coords = computed(() => chartCoords(props.points, W, H, 18))
const line = computed(() => coords.value.map(c => `${c.x},${c.y}`).join(" "))
const y = (percent: number) => 18 + (H - 36) - (percent / 100) * (H - 36)
const summary = computed(() => {
  const last = props.points.at(-1)
  return last ? t("trend.summary", { n: props.points.length, last: last.percent }) : ""
})
const { t } = useI18n()
</script>

<template>
  <figure class="trend">
    <svg v-if="points.length" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="summary" preserveAspectRatio="xMidYMid meet">
      <g class="grid">
        <template v-for="g in [0, 50, 100]" :key="g">
          <line :x1="18" :x2="W - 18" :y1="y(g)" :y2="y(g)" />
          <text :x="0" :y="y(g) + 4" class="axis">{{ g }}</text>
        </template>
      </g>
      <polyline v-if="points.length > 1" :points="line" class="path" />
      <g v-for="(c, i) in coords" :key="i">
        <circle :cx="c.x" :cy="c.y" r="5" class="dot"><title>{{ c.lesson }}: {{ c.percent }}%</title></circle>
      </g>
    </svg>
    <p v-else class="muted small">{{ $t("trend.none") }}</p>
    <table v-if="points.length" class="sr-only">
      <caption>{{ $t("trend.title") }}</caption>
      <thead><tr><th>{{ $t("trend.lesson") }}</th><th>%</th></tr></thead>
      <tbody><tr v-for="(p, i) in points" :key="i"><td>{{ p.lesson }}</td><td>{{ p.percent }}</td></tr></tbody>
    </table>
  </figure>
</template>

<style scoped>
.trend { margin: 0; }
svg { width: 100%; height: auto; max-height: 220px; }
.grid line { stroke: var(--line); stroke-width: 1; }
.axis { fill: var(--muted); font-size: 11px; }
.path { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linejoin: round; }
.dot { fill: var(--card); stroke: var(--accent); stroke-width: 2.5; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
