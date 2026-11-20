<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import { buildClassScores, termOf, type ClassScoreData, type PointRow, type ScoreStudent, type Term } from "~/utils/classScores"
import { loadClassScores } from "~/utils/classScoreStore"

// Marks of what happens in class, per class and term: attendance, +1 for speaking up, oral checks, homework, and a
// summary with the Excel file. The tab is kept in the address (?tab=) so a reload stays on it.
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("classScores.pageTitle") })

const TABS = ["attendance", "points", "oral", "homework", "summary"] as const
type Tab = typeof TABS[number]

const route = useRoute()
const router = useRouter()
const classId = route.params.classId as string
const client = useSupabaseClient<Database>()

const tab = computed<Tab>({
  get: () => (TABS as readonly string[]).includes(route.query.tab as string) ? route.query.tab as Tab : "attendance",
  set: v => router.replace({ query: { ...route.query, tab: v } }),
})
const term = ref<Term>(termOf(new Date()))
const cls = shallowRef<Pick<Tables<"classes">, "id" | "name"> | null>(null)
const students = shallowRef<ScoreStudent[]>([])
const data = shallowRef<ClassScoreData | null>(null)
const loaded = ref(false)
const error = ref("")

const rows = computed(() => (data.value ? buildClassScores(students.value, data.value) : []))

async function reload() {
  try {
    data.value = await loadClassScores(client, classId, term.value)
    error.value = ""
  } catch (e) {
    error.value = t("classScores.loadFailed", { msg: (e as Error).message })
  }
}

onMounted(async () => {
  try {
    const [c, st] = await Promise.all([
      client.from("classes").select("id, name").eq("id", classId).maybeSingle(),
      client.from("student_progress").select("user_id, full_name, username, email").eq("class_id", classId),
    ])
    if (c.error) throw c.error
    if (st.error) throw st.error
    cls.value = c.data
    students.value = (st.data ?? []) as ScoreStudent[]
    if (c.data) await reload()
  } catch (e) {
    error.value = t("classScores.loadFailed", { msg: (e as Error).message })
  }
  loaded.value = true
})
watch(term, reload)

function added(row: PointRow) {
  if (data.value) data.value = { ...data.value, points: [...data.value.points, row] }
}
function removed(id: string) {
  if (data.value) data.value = { ...data.value, points: data.value.points.filter(p => p.id !== id) }
}
</script>

<template>
  <div>
    <BackLink :to="`/teacher/classes/${classId}`" :label="cls?.name ?? $t('nav.myClasses')" />
    <Skeleton v-if="!loaded" />
    <p v-else-if="error && !data" class="fb no">{{ error }}</p>
    <p v-else-if="!cls" class="card muted">{{ $t("classPage.notFound") }}</p>
    <template v-else>
      <div class="head">
        <div>
          <h1>{{ $t("classScores.title", { name: cls.name }) }}</h1>
          <p class="sub">{{ $t("classScores.intro") }}</p>
        </div>
        <label class="term">
          <span class="small muted">{{ $t("classScores.term") }}</span>
          <select v-model.number="term">
            <option :value="1">{{ $t("classScores.termN", { n: 1 }) }}</option>
            <option :value="2">{{ $t("classScores.termN", { n: 2 }) }}</option>
          </select>
        </label>
      </div>
      <p v-if="error" class="fb no">{{ error }}</p>
      <div class="row tabs" role="tablist" :aria-label="$t('classScores.pageTitle')">
        <button
          v-for="k in TABS"
          :key="k"
          class="btn small"
          role="tab"
          :aria-selected="tab === k"
          :class="{ primary: tab === k }"
          @click="tab = k"
        >{{ $t(`classScores.tab.${k}`) }}</button>
      </div>

      <EmptyState v-if="!rows.length" icon="users" :title="$t('gradebook.noStudents')" :text="$t('gradebook.noStudentsHint')" />
      <template v-else-if="data">
        <ClassScoresAttendance v-if="tab === 'attendance'" :class-id="classId" :term="term" :rows="rows" :data="data" @changed="reload" />
        <ClassScoresParticipation v-else-if="tab === 'points'" :class-id="classId" :term="term" :rows="rows" :points="data.points" @added="added" @removed="removed" />
        <ClassScoresScoreColumns v-else-if="tab === 'oral' || tab === 'homework'" :key="tab" :class-id="classId" :term="term" :kind="tab" :rows="rows" :data="data" @changed="reload" />
        <ClassScoresSummary v-else :class-name="cls.name" :term="term" :rows="rows" :data="data" />
      </template>
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); flex-wrap: wrap; }
.term { display: grid; gap: 4px; }
.tabs { margin-bottom: var(--space-md); flex-wrap: wrap; }
</style>
