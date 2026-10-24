<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Lesson } from "~/utils/course"

definePageMeta({ key: route => route.fullPath })

const route = useRoute()
const { getLesson, load } = useCourse()
const found = await getLesson(route.params.id as string)
if (!found) throw createError({ statusCode: 404, statusMessage: tr("lessonPage.notFound"), fatal: true })
const loaded = found
const course = await load(loaded.courseId)
// Re-read after submitting: explanations come with the results.
const lesson = shallowRef(loaded)

useHead({ title: `${loaded.label} - ${loaded.title}` })
const { t } = useI18n()

const client = useSupabaseClient<Database>()
const { isStudent, myClass } = useProfile()
const user = useSupabaseUser()
// Content comes back empty when the lesson is not given to the reader's class, closed, or not open to them (RLS).
const noContent = loaded.sections.length === 0
/** For students: whether they may still work on the lesson (closed / not opened to them otherwise). */
const access = ref<LessonAccess>("open")
/** The class's deadline for this lesson; the page locks itself when it passes. */
const dueAt = ref<string | null>(null)
/** When the class shuffles this lesson: the student id that seeds their own question order. */
const shuffleFor = ref("")
const arrange = (l: Lesson) => (shuffleFor.value ? shuffleLesson(l, shuffleFor.value) : l)
const now = ref(Date.now())
// Teachers and admins open lessons as a preview with the answers shown.
const attempt = useAttempt(loaded, { preview: !isStudent.value })
const { state, results, score, total, answered, locked } = attempt
const feedback = shallowRef<Tables<"feedback">[]>([])

onMounted(async () => {
  if (isStudent.value && myClass.value) {
    const [cl, mine] = await Promise.all([
      client.from("class_lessons").select("for_all, closed, due_at, shuffle").eq("class_id", myClass.value.id).eq("lesson_id", loaded.id).maybeSingle(),
      client.from("class_lesson_students").select("lesson_id").eq("class_id", myClass.value.id).eq("lesson_id", loaded.id)
        .eq("student_id", user.value?.sub ?? "").maybeSingle(),
    ])
    access.value = cl.data ? accessOf(cl.data, !!mine.data) : "locked"
    dueAt.value = cl.data?.due_at ?? null
    shuffleFor.value = cl.data?.shuffle ? user.value?.sub ?? "" : ""
    lesson.value = arrange(lesson.value)
  }
  await attempt.load()
  state.blocked = access.value !== "open"
  if (state.id) {
    const { data } = await client.from("feedback").select("*").eq("attempt_id", state.id).order("created_at", { ascending: false })
    feedback.value = data ?? []
  }
  await refreshKey()
})
onBeforeUnmount(() => { attempt.flush() })

// Tick every 15 s: save what is pending before the deadline, and lock the page once it passes.
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (!dueAt.value) return
  tick = setInterval(() => {
    now.value = Date.now()
    const left = Date.parse(dueAt.value!) - now.value
    if (left <= 60_000 && left > 0) attempt.flush()
    if (left <= 0 && access.value === "open") {
      access.value = "closed"
      state.blocked = true
    }
  }, 15_000)
})
onBeforeUnmount(() => clearInterval(tick))
const dueText = computed(() => (dueAt.value ? timeLeft(dueAt.value, now.value) : ""))

// Teachers and admins assign the lesson to classes right from the preview.
const assign = useAssignments()
/** The popup of where each student stands with this lesson, in the classes that have it. */
const progressOpen = ref(false)
onMounted(() => { if (attempt.preview && !noContent) assign.load(loaded.courseId, [loaded.id]) })

/** Explanations and answers arrive with the lesson once results are out. */
async function refreshKey() {
  if (state.released && !hasAnswerKey(lesson.value)) lesson.value = arrange((await getLesson(loaded.id)) ?? lesson.value)
}

// Remount the sections when the answer key arrives so every item shows it.
const withKey = computed(() => hasAnswerKey(lesson.value))

const writing = computed({
  get: () => state.writing,
  set: (v: string) => attempt.setWriting(v),
})

const saveText = computed(() => ({
  idle: t("lessonPage.saveIdle"),
  saving: t("lessonPage.saveSaving"),
  saved: t("lessonPage.saveSaved"),
  error: t("lessonPage.saveError"),
}[state.save]))

const statusText = computed(() => {
  if (state.status === "in_progress") return `${saveText.value} · ${t("lessonPage.answered", { n: answered.value, total })}`
  if (state.status === "submitted") return state.released ? t("lessonPage.waitComment") : t("lessonPage.waitGrade")
  return t("lessonPage.graded")
})

// Submitting is final, so it takes a second click.
const submitArmed = ref(false)
const submitting = ref(false)
const submitError = ref("")
async function submit() {
  if (!submitArmed.value) {
    submitArmed.value = true
    setTimeout(() => { submitArmed.value = false }, 5000)
    return
  }
  submitArmed.value = false
  submitting.value = true
  submitError.value = errorText(await attempt.submit())
  submitting.value = false
  await refreshKey()
}
const unanswered = computed(() => total - answered.value)

const nextId = course.order[course.order.indexOf(loaded.id) + 1]
const next = nextId ? course.byId[nextId] : null
</script>

<template>
  <div>
    <BackLink :to="isStudent ? '/' : `/courses/${lesson.courseId}`" :label="isStudent ? $t('nav.roadmap') : $t('lessonPage.lessonList')" />
    <h1>{{ lesson.heading }}</h1>
    <p class="sub">{{ lesson.sub }}</p>

    <template v-if="attempt.preview">
      <p class="fb key preview-note">
        {{ $t("lessonPage.previewNote") }}
      </p>
      <div class="card assign-card">
        <div class="assign-head">
          <b>{{ $t("lessonPage.giveToClass") }}</b>
          <span class="row">
            <button
              v-if="assign.classesOf(loaded.id).length" type="button" class="btn small" :title="$t('lessonPage.progressTitle')"
              @click="progressOpen = true"
            >📋 {{ $t("classPage.lessonProgress.open") }}</button>
            <NuxtLink :to="`/teacher/print/${loaded.id}`" class="btn small ghost">🖨 {{ $t("lessonPage.print") }}</NuxtLink>
            <NuxtLink :to="`/teacher/print/${loaded.id}?key=1`" class="btn small ghost">{{ $t("lessonPage.printKey") }}</NuxtLink>
          </span>
        </div>
        <span class="small muted">{{ $t("lessonPage.giveHelp") }}</span>
        <LessonAssign :lesson-id="loaded.id" :assign="assign" />
        <p v-if="assign.error.value" class="fb no">{{ assign.error.value }}</p>
      </div>
    </template>

    <LessonProgressDialog
      v-if="progressOpen" :lesson-id="loaded.id" :lesson-name="`${loaded.label} - ${loaded.title}`" :classes="assign.classesOf(loaded.id)"
      @close="progressOpen = false"
    />

    <div v-if="noContent" class="card">
      <h2>{{ $t(`lessonPage.unavailable.${access}.title`) }}</h2>
      <p class="muted">
        {{ $t(`lessonPage.unavailable.${access}.text`) }}
      </p>
      <NuxtLink to="/" class="btn">{{ $t("join.toRoadmap") }}</NuxtLink>
    </div>
    <template v-else>

    <div v-for="f in feedback" :key="f.id" class="feedback-box">
      <b>{{ $t("lessonPage.teacherComment") }}</b> <span class="muted small">· {{ formatDate(f.created_at) }}</span>
      <p>{{ f.body }}</p>
      <div v-if="f.error_tags.length" class="row tags">
        <span v-for="t in f.error_tags" :key="t" class="badge open">{{ ERROR_CATEGORIES[t as keyof typeof ERROR_CATEGORIES] ?? t }}</span>
      </div>
    </div>

    <p v-if="!state.loaded" class="muted">{{ $t("common.loading") }}</p>
    <template v-else>
      <p v-if="dueAt && !locked" class="fb wait due-note">
        ⏰ {{ $t("roadmap.due", { date: formatDate(dueAt) }) }}<template v-if="dueText"> · {{ dueText }}</template>.
        {{ $t("lessonPage.dueNote") }}
      </p>
      <div v-if="locked" class="fb" :class="state.released ? 'ok' : 'wait'">
        <template v-if="state.released">{{ $t("lessonPage.result", { ok: score.ok, total }) }}</template>
        <template v-else-if="state.status === 'in_progress'">
          {{ access === "closed" ? $t("lessonPage.blockedClosed") : $t("lessonPage.blockedLocked") }}
        </template>
        <template v-else>{{ $t("lessonPage.submittedWait") }}</template>
      </div>
      <p v-else-if="!attempt.preview" class="hint">
        <span v-html="$t('lessonPage.howTo')" />
      </p>

      <section v-for="(s, i) in lesson.sections" :key="`${i}-${withKey}`" class="card">
        <span v-if="s.time" class="time">{{ s.time }}</span>
        <h2>{{ i + 1 }}. {{ s.title }}</h2>
        <p v-if="s.hint" class="hint" v-html="s.hint" />

        <div v-if="s.type === 'explain'" class="explain" v-html="s.html" />
        <LessonCardsSection v-else-if="s.type === 'cards'" :items="s.items" />
        <LessonQuestions
          v-else-if="isScored(s)"
          :section="s" :responses="state.responses" :results="results" :locked="locked" :show-key="attempt.preview"
          @respond="attempt.respond"
        />
        <textarea v-else-if="s.type === 'writing'" :id="`writing-${lesson.id}`" v-model="writing" :placeholder="s.placeholder" :disabled="locked" />
      </section>

      <div class="actions">
        <NuxtLink v-if="next" :to="`/lessons/${next.id}`" class="btn ghost">{{ $t("lessonPage.next", { label: next.label }) }} →</NuxtLink>
      </div>
      <p v-if="submitError" class="fb no">{{ $t("lessonPage.submitFailed", { msg: submitError }) }}</p>

      <div v-if="!attempt.preview" class="scorebar">
        <div class="meta">
          <b v-if="results">{{ $t("lessonPage.score", { ok: score.ok, total }) }}</b>
          <b v-else>{{ $t("lessonPage.size", { total }) }}</b>
          <small>{{ statusText }}</small>
        </div>
        <button v-if="!locked" class="btn" :class="submitArmed ? 'danger' : 'primary'" :disabled="submitting" @click="submit">
          <template v-if="submitting">{{ $t("lessonPage.submitting") }}</template>
          <template v-else-if="submitArmed">{{ unanswered > 0 ? $t("lessonPage.blanksLeft", { n: unanswered }) : "" }}{{ $t("lessonPage.submitConfirm") }}</template>
          <template v-else>{{ $t("lessonPage.submit") }}</template>
        </button>
      </div>
    </template>
    </template>
  </div>
</template>

<style scoped>
.actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; margin: 4px 0 16px; }
.tags { margin-top: 8px; }
.assign-card { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; }
.assign-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.assign-head .btn { padding: 2px 10px; }
.fb.wait { background: var(--warn-soft); color: var(--warn); margin: 0 0 16px; }
.due-note { font-weight: 500; }
.fb.ok:not(.feedback-box), .preview-note { margin: 0 0 16px; }
</style>
