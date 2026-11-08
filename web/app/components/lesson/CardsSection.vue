<script setup lang="ts">
const props = defineProps<{
  items: [string, string][]
  /** With a lesson id and section index, a student can mark each card "remembered" / "not yet" (spaced repetition). */
  lessonId?: string
  section?: number
}>()
const { mark } = useCardReviews()
/** card index → the student's last answer in this visit. */
const answered = ref<Record<number, "ok" | "again" | "failed">>({})
async function rate(i: number, remembered: boolean) {
  answered.value[i] = (await mark(cardId(props.lessonId!, props.section!, i), remembered)) ? (remembered ? "ok" : "again") : "failed"
}
const reviewable = computed(() => !!props.lessonId && props.section !== undefined)
const flipped = ref<Record<number, boolean>>({})
const flip = (i: number) => { flipped.value[i] = !flipped.value[i] }
</script>

<template>
  <div class="cards">
    <div v-for="([front, back], i) in items" :key="i" class="cell">
    <div
      class="flash"
      :class="{ flipped: flipped[i] }"
      role="button"
      tabindex="0"
      @click="flip(i)"
      @keydown.enter.prevent="flip(i)"
      @keydown.space.prevent="flip(i)"
    >
      <div class="inner">
        <div class="face face-front"><span v-html="front" /><SpeakButton class="spk" :text="front" /></div>
        <div class="face face-back" v-html="back" />
      </div>
    </div>
    <div v-if="reviewable" class="rate">
      <template v-if="!answered[i]">
        <button type="button" class="btn small" @click="rate(i, true)">{{ $t("cards.remembered") }}</button>
        <button type="button" class="btn small ghost" @click="rate(i, false)">{{ $t("cards.notYet") }}</button>
      </template>
      <span v-else-if="answered[i] === 'failed'" class="small bad">{{ $t("cards.failed") }}</span>
      <span v-else class="small muted"><Icon name="check" size="14" /> {{ answered[i] === "ok" ? $t("cards.savedOk") : $t("cards.savedAgain") }}</span>
    </div>
    </div>
  </div>
</template>

<style scoped>
.cell { display: flex; flex-direction: column; gap: 6px; }
.rate { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; min-height: 32px; }
.bad { color: var(--bad); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.flash { perspective: 800px; height: 160px; cursor: pointer; }
.inner { position: relative; width: 100%; height: 100%; transition: transform .45s; transform-style: preserve-3d; }
.flash.flipped .inner { transform: rotateY(180deg); }
.face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 12px; border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center; text-align: center; padding: 12px; font-size: .95rem; }
.face-front { background: var(--accent-soft); font-weight: 700; font-size: 1.1rem; }
.spk { position: absolute; top: 6px; right: 6px; }
.face-back { background: var(--bg); transform: rotateY(180deg); }
</style>
