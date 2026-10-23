<script setup lang="ts">
import type { DraftSection, PresetKey, SectionType } from "~/utils/lessonDraft"

// "Add a section" menu of the lesson editor: plain section types and ready-made exam formats ("preset:<key>").
const emit = defineEmits<{ add: [section: DraftSection] }>()
const choice = ref<string>("mcq")

function add() {
  const v = choice.value
  emit("add", v.startsWith("preset:")
    ? SECTION_PRESETS[v.slice(7) as PresetKey].make()
    : emptySection(v as SectionType, { title: SECTION_TYPES[v as SectionType].label }))
}
</script>

<template>
  <div class="row add">
    <select v-model="choice" :aria-label="$t('editor.sectionTypes')">
      <optgroup :label="$t('editor.sectionTypes')">
        <option v-for="(t, key) in SECTION_TYPES" :key="key" :value="key">{{ t.label }}</option>
      </optgroup>
      <optgroup :label="$t('editor.presets')">
        <option v-for="(p, key) in SECTION_PRESETS" :key="key" :value="`preset:${key}`">{{ p.label }}</option>
      </optgroup>
    </select>
    <button class="btn" @click="add">{{ $t("editor.addSection") }}</button>
  </div>
</template>

<style scoped>
.add select { width: auto; max-width: 100%; }
</style>
