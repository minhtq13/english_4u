<script setup lang="ts">
defineProps<{ items: [string, string][] }>()
const flipped = ref<Record<number, boolean>>({})
const flip = (i: number) => { flipped.value[i] = !flipped.value[i] }
</script>

<template>
  <div class="cards">
    <div
      v-for="([front, back], i) in items"
      :key="i"
      class="flash"
      :class="{ flipped: flipped[i] }"
      role="button"
      tabindex="0"
      @click="flip(i)"
      @keydown.enter.prevent="flip(i)"
      @keydown.space.prevent="flip(i)"
    >
      <div class="inner">
        <div class="face face-front" v-html="front" />
        <div class="face face-back" v-html="back" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.flash { perspective: 800px; height: 160px; cursor: pointer; }
.inner { position: relative; width: 100%; height: 100%; transition: transform .45s; transform-style: preserve-3d; }
.flash.flipped .inner { transform: rotateY(180deg); }
.face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 12px; border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center; text-align: center; padding: 12px; font-size: .95rem; }
.face-front { background: var(--accent-soft); font-weight: 700; font-size: 1.1rem; }
.face-back { background: var(--bg); transform: rotateY(180deg); }
</style>
