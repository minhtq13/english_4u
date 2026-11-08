<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import { filterTerm, personSearch } from "~/utils/search"

// Every sign-in (table login_log): who, when, from where, how long it lasted and how it ended.
definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: () => `${t("nav.logins")} - Admin` })

const client = useSupabaseClient<Database>()
type Row = Pick<Tables<"login_log">, "id" | "signed_in_at" | "last_seen_at" | "ended_at" | "end_reason" | "ip" | "user_agent"> & {
  profiles: { full_name: string | null; username: string | null; email: string | null } | null
}
const search = ref("")
const reason = ref("")
const REASONS = ["signout", "replaced", "idle", "locked"] as const

const list = useServerList<Row>(([from, to]) => {
  let q = client.from("login_log")
    .select("id, signed_in_at, last_seen_at, ended_at, end_reason, ip, user_agent, profiles!inner(full_name, username, email)", { count: "exact" })
    .order("signed_in_at", { ascending: false })
  if (reason.value === "active") q = q.is("ended_at", null)
  else if (reason.value) q = q.eq("end_reason", reason.value)
  const term = filterTerm(search.value)
  if (term) q = q.or(personSearch(term), { referencedTable: "profiles" })
  return q.range(from, to) as unknown as PromiseLike<{ data: Row[] | null; count: number | null; error: { message: string } | null }>
}, { pageSize: 25, filters: [search, reason] })
onMounted(() => list.load())

/** A short readable browser name from the user agent. */
const browser = (ua: string | null) => {
  if (!ua) return "–"
  const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : ""
  const app = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : ""
  return [app, os].filter(Boolean).join(" · ") || ua.slice(0, 30)
}
const minutes = (r: Row) => Math.max(0, Math.round((Date.parse(r.ended_at ?? r.last_seen_at) - Date.parse(r.signed_in_at)) / 60000))
const reasonLabel = (r: Row) => (r.ended_at ? t(`logins.reason.${r.end_reason ?? "unknown"}`) : t("logins.active"))
</script>

<template>
  <div>
    <h1>{{ $t("nav.logins") }}</h1>
    <p class="sub">{{ $t("logins.intro") }}</p>
    <div class="row filters">
      <input v-model="search" type="search" :placeholder="$t('logins.search')" :aria-label="$t('logins.search')">
      <select v-model="reason" :aria-label="$t('logins.reasonFilter')">
        <option value="">{{ $t("logins.all") }}</option>
        <option value="active">{{ $t("logins.active") }}</option>
        <option v-for="r in REASONS" :key="r" :value="r">{{ $t(`logins.reason.${r}`) }}</option>
      </select>
    </div>
    <p v-if="list.error" class="fb no">{{ list.error }}</p>
    <Skeleton v-if="list.loading && !list.rows.length" />
    <EmptyState v-else-if="!list.rows.length" icon="clipboard" :title="$t('logins.none')" />
    <div v-else class="card scroll">
      <table class="stack-table">
        <thead><tr><th>{{ $t("logins.who") }}</th><th>{{ $t("logins.when") }}</th><th>{{ $t("logins.duration") }}</th><th>{{ $t("logins.end") }}</th><th>{{ $t("logins.device") }}</th><th>IP</th></tr></thead>
        <tbody>
          <tr v-for="r in list.rows" :key="r.id">
            <td :data-label="$t('logins.who')"><b>{{ r.profiles ? personName(r.profiles) : "?" }}</b></td>
            <td :data-label="$t('logins.when')">{{ formatDate(r.signed_in_at) }}</td>
            <td :data-label="$t('logins.duration')">{{ $t("logins.minutes", minutes(r)) }}</td>
            <td :data-label="$t('logins.end')">{{ reasonLabel(r) }}</td>
            <td :data-label="$t('logins.device')" :title="r.user_agent ?? ''">{{ browser(r.user_agent) }}</td>
            <td data-label="IP">{{ r.ip ?? "–" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pager v-model:page="list.page" :page-size="list.pageSize" :total="list.total" />
  </div>
</template>

<style scoped>
.filters { align-items: center; gap: 8px; margin: 8px 0 12px; flex-wrap: wrap; }
.filters input { flex: 1; min-width: 180px; }
.filters select { width: auto; }
.scroll { overflow-x: auto; padding: 0; }
td, th { text-align: left; padding: 8px 10px; }
</style>
