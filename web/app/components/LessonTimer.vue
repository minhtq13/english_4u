<script setup lang="ts">
// The clock of a timed lesson. Before the first answer it only tells how long there is; after, it counts down and turns
// red in the last minute. The server owns the real clock: this is a display.
const props = defineProps<{ limitMin: number; leftMs: number | null }>()
const text = computed(() => {
  if (props.leftMs === null) return ""
  const s = Math.ceil(props.leftMs / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
})
const urgent = computed(() => props.leftMs !== null && props.leftMs <= 60_000)
// A screen reader hears the time left only at whole minutes and in the last 30 seconds, not every second.
const spoken = computed(() => {
  if (props.leftMs === null) return ""
  const s = Math.ceil(props.leftMs / 1000)
  return s % 60 === 0 || s === 30 || s === 10 ? text.value : ""
})
</script>

<template>
  <div class="timer" :class="{ urgent }" role="timer" :aria-label="$t('timer.label')">
    <Icon name="clock" />
    <template v-if="leftMs === null"><span>{{ $t("timer.willStart", { n: limitMin }) }}</span></template>
    <template v-else>
      <b class="digits" aria-hidden="true">{{ text }}</b>
      <span class="muted small">{{ $t("timer.left", { n: limitMin }) }}</span>
    </template>
    <span class="sr-only" aria-live="polite">{{ spoken ? $t("timer.spoken", { time: spoken }) : "" }}</span>
  </div>
</template>

<style scoped>
.timer { position: sticky; top: var(--sticky-top, 0px); z-index: 16; display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin: 0 0 12px;
  border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
.digits { font-size: 1.25rem; font-variant-numeric: tabular-nums; }
.timer.urgent { border-color: var(--bad); color: var(--bad); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 800px) { .timer { --sticky-top: 56px; } }
</style>
