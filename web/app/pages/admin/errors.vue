<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"

// The browser errors people's pages reported (client_errors, newest first; the log keeps the last 1000).
definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: () => `${t("nav.errors")} - Admin` })

const client = useSupabaseClient<Database>()
type Row = Pick<Tables<"client_errors">, "slot" | "created_at" | "message" | "stack" | "url" | "user_agent"> & {
  profiles: { full_name: string | null; username: string | null; email: string | null } | null
}
const list = useServerList<Row>(([from, to]) =>
  client.from("client_errors")
    .select("slot, created_at, message, stack, url, user_agent, profiles(full_name, username, email)", { count: "exact" })
    .order("created_at", { ascending: false }).order("slot").range(from, to) as unknown as PromiseLike<{ data: Row[] | null; count: number | null; error: { message: string } | null }>,
{ pageSize: 20 })
onMounted(() => list.load())
const open = ref<number | null>(null)
</script>

<template>
  <div>
    <h1>{{ $t("nav.errors") }}</h1>
    <p class="sub">{{ $t("errorsPage.intro") }}</p>
    <p v-if="list.error" class="fb no">{{ list.error }}</p>
    <Skeleton v-if="list.loading && !list.rows.length" />
    <EmptyState v-else-if="!list.rows.length" icon="checkCircle" :title="$t('errorsPage.none')" />
    <div v-else class="card list">
      <div v-for="r in list.rows" :key="r.slot" class="err">
        <button class="head" :aria-expanded="open === r.slot" @click="open = open === r.slot ? null : r.slot">
          <b class="msg">{{ r.message }}</b>
          <span class="muted small">{{ formatDate(r.created_at) }} · {{ r.profiles ? personName(r.profiles) : "?" }} · {{ r.url ?? "" }}</span>
        </button>
        <pre v-if="open === r.slot" class="stack-trace">{{ r.stack || $t("errorsPage.noStack") }}
{{ r.user_agent }}</pre>
      </div>
    </div>
    <Pager v-model:page="list.page" :page-size="list.pageSize" :total="list.total" />
  </div>
</template>

<style scoped>
.list { padding: 0; }
.err + .err { border-top: 1px solid var(--line); }
.head { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; background: none; border: 0; padding: var(--space-md) var(--space-lg); cursor: pointer; color: var(--text); }
.head:hover { background: var(--bg); }
.msg { overflow-wrap: anywhere; }
.stack-trace { margin: 0; padding: var(--space-md) var(--space-lg); background: var(--bg); font-size: .8rem; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
