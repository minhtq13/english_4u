<script setup lang="ts">
import type { Database, Enums, Tables } from "~/types/database.types"

definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: () => `${t("nav.users")} - Admin` })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

type Person = Pick<Tables<"profiles">, "id" | "full_name" | "email" | "username" | "role" | "class_id" | "created_at">
const classes = shallowRef<Pick<Tables<"classes">, "id" | "name">[]>([])
const counts = reactive({ student: 0, teacher: 0, admin: 0 })
const loaded = ref(false)
const message = ref("")
const failure = ref("")
const busy = ref<string | null>(null)
const search = ref("")
const roleFilter = ref<"" | Enums<"app_role">>("")
const classFilter = ref("")
const statusFilter = ref<"" | "active" | "locked">("")

// Search, filters and paging all run in the database; only one page of people is fetched.
const people = useServerList<Person>(([from, to]) => {
  let q = client.from("profiles")
    .select("id, full_name, email, username, role, class_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
  if (roleFilter.value) q = q.eq("role", roleFilter.value)
  if (classFilter.value) q = classFilter.value === "none" ? q.is("class_id", null) : q.eq("class_id", classFilter.value)
  if (statusFilter.value) q = q.eq("active", statusFilter.value === "active")
  const term = filterTerm(search.value)
  if (term) q = q.or(personSearch(term))
  return q.range(from, to)
}, { pageSize: 25, filters: [search, roleFilter, classFilter, statusFilter] })

async function loadCounts() {
  const roles = ["student", "teacher", "admin"] as const
  const results = await Promise.all(roles.map(r =>
    client.from("profiles").select("id", { count: "exact", head: true }).eq("role", r)))
  roles.forEach((r, i) => { counts[r] = results[i]!.count ?? 0 })
}

async function load() {
  await Promise.all([people.load(), loadCounts()])
  loaded.value = true
}
onMounted(async () => {
  const [c] = await Promise.all([client.from("classes").select("id, name").order("name"), load()])
  classes.value = c.data ?? []
})

async function update(p: Person, patch: Partial<Tables<"profiles">>, ok: string) {
  busy.value = p.id
  message.value = ""
  const { error } = await client.from("profiles").update(patch).eq("id", p.id)
  busy.value = null
  message.value = error ? t("usersPage.updateFailed", { name: p.full_name || p.email, msg: errorText(error.message) }) : ok
  if (!error) await load()
}

function setRole(p: Person, role: Enums<"app_role">) {
  if (role === p.role) return
  // Teachers and admins do not belong to a class as learners.
  const patch: Partial<Tables<"profiles">> = role === "student" ? { role } : { role, class_id: null }
  update(p, patch, t("usersPage.roleSet", { name: p.full_name || p.email, role: ROLE_LABEL[role] }))
}
function setClass(p: Person, classId: string) {
  update(p, { class_id: classId || null },
    classId ? t("usersPage.classSet", { name: p.full_name || p.email, cls: classes.value.find(c => c.id === classId)?.name })
      : t("usersPage.classCleared", { name: p.full_name || p.email }))
}
</script>

<template>
  <div>
    <h1>{{ $t("nav.users") }}</h1>
    <p class="sub">
      {{ $t("usersPage.counts", { s: counts.student, t: counts.teacher, a: counts.admin }) }} {{ $t("usersPage.intro") }}
    </p>
    <p v-if="message" class="fb ok">{{ message }}</p>
    <p v-if="failure" class="fb no">{{ failure }}</p>

    <div class="row filters">
      <input id="user-search" v-model="search" type="search" :placeholder="$t('usersPage.search')">
      <select id="user-role-filter" v-model="roleFilter">
        <option value="">{{ $t("usersPage.allRoles") }}</option>
        <option v-for="(label, key) in ROLE_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
      <select id="user-class-filter" v-model="classFilter" :aria-label="$t('common.allClasses')">
        <option value="">{{ $t("common.allClasses") }}</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        <option value="none">{{ $t("usersPage.noClass") }}</option>
      </select>
      <select id="user-status-filter" v-model="statusFilter" :aria-label="$t('accounts.status')">
        <option value="">{{ $t("accounts.anyStatus") }}</option>
        <option value="active">{{ $t("accounts.active") }}</option>
        <option value="locked">{{ $t("accounts.inactive") }}</option>
      </select>
      <span class="small muted">{{ $t("accounts.found", { n: people.total }) }}</span>
    </div>

    <Skeleton v-if="!loaded" />
    <div v-else class="card table-wrap">
      <table class="stack-table users">
        <thead>
          <tr>
            <th>{{ $t("usersPage.user") }}</th><th>{{ $t("account.role") }}</th><th>{{ $t("usersPage.class") }}</th>
            <th>{{ $t("login.password") }}</th><th>{{ $t("usersPage.joined") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in people.rows" :key="p.id">
            <td :data-label="$t('usersPage.user')">
              <b>{{ p.full_name || p.email }}</b><span v-if="p.id === user?.sub" class="small muted"> ({{ $t("usersPage.you") }})</span>
              <br><span class="small muted">{{ loginOf(p) }}</span>
            </td>
            <td :data-label="$t('account.role')">
              <select
                :id="`role-${p.id}`"
                :value="p.role"
                :disabled="busy === p.id || p.id === user?.sub"
                :title="p.id === user?.sub ? $t('usersPage.notSelf') : ''"
                @change="setRole(p, ($event.target as HTMLSelectElement).value as Enums<'app_role'>)"
              >
                <option v-for="(label, key) in ROLE_LABEL" :key="key" :value="key">{{ label }}</option>
              </select>
            </td>
            <td :data-label="$t('usersPage.class')">
              <select
                v-if="p.role === 'student'"
                :id="`class-${p.id}`"
                :value="p.class_id ?? ''"
                :disabled="busy === p.id"
                @change="setClass(p, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ $t("usersPage.noClass") }}</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <span v-else class="muted small">-</span>
            </td>
            <td :data-label="$t('login.password')" class="pw-cell">
              <NuxtLink v-if="p.id === user?.sub" to="/account" class="small">{{ $t("usersPage.ownPassword") }}</NuxtLink>
              <SetPasswordButton v-else :user-id="p.id" :name="p.full_name || loginOf(p)" @done="message = $event; failure = ''" @failed="failure = $event; message = ''" />
            </td>
            <td :data-label="$t('usersPage.joined')" class="small muted">{{ formatDate(p.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="people.error" class="fb no">{{ people.error }}</p>
      <p v-else-if="!people.rows.length" class="muted small">{{ $t("usersPage.none") }}</p>
      <Pager v-model:page="people.page" :page-size="people.pageSize" :total="people.total" />
    </div>
  </div>
</template>

<style scoped>
.filters { margin-bottom: 12px; }
.filters input { flex: 1; min-width: 200px; }
.filters select { width: auto; }
.users select { width: auto; min-width: 140px; }
.users th { white-space: nowrap; }
.pw-cell { white-space: nowrap; }
</style>
