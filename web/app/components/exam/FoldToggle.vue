<script setup lang="ts">
// A small chevron that folds a part of the exam. A span with role=button for the same reason as ExamCollapse: it must
// keep working inside the builder's <fieldset disabled>.
defineProps<{ folded: boolean; label: string }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <span
    class="fold-btn" role="button" tabindex="0" :aria-expanded="!folded" :aria-label="label" :title="label"
    @click="emit('toggle')" @keydown.enter.prevent="emit('toggle')" @keydown.space.prevent="emit('toggle')"
  ><Icon :name="folded ? 'chevronRight' : 'chevronDown'" /></span>
</template>

<style scoped>
.fold-btn { display: inline-grid; place-items: center; width: 28px; height: 28px; flex: none; border-radius: var(--radius-sm); color: var(--muted); cursor: pointer; }
.fold-btn:hover { background: var(--accent-soft); color: var(--accent); }
</style>
