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
const queue = useGradingQueue()
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

// ---- deadline: past it students cannot work, and the lesson closes itself (pg_cron, every minute) ----
const dueEditing = ref<string | null>(null)
const dueValue = ref("")
function editDue(lessonId: string) {
  const current = unlocked.value.get(lessonId)?.due_at
  // Default: one week from now at 21:00.
  const d = new Date(Date.now() + 7 * 864e5)
  d.setHours(21, 0, 0, 0)
  dueValue.value = toLocalInput(current ?? d.toISOString())
  dueEditing.value = lessonId
}
async function saveDue(lessonId: string, clear = false) {
  if (await workspace.saveDue(lessonId, clear ? null : new Date(dueValue.value).toISOString())) dueEditing.value = null
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

// ---- who may work on a lesson (default: the whole class) ----
const whoOpen = ref<string | null>(null)
const whoText = (lessonId: string) => {
  const st = unlocked.value.get(lessonId)
  return st?.for_all ? t("classPage.wholeClass") : t("classPage.someStudents", { n: picks.value.get(lessonId)?.size ?? 0, total: students.value.length })
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

            <div v-if="unlocked.has(l.id) && isOpen(l.id)" :id="`lesson-${l.id}`" class="lesson-body">
              <div class="lesson-stats">
                <div class="stat-cell">
                  <span class="small muted">{{ $t("classPage.submitted") }}</span>
                  <StatBar :value="percentOf(lessonStats(l.id).done, students.length)" :text="`${lessonStats(l.id).done}/${students.length}`" />
                </div>
                <div class="stat-cell">
                  <span class="small muted">{{ $t("classPage.accuracy") }}</span>
                  <StatBar :value="lessonStats(l.id).accuracy" />
                </div>
                <div class="stat-cell waiting">
                  <span class="small muted">{{ $t("classPage.waiting") }}</span>
                  <span class="row">
                    <span class="badge" :class="lessonStats(l.id).waiting ? 'submitted' : ''">{{ lessonStats(l.id).waiting }}</span>
                    <template v-if="lessonStats(l.id).waiting">
                      <button class="link small" @click="queue.start(l.id, classId)">{{ $t("classPage.queue") }}</button>
                      <button
                        class="btn small" :class="armed === `release-${l.id}` ? 'danger' : 'ghost'" :disabled="busy === `release-${l.id}`"
                        :title="$t('classPage.releaseTitle')" @click="releaseAll(l.id)"
                      >{{ armed === `release-${l.id}` ? $t("common.confirmAgain") : $t("classPage.release") }}</button>
                    </template>
                  </span>
                </div>
              </div>

              <div>
                <button type="button" class="btn small" @click="progressOpen = l.id"><Icon name="clipboard" /> {{ $t("classPage.lessonProgress.open") }}</button>
              </div>

              <div class="lesson-controls">
                <span class="row">
                  <button v-if="unlocked.get(l.id)!.closed" class="btn ghost small" :disabled="busy === l.id" @click="setClosed(l.id, false)">{{ $t("classPage.reopen") }}</button>
                  <button
                    v-else class="btn small" :class="armed === `close-${l.id}` ? 'danger' : 'ghost'" :disabled="busy === l.id"
                    :title="$t('classPage.closeTitle')" @click="setClosed(l.id, true)"
                  >{{ armed === `close-${l.id}` ? $t("classPage.closeConfirm") : $t("classPage.close") }}</button>
                  <button
                    v-if="canTakeBack(l.id)" class="btn small" :class="armed === `back-${l.id}` ? 'danger' : 'ghost'" :disabled="busy === l.id"
                    :title="$t('classPage.takeBackTitle')" @click="takeBack(l.id)"
                  >{{ armed === `back-${l.id}` ? $t("classPage.takeBackConfirm") : $t("classPage.takeBack") }}</button>
                  <span v-else class="opt">
                    <button type="button" class="btn small ghost" disabled>{{ $t("classPage.takeBack") }}</button>
                    <InfoTip :text="$t('classPage.takeBackBlockedTip', lessonStats(l.id).started)" />
                  </span>
                  <button class="btn ghost small" @click="whoOpen = whoOpen === l.id ? null : l.id">
                    <Icon name="users" /> {{ whoText(l.id) }} <Icon :name="whoOpen === l.id ? 'chevronUp' : 'chevronDown'" />
                  </button>
                </span>

                <span class="due">
                  <template v-if="dueEditing === l.id">
                    <input v-model="dueValue" type="datetime-local" :aria-label="$t('classPage.dueLabel', { name: l.label })">
                    <button class="btn small primary" :disabled="!dueValue || busy === `due-${l.id}`" @click="saveDue(l.id)">{{ $t("common.save") }}</button>
                    <button v-if="unlocked.get(l.id)!.due_at" class="btn small ghost" :disabled="busy === `due-${l.id}`" @click="saveDue(l.id, true)">{{ $t("classPage.dueClear") }}</button>
                    <button class="btn small ghost" @click="dueEditing = null">{{ $t("common.cancel") }}</button>
                  </template>
                  <template v-else-if="unlocked.get(l.id)!.due_at">
                    <span class="small" :class="{ late: isPastDue(unlocked.get(l.id)!.due_at) }">
                      <Icon name="clock" /> {{ formatDate(unlocked.get(l.id)!.due_at) }} · {{ timeLeft(unlocked.get(l.id)!.due_at) || $t("classPage.duePassed") }}
                    </span>
                    <button v-if="!unlocked.get(l.id)!.closed" class="link small" @click="editDue(l.id)">{{ $t("common.edit") }}</button>
                  </template>
                  <button v-else-if="!unlocked.get(l.id)!.closed" class="link small" @click="editDue(l.id)">{{ $t("classPage.dueAdd") }}</button>
                </span>

                <span class="toggles">
                  <span class="opt">
                    <label class="toggle small">
                      <input type="checkbox" :checked="unlocked.get(l.id)!.show_results" :disabled="busy === `show-${l.id}`" @change="setSetting(l.id, 'show', { show_results: ($event.target as HTMLInputElement).checked })">
                      {{ $t("classPage.showResults") }}
                    </label>
                    <InfoTip :text="$t('giveForm.showResultsTip')" />
                  </span>
                  <span class="opt">
                    <label class="toggle small">
                      <input type="checkbox" :checked="unlocked.get(l.id)!.shuffle" :disabled="busy === `shuffle-${l.id}`" @change="setSetting(l.id, 'shuffle', { shuffle: ($event.target as HTMLInputElement).checked })">
                      {{ $t("classPage.shuffle") }}
                    </label>
                    <InfoTip :text="$t('giveForm.shuffleTip')" />
                  </span>
                </span>
              </div>

              <div v-if="whoOpen === l.id" class="who-panel">
                <span class="row">
                  <label class="toggle"><input type="radio" :checked="unlocked.get(l.id)!.for_all" :disabled="busy === `who-${l.id}`" @change="setSetting(l.id, 'who', { for_all: true })"> {{ $t("classPage.whoAll") }}</label>
                  <label class="toggle"><input type="radio" :checked="!unlocked.get(l.id)!.for_all" :disabled="busy === `who-${l.id}`" @change="setSetting(l.id, 'who', { for_all: false })"> {{ $t("classPage.whoSome") }}</label>
                </span>
                <template v-if="!unlocked.get(l.id)!.for_all">
                  <p v-if="!students.length" class="muted small">{{ $t("classPage.noStudents") }}</p>
                  <div v-else class="row picks">
                    <label v-for="st in students" :key="st.user_id ?? ''" class="pick" :class="{ on: picks.get(l.id)?.has(st.user_id ?? '') }">
                      <input type="checkbox" :checked="picks.get(l.id)?.has(st.user_id ?? '')" :disabled="busy === `pick-${l.id}-${st.user_id}`" @change="togglePick(l.id, st.user_id ?? '')">
                      {{ personName(st) }}
                    </label>
                  </div>
                  <p class="hint">{{ $t("classPage.whoHint") }}</p>
                </template>
              </div>
            </div>
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
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.code-box { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
.code { font-size: 1.3rem; letter-spacing: .15em; font-variant-numeric: tabular-nums; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.section-head h2 { margin: 0; }
.section-head .btn { padding: 4px 12px; }

.help { margin: 0 0 12px; font-size: .9rem; color: var(--muted); }
.help summary { cursor: pointer; color: var(--accent); font-weight: 500; width: fit-content; }
.help ul { margin: 8px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }

.phase { font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 16px 0 6px; }
.lesson { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 10px; }
.lesson.given { border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); }
.lesson-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.lesson-name { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-width: 0; }
.lesson-name a { text-decoration: none; }
.lesson-top .btn { padding: 4px 12px; }
.top-actions { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.missing-btn { color: var(--warn); border-color: var(--warn); }
.edit-btn { text-decoration: none; }
.chev { width: 26px; height: 26px; padding: 0; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--muted); cursor: pointer; flex: none; align-self: center; }
.chev:hover { border-color: var(--accent); color: var(--accent); }
.folded { margin: -4px 0 0 34px; }
.lesson-body { display: flex; flex-direction: column; gap: 10px; }
.expand-all { margin: 0 0 8px; text-align: right; }
.own { font-size: .72rem; }
.lesson-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.stat-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.stat-cell :deep(.meter) { min-width: 0; }
.waiting .row { gap: 8px; flex-wrap: wrap; }
.waiting .btn { padding: 2px 8px; }
.lesson-controls { display: flex; align-items: center; gap: 8px 16px; flex-wrap: wrap; padding-top: 10px; border-top: 1px dashed var(--line); }
.lesson-controls .row { gap: 6px; }
.lesson-controls .btn { padding: 3px 10px; }
.due { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.due input { width: auto; padding: 2px 6px; }
.toggles { display: inline-flex; gap: 6px 14px; flex-wrap: wrap; }
.opt { display: inline-flex; align-items: center; gap: 6px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.late { color: var(--bad); }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.notice { margin: 0; }
.who-panel { display: flex; flex-direction: column; gap: 8px; background: var(--bg); border-radius: 8px; padding: 10px 12px; }
.picks { gap: 6px; }
.pick { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--card); cursor: pointer; font-size: .88rem; }
.pick.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }


@media (max-width: 640px) {
  .lesson-stats { grid-template-columns: 1fr 1fr; }
  .stat-cell.waiting { grid-column: span 2; }
  .code-box { width: 100%; justify-content: space-between; }
}
</style>
