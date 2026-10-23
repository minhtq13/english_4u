<script setup lang="ts">
import type { Answer, Response, ScoredSection } from "~/utils/course"

// The questions of one auto-graded section, in whichever form the section uses.
// A section with a reading passage shows it beside the questions (above them on narrow screens).
defineProps<{
  section: ScoredSection
  responses: Record<string, Response>
  results: Record<string, Answer> | null
  locked?: boolean
  showKey?: boolean
}>()
const emit = defineEmits<{ respond: [qid: string, response: Response | null] }>()
const respond = (qid: string, r: Response | null) => emit("respond", qid, r)
</script>

<template>
  <div :class="{ 'with-passage': 'passage' in section && section.passage }">
    <LessonPassage v-if="'passage' in section && section.passage" class="side" :html="section.passage" />
    <div class="items">
      <LessonMcqSection
        v-if="section.type === 'mcq'"
        :section-key="section.key" :items="section.items" :responses="responses" :results="results" :locked="locked" :show-key="showKey"
        @respond="respond"
      />
      <LessonTypedSection
        v-else-if="section.type === 'typed'"
        :section-key="section.key" :items="section.items" :short="section.short" :responses="responses" :results="results" :locked="locked" :show-key="showKey"
        @respond="respond"
      />
      <LessonErrorSection
        v-else-if="section.type === 'error'"
        :section-key="section.key" :items="section.items" :responses="responses" :results="results" :locked="locked" :show-key="showKey"
        @respond="respond"
      />
      <LessonMatchSection
        v-else-if="section.type === 'match'"
        :section-key="section.key" :items="section.items" :choices="section.choices" :responses="responses" :results="results" :locked="locked" :show-key="showKey"
        @respond="respond"
      />
      <LessonOrderSection
        v-else
        :section-key="section.key" :items="section.items" :responses="responses" :results="results" :locked="locked" :show-key="showKey"
        @respond="respond"
      />
    </div>
  </div>
</template>

<style scoped>
.with-passage .side { margin-bottom: 8px; }
@media (min-width: 900px) {
  .with-passage { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
  .with-passage .side { position: sticky; top: 16px; max-height: calc(100vh - 32px); overflow: auto; margin: 0; }
}
</style>
