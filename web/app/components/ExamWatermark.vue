<script setup lang="ts">
// The student's name, login and the time, faint and repeated over the page while they work on a lesson, so a photo or
// screenshot of the questions that goes elsewhere shows whose it is. It never takes clicks and is hidden from screen readers.
const { profile } = useProfile()
const text = computed(() => {
  const p = profile.value
  const who = p ? [p.full_name, loginOf(p)].filter(Boolean).join(" · ") : ""
  return `${who} · ${formatDate(new Date().toISOString())}`
})
const escape = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const background = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220"><text x="210" y="110" text-anchor="middle"
    transform="rotate(-30 210 110)" font-family="sans-serif" font-size="15" fill="#7a8291">${escape(text.value)}</text></svg>`
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
})
</script>

<template>
  <div class="watermark" aria-hidden="true" :style="{ backgroundImage: background }" />
</template>

<style scoped>
.watermark { position: fixed; inset: 0; z-index: 40; pointer-events: none; opacity: .16; background-repeat: repeat; }
@media print { .watermark { display: none; } }
</style>
