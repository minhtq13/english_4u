<script setup lang="ts">
import type { Views } from "~/types/database.types"
import type { StudentSort, StudentStatus } from "~/utils/studentFilter"

// The students of one class with their numbers: search, who to show, the order, and pages of 10. A class is small, so
// its rows come loaded whole (from the student_progress view) and this works on them in the browser.
type StudentRow = Pick<Views<"student_progress">, "user_id" | "full_name" | "email" | "username" | "submitted" | "waiting" | "ok" | "done" | "last_activity">
const props = defineProps<{
  students: StudentRow[]
  /** How many lessons are given to the class: the denominator of "submitted". */
  given: number
  otherClasses: { id: string; name: string }[]
  /** The student being moved, whose row is locked. */
  busy: string | null
  joinCode: string
}>()
const emit = defineEmits<{ move: [student: StudentRow, classId: string] }>()

const q = ref("")
const status = ref<StudentStatus>("")
const sort = ref<StudentSort>("name")
const filtered = computed(() => filterStudents(props.students, { q: q.value, status: status.value, sort: sort.value }))
const paged = usePaged(filtered, 10)
watch([q, status, sort], () => { paged.page = 0 })
const active = computed(() => !!(q.value.trim() || status.value))
function reset() {
  q.value = ""
  status.value = ""
}

const numbers = (s: StudentRow) => ({ done: s.submitted ?? 0, accuracy: percentOf(s.ok, s.done), waiting: s.waiting ?? 0, last: s.last_activity })
</script>

<template>
  <section class="card">
    <div class="section-head">
      <h2>{{ $t("nav.students") }}</h2>
      <NuxtLink to="/teacher/students" class="btn ghost small">{{ $t("classPage.manageStudents") }} →</NuxtLink>
    </div>
    <p v-if="!students.length" class="muted small" v-html="$t('classPage.noStudentsCode', { code: joinCode })" />
    <template v-else>
      <div class="row filters">
        <input v-model="q" type="search" :placeholder="$t('classPage.studentFilter.search')" :aria-label="$t('classPage.studentFilter.search')">
        <select v-model="status" :aria-label="$t('classPage.studentFilter.allStatuses')">
          <option value="">{{ $t("classPage.studentFilter.allStatuses") }}</option>
          <option value="waiting">{{ $t("classPage.studentFilter.waiting") }}</option>
          <option value="none">{{ $t("classPage.studentFilter.none") }}</option>
          <option value="idle">{{ $t("classPage.studentFilter.idle") }}</option>
        </select>
        <select v-model="sort" :aria-label="$t('accounts.sort')">
          <option value="name">{{ $t("classPage.studentFilter.sortName") }}</option>
          <option value="accuracy">{{ $t("classPage.studentFilter.sortAccuracy") }}</option>
          <option value="activity">{{ $t("classPage.studentFilter.sortActivity") }}</option>
          <option value="waiting">{{ $t("classPage.studentFilter.sortWaiting") }}</option>
        </select>
        <span class="small muted">{{ $t("common.students", paged.total) }}</span>
        <button v-if="active" type="button" class="link small" @click="reset">{{ $t("lessonFilter.clear") }}</button>
      </div>

      <p v-if="!paged.total" class="muted small">{{ $t("classPage.studentFilter.noMatch") }}</p>
      <div v-else class="table-wrap">
        <table class="stack-table stats-table">
          <thead>
            <tr>
              <th>{{ $t("common.student") }}</th><th>{{ $t("classPage.submittedLessons") }}</th><th>{{ $t("classPage.accuracy") }}</th>
              <th class="n">{{ $t("classPage.waiting") }}</th><th>{{ $t("classPage.lastActive") }}</th><th>{{ $t("classPage.moveTo") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in paged.rows" :key="s.user_id ?? ''">
              <td :data-label="$t('common.student')"><NuxtLink :to="`/teacher/students/${s.user_id}`"><b>{{ s.full_name || s.email }}</b></NuxtLink><br><span class="small muted">{{ loginOf(s) }}</span></td>
              <td :data-label="$t('classPage.submittedLessons')"><StatBar :value="percentOf(numbers(s).done, given)" :text="`${numbers(s).done}/${given}`" /></td>
              <td :data-label="$t('classPage.accuracy')"><StatBar :value="numbers(s).accuracy" /></td>
              <td :data-label="$t('classPage.waiting')" class="n">{{ numbers(s).waiting }}</td>
              <td :data-label="$t('classPage.lastActive')" class="small muted">{{ numbers(s).last ? formatDate(numbers(s).last) : $t("classPage.neverActive") }}</td>
              <td :data-label="$t('classPage.moveTo')">
                <select
                  :id="`move-${s.user_id}`"
                  :disabled="busy === s.user_id || !otherClasses.length"
                  value=""
                  @change="emit('move', s, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">{{ otherClasses.length ? $t("classPage.pickClass") : $t("classPage.noOtherClass") }}</option>
                  <option v-for="o in otherClasses" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pager v-model:page="paged.page" :page-size="paged.pageSize" :total="paged.total" />
    </template>
  </section>
</template>

<style scoped>
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.section-head h2 { margin: 0; }
.section-head .btn { padding: 4px 12px; }
.filters { margin-bottom: 10px; gap: 8px; align-items: center; }
.filters input { flex: 1 1 200px; min-width: 0; }
.filters select { width: auto; max-width: 100%; }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.stats-table th { white-space: nowrap; }
.stats-table td:has(.meter) { min-width: 140px; }
.stats-table a { text-decoration: none; }
.stats-table select { width: auto; }
.n { text-align: right; font-variant-numeric: tabular-nums; }
</style>
