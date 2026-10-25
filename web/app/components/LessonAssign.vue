<script setup lang="ts">
import type { Assignments } from "~/composables/useAssignments"

// One chip per class of the grade: filled = assigned (students of that class see the lesson).
// Taking a lesson back takes a second click, since it disappears from the students' roadmap.
const props = defineProps<{ lessonId: string; assign: Assignments }>()
const armed = ref<string | null>(null)

function click(classId: string) {
  if (props.assign.isAssigned(classId, props.lessonId) && armed.value !== classId) {
    armed.value = classId
    setTimeout(() => { if (armed.value === classId) armed.value = null }, 4000)
    return
  }
  armed.value = null
  props.assign.toggle(classId, props.lessonId)
}
</script>

<template>
  <span class="assign">
    <span v-if="!assign.classes.value.length" class="small muted">{{ $t("assign.noClasses") }}</span>
    <button
      v-for="c in assign.classes.value"
      :key="c.id"
      type="button"
      class="chip-class"
      :class="{ on: assign.isAssigned(c.id, lessonId), armed: armed === c.id }"
      :disabled="assign.busy.value === assign.key(c.id, lessonId)"
      :title="assign.isAssigned(c.id, lessonId) ? $t('assign.givenTitle', { name: c.name }) : $t('assign.giveTitle', { name: c.name })"
      @click.prevent.stop="click(c.id)"
    >
      <template v-if="armed === c.id">{{ $t("assign.takeBack", { name: c.name }) }}</template>
      <template v-else><Icon :name="assign.isAssigned(c.id, lessonId) ? 'check' : 'plus'" /> {{ c.name }}</template>
    </button>
  </span>
</template>

<style scoped>
.assign { display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chip-class { border: 1px dashed var(--line); background: var(--bg); color: var(--muted); border-radius: 999px;
  padding: 2px 10px; font: inherit; font-size: .82rem; cursor: pointer; white-space: nowrap; }
.chip-class:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.chip-class.on { border-style: solid; border-color: var(--ok); background: var(--ok-soft); color: var(--ok); font-weight: 600; }
.chip-class.armed { border-color: var(--bad); background: var(--bad-soft); color: var(--bad); }
.chip-class:disabled { opacity: .6; cursor: default; }
</style>
