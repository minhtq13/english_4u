<script setup lang="ts">
// The four steps of the lesson editor (grade, structure, content, give). Clicking one asks the page to go there.
defineProps<{ stage: "setup" | "content"; canContinue: boolean }>()
const emit = defineEmits<{ go: [stage: "setup" | "content"]; give: [] }>()
</script>

<template>
      <ol class="steps" :aria-label="$t('editor.steps')">
        <li :class="{ on: stage === 'setup', done: stage === 'content' }">
          <button type="button" @click="emit('go', 'setup')"><span class="dot"><Icon v-if="stage === 'content'" name="check" size="14" /><template v-else>1</template></span>{{ $t("editor.stepGrade") }}</button>
        </li>
        <li :class="{ on: stage === 'setup', done: stage === 'content' }">
          <button type="button" @click="emit('go', 'setup')"><span class="dot"><Icon v-if="stage === 'content'" name="check" size="14" /><template v-else>2</template></span>{{ $t("editor.stepStructure") }}</button>
        </li>
        <li :class="{ on: stage === 'content' }">
          <button type="button" :disabled="!canContinue" :aria-current="stage === 'content' ? 'step' : undefined" @click="emit('go', 'content')">
            <span class="dot">3</span>{{ $t("editor.stepContent") }}
          </button>
        </li>
        <li>
          <button type="button" :disabled="!canContinue" @click="emit('give')">
            <span class="dot">4</span>{{ $t("editor.stepGive") }}
          </button>
        </li>
      </ol>
</template>

<style scoped>
.steps { list-style: none; margin: 0 0 16px; padding: 0; display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.steps li { flex: 1 1 150px; }
.steps button { width: 100%; display: flex; align-items: center; gap: var(--space-sm); padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px;
  background: var(--card); color: var(--muted); font: inherit; font-size: .9rem; font-weight: 500; cursor: pointer; text-align: left; }
.steps button:disabled { opacity: .55; cursor: default; }
.steps .dot { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; background: var(--bg); border: 1px solid var(--line); font-size: .8rem; font-weight: 700; }
.steps li.on button { border-color: var(--accent); color: var(--text); }
.steps li.on .dot { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.steps li.done .dot { background: var(--ok-soft); border-color: var(--ok); color: var(--ok); }
</style>
