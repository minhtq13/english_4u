<script setup lang="ts">
// Previous/next paging for lists fetched one page at a time (PostgREST range + exact count).
const props = defineProps<{ page: number; pageSize: number; total: number }>()
const emit = defineEmits<{ "update:page": [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total ? props.page * props.pageSize + 1 : 0))
const to = computed(() => Math.min(props.total, (props.page + 1) * props.pageSize))
</script>

<template>
  <div v-if="total > pageSize" class="pager">
    <span class="small muted">{{ $t("common.range", { from, to, total }) }}</span>
    <button class="btn small" :disabled="page === 0" @click="emit('update:page', page - 1)">{{ $t("common.previous") }}</button>
    <span class="small">{{ $t("common.page", { page: page + 1, pages }) }}</span>
    <button class="btn small" :disabled="page + 1 >= pages" @click="emit('update:page', page + 1)">{{ $t("common.next") }}</button>
  </div>
</template>

<style scoped>
.pager { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.pager .btn { padding: 4px 12px; }
</style>
