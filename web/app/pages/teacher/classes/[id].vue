<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Course } from "~/utils/course"
import type { GiveSettings } from "~/utils/classLesson"
import type { ClassStudentRow } from "~/composables/useClassWorkspace"

definePageMeta({ roles: ["teacher"] })

const route = useRoute()
const classId = route.params.id as string
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { load } = useCourse()
const { t } = useI18n()

type ClassRow = Tables<"classes"> & { courses: Pick<Tables<"courses">, "name"> | null }

const cls = shallowRef<ClassRow | null>(null)
const outline = shallowRef<Course | null>(null)
/** The class's lessons and what a change to them moves (numbers, who owes work): see useClassWorkspace. */
const workspace = useClassWorkspace(classId, outline, cls)
const {
  settings: unlocked, picks, stateOf, students, busy, notice, armed, lessonName, missingByLesson, missingOf, missingCount, remindText, remindAll,
  lessonStats, givenToOthers, canTakeBack, takeBack, setClosed, setSetting, releaseAll, togglePick, loadStudents,
} = workspace
const otherClasses = shallowRef<Pick<Tables<"classes">, "id" | "name">[]>([])
const loaded = ref(false)
const error = ref("")
// The outcome of moving a student shows as a toast.
const toast = useToast()

onMounted(async () => {
  try {
    const { data, error: e } = await client.from("classes").select("*, courses(name)").eq("id", classId).maybeSingle()
    if (e) throw e
    cls.value = data as ClassRow | null
    if (!cls.value) return
    const [o, others] = await Promise.all([
      load(cls.value.course_id, true),
      client.from("classes").select("id, name").neq("id", classId).order("name"),
      workspace.load(cls.value.course_id),
    ])
    outline.value = o
    otherClasses.value = others.data ?? []
  } catch (e) {
    error.value = t("classPage.loadFailed", { msg: (e as Error).message })
  } finally {
    loaded.value = true
  }
})
useHead({ title: () => t("classPage.pageTitle", { name: cls.value?.name ?? "" }) })

/** The lesson whose "Chưa nộp" popup is open. */
const missingOpen = ref<string | null>(null)
/** The lesson whose "Tình trạng nộp bài" popup (every student, where they stand) is open. */
const progressOpen = ref<string | null>(null)

// One lesson at a time opens its panel (info + settings) before it is given.
const setupOpen = ref<string | null>(null)
const toggleSetup = (lessonId: string) => (setupOpen.value = setupOpen.value === lessonId ? null : lessonId)
const pickable = computed(() => students.value.map(st => ({ id: st.user_id ?? "", name: personName(st) || "?" })))

async function give(lessonId: string, settings: GiveSettings) {
  if (await workspace.give(lessonId, settings)) setupOpen.value = null
}

// ---- a given lesson folds down to one line; unfolded it shows its numbers and controls ----
const openLessons = shallowRef(new Set<string>())
const isOpen = (lessonId: string) => openLessons.value.has(lessonId)
function toggleOpen(lessonId: string) {
  const next = new Set(openLessons.value)
  if (!next.delete(lessonId)) next.add(lessonId)
  openLessons.value = next
}
/** The given lessons on the current page of the list: what "expand all" acts on. */
const givenShown = computed(() => lessonFilter.groups.flatMap(g => g.lessons).filter(l => unlocked.value.has(l.id)).map(l => l.id))
const allOpen = computed(() => givenShown.value.length > 0 && givenShown.value.every(isOpen))
function toggleAll() {
  const next = new Set(openLessons.value)
  for (const id of givenShown.value) {
    if (allOpen.value) next.delete(id)
    else next.add(id)
  }
  openLessons.value = next
}
/** One line for a folded lesson: how many have submitted, how well, how many wait for a grade. */
const summaryOf = (lessonId: string) => {
  const n = lessonStats(lessonId)
  return t("classPage.summary", { done: n.done, total: students.value.length, acc: n.accuracy === null ? "-" : `${n.accuracy}%`, waiting: n.waiting })
}

// ---- numbers ----
const lessonIds = computed(() => outline.value?.order ?? [])
const { isAdmin } = useProfile()
const canEditLesson = (l: { createdBy: string | null }) => isAdmin.value || (!!l.createdBy && l.createdBy === user.value?.sub)

// Lesson list: search, kind, term, author and how the lesson stands in this class, paged in the browser.
const LESSON_STATUSES = ["given", "notGiven", "open", "closed", "waiting"] as const
const lessonStatuses = computed(() => LESSON_STATUSES.map(key => ({ key, label: t(`lessonFilter.status.${key}`) })))
const lessonFilter = useLessonFilter(outline, {
  match: (l, status) => {
    switch (status) {
      case "given": return stateOf(l.id) !== "notGiven"
      case "notGiven": case "open": case "closed": return stateOf(l.id) === status
      case "waiting": return lessonStats(l.id).waiting > 0
      default: return true
    }
  },
})


// ---- moving a student ----
async function moveStudent(s: ClassStudentRow, target: string) {
  if (!target) return
  busy.value = s.user_id
  const { error: e } = await client.from("profiles").update({ class_id: target }).eq("id", s.user_id ?? "")
  busy.value = null
  if (e) {
    toast.error(t("classPage.moveFailed", { name: personName(s), msg: errorText(e.message) }))
    return
  }
  toast.ok(t("classPage.moved", { name: personName(s), cls: otherClasses.value.find(c => c.id === target)?.name }))
  await loadStudents()
}

const copied = ref(false)
async function copyCode() {
  if (!cls.value) return
  try {
    await navigator.clipboard.writeText(cls.value.join_code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* the code stays visible to copy by hand */ }
}
</script>

<template>
  <div>
    <BackLink to="/teacher" :label="$t('nav.myClasses')" />
    <Skeleton v-if="!loaded" />
    <p v-else-if="error" class="fb no">{{ error }}</p>
    <p v-else-if="!cls" class="card muted">{{ $t("classPage.notFound") }}</p>
    <template v-else>
      <div class="head">
        <div>
          <h1>{{ $t("nav.classBadge", { name: cls.name }) }}</h1>
          <p class="sub">{{ localName(cls.courses?.name) }} · {{ $t("common.students", students.length) }} · {{ $t("classPage.given", { n: unlocked.size, total: lessonIds.length }) }}</p>
        </div>
        <div class="code-box">
          <span class="small muted">{{ $t("classPage.code") }}</span>
          <b class="code">{{ cls.join_code }}</b>
          <button class="btn small" @click="copyCode">{{ copied ? $t("common.copied") : $t("common.copy") }}</button>
        </div>
      </div>
      <ClassAnnouncements :class-id="cls.id" can-post />

      <section class="card">
        <div class="section-head">
          <h2>{{ $t("nav.lessons") }}</h2>
          <span class="row">
            <NuxtLink :to="`/teacher/lessons/new?class=${cls.id}`" class="btn primary small">{{ $t("classPage.newLesson") }}</NuxtLink>
            <NuxtLink :to="`/teacher/gradebook/${cls.id}`" class="btn small">{{ $t("gradebook.open") }}</NuxtLink>
            <NuxtLink :to="`/teacher/analysis/${cls.id}`" class="btn small">{{ $t("analysis.open") }}</NuxtLink>
            <NuxtLink :to="`/teacher/review/${cls.id}`" class="btn small">{{ $t("classPage.review") }}</NuxtLink>
            <NuxtLink :to="`/teacher/grading?class=${cls.id}`" class="btn ghost small">{{ $t("classPage.grade") }} →</NuxtLink>
          </span>
        </div>
        <details class="help">
          <summary>{{ $t("classPage.helpTitle") }}</summary>
          <ul>
            <li v-for="k in ['give', 'who', 'close', 'due', 'back', 'results']" :key="k" v-html="$t(`classPage.help.${k}`)" />
          </ul>
        </details>
        <p v-if="!lessonIds.length" class="muted small">{{ $t("classPage.noLessons") }}</p>
        <LessonFilters v-else :filter="lessonFilter" :phases="outline?.phases ?? []" :statuses="lessonStatuses" />
        <p v-if="lessonIds.length && !lessonFilter.total" class="muted small">{{ $t("lessonFilter.none") }}</p>
        <p v-if="givenShown.length" class="expand-all">
          <button type="button" class="link small" @click="toggleAll">{{ allOpen ? $t("classPage.collapseAll") : $t("classPage.expandAll") }}</button>
        </p>

        <template v-for="phase in lessonFilter.groups" :key="phase.id">
          <h3 v-if="phase.lessons.length" class="phase">{{ localName(phase.name) }}</h3>
          <div v-for="l in phase.lessons" :key="l.id" class="lesson" :class="{ given: unlocked.has(l.id) }">
            <div class="lesson-top">
              <div class="lesson-name">
                <button
                  v-if="unlocked.has(l.id)" type="button" class="chev" :aria-expanded="isOpen(l.id)" :aria-controls="`lesson-${l.id}`"
                  :aria-label="isOpen(l.id) ? $t('classPage.collapse') : $t('classPage.expand')" :title="isOpen(l.id) ? $t('classPage.collapse') : $t('classPage.expand')"
                  @click="toggleOpen(l.id)"
                ><Icon :name="isOpen(l.id) ? 'chevronDown' : 'chevronRight'" /></button>
                <NuxtLink :to="`/lessons/${l.id}`"><b>{{ l.label }}</b> - {{ l.title }}</NuxtLink>
                <span v-if="l.createdBy" class="badge own">{{ $t("classPage.byTeacher") }}</span>
              </div>
              <span class="top-actions">
                <NuxtLink v-if="canEditLesson(l)" :to="`/teacher/lessons/${l.id}?class=${classId}`" class="btn small ghost edit-btn" :title="$t('classPage.editLessonTitle')">
                  <Icon name="pencil" /> {{ $t("classPage.editLesson") }}
                </NuxtLink>
                <button v-if="unlocked.has(l.id) && missingCount(l.id)" type="button" class="btn small ghost missing-btn" @click="missingOpen = l.id">
                  {{ $t("classPage.missingBtn", { n: missingCount(l.id) }) }}
                </button>
                <button
                  v-if="!unlocked.has(l.id)" class="btn small" :class="setupOpen === l.id ? 'ghost' : 'primary'"
                  :aria-expanded="setupOpen === l.id" :aria-controls="`setup-${l.id}`" @click="toggleSetup(l.id)"
                >{{ $t("classPage.give") }} <Icon :name="setupOpen === l.id ? 'chevronUp' : 'chevronDown'" /></button>
                <span v-else class="badge" :class="stateOf(l.id) === 'closed' ? '' : 'done'">
                  {{ stateOf(l.id) === "closed" ? $t("classPage.stateClosed") : $t("classPage.stateOpen") }}
                </span>
              </span>
            </div>
            <p v-if="unlocked.has(l.id) && !isOpen(l.id)" class="small muted folded">
              {{ summaryOf(l.id) }}
              <span v-if="unlocked.get(l.id)!.due_at" :class="{ late: isPastDue(unlocked.get(l.id)!.due_at) }"> · <Icon name="clock" /> {{ formatDate(unlocked.get(l.id)!.due_at) }}</span>
            </p>

            <ClassLessonSetup
              v-if="!unlocked.has(l.id) && setupOpen === l.id"
              :id="`setup-${l.id}`" :lesson-id="l.id" :class-name="cls.name" :students="pickable"
              :assigned-to="givenToOthers(l.id)" :busy="busy === l.id"
              @give="give(l.id, $event)" @cancel="setupOpen = null"
            />
            <!-- Outside the "given" block, so it also shows after a lesson is taken back or fails to be given. -->
            <p v-if="notice?.lessonId === l.id" class="fb small notice" :class="notice.ok ? 'ok' : 'no'" role="status">{{ notice.text }}</p>

            <ClassLessonBody
              v-if="unlocked.has(l.id) && isOpen(l.id)" :id="`lesson-${l.id}`" :workspace="workspace" :class-id="classId" :lesson-id="l.id" :label="l.label"
              @progress="progressOpen = l.id"
            />
          </div>
        </template>
        <Pager v-model:page="lessonFilter.page" :page-size="lessonFilter.pageSize" :total="lessonFilter.total" />
      </section>

      <ClassStudents
        :students="students" :given="unlocked.size" :other-classes="otherClasses" :busy="busy" :join-code="cls.join_code"
        @move="moveStudent"
      />

      <LessonProgressDialog
        v-if="progressOpen"
        :lesson-id="progressOpen" :lesson-name="lessonName(progressOpen)" :classes="[{ id: classId, name: cls.name }]"
        @close="progressOpen = null"
      />

      <MissingWorkDialog
        v-if="missingOpen"
        :lesson="lessonName(missingOpen)" :due="missingOf(missingOpen)?.due ?? unlocked.get(missingOpen)?.due_at ?? null"
        :people="missingOf(missingOpen)?.people ?? []"
        :remind="missingOf(missingOpen) ? remindText(missingOf(missingOpen)!) : ''" :remind-all="remindAll"
        @close="missingOpen = null"
      />
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-lg); flex-wrap: wrap; margin-bottom: var(--space-md); }
.code-box { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 8px 12px; }
.code { font-size: 1.3rem; letter-spacing: .15em; font-variant-numeric: tabular-nums; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-sm); }
.section-head h2 { margin: 0; }
.section-head .btn { padding: 4px 12px; }

.help { margin: 0 0 12px; font-size: .9rem; color: var(--muted); }
.help summary { cursor: pointer; color: var(--accent); font-weight: 500; width: fit-content; }
.help ul { margin: 8px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: var(--space-xs); }

.phase { font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 16px 0 6px; }
.lesson { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 10px; }
.lesson.given { border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); }
.lesson-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.lesson-name { display: flex; align-items: baseline; gap: var(--space-sm); flex-wrap: wrap; min-width: 0; }
.lesson-name a { text-decoration: none; }
.lesson-top .btn { padding: 4px 12px; }
.top-actions { display: inline-flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.missing-btn { color: var(--warn); border-color: var(--warn); }
.edit-btn { text-decoration: none; }
.chev { width: 26px; height: 26px; padding: 0; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--bg); color: var(--muted); cursor: pointer; flex: none; align-self: center; }
.chev:hover { border-color: var(--accent); color: var(--accent); }
.folded { margin: -4px 0 0 34px; }
.expand-all { margin: 0 0 8px; text-align: right; }
.own { font-size: .72rem; }
.late { color: var(--bad); }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.notice { margin: 0; }


@media (max-width: 640px) {
  .code-box { width: 100%; justify-content: space-between; }
}
</style>
