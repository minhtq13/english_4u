<script setup lang="ts">
// A formatting editor for lesson text, so teachers never type HTML.
// Full mode (explanations) is always live. Inline mode (one-line fields, many per lesson) shows the
// formatted text and only starts an editor while the field is being edited, keeping long lessons light.
const props = defineProps<{ modelValue: string; inline?: boolean; placeholder?: string }>()
const emit = defineEmits<{ "update:modelValue": [html: string] }>()
const editing = ref(false)
const value = computed({ get: () => props.modelValue, set: (v: string) => emit("update:modelValue", v) })
</script>

<template>
  <RichEditorCore v-if="!inline" v-model="value" :placeholder="placeholder" />
  <RichEditorCore v-else-if="editing" v-model="value" inline autofocus :placeholder="placeholder" @blur="editing = false" />
  <div
    v-else
    class="preview"
    role="textbox"
    tabindex="0"
    @focus="editing = true"
    @click="editing = true"
  >
    <span v-if="modelValue" class="explain" v-html="safeHtml(modelValue)" />
    <span v-else class="muted">{{ placeholder }}</span>
  </div>
</template>

<style scoped>
.preview { border: 1px solid var(--line); border-radius: 8px; background: var(--bg); padding: 8px 10px; min-height: 40px;
  cursor: text; font-weight: 400; }
.preview:hover { border-color: var(--accent); }
.preview :deep(p) { margin: 0; }
</style>
