<script setup lang="ts">
import type { DraftInfo } from "~/utils/examDraft"

// Step 1 of the exam builder: the heading of the paper (title, grade, time, school, term). Edits the form's `info` in place.
defineProps<{ info: DraftInfo; courses: { id: string; name: string }[] }>()
</script>

<template>
    <section class="card">
      <h2>1. {{ $t("examPage.infoTitle") }}</h2>
      <div class="grid">
        <label class="wide"><span>{{ $t("examPage.title") }}</span>
          <input v-model="info.title" type="text" :placeholder="$t('examPage.titleHint')">
        </label>
        <label><span>{{ $t("examPage.grade") }}</span>
          <select v-model="info.courseId">
            <option v-for="c in courses" :key="c.id" :value="c.id">{{ localName(c.name) }}</option>
          </select>
        </label>
        <label><span>{{ $t("examPage.minutes") }}</span>
          <input v-model.number="info.minutes" type="number" min="1" max="300">
        </label>
        <label class="wide"><span>{{ $t("examPage.school") }}</span>
          <input v-model="info.school" type="text" :placeholder="$t('examPage.schoolHint')">
        </label>
        <label><span>{{ $t("examPage.department") }}</span>
          <input v-model="info.department" type="text" :placeholder="$t('examPage.departmentHint')">
        </label>
        <label><span>{{ $t("examPage.schoolYear") }}</span>
          <input v-model="info.schoolYear" type="text" placeholder="2026 – 2027">
        </label>
        <label><span>{{ $t("examPage.term") }}</span>
          <input v-model="info.term" type="text" :placeholder="$t('examPage.termHint')">
        </label>
      </div>
    </section>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-md); }
.grid label { display: flex; flex-direction: column; gap: var(--space-xs); font-size: .9rem; }
.grid label > span { color: var(--muted); }
.grid .wide { grid-column: span 2; }
@media (max-width: 720px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 460px) { .grid { grid-template-columns: 1fr; } .grid .wide { grid-column: auto; } }
</style>
