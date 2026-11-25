<script setup lang="ts">
// The popup behind "Tình trạng nộp bài": where each student of a class stands with one lesson. With several classes
// (the lesson page, for a lesson given to more than one) a row of chips switches between them.
const props = defineProps<{
  lessonId: string
  lessonName: string
  /** The classes that have the lesson; the first is shown first. */
  classes: { id: string; name: string }[]
}>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => emit("close"))

const current = ref(props.classes[0]?.id ?? "")

const titleId = useId()
</script>

<template>
  <div class="overlay scroll" @click.self="emit('close')">
    <div ref="dialog" class="dialog wide" role="dialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId">
      <header class="bar">
        <span class="heading">
          <b :id="titleId">{{ $t("classPage.lessonProgress.title") }}</b>
          <span class="small muted">{{ lessonName }}</span>
        </span>
        <button class="btn small" @click="emit('close')">{{ $t("common.close") }} <Icon name="x" /></button>
      </header>
      <div class="body">
        <div v-if="classes.length > 1" class="row classes" role="group" :aria-label="$t('common.class')">
          <button
            v-for="c in classes" :key="c.id" type="button" class="chip" :class="{ on: current === c.id }" :aria-pressed="current === c.id"
            @click="current = c.id"
          >{{ $t("nav.classBadge", { name: c.name }) }}</button>
        </div>
        <p v-else-if="classes[0]" class="small muted">{{ $t("nav.classBadge", { name: classes[0].name }) }}</p>
        <ClassLessonProgress v-if="current" :key="current" :class-id="current" :lesson-id="lessonId" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar .btn { padding: 4px 12px; }
.heading { display: flex; flex-direction: column; min-width: 0; }
.body { display: flex; flex-direction: column; gap: 10px; }
.body p { margin: 0; }
.classes { gap: 6px; }
.chip { padding: 3px 12px; border: 1px solid var(--line); border-radius: var(--radius-full); background: var(--bg); color: var(--text); font: inherit; font-size: var(--fs-sm); cursor: pointer; }
.chip:hover { border-color: var(--accent); }
.chip.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
</style>
