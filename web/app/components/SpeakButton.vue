<script setup lang="ts">
import { canSpeak, speak, speakable } from "~/utils/speech"

// A small speaker button that reads English text aloud with the browser's own voice. Hidden when the browser has none.
const props = defineProps<{ text: string; label?: string }>()
const supported = ref(false)
onMounted(() => { supported.value = canSpeak() })
const readable = computed(() => !!speakable(props.text))
const stop = (e: Event) => e.stopPropagation()
</script>

<template>
  <button
    v-if="supported && readable" type="button" class="speak" :aria-label="label ?? $t('speak.read')" :title="label ?? $t('speak.read')"
    @click="stop($event); speak(text)" @keydown.enter.stop @keydown.space.stop
  >
    <Icon name="volume" size="16" />
  </button>
</template>

<style scoped>
.speak { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; border-radius: 999px; border: 1px solid var(--line); background: var(--card); color: var(--accent); cursor: pointer; padding: 0; }
.speak:hover { border-color: var(--accent); }
</style>
