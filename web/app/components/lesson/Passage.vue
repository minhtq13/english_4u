<script setup lang="ts">
// The reading passage shared by a section's questions (already sanitised by toLesson / draftToLesson).
defineProps<{ html: string }>()
</script>

<template>
  <div class="passage">
    <span class="label">{{ $t("lesson.passage") }}</span>
    <div class="text" v-html="html" />
  </div>
</template>

<style scoped>
.passage { border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 8px; background: var(--card, var(--bg)); padding: 12px 14px; }
.label { display: block; font-size: .78rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.text { line-height: 1.7; }
.text :deep(p) { margin: 0 0 8px; }
</style>
