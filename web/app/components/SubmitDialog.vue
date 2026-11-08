<script setup lang="ts">
import type { SectionProgress } from "~/utils/lessonProgress"
import { blanksLeft } from "~/utils/lessonProgress"

// Asked before the one and only submit: what is answered in each section, what is still blank, and a way back to it.
const props = defineProps<{ progress: SectionProgress[]; submitting: boolean }>()
const emit = defineEmits<{ close: []; confirm: []; jump: [index: number] }>()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => { if (!props.submitting) emit("close") })
const left = computed(() => blanksLeft(props.progress))
const firstBlank = computed(() => props.progress.find(p => p.scored && p.answered < p.total)?.index ?? null)
const titleId = useId()
</script>

<template>
  <div class="overlay" @click.self="!submitting && emit('close')">
    <div ref="dialog" class="dialog" role="dialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId">
      <header class="bar"><b :id="titleId">{{ $t("submitDialog.title") }}</b></header>
      <div class="body">
        <p v-if="left" class="fb wait"><Icon name="clock" /> {{ $t("submitDialog.blanks", left) }}</p>
        <p v-else class="fb ok"><Icon name="check" /> {{ $t("submitDialog.allDone") }}</p>
        <ul class="sections">
          <li v-for="p in progress" :key="p.index" :class="p.state">
            <span class="name">{{ p.title }}</span>
            <span class="count">{{ p.answered }}/{{ p.total }}</span>
            <Icon :name="p.state === 'done' ? 'check' : 'clock'" size="14" />
          </li>
        </ul>
        <p class="small muted">{{ $t("submitDialog.final") }}</p>
      </div>
      <footer class="actions">
        <button class="btn ghost" :disabled="submitting" @click="emit('close')">{{ $t("submitDialog.back") }}</button>
        <button v-if="firstBlank !== null" class="btn" :disabled="submitting" @click="emit('jump', firstBlank)">{{ $t("submitDialog.toBlank") }}</button>
        <button class="btn primary" :disabled="submitting" @click="emit('confirm')">
          {{ submitting ? $t("lessonPage.submitting") : left ? $t("submitDialog.submitAnyway") : $t("lessonPage.submit") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, .5); display: flex; justify-content: center; align-items: center; padding: 16px; overflow-y: auto; }
.dialog { width: 100%; max-width: 480px; background: var(--card); border-radius: 14px; box-shadow: 0 12px 40px rgba(0, 0, 0, .3); max-height: 100%; overflow: auto; }
.bar { padding: 12px 16px; border-bottom: 1px solid var(--line); }
.body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.body p { margin: 0; }
.fb { padding: 8px 10px; border-radius: 8px; }
.fb.wait { background: var(--warn-soft); color: var(--warn); }
.fb.ok { background: var(--ok-soft); color: var(--ok); }
.sections { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.sections li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-top: 1px solid var(--line); }
.sections li:first-child { border-top: 0; }
.name { flex: 1; }
.count { font-variant-numeric: tabular-nums; font-weight: 600; }
.sections li.done { color: var(--ok); }
.sections li.partial, .sections li.empty { color: var(--warn); }
.actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; padding: 12px 16px; border-top: 1px solid var(--line); }
.actions .btn { min-height: 44px; }
</style>
