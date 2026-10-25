<script setup lang="ts">
import type { Answer } from "~/utils/course"

// `result` is missing when the question was left blank; `correct` is the key's answer for that case.
// `showKey` (teacher preview) shows the answer for unanswered questions without marking them wrong.
const props = defineProps<{ result?: Answer; why?: string; correct?: string; showKey?: boolean }>()
const answer = computed(() => markUnderline(props.result?.correct || props.correct || ""))
const kind = computed(() => (props.result ? (props.result.ok ? "ok" : "no") : props.showKey ? "key" : "no"))
</script>

<template>
  <div class="fb" :class="kind">
    <template v-if="kind === 'ok'"><Icon name="check" /> {{ $t("feedback.right") }}</template>
    <template v-else-if="kind === 'key'">{{ $t("feedback.answer") }}: <b v-html="answer" /></template>
    <template v-else>
      <template v-if="result"><Icon name="x" /> {{ $t("feedback.wrong") }}</template><template v-else>{{ $t("feedback.blank") }}</template><template v-if="answer"> {{ $t("feedback.answer") }}: <b v-html="answer" /></template>
    </template>
    <span v-if="why" class="why" v-html="why" />
  </div>
</template>
