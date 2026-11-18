<script setup lang="ts">
import { ACCENTS, isHex } from "~/utils/accents"

// The primary colour: swatches of ready-made colours, and "your own" through the browser's colour picker (RGB / HEX)
// or a typed hex code. One choice changes the accent of the whole app (useAccent), in light and dark.
const { accent, customHex, setAccent, setCustom } = useAccent()
const typed = ref(customHex.value || "#2071c2")
const bad = computed(() => !!typed.value && !isHex(typed.value.trim()))
watch(customHex, (h) => { if (h) typed.value = h })
const pickerValue = computed(() => (isHex(typed.value.trim()) ? typed.value.trim().toLowerCase() : "#2071c2"))
function onPick(e: Event) {
  const v = (e.target as HTMLInputElement).value
  typed.value = v
  setCustom(v)
}
function onType() {
  const v = typed.value.trim()
  if (isHex(v)) setCustom(v)
}
</script>

<template>
  <div class="accent-picker">
    <div class="accents" role="radiogroup" :aria-label="$t('accent.label')">
      <button
        v-for="a in ACCENTS" :key="a.key" type="button" role="radio" class="swatch" :class="{ on: accent === a.key }"
        :aria-checked="accent === a.key" :style="{ '--sw': a.swatch }" :title="$t(`accent.${a.key}`)" @click="setAccent(a.key)"
      >
        <Icon v-if="accent === a.key" name="check" size="16" />
        <span class="sr-only">{{ $t(`accent.${a.key}`) }}</span>
      </button>
      <label class="swatch own" :class="{ on: accent === 'custom' }" :style="accent === 'custom' ? { '--sw': customHex } : undefined" :title="$t('accent.custom')">
        <input type="color" :value="pickerValue" :aria-label="$t('accent.custom')" @input="onPick">
        <Icon v-if="accent === 'custom'" name="check" size="16" />
        <Icon v-else name="plus" size="16" />
      </label>
    </div>
    <div class="row hex">
      <label class="small muted" for="accent-hex">{{ $t("accent.hex") }}</label>
      <input id="accent-hex" v-model="typed" type="text" class="short" maxlength="7" spellcheck="false" autocomplete="off" placeholder="#2071c2" :aria-invalid="bad" @input="onType">
      <span v-if="bad" class="small bad">{{ $t("accent.badHex") }}</span>
      <span v-else class="small muted">{{ $t("accent.customHint") }}</span>
    </div>
  </div>
</template>

<style scoped>
.accent-picker { display: flex; flex-direction: column; gap: var(--space-md); }
.accents { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
.swatch { position: relative; width: 36px; height: 36px; border-radius: 50%; border: 2px solid transparent; background: var(--sw); color: #fff; display: grid; place-items: center; cursor: pointer;
  padding: 0; transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
.swatch:hover { transform: scale(1.08); }
.swatch.on { box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--sw); }
/* "Your own": a colour wheel until a colour is picked; the real colour input sits invisibly over it. */
.own { --sw: transparent; background: conic-gradient(#e53935, #fdd835, #43a047, #1e88e5, #8e24aa, #e53935); }
.own.on { background: var(--sw); }
.own:not(.on) :deep(svg) { filter: drop-shadow(0 0 2px rgba(0, 0, 0, .6)); }
.own input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; padding: 0; border: 0; }
.own:focus-within { outline: 2px solid var(--accent); outline-offset: 3px; }
.hex { gap: var(--space-sm); align-items: center; }
.hex input { width: 110px; font-variant-numeric: tabular-nums; }
.hex input[aria-invalid="true"] { border-color: var(--bad); }
.bad { color: var(--bad); }
</style>
