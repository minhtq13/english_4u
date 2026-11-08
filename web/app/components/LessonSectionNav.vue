<script setup lang="ts">
import type { SectionProgress } from "~/utils/lessonProgress"

// Sticky strip above the lesson: one chip per section with where the student stands in it, and an overall bar.
// A chip scrolls to its section (cards carry id="sec-<index>").
const props = defineProps<{ progress: SectionProgress[]; answered: number; total: number }>()
const scored = computed(() => props.progress.filter(p => p.scored))
const done = computed(() => scored.value.reduce((n, p) => n + p.answered, 0))
const all = computed(() => scored.value.reduce((n, p) => n + p.total, 0))
const percent = computed(() => (all.value ? Math.round((done.value / all.value) * 100) : 0))
function go(index: number) {
  const el = document.getElementById(`sec-${index}`)
  el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
  el?.focus({ preventScroll: true })
}
</script>

<template>
  <nav class="secnav" :aria-label="$t('sectionNav.label')">
    <div class="bar" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100" :aria-label="$t('sectionNav.progress', { done, total: all })">
      <span :style="{ width: `${percent}%` }" />
    </div>
    <div class="chips">
      <button v-for="(p, i) in progress" :key="p.index" type="button" class="chip" :class="p.state" :title="p.title" @click="go(p.index)">
        <Icon v-if="p.state === 'done'" name="check" size="12" />
        <span>{{ i + 1 }}</span>
        <small>{{ p.answered }}/{{ p.total }}</small>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.secnav { position: sticky; top: var(--sticky-top, 0px); z-index: 15; background: var(--bg); padding: 8px 0 6px; margin: 0 0 8px; border-bottom: 1px solid var(--line); }
.bar { height: 6px; border-radius: 999px; background: var(--line); overflow: hidden; margin-bottom: 8px; }
.bar span { display: block; height: 100%; background: var(--accent); transition: width .2s; }
.chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.chip { flex: none; display: inline-flex; align-items: center; gap: 4px; min-height: 36px; padding: 4px 12px; border-radius: 999px; font-weight: 600; }
.chip small { font-weight: 500; opacity: .8; font-variant-numeric: tabular-nums; }
.chip.done { background: var(--ok-soft); border-color: var(--ok); color: var(--ok); }
.chip.partial { background: var(--warn-soft); border-color: var(--warn); color: var(--warn); }
@media (max-width: 800px) { .secnav { --sticky-top: 56px; } }
@media (prefers-reduced-motion: reduce) { .bar span { transition: none; } }
</style>
