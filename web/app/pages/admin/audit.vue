<script setup lang="ts">
import type { Database } from "~/types/database.types"
import { auditView, AUDIT_ACTIONS, idsToName, type AuditRow } from "~/utils/audit"

// Who changed what: roles, locked or deleted accounts, class moves, class codes and promotions (table audit_log).
definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: () => `${t("nav.audit")} - Admin` })

const client = useSupabaseClient<Database>()
const action = ref("")
const people = shallowRef(new Map<string, string>())
const classes = shallowRef(new Map<string, string>())

const list = useServerList<AuditRow>(async ([from, to]) => {
  let q = client.from("audit_log").select("id, at, actor, action, target, detail", { count: "exact" }).order("at", { ascending: false })
  if (action.value) q = q.eq("action", action.value)
  const r = await q.range(from, to)
  if (!r.error) await nameThem(r.data ?? [])
  return r
}, { pageSize: 25, filters: [action] })

/** Looks up the names of the people and classes on this page. */
async function nameThem(rows: AuditRow[]) {
  const ids = idsToName(rows)
  const [p, c] = await Promise.all([
    ids.people.length ? client.from("profiles").select("id, full_name, username, email").in("id", ids.people) : { data: [] },
    ids.classes.length ? client.from("classes").select("id, name").in("id", ids.classes) : { data: [] },
  ])
  people.value = new Map((p.data ?? []).map(x => [x.id, personName(x) || "?"]))
  classes.value = new Map((c.data ?? []).map(x => [x.id, x.name]))
}
onMounted(() => list.load())

const view = (r: AuditRow) => auditView(r, people.value, classes.value)
const actionLabel = (a: string) => t(`audit.action.${a}`)
</script>

<template>
  <div>
    <h1>{{ $t("nav.audit") }}</h1>
    <p class="sub">{{ $t("audit.intro") }}</p>
    <div class="row filters">
      <label class="small muted" for="audit-action">{{ $t("audit.filter") }}</label>
      <select id="audit-action" v-model="action">
        <option value="">{{ $t("audit.all") }}</option>
        <option v-for="a in AUDIT_ACTIONS" :key="a" :value="a">{{ actionLabel(a) }}</option>
      </select>
    </div>
    <p v-if="list.error" class="fb no">{{ list.error }}</p>
    <Skeleton v-if="list.loading && !list.rows.length" />
    <EmptyState v-else-if="!list.rows.length" icon="clipboard" :title="$t('audit.none')" :text="$t('audit.noneHint')" />
    <div v-else class="card scroll">
      <table class="stack-table">
        <thead><tr><th>{{ $t("audit.when") }}</th><th>{{ $t("audit.who") }}</th><th>{{ $t("audit.what") }}</th><th>{{ $t("audit.target") }}</th><th>{{ $t("audit.detailTitle") }}</th></tr></thead>
        <tbody>
          <tr v-for="r in list.rows" :key="r.id">
            <td :data-label="$t('audit.when')">{{ formatDate(r.at) }}</td>
            <td :data-label="$t('audit.who')">{{ view(r).actor || $t("audit.system") }}</td>
            <td :data-label="$t('audit.what')"><b>{{ actionLabel(r.action) }}</b></td>
            <td :data-label="$t('audit.target')">{{ view(r).target }}</td>
            <td :data-label="$t('audit.detailTitle')">{{ view(r).detail ? $t(view(r).detail!.key, view(r).detail!.params) : "–" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pager v-model:page="list.page" :page-size="list.pageSize" :total="list.total" />
  </div>
</template>

<style scoped>
.filters { align-items: center; gap: 8px; margin: 8px 0 12px; }
.filters select { width: auto; }
.scroll { overflow-x: auto; padding: 0; }
td, th { text-align: left; padding: 8px 10px; }
</style>
