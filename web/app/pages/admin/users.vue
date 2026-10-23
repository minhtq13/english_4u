<script setup lang="ts">
import type { Database, Enums, Tables } from "~/types/database.types"

definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: () => `${t("nav.users")} - Admin` })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

type Person = Pick<Tables<"profiles">, "id" | "full_name" | "email" | "username" | "role" | "class_id" | "created_at">
const people = shallowRef<Person[]>([])
const classes = shallowRef<Pick<Tables<"classes">, "id" | "name">[]>([])
const counts = reactive({ student: 0, teacher: 0, admin: 0 })
const loaded = ref(false)
const message = ref("")
const failure = ref("")
const busy = ref<string | null>(null)
const search = ref("")
const roleFilter = ref<"" | Enums<"app_role">>("")

// Search, role filter and paging all run in the database; only one page of people is fetched.
const PAGE = 25
const page = ref(0)
const total = ref(0)

async function loadPage() {
  const [from, to] = pageRange(page.value, PAGE)
  let q = client.from("profiles")
    .select("id, full_name, email, username, role, class_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
  if (roleFilter.value) q = q.eq("role", roleFilter.value)
  // Characters with a meaning in PostgREST filters are dropped from the search text.
  const term = search.value.trim().replace(/[,()*%\\]/g, " ").trim()
  if (term) q = q.or(`full_name.ilike.*${term}*,username.ilike.*${term}*,email.ilike.*${term}*`)
  const { data, count } = await q.range(from, to)
  people.value = data ?? []
  total.value = count ?? 0
}

async function loadCounts() {
  const roles = ["student", "teacher", "admin"] as const
  const results = await Promise.all(roles.map(r =>
    client.from("profiles").select("id", { count: "exact", head: true }).eq("role", r)))
  roles.forEach((r, i) => { counts[r] = results[i]!.count ?? 0 })
}

async function load() {
  await Promise.all([loadPage(), loadCounts()])
  loaded.value = true
}
onMounted(async () => {
  const [c] = await Promise.all([client.from("classes").select("id, name").order("name"), load()])
  classes.value = c.data ?? []
})

watch(page, loadPage)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([search, roleFilter], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (page.value === 0) loadPage()
    else page.value = 0
  }, 300)
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
    </div>

    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <div v-else class="card table-wrap">
      <table class="users">
        <thead>
          <tr>
            <th>{{ $t("usersPage.user") }}</th><th>{{ $t("account.role") }}</th><th>{{ $t("usersPage.class") }}</th>
            <th>{{ $t("login.password") }}</th><th>{{ $t("usersPage.joined") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in people" :key="p.id">
            <td>
              <b>{{ p.full_name || p.email }}</b><span v-if="p.id === user?.sub" class="small muted"> ({{ $t("usersPage.you") }})</span>
              <br><span class="small muted">{{ loginOf(p) }}</span>
            </td>
            <td>
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
            <td>
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
            <td class="pw-cell">
              <NuxtLink v-if="p.id === user?.sub" to="/account" class="small">{{ $t("usersPage.ownPassword") }}</NuxtLink>
              <SetPasswordButton v-else :user-id="p.id" :name="p.full_name || loginOf(p)" @done="message = $event; failure = ''" @failed="failure = $event; message = ''" />
            </td>
            <td class="small muted">{{ formatDate(p.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!people.length" class="muted small">{{ $t("usersPage.none") }}</p>
      <Pager v-model:page="page" :page-size="PAGE" :total="total" />
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
