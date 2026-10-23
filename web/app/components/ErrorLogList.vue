<script setup lang="ts">
import type { Database, Enums, Tables } from "~/types/database.types"

const props = defineProps<{ entries: Tables<"error_log">[]; editable?: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const client = useSupabaseClient<Database>()
const busy = ref<string | null>(null)

const sorted = computed(() => {
  const rank = { open: 0, improving: 1, fixed: 2 }
  return [...props.entries].sort((a, b) => rank[a.status] - rank[b.status] || b.occurrences - a.occurrences)
})

async function patch(id: string, update: Partial<Tables<"error_log">>) {
  busy.value = id
  await client.from("error_log").update(update).eq("id", id)
  busy.value = null
  emit("changed")
}
const setStatus = (e: Tables<"error_log">, status: Enums<"error_status">) => patch(e.id, { status })
const bump = (e: Tables<"error_log">) => patch(e.id, { occurrences: e.occurrences + 1, status: "open" })
</script>

<template>
  <p v-if="!entries.length" class="muted small">{{ $t("errors.none") }}</p>
  <div v-else>
    <div v-for="e in sorted" :key="e.id" class="list-row">
      <span>
        <b>{{ e.note }}</b>
        <small>
          {{ ERROR_CATEGORIES[e.category] }}
          <template v-if="e.lesson_id"> · {{ $t("errors.lesson", { id: e.lesson_id }) }}</template>
          · {{ $t("errors.times", { n: e.occurrences }) }} · {{ formatDate(e.updated_at) }}
        </small>
      </span>
      <span v-if="editable" class="row controls">
        <button class="btn small" :disabled="busy === e.id" :title="$t('errors.againTitle')" @click="bump(e)">{{ $t("errors.again") }}</button>
        <select :value="e.status" :disabled="busy === e.id" @change="setStatus(e, ($event.target as HTMLSelectElement).value as Enums<'error_status'>)">
          <option v-for="(label, key) in ERROR_STATUS" :key="key" :value="key">{{ label }}</option>
        </select>
      </span>
      <span v-else class="badge" :class="e.status">{{ ERROR_STATUS[e.status] }}</span>
    </div>
  </div>
</template>

<style scoped>
.controls { flex-wrap: nowrap; }
.controls select { width: auto; }
</style>
