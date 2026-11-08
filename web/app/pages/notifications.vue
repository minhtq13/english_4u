<script setup lang="ts">
import type { Database } from "~/types/database.types"
import { dueOf, lessonOf, safeLink } from "~/utils/notifications"

definePageMeta({ roles: ["student"] })
const { t } = useI18n()
useHead({ title: () => t("notifications.pageTitle") })

const client = useSupabaseClient<Database>()
const { rows, loaded, unread, load, markRead, markAllRead, remove } = useNotifications()

// Lesson names for the notices that mention one.
const names = shallowRef<Record<string, string>>({})
async function loadNames() {
  const ids = [...new Set(rows.value.map(lessonOf).filter(Boolean) as string[])].filter(id => !names.value[id])
  if (!ids.length) return
  const { data } = await client.from("lessons").select("id, label, title").in("id", ids)
  names.value = { ...names.value, ...Object.fromEntries((data ?? []).map(l => [l.id, `${l.label} - ${l.title}`])) }
}
onMounted(async () => { await load(); await loadNames() })
watch(rows, loadNames)

const text = (n: (typeof rows.value)[number]) =>
  t(`notifications.kind.${n.kind}`, { lesson: names.value[lessonOf(n) ?? ""] ?? lessonOf(n) ?? "", date: formatDate(dueOf(n)) })
</script>

<template>
  <div>
    <div class="head">
      <h1>{{ $t("notifications.title") }}</h1>
      <button v-if="unread" class="btn small" @click="markAllRead">{{ $t("notifications.markAll") }}</button>
    </div>
    <Skeleton v-if="!loaded" />
    <EmptyState v-else-if="!rows.length" icon="bell" :title="$t('notifications.none')" :text="$t('notifications.noneHint')" />
    <ul v-else class="list">
      <li v-for="n in rows" :key="n.id" class="card item" :class="{ unread: !n.read_at }">
        <NuxtLink :to="safeLink(n.link)" class="body" @click="markRead([n.id])">
          <span class="text">{{ text(n) }}</span>
          <span class="muted small">{{ formatDate(n.created_at) }}</span>
        </NuxtLink>
        <button class="x" :aria-label="$t('notifications.remove')" :title="$t('notifications.remove')" @click="remove(n.id)"><Icon name="x" size="16" /></button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.item { display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 14px; }
.item.unread { border-left: 4px solid var(--accent); background: var(--accent-soft); }
.body { flex: 1; display: flex; flex-direction: column; gap: 2px; text-decoration: none; color: var(--text); min-width: 0; }
.text { font-weight: 600; }
.x { background: none; border: 0; color: var(--muted); cursor: pointer; min-width: 36px; min-height: 36px; border-radius: 8px; }
.x:hover { background: var(--bg); color: var(--text); }
</style>
