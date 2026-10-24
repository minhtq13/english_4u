<script setup lang="ts">
// A small "i" next to a label that explains it. The text shows on mouse hover, keyboard focus, or a tap
// (touch screens have no hover); it goes away when the mouse leaves, focus moves, Esc is pressed, the icon
// is tapped again or anything else is pressed. Pointer events are used rather than click: they always
// name the element that was touched.
defineProps<{ text: string }>()

const id = useId()
const root = ref<HTMLElement>()
const hover = ref(false)
const open = ref(false)
const shown = computed(() => hover.value || open.value)

// When it appears, the text is nudged sideways until it is inside the card around it (or the dialog, or the page).
// The window's own width is no use for this: on a phone it grows to fit text that overflows.
const bubble = ref<HTMLElement>()
const shift = ref(0)
watch(shown, async (now) => {
  if (!now) return
  shift.value = 0
  await nextTick()
  const r = bubble.value?.getBoundingClientRect()
  if (!r) return
  const frame = root.value?.closest(".card, [role=dialog], main")?.getBoundingClientRect()
  const lo = (frame?.left ?? 0) + 8
  const hi = (frame?.right ?? document.documentElement.clientWidth) - 8
  shift.value = r.right > hi ? hi - r.right : r.left < lo ? lo - r.left : 0
})

function leave(e: PointerEvent) {
  hover.value = false
  if (e.pointerType === "mouse") open.value = false
}
/** A tap (touch or pen) shows the text, and a second tap hides it. */
function up(e: PointerEvent) {
  if (e.pointerType !== "mouse") open.value = !open.value
}
function outside(e: Event) {
  if (open.value && !root.value?.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener("pointerdown", outside))
onBeforeUnmount(() => document.removeEventListener("pointerdown", outside))
</script>

<template>
  <span ref="root" class="tip">
    <button
      type="button" class="tip-btn" :aria-label="$t('common.moreInfo')" :aria-describedby="id" :aria-expanded="shown"
      @pointerenter="hover = true" @pointerleave="leave" @pointerup="up"
      @focus="open = true" @blur="open = false" @keydown.esc="open = false; hover = false"
    >i</button>
    <span :id="id" ref="bubble" role="tooltip" class="bubble" :class="{ shown }" :style="{ '--shift': `${shift}px` }">{{ text }}</span>
  </span>
</template>

<style scoped>
.tip { position: relative; display: inline-flex; align-items: center; vertical-align: middle; }
.tip-btn { width: 18px; height: 18px; padding: 0; border-radius: 50%; border: 1px solid var(--line); background: var(--bg); color: var(--muted);
  font: italic 700 .72rem/1 Georgia, serif; cursor: help; display: grid; place-items: center; }
.tip-btn:hover, .tip-btn:focus-visible { border-color: var(--accent); color: var(--accent); }
/* To the right of the "i" so it never covers the line below; under it on a narrow screen, where there is no room beside it. */
.bubble { display: none; position: absolute; z-index: 30; left: calc(100% + 8px); top: 50%; transform: translate(var(--shift, 0px), -50%); width: max-content; max-width: min(300px, calc(100vw - 24px));
  padding: 8px 10px; border-radius: 8px; background: var(--text); color: var(--card); box-shadow: 0 4px 16px var(--shadow);
  font-size: .82rem; font-weight: 400; line-height: 1.45; text-align: left; white-space: normal; }
.bubble.shown { display: block; }
@media (max-width: 640px) {
  .bubble { left: -8px; top: calc(100% + 8px); transform: translate(var(--shift, 0px), 0); }
}
</style>
