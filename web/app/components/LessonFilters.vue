<script setup lang="ts">
import type { LessonFilter, LessonStatusOption } from "~/composables/useLessonFilter"
import type { Phase } from "~/utils/course"

// The filter bar above a lesson list (state lives in useLessonFilter, owned by the page).
defineProps<{ filter: LessonFilter; phases: Phase[]; statuses?: LessonStatusOption[] }>()
</script>

<template>
  <div class="lesson-filters">
    <input v-model="filter.q" type="search" :placeholder="$t('lessonFilter.search')" :aria-label="$t('lessonFilter.search')">
    <select v-model="filter.kind" :aria-label="$t('lessonFilter.allKinds')">
      <option value="">{{ $t("lessonFilter.allKinds") }}</option>
      <option v-for="k in LESSON_KINDS" :key="k" :value="k">{{ LESSON_KIND[k] }}</option>
    </select>
    <select v-if="phases.length > 1" v-model="filter.phase" :aria-label="$t('lessonFilter.allPhases')">
      <option value="">{{ $t("lessonFilter.allPhases") }}</option>
      <option v-for="p in phases" :key="p.id" :value="p.id">{{ localName(p.name) }}</option>
    </select>
    <select v-model="filter.author" :aria-label="$t('lessonFilter.allAuthors')">
      <option value="">{{ $t("lessonFilter.allAuthors") }}</option>
      <option v-for="a in LESSON_AUTHORS" :key="a" :value="a">{{ LESSON_AUTHOR[a] }}</option>
    </select>
    <select v-if="statuses?.length" v-model="filter.status" :aria-label="$t('lessonFilter.allStatuses')">
      <option value="">{{ $t("lessonFilter.allStatuses") }}</option>
      <option v-for="s in statuses" :key="s.key" :value="s.key">{{ s.label }}</option>
    </select>
    <span class="count small muted">{{ $t("lessonFilter.count", { n: filter.total }) }}</span>
    <button v-if="filter.active" type="button" class="link small" @click="filter.reset()">{{ $t("lessonFilter.clear") }}</button>
  </div>
</template>

<style scoped>
.lesson-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 12px; }
.lesson-filters input { flex: 1 1 220px; min-width: 0; }
.lesson-filters select { width: auto; max-width: 100%; }
.count { white-space: nowrap; }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
</style>
