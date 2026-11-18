<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { AttemptWithStudent } from "~/utils/attemptReview"
import type { Answer, Lesson, Response } from "~/utils/course"

// Remount per attempt, so "next" in the grading queue loads the following student's work.
definePageMeta({ roles: ["teacher"], key: route => route.fullPath })

const route = useRoute()
const client = useSupabaseClient<Database>()
const attemptId = route.params.id as string

const attempt = shallowRef<AttemptWithStudent | null>(null)
const feedback = shallowRef<Tables<"feedback">[]>([])
const errors = shallowRef<Tables<"error_log">[]>([])
const loaded = ref(false)

const { getLesson } = useCourse()
const lesson = shallowRef<Lesson | null>(null)
/** Graded answers (from submit_attempt); null while the attempt is still in progress. */
const answers = shallowRef<Record<string, Answer> | null>(null)
const responses = computed(() => (attempt.value?.answers ?? {}) as unknown as Record<string, Response>)
const score = computed(() => (attempt.value ? toScore(attempt.value.score) : undefined))
const student = computed(() => attempt.value?.profiles)

async function load() {
  const review = await readAttempt(client, attemptId)
  attempt.value = review?.attempt ?? null
  if (review) {
    lesson.value = lesson.value?.id === review.attempt.lesson_id ? lesson.value : await getLesson(review.attempt.lesson_id)
    answers.value = review.results as Record<string, Answer> | null
    feedback.value = review.feedback
    errors.value = review.errors
  }
  loaded.value = true
}
onMounted(load)
const { t } = useI18n()
useHead({ title: () => `${t("grading.grade")} ${attempt.value?.lesson_id ?? ""}` })

async function reloadErrors() {
  if (!attempt.value) return
  errors.value = await readErrors(client, attempt.value.user_id)
}

// ---- releasing results / letting the student redo ----
const acting = ref(false)
const actionMsg = ref("")
async function releaseResults() {
  if (!attempt.value) return
  acting.value = true
  const error = await releaseAttempt(client, attempt.value.id)
  acting.value = false
  actionMsg.value = error ?? t("attemptPage.released")
  if (!error && inQueue) return goNext()
  await load()
}

// ---- grading queue: ?queue=<lesson>&class=<class> walks through the class's submitted work, oldest first ----
const queueLesson = typeof route.query.queue === "string" ? route.query.queue : ""
const queueClass = typeof route.query.class === "string" ? route.query.class : ""
const inQueue = !!(queueLesson && queueClass)
const waitingIds = ref<string[]>([])
const queueDone = ref(false)
const queue = useGradingQueue()
async function loadQueue() {
  if (inQueue) waitingIds.value = await queue.waiting(queueLesson, queueClass)
}
onMounted(loadQueue)
const queuePos = computed(() => queuePosition(waitingIds.value, attemptId))
const linkTo = (id: string) => queueLink(id, queueLesson, queueClass)

/** After grading this one: the oldest still waiting (this one is no longer in the list). */
async function goNext() {
  await loadQueue()
  const next = nextAfterGrading(waitingIds.value, attemptId)
  if (next) return navigateTo(linkTo(next))
  queueDone.value = true
  await load()
}
/** Skip without grading: the next one after this in submission order, wrapping around. */
function previous() {
  const prev = nextBefore(waitingIds.value, attemptId)
  if (prev) navigateTo(linkTo(prev))
}
function skip() {
  const next = nextAfterSkip(waitingIds.value, attemptId)
  if (next) navigateTo(linkTo(next))
}

const { armed, arm } = useTwoClick()
async function allowRedo() {
  if (!attempt.value || !arm("redo")) return
  acting.value = true
  // One transaction: the graded results go and the attempt reopens together.
  const error = await reopenAttempt(client, attempt.value.id)
  acting.value = false
  actionMsg.value = error ?? t("attemptPage.redone")
  await load()
}

</script>

<template>
  <div>
    <BackLink to="/teacher/grading" :label="$t('nav.grading')" />
    <div v-if="inQueue" class="queue-bar">
      <span v-if="queueDone" v-html="$t('attemptPage.queueDone')" />
      <span v-else-if="queuePos"><b>{{ $t("classPage.queue") }}</b> · {{ $t("attemptPage.queuePos", { n: queuePos, total: waitingIds.length }) }}</span>
      <span v-else><b>{{ $t("classPage.queue") }}</b> · {{ $t("grading.waitingCount", { n: waitingIds.length }) }}</span>
      <span class="row">
        <button v-if="waitingIds.some(id => id !== attemptId)" class="btn small ghost" @click="skip">{{ $t("attemptPage.skip") }} →</button>
        <NuxtLink to="/teacher/grading" class="btn small ghost">{{ $t("attemptPage.exit") }}</NuxtLink>
      </span>
    </div>
    <Skeleton v-if="!loaded" />
    <p v-else-if="!attempt || !lesson" class="muted">{{ $t("attemptPage.notFound") }}</p>
    <template v-else>
      <h1>{{ student ? personName(student) : "" }} · {{ lesson.label }} - {{ lesson.title }}</h1>
      <p class="sub">
        {{ lesson.title }} · {{ $t("attemptPage.scoreLine", { ok: score?.ok ?? 0, done: score?.done ?? 0, total: lessonTotal(lesson) }) }}
        · <span class="badge" :class="attempt.status">{{ ATTEMPT_STATUS[attempt.status] }}</span>
        · <NuxtLink :to="`/teacher/students/${attempt.user_id}`">{{ $t("attemptPage.profile") }}</NuxtLink>
      </p>
      <div class="row actions">
        <button v-if="attempt.status === 'submitted'" class="btn primary" :disabled="acting" @click="releaseResults">
          {{ inQueue ? $t("attemptPage.releaseNext") : $t("attemptPage.release") }}
        </button>
        <button v-if="attempt.status !== 'in_progress'" class="btn" :class="armed === 'redo' ? 'danger' : 'ghost'" :disabled="acting" @click="allowRedo">
          {{ armed === 'redo' ? $t("attemptPage.redoConfirm") : $t("attemptPage.redo") }}
        </button>
        <span v-if="attempt.status === 'in_progress'" class="small muted">{{ $t("attemptPage.notSubmitted") }}</span>
      </div>
      <p v-if="actionMsg" class="fb ok">{{ actionMsg }}</p>

      <section class="card">
        <h2>{{ $t("attemptPage.writing") }}</h2>
        <p v-if="attempt.writing.trim()" class="pre">{{ attempt.writing }}</p>
        <p v-else class="muted small">{{ $t("attemptPage.noWriting") }}</p>
      </section>

      <section class="card">
        <h2>{{ $t("attemptPage.auto") }}</h2>
        <p class="hint">{{ $t("attemptPage.autoHint") }}</p>
        <AttemptReview :lesson="lesson" :responses="responses" :answers="answers" />
      </section>
      <AttemptFeedback :attempt="attempt" :feedback="feedback" :in-queue="inQueue" @saved="inQueue ? goNext() : load()" @changed="load" @skip="skip" @previous="previous" />

      <section class="card">
        <h2>{{ $t("attemptPage.tracked") }}</h2>
        <p class="hint">{{ $t("attemptPage.trackedHint") }}</p>
        <ErrorLogList :entries="errors" editable @changed="reloadErrors" />
      </section>

    </template>
  </div>
</template>

<style scoped>
.actions { margin-bottom: var(--space-lg); }
.queue-bar { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-md);
  padding: 10px 14px; border-radius: 10px; background: var(--accent-soft); color: var(--accent); }
.queue-bar .btn { padding: 2px 10px; }
</style>
