<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { CreateResult } from "~/composables/useAccounts"

// Issue and manage username/password accounts. role = "student": teachers see the students of their
// classes (RLS), admins everyone; role = "teacher": admins only. Writes go through the manage-accounts
// edge function, which re-checks every permission.
const props = defineProps<{ role: "student" | "teacher" }>()

const client = useSupabaseClient<Database>()
const { isAdmin } = useProfile()
const accounts = useAccounts()
const isStudents = props.role === "student"
const { t } = useI18n()
/** Role-specific wording lives under accounts.student.* / accounts.teacher.*. */
const rt = (key: string, params: Record<string, unknown> = {}) => t(`accounts.${props.role}.${key}`, params)

type Person = Pick<Tables<"profiles">, "id" | "full_name" | "email" | "username" | "active" | "class_id" | "created_at"> & {
  /** For teachers: the names of the classes they teach. */
  teaches?: string[]
}
type ClassRow = Pick<Tables<"classes">, "id" | "name">

const classes = shallowRef<ClassRow[]>([])
const search = ref("")
const classFilter = ref("")
/** "" = everyone, "active" / "locked" = profiles.active */
const statusFilter = ref<"" | "active" | "locked">("")
const sortBy = ref<"newest" | "name">("newest")
const loaded = ref(false)
const message = ref("")
const error = ref("")
const busy = ref<string | null>(null)

const className = (id: string | null) => classes.value.find(c => c.id === id)?.name ?? "-"

const people = useServerList<Person>(async ([from, to]) => {
  // Teachers are filtered by a class they teach: the inner join keeps only teachers with that class_teachers row.
  const byTaughtClass = !isStudents && !!classFilter.value
  let q = client.from("profiles")
    .select(`id, full_name, email, username, active, class_id, created_at${byTaughtClass ? ", class_teachers!inner(class_id)" : ""}`, { count: "exact" })
    .eq("role", props.role)
  q = sortBy.value === "name"
    ? q.order("full_name", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false })
    : q.order("created_at", { ascending: false })
  if (isStudents && classFilter.value) q = classFilter.value === "none" ? q.is("class_id", null) : q.eq("class_id", classFilter.value)
  if (byTaughtClass) q = q.eq("class_teachers.class_id", classFilter.value)
  if (statusFilter.value) q = q.eq("active", statusFilter.value === "active")
  const term = filterTerm(search.value)
  if (term) q = q.or(personSearch(term))
  const { data, count, error: e } = await q.range(from, to)
  const rows = (data ?? []) as unknown as Person[]
  if (isStudents || !rows.length) return { data: rows, count, error: e }
  // The classes each teacher of this page teaches, read with the page so both arrive together.
  const { data: ct } = await client.from("class_teachers").select("teacher_id, classes(name)").in("teacher_id", rows.map(p => p.id))
  const names: Record<string, string[]> = {}
  for (const r of (ct ?? []) as { teacher_id: string; classes: { name: string } | null }[]) {
    names[r.teacher_id] = [...(names[r.teacher_id] ?? []), r.classes?.name ?? "?"]
  }
  return { data: rows.map(p => ({ ...p, teaches: names[p.id] ?? [] })), count, error: e }
}, { pageSize: 25, filters: [search, classFilter, statusFilter, sortBy] })

onMounted(async () => {
  const { data } = await client.from("classes").select("id, name").order("name")
  classes.value = data ?? []
  if (isStudents && !isAdmin.value && classes.value.length === 1) newClass.value = classes.value[0]!.id
  await people.load()
  loaded.value = true
})

async function run(key: string, action: () => Promise<{ error: string | null }>, ok: string) {
  busy.value = key
  message.value = error.value = ""
  const { error: e } = await action()
  busy.value = null
  if (e) error.value = e
  else {
    message.value = ok
    await people.load()
  }
  return !e
}
const name = (p: Person) => p.full_name || loginOf(p)

// ---- create (one or many: one name per line) ----
const showCreate = ref(false)
const newClass = ref("")
const namesText = ref("")
type Draft = { full_name: string; username: string; password: string }
const drafts = ref<Draft[]>([])
const created = shallowRef<CreateResult[]>([])

const prefix = computed(() => {
  if (!isStudents) return "gv"
  const cls = classes.value.find(c => c.id === newClass.value)
  return cls ? slug(cls.name) : "hs"
})

/** Builds the rows to create: <prefix>.<nn> usernames after the highest one in use, random passwords. */
async function prepare() {
  const names = namesText.value.split("\n").map(s => s.trim()).filter(Boolean)
  if (!names.length) return
  const { data } = await client.from("profiles").select("username").like("username", `${prefix.value}.%`)
  const used = (data ?? []).map(r => Number((r.username ?? "").split(".").pop())).filter(n => Number.isFinite(n))
  let n = used.length ? Math.max(...used) : 0
  drafts.value = names.map(full_name => ({ full_name, username: `${prefix.value}.${String(++n).padStart(2, "0")}`, password: randomPassword() }))
}

async function createAll() {
  if (isStudents && !isAdmin.value && !newClass.value) {
    error.value = t("accounts.pickClass")
    return
  }
  busy.value = "create"
  message.value = error.value = ""
  const { data, error: e } = await accounts.create(drafts.value, props.role, isStudents ? newClass.value || null : null)
  busy.value = null
  if (e) {
    error.value = e
    return
  }
  created.value = data?.results ?? []
  const ok = created.value.filter(r => r.ok).length
  message.value = t("accounts.created", { ok, total: drafts.value.length })
  drafts.value = drafts.value.filter((_, i) => !created.value[i]?.ok)
  if (!drafts.value.length) namesText.value = ""
  await people.load()
}

const createdText = computed(() =>
  created.value.filter(r => r.ok).map(r => `${r.full_name || r.username}\t${r.username}\t${r.password}`).join("\n"))
async function copyCreated() {
  try { await navigator.clipboard.writeText(`${t("accounts.fullName")}\t${t("accounts.username")}\t${t("login.password")}\n${createdText.value}`) } catch { /* the table stays on screen */ }
}

// ---- per-account actions ----
const editing = ref<string | null>(null)
const editName = ref("")
const editUsername = ref("")
function startEdit(p: Person) {
  editing.value = p.id
  editName.value = p.full_name ?? ""
  editUsername.value = p.username ?? ""
}
async function saveEdit(p: Person) {
  const patch: { full_name?: string; username?: string } = { full_name: editName.value }
  if (editUsername.value.trim() && editUsername.value.trim().toLowerCase() !== (p.username ?? "")) patch.username = editUsername.value
  if (await run(`edit-${p.id}`, () => accounts.update(p.id, patch), t("accounts.saved", { name: editName.value || loginOf(p) }))) editing.value = null
}

const passwordSet = (msg: string) => { error.value = ""; message.value = msg }
const passwordFailed = (msg: string) => { message.value = ""; error.value = msg }

const armed = ref<string | null>(null)
function arm(key: string) {
  if (armed.value === key) {
    armed.value = null
    return true
  }
  armed.value = key
  setTimeout(() => { if (armed.value === key) armed.value = null }, 4000)
  return false
}
function toggleActive(p: Person) {
  if (p.active && !arm(`lock-${p.id}`)) return
  run(`lock-${p.id}`, () => accounts.setActive(p.id, !p.active), t(p.active ? "accounts.locked" : "accounts.unlocked", { name: name(p) }))
}
function remove(p: Person) {
  if (!arm(`del-${p.id}`)) return
  run(`del-${p.id}`, () => accounts.remove(p.id), t("accounts.deleted", { name: name(p) }))
}
async function moveClass(p: Person, classId: string) {
  busy.value = `cls-${p.id}`
  message.value = error.value = ""
  const { error: e } = await client.from("profiles").update({ class_id: classId || null }).eq("id", p.id)
  busy.value = null
  if (e) error.value = t("accounts.moveFailed", { msg: errorText(e.message) })
  else {
    message.value = t("classPage.moved", { name: name(p), cls: className(classId || null) })
    await people.load()
  }
}
</script>

<template>
  <div>
    <div class="head">
      <div class="head-text">
        <h1>{{ rt("title") }}</h1>
        <p class="sub">
          <template v-if="isStudents && !isAdmin">{{ $t("accounts.student.mine") }} </template>
          {{ rt("intro") }}
          <template v-if="!isStudents"> <NuxtLink to="/admin/classes">{{ $t("accounts.teacher.assignLink") }}</NuxtLink></template>
        </p>
      </div>
      <button class="btn primary" @click="showCreate = !showCreate">{{ showCreate ? $t("common.close") : rt("add") }}</button>
    </div>
    <p v-if="message" class="fb ok">{{ message }}</p>
    <p v-if="error" class="fb no">{{ error }}</p>

    <section v-if="showCreate" class="card stack">
      <h2>{{ rt("addTitle") }}</h2>
      <div class="row">
        <label v-if="isStudents" class="field">{{ $t("common.class") }}
          <select v-model="newClass">
            <option value="">{{ isAdmin ? $t("usersPage.noClass") : $t("classPage.pickClass") }}</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
      </div>
      <label class="field">{{ rt("namesLabel") }}
        <textarea v-model="namesText" :placeholder="isStudents ? 'Nguyễn Văn An\nTrần Thị Bình\n…' : 'Nguyễn Thị Lan'" rows="5" />
      </label>
      <div><button class="btn" :disabled="!namesText.trim()" @click="prepare">{{ $t("accounts.generate") }}</button></div>

      <template v-if="drafts.length">
        <p class="hint" v-html="$t('accounts.draftHint', { ex: `${prefix}.01` })" />
        <div class="table-wrap">
          <table class="accounts">
            <thead><tr><th>{{ $t("accounts.fullName") }}</th><th>{{ $t("accounts.username") }}</th><th>{{ $t("login.password") }}</th><th /></tr></thead>
            <tbody>
              <tr v-for="(d, i) in drafts" :key="i">
                <td><input v-model="d.full_name" type="text"></td>
                <td><input v-model="d.username" type="text" :class="{ bad: !USERNAME_RULE.test(d.username.trim().toLowerCase()) }"></td>
                <td><input v-model="d.password" type="text" :class="{ bad: d.password.length < 6 }"></td>
                <td><button class="btn ghost small" @click="drafts.splice(i, 1)">×</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div><button class="btn primary" :disabled="busy === 'create'" @click="createAll">{{ busy === "create" ? $t("accounts.creating") : $t("accounts.create", { n: drafts.length }) }}</button></div>
      </template>

      <template v-if="created.length">
        <h3>{{ $t("accounts.result") }}</h3>
        <div class="table-wrap">
          <table class="accounts printable">
            <thead><tr><th>{{ $t("accounts.fullName") }}</th><th>{{ $t("accounts.username") }}</th><th>{{ $t("login.password") }}</th></tr></thead>
            <tbody>
              <tr v-for="r in created" :key="r.username">
                <td>{{ r.full_name || r.username }}</td>
                <td><b>{{ r.username }}</b></td>
                <td v-if="r.ok"><code>{{ r.password }}</code></td>
                <td v-else class="bad-text">{{ errorText(r.error ?? "") }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="row">
          <button class="btn" @click="copyCreated">{{ $t("accounts.copyList") }}</button>
          <button class="btn ghost" @click="created = []">{{ $t("accounts.hideList") }}</button>
        </div>
      </template>
    </section>

    <div class="row filters">
      <input v-model="search" type="search" :placeholder="rt('search')">
      <select v-model="classFilter" :aria-label="$t('common.allClasses')">
        <option value="">{{ isStudents ? $t("common.allClasses") : $t("accounts.anyTaughtClass") }}</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ isStudents ? c.name : $t("accounts.teaches", { name: c.name }) }}</option>
        <option v-if="isStudents && isAdmin" value="none">{{ $t("usersPage.noClass") }}</option>
      </select>
      <select v-model="statusFilter" :aria-label="$t('accounts.status')">
        <option value="">{{ $t("accounts.anyStatus") }}</option>
        <option value="active">{{ $t("accounts.active") }}</option>
        <option value="locked">{{ $t("accounts.inactive") }}</option>
      </select>
      <select v-model="sortBy" :aria-label="$t('accounts.sort')">
        <option value="newest">{{ $t("accounts.sortNewest") }}</option>
        <option value="name">{{ $t("accounts.sortName") }}</option>
      </select>
      <span class="small muted">{{ $t("accounts.found", { n: people.total }) }}</span>
    </div>

    <Skeleton v-if="!loaded" />
    <div v-else class="card table-wrap">
      <table class="stack-table accounts">
        <thead>
          <tr>
            <th>{{ rt("title") }}</th><th>{{ $t("accounts.login") }}</th>
            <th>{{ rt("classCol") }}</th><th>{{ $t("accounts.status") }}</th><th>{{ $t("accounts.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in people.rows" :key="p.id" :class="{ inactive: !p.active }">
            <td :data-label="rt('title')">
              <template v-if="editing === p.id">
                <input v-model="editName" type="text" :placeholder="$t('accounts.fullName')">
              </template>
              <template v-else>
                <NuxtLink v-if="isStudents" :to="`/teacher/students/${p.id}`"><b>{{ name(p) }}</b></NuxtLink>
                <b v-else>{{ name(p) }}</b>
              </template>
            </td>
            <td :data-label="$t('accounts.login')">
              <input v-if="editing === p.id" v-model="editUsername" type="text" :placeholder="$t('accounts.username')">
              <template v-else>
                <span>{{ loginOf(p) }}</span>
                <span v-if="!p.username" class="small muted"> (Google)</span>
              </template>
            </td>
            <td :data-label="rt('classCol')">
              <template v-if="isStudents">
                <select :value="p.class_id ?? ''" :disabled="busy === `cls-${p.id}`" @change="moveClass(p, ($event.target as HTMLSelectElement).value)">
                  <option v-if="isAdmin || !p.class_id" value="">{{ $t("usersPage.noClass") }}</option>
                  <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </template>
              <span v-else class="small">{{ (p.teaches ?? []).join(", ") || "-" }}</span>
            </td>
            <td :data-label="$t('accounts.status')"><span class="badge" :class="p.active ? 'done' : 'open'">{{ p.active ? $t("accounts.active") : $t("accounts.inactive") }}</span></td>
            <td :data-label="$t('accounts.actions')" class="actions no-label">
              <template v-if="editing === p.id">
                <button class="btn small primary" :disabled="busy === `edit-${p.id}`" @click="saveEdit(p)">{{ $t("common.save") }}</button>
                <button class="btn small ghost" @click="editing = null">{{ $t("common.cancel") }}</button>
              </template>
              <template v-else>
                <button class="btn small ghost" @click="startEdit(p)">{{ $t("common.edit") }}</button>
                <SetPasswordButton :user-id="p.id" :name="name(p)" @done="passwordSet" @failed="passwordFailed" />
                <button class="btn small" :class="armed === `lock-${p.id}` ? 'danger' : 'ghost'" :disabled="busy === `lock-${p.id}`" @click="toggleActive(p)">
                  {{ p.active ? (armed === `lock-${p.id}` ? $t("accounts.lockConfirm") : $t("accounts.lock")) : $t("accounts.unlock") }}
                </button>
                <button v-if="isAdmin" class="btn small" :class="armed === `del-${p.id}` ? 'danger' : 'ghost'" :disabled="busy === `del-${p.id}`" @click="remove(p)">
                  {{ armed === `del-${p.id}` ? $t("accounts.deleteConfirm") : $t("common.delete") }}
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="people.error" class="fb no">{{ people.error }}</p>
      <p v-else-if="!people.rows.length" class="muted small">{{ search || classFilter || statusFilter ? $t("usersPage.none") : rt("none") }}</p>
      <Pager v-model:page="people.page" :page-size="people.pageSize" :total="people.total" />
    </div>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px 20px; flex-wrap: wrap; margin-bottom: 16px; }
.head-text { flex: 1 1 320px; }
.head-text .sub { margin-bottom: 0; }
.head > .btn { flex-shrink: 0; margin-top: 6px; }
.field { display: flex; flex-direction: column; gap: 4px; font-size: .88rem; font-weight: 500; }
.field select { width: auto; min-width: 180px; }
.filters { margin-bottom: 12px; }
.filters input { flex: 1; min-width: 220px; }
.filters select { width: auto; }
.accounts th { white-space: nowrap; }
.accounts td { vertical-align: middle; }
.accounts select { width: auto; }
.accounts input[type=text] { padding: 4px 8px; }
.accounts a { text-decoration: none; }
.actions { white-space: nowrap; }
.actions > * + * { margin-left: 8px; }
.actions .btn { padding: 2px 10px; }
@media (max-width: 640px) {
  .actions { white-space: normal; justify-content: flex-start; gap: 8px; }
  .actions > * + * { margin-left: 0; }
  .actions .btn { padding: 6px 12px; }
}
.inactive td { opacity: .6; }
input.bad { border-color: var(--bad); }
.bad-text { color: var(--bad); font-size: .88rem; }
code { font-size: .95rem; background: var(--accent-soft); padding: 1px 6px; border-radius: 4px; }
</style>
