<script setup lang="ts">
import type { IconName } from "~/components/Icon.vue"

// What a list or page shows when there is nothing yet: a line icon, what is missing, and (in the slot) what to do next.
defineProps<{ icon?: IconName; title: string; text?: string }>()
</script>

<template>
  <div class="empty card">
    <span class="mark" aria-hidden="true"><Icon :name="icon ?? 'book'" size="26" /></span>
    <b class="title">{{ title }}</b>
    <p v-if="text" class="muted">{{ text }}</p>
    <div class="actions"><slot /></div>
  </div>
</template>

<style scoped>
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 28px 16px; }
.mark { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); }
.title { font-size: 1.05rem; }
p { margin: 0; max-width: 46ch; }
.actions:empty { display: none; }
.actions { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
</style>
