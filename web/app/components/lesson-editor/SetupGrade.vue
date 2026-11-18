<script setup lang="ts">
// Step 1 of a new lesson: the grade and the term (phase) it belongs to.
defineProps<{ courseChoices: { id: string; name: string }[]; phases: { id: number; name: string }[]; editing: boolean }>()
const courseId = defineModel<string>("courseId", { required: true })
const phaseId = defineModel<number | null>("phaseId", { required: true })
</script>

<template>
        <section class="card stack">
          <h2>1. {{ $t("editor.step1") }}</h2>
          <div class="grid3">
            <label>{{ $t("editor.grade") }}
              <select v-model="courseId" :disabled="editing">
                <option value="">{{ $t("editor.pickGradeOption") }}</option>
                <option v-for="k in courseChoices" :key="k.id" :value="k.id">{{ localName(k.name) }}</option>
              </select>
            </label>
            <label>{{ $t("editor.phase") }}
              <select v-model="phaseId" :disabled="!phases.length">
                <option v-if="!phases.length" :value="null">{{ courseId ? $t("editor.noPhases") : $t("editor.gradeFirst") }}</option>
                <option v-for="p in phases" :key="p.id" :value="p.id">{{ localName(p.name) }}</option>
              </select>
            </label>
          </div>
        </section>
</template>

<style scoped>
.stack label { display: flex; flex-direction: column; gap: var(--space-xs); font-size: .88rem; font-weight: 500; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-items: end; }
@media (max-width: 640px) { .grid3 { grid-template-columns: 1fr; } }
</style>
