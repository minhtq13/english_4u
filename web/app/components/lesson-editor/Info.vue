<script setup lang="ts">
import type { LessonDraft } from "~/utils/lessonDraft"

// Step 3 of the lesson editor, first card: label, title, description and subtitle. Edits the page's draft in place.
defineProps<{ draft: LessonDraft }>()
</script>

<template>
        <section class="card stack">
          <h2>3. {{ $t("editor.step3") }}</h2>
          <div class="grid3">
            <label><span class="lab">{{ $t("editor.label") }} <span class="muted">{{ $t("editor.labelEx") }}</span></span><input v-model="draft.label" type="text"></label>
            <label class="span2"><span class="lab">{{ $t("editor.lessonTitle") }}</span><input v-model="draft.title" type="text" :placeholder="$t('editor.lessonTitleEx')"></label>
          </div>
          <label><span class="lab">{{ $t("editor.desc") }} <span class="muted">{{ $t("editor.descHelp") }}</span></span><input v-model="draft.description" type="text"></label>
          <label><span class="lab">{{ $t("editor.subtitle") }} <span class="muted">{{ $t("sectionEd.optional") }}</span></span><input v-model="draft.subtitle" type="text" :placeholder="$t('editor.subtitleEx')"></label>
        </section>
</template>

<style scoped>
.stack label { display: flex; flex-direction: column; gap: var(--space-xs); font-size: .88rem; font-weight: 500; }
.stack label .muted { font-weight: 400; }
.stack label .lab { display: block; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-items: end; }
.span2 { grid-column: span 2; }
@media (max-width: 640px) { .grid3 { grid-template-columns: 1fr; } .span2 { grid-column: auto; } }
</style>
