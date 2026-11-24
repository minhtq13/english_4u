<script setup lang="ts">
import type { PartKey, ShuffleMode } from "~/utils/examGenerator"

// Step 4 of the exam builder: the exam codes, which parts of the paper are shuffled, and how (the shuffle mode applies to
// the parts that are ticked; an unticked part prints the same on every code).
const props = defineProps<{ parts: PartKey[] }>()
const codesText = defineModel<string>("codesText", { required: true })
const mode = defineModel<ShuffleMode>("mode", { required: true })
const fixedParts = defineModel<PartKey[]>("fixedParts", { required: true })
const codeCount = ref(4)
const codeStart = ref(101)
const fillCodes = () => { codesText.value = codeSeries(codeCount.value, codeStart.value).join(", ") }

const shuffled = (k: PartKey) => !fixedParts.value.includes(k)
const shuffledCount = computed(() => props.parts.filter(shuffled).length)
const noneShuffled = computed(() => props.parts.length > 0 && shuffledCount.value === 0)
function toggle(k: PartKey) {
  fixedParts.value = shuffled(k) ? [...fixedParts.value, k] : fixedParts.value.filter(x => x !== k)
}
/** Tick every part (nothing fixed) or none of them (every part fixed). */
const setAll = (on: boolean) => { fixedParts.value = on ? [] : [...props.parts] }
</script>

<template>
  <ExamCollapse id="exam:codes" :title="`4. ${$t('examPage.codesTitle')}`" :summary="$t('examPage.sum.codes', { codes: codesText || '-', mode: $t(`exam.mode.${mode}.label`) })">
    <div class="row series">
      <label><span>{{ $t("examPage.codeCount") }}</span><input v-model.number="codeCount" type="number" min="1" max="24"></label>
      <label><span>{{ $t("examPage.codeStart") }}</span><input v-model.number="codeStart" type="number" min="0"></label>
      <button class="btn small" @click="fillCodes">{{ $t("examPage.fillCodes") }}</button>
    </div>
    <label class="codes"><span>{{ $t("examPage.codes") }}</span>
      <input v-model="codesText" type="text" placeholder="101, 102, 103, 104">
    </label>

    <div class="group">
      <div class="group-head">
        <b>{{ $t("examPage.shuffleParts") }}</b>
        <span v-if="parts.length > 1" class="row">
          <button class="link small" type="button" @click="setAll(true)">{{ $t("examPage.shuffleAllParts") }}</button>
          <button class="link small" type="button" @click="setAll(false)">{{ $t("examPage.shuffleNoParts") }}</button>
        </span>
      </div>
      <p class="small muted">{{ $t("examPage.shufflePartsHint") }}</p>
      <p v-if="!parts.length" class="small muted">{{ $t("examPage.shuffleNoQuestions") }}</p>
      <div v-else class="picks">
        <label v-for="(k, i) in parts" :key="k" class="pick" :class="{ on: shuffled(k) }">
          <input type="checkbox" :checked="shuffled(k)" @change="toggle(k)">
          <span>{{ $t("examDoc.part", { n: roman(i + 1) }) }} {{ $t(`exam.part.${k}.title`) }}</span>
          <small>{{ shuffled(k) ? $t("examPage.partShuffled") : $t("examPage.partFixed") }}</small>
        </label>
      </div>
      <p v-if="noneShuffled" class="fb key">{{ $t("examPage.noneShuffled") }}</p>
    </div>

    <fieldset class="modes" :disabled="noneShuffled">
      <legend>{{ $t("examPage.modeTitle") }}</legend>
      <label v-for="m in SHUFFLE_MODES" :key="m" class="mode" :class="{ on: mode === m }">
        <input v-model="mode" type="radio" :value="m">
        <span><b>{{ $t(`exam.mode.${m}.label`) }}</b><small class="muted">{{ $t(`exam.mode.${m}.hint`) }}</small></span>
      </label>
    </fieldset>
    <p class="small muted">{{ $t("examPage.seedNote") }}</p>
  </ExamCollapse>
</template>

<style scoped>
.series label, .codes { display: flex; flex-direction: column; gap: var(--space-xs); font-size: .9rem; }
.series label > span, .codes > span { color: var(--muted); }
.series { align-items: flex-end; margin-bottom: 10px; }
.series input { width: 110px; }
.codes { margin-bottom: 14px; }
.group { margin: 0 0 var(--space-lg); }
.group-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.group p { margin: 2px 0 var(--space-sm); }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.picks { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
.pick { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--line); border-radius: var(--radius-md);
  background: var(--card); cursor: pointer; transition: border-color var(--transition-fast), background-color var(--transition-fast); }
.pick:hover { border-color: var(--accent); }
.pick.on { border-color: var(--accent); background: var(--accent-soft); }
.pick small { color: var(--muted); }
.pick.on small { color: var(--accent); }
.group .fb { margin-top: var(--space-sm); }
.modes { border: 0; padding: 0; margin: 0 0 8px; display: grid; gap: 6px; min-width: 0; }
.modes:disabled { opacity: .55; }
.modes legend { padding: 0; margin-bottom: 6px; font-weight: 600; }
.mode { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--radius-md); cursor: pointer; }
.mode.on { border-color: var(--accent); background: var(--accent-soft); }
.mode input { margin-top: 5px; }
.mode span { display: flex; flex-direction: column; }
</style>
