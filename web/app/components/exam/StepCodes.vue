<script setup lang="ts">
import type { SheetAt } from "~/utils/examDraft"
import type { ShuffleMode } from "~/utils/examGenerator"

// Step 4 of the exam builder: the exam codes, how the papers are shuffled and where the answer sheet goes.
const codesText = defineModel<string>("codesText", { required: true })
const mode = defineModel<ShuffleMode>("mode", { required: true })
const sheetAt = defineModel<SheetAt>("sheetAt", { required: true })
const codeCount = ref(4)
const codeStart = ref(101)
const fillCodes = () => { codesText.value = codeSeries(codeCount.value, codeStart.value).join(", ") }
</script>

<template>
    <section class="card">
      <h2>4. {{ $t("examPage.codesTitle") }}</h2>
      <div class="row series">
        <label><span>{{ $t("examPage.codeCount") }}</span><input v-model.number="codeCount" type="number" min="1" max="24"></label>
        <label><span>{{ $t("examPage.codeStart") }}</span><input v-model.number="codeStart" type="number" min="0"></label>
        <button class="btn small" @click="fillCodes">{{ $t("examPage.fillCodes") }}</button>
      </div>
      <label class="codes"><span>{{ $t("examPage.codes") }}</span>
        <input v-model="codesText" type="text" placeholder="101, 102, 103, 104">
      </label>

      <fieldset class="modes">
        <legend>{{ $t("examPage.modeTitle") }}</legend>
        <label v-for="m in SHUFFLE_MODES" :key="m" class="mode" :class="{ on: mode === m }">
          <input v-model="mode" type="radio" :value="m">
          <span><b>{{ $t(`exam.mode.${m}.label`) }}</b><small class="muted">{{ $t(`exam.mode.${m}.hint`) }}</small></span>
        </label>
      </fieldset>
      <p class="small muted">{{ $t("examPage.seedNote") }}</p>

      <label class="sheet-at"><span>{{ $t("examPage.sheetAt") }}</span>
        <select v-model="sheetAt">
          <option value="top">{{ $t("examPage.sheetTop") }}</option>
          <option value="bottom">{{ $t("examPage.sheetBottom") }}</option>
          <option value="none">{{ $t("examPage.sheetNone") }}</option>
        </select>
      </label>
    </section>
</template>

<style scoped>
.series, .codes, .sheet-at { }
.series label, .codes, .sheet-at { display: flex; flex-direction: column; gap: var(--space-xs); font-size: .9rem; }
.series label > span, .codes > span, .sheet-at > span { color: var(--muted); }
.series { align-items: flex-end; margin-bottom: 10px; }
.series input { width: 110px; }
.codes { margin-bottom: 14px; }
.modes { border: 0; padding: 0; margin: 0 0 8px; display: grid; gap: 6px; }
.modes legend { padding: 0; margin-bottom: 6px; font-weight: 600; }
.mode { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--radius-md); cursor: pointer; }
.mode.on { border-color: var(--accent); background: var(--accent-soft); }
.mode input { margin-top: 5px; }
.mode span { display: flex; flex-direction: column; }
.sheet-at { max-width: 320px; margin-top: 10px; }
</style>
