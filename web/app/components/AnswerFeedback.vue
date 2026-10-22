<script setup lang="ts">
defineProps<{ ok: boolean; why?: string; correct?: string }>()
</script>

<template>
  <div class="fb" :class="ok ? 'ok' : 'no'">
    <template v-if="ok">✔ Đúng!</template>
    <template v-else>
      ✘ Chưa đúng.<template v-if="correct"> Đáp án: <b v-html="correct" /></template>
    </template>
    <span v-if="why" class="why" v-html="why" />
  </div>
</template>
