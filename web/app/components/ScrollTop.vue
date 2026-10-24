<script setup lang="ts">
// A round "back to top" button at the bottom right of long pages. It shows once the page has been scrolled down a
// little over half a screen, and rises above a sticky bar (the editor's `.savebar`) while one is on screen, so it never covers
// the buttons on it.
const SHOW_AFTER = 480
const GAP = 16
const route = useRoute()
const visible = ref(false)
const bottom = ref(GAP)
let frame = 0

function update() {
  frame = 0
  visible.value = window.scrollY > SHOW_AFTER
  const barTop = document.querySelector(".savebar")?.getBoundingClientRect().top
  bottom.value = barTop !== undefined && barTop < window.innerHeight ? Math.round(window.innerHeight - barTop + 12) : GAP
}
const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
onMounted(() => {
  window.addEventListener("scroll", schedule, { passive: true })
  window.addEventListener("resize", schedule)
  update()
})
onBeforeUnmount(() => {
  window.removeEventListener("scroll", schedule)
  window.removeEventListener("resize", schedule)
  cancelAnimationFrame(frame)
})
// A new page, or the editor moving to another step, can bring a sticky bar in or out without any scrolling.
watch(() => route.fullPath, () => nextTick(schedule))

function toTop() {
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" })
}
</script>

<template>
  <Transition name="scroll-top">
    <button
      v-show="visible" type="button" class="scroll-top" :style="{ bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))` }"
      :aria-label="$t('common.scrollTop')" :title="$t('common.scrollTop')" @click="toTop"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
  </Transition>
</template>

<style scoped>
.scroll-top { position: fixed; right: 16px; z-index: 20; width: 44px; height: 44px; padding: 0; display: grid; place-items: center;
  border-radius: 50%; border: 1px solid var(--line); background: var(--card); color: var(--accent); cursor: pointer;
  box-shadow: 0 4px 16px var(--shadow); transition: opacity .2s, transform .2s, bottom .2s; }
.scroll-top:hover { background: var(--accent-soft); border-color: var(--accent); }
.scroll-top:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.scroll-top-enter-from, .scroll-top-leave-to { opacity: 0; transform: translateY(8px); }
@media print { .scroll-top { display: none; } }
</style>
