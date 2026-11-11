<script setup lang="ts">
import type { Database } from "~/types/database.types"
import {
  LIST_COLUMNS, codeCountOf, copyExamSet, deleteExamSet, examAccess, removeShare, staffByIds, type Person, type ShareRow,
} from "~/utils/examStore"

// The exam sets a person can open: their own, the ones shared with them, and (for an admin) everyone's (RLS). Paged in
// the database, searched by title, filtered by grade and by who made them. Opening a set edits it (or only shows it, when
// it was shared as view-only) at /teacher/exams/<id>; "Tạo bộ đề mới" starts /teacher/exams/new.
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("examList.pageTitle") })
const client = useSupabaseClient<Database>()
const toast = useToast()
const { isAdmin } = useProfile()
const me = computed(() => useSupabaseUser().value?.sub)
const { listCourses } = useCourse()

interface ListRow {
  id: string; title: string; course_id: string | null; minutes: number; codes: string; mode: string; question_count: number
  owner_id: string; created_at: string; updated_at: string
  profiles: { full_name: string | null; username: string | null; email: string | null } | null
  exam_set_shares: ShareRow[]
}

const courses = shallowRef<{ id: string; name: string }[]>([])
const courseName = computed(() => new Map(courses.value.map(c => [c.id, localName(c.name)])))
const search = ref("")
const course = ref("")
const scope = ref<"all" | "mine" | "others">("all")
const list = useServerList<ListRow>(([from, to]) => {
  let q = client.from("exam_sets").select(LIST_COLUMNS, { count: "exact" })
  if (course.value) q = q.eq("course_id", course.value)
  if (scope.value === "mine" && me.value) q = q.eq("owner_id", me.value)
  if (scope.value === "others" && me.value) q = q.neq("owner_id", me.value)
  const term = likeTerm(search.value)
  if (term) q = q.ilike("title", `%${term}%`)
  return q.order("updated_at", { ascending: false }).order("id").range(from, to) as unknown as PromiseLike<PageResult<ListRow>>
}, { pageSize: 10, filters: [search, course, scope] })

onMounted(async () => {
  try {
    courses.value = (await listCourses()).map(c => ({ id: c.id, name: c.name }))
  } catch (e) {
    toast.error(errorText((e as Error).message))
  }
  await list.load()
})

// Teachers cannot read each other's profiles, so who made a shared set comes from the staff directory.
const owners = shallowRef(new Map<string, Person>())
watch(() => list.rows, async (rows) => {
  const missing = [...new Set(rows.filter(r => r.owner_id !== me.value && !r.profiles && !owners.value.has(r.owner_id)).map(r => r.owner_id))]
  if (!missing.length) return
  try {
    const found = await staffByIds(client, missing)
    owners.value = new Map([...owners.value, ...found.map(p => [p.id, p] as const)])
  } catch { /* the owner then shows as "?" */ }
})
const ownerLabel = (r: ListRow) => {
  if (r.owner_id === me.value) return t("examList.mine")
  const p = r.profiles ?? owners.value.get(r.owner_id)
  return (p && personName(p)) || "?"
}
const accessOf = (r: ListRow) => examAccess(r, me.value, isAdmin.value)

const filtered = computed(() => !!search.value.trim() || !!course.value || scope.value !== "all")
const confirm = useTwoClick()
const busy = ref("")
/** After a row is gone from this page: show the page before it when it was the last row of a later page, else reload. */
async function refreshAfterRemoval() {
  if (list.rows.length === 1 && list.page > 0) list.page--
  else await list.load()
}
async function remove(row: ListRow) {
  if (busy.value || !confirm.arm(`delete:${row.id}`)) return
  busy.value = row.id
  const error = await deleteExamSet(client, row.id)
  busy.value = ""
  if (error) return toast.error(error)
  toast.ok(t("examList.deleted", { title: row.title }))
  await refreshAfterRemoval()
}
async function leave(row: ListRow) {
  if (busy.value || !me.value || !confirm.arm(`leave:${row.id}`)) return
  busy.value = row.id
  const error = await removeShare(client, row.id, me.value)
  busy.value = ""
  if (error) return toast.error(error)
  toast.ok(t("examList.left", { title: row.title }))
  await refreshAfterRemoval()
}
async function copy(row: ListRow) {
  if (busy.value) return
  busy.value = row.id
  const made = await copyExamSet(client, row.id)
  busy.value = ""
  if (made.error || !made.id) return toast.error(made.error ?? "")
  toast.ok(t("examList.copied"))
  await navigateTo(`/teacher/exams/${made.id}`)
}

const sharing = shallowRef<ListRow | null>(null)
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h1>{{ $t("examList.pageTitle") }}</h1>
        <p class="sub">{{ $t("examList.intro") }}</p>
      </div>
      <NuxtLink class="btn primary" to="/teacher/exams/new"><Icon name="plus" /> {{ $t("examList.create") }}</NuxtLink>
    </div>

    <div class="row filters">
      <input v-model="search" type="search" :placeholder="$t('examList.search')" :aria-label="$t('examList.search')">
      <select v-model="scope" :aria-label="$t('examList.scope')">
        <option value="all">{{ $t("examList.scopeAll") }}</option>
        <option value="mine">{{ $t("examList.scopeMine") }}</option>
        <option value="others">{{ $t("examList.scopeOthers") }}</option>
      </select>
      <select v-model="course" :aria-label="$t('bank.allGrades')">
        <option value="">{{ $t("bank.allGrades") }}</option>
        <option v-for="c in courses" :key="c.id" :value="c.id">{{ localName(c.name) }}</option>
      </select>
      <span class="small muted">{{ $t("examList.found", { n: list.total }) }}</span>
    </div>

    <p v-if="list.error" class="fb no">{{ list.error }}</p>
    <Skeleton v-else-if="!list.rows.length && list.loading" :rows="4" />
    <EmptyState
      v-else-if="!list.rows.length" icon="file"
      :title="filtered ? $t('examList.noMatch') : $t('examList.empty')" :text="filtered ? '' : $t('examList.emptyText')"
    >
      <NuxtLink v-if="!filtered" class="btn primary" to="/teacher/exams/new"><Icon name="plus" /> {{ $t("examList.create") }}</NuxtLink>
    </EmptyState>
    <div v-else class="card table-wrap">
      <table class="stack-table">
        <thead>
          <tr>
            <th>{{ $t("examList.colTitle") }}</th><th>{{ $t("examList.colGrade") }}</th><th>{{ $t("examList.colQuestions") }}</th>
            <th>{{ $t("examList.colCodes") }}</th><th>{{ $t("examList.colUpdated") }}</th><th>{{ $t("examList.colOwner") }}</th><th class="no-label" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in list.rows" :key="r.id">
            <td :data-label="$t('examList.colTitle')">
              <NuxtLink :to="`/teacher/exams/${r.id}`"><b>{{ r.title }}</b></NuxtLink>
              <small class="muted block">
                {{ $t("examDoc.duration", { n: r.minutes }) }}
                <span v-if="accessOf(r) === 'manage' && r.exam_set_shares.length" class="badge">{{ $t("examList.sharedWithN", { n: r.exam_set_shares.length }) }}</span>
                <span v-else-if="accessOf(r) === 'edit'" class="badge">{{ $t("examList.canEdit") }}</span>
                <span v-else-if="accessOf(r) === 'view'" class="badge">{{ $t("examList.viewOnly") }}</span>
              </small>
            </td>
            <td :data-label="$t('examList.colGrade')">{{ (r.course_id && courseName.get(r.course_id)) || "–" }}</td>
            <td :data-label="$t('examList.colQuestions')">{{ r.question_count }}</td>
            <td :data-label="$t('examList.colCodes')">{{ codeCountOf(r.codes) }}</td>
            <td :data-label="$t('examList.colUpdated')">{{ formatDate(r.updated_at) }}</td>
            <td :data-label="$t('examList.colOwner')">{{ ownerLabel(r) }}</td>
            <td class="no-label actions">
              <NuxtLink class="btn small" :to="`/teacher/exams/${r.id}`">{{ $t(accessOf(r) === "view" ? "examList.open" : "common.edit") }}</NuxtLink>
              <button v-if="accessOf(r) === 'manage'" class="btn small" @click="sharing = r"><Icon name="users" /> {{ $t("examList.share") }}</button>
              <button class="btn small" :disabled="busy === r.id" @click="copy(r)">{{ $t("examList.copy") }}</button>
              <button v-if="accessOf(r) === 'manage'" class="btn small danger" :disabled="busy === r.id" @click="remove(r)">
                {{ confirm.armed.value === `delete:${r.id}` ? $t("common.confirmAgain") : $t("common.delete") }}
              </button>
              <button v-else class="btn small danger" :disabled="busy === r.id" @click="leave(r)">
                {{ confirm.armed.value === `leave:${r.id}` ? $t("common.confirmAgain") : $t("examList.leave") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pager v-model:page="list.page" :page-size="list.pageSize" :total="list.total" />

    <ExamShareDialog v-if="sharing" :exam-id="sharing.id" :title="sharing.title" @close="sharing = null" @changed="list.load()" />
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.filters { margin-bottom: 12px; }
.filters select { width: auto; }
.filters input { flex: 1 1 220px; min-width: 0; }
.block { display: block; }
.actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.badge { margin-left: 6px; }
</style>
