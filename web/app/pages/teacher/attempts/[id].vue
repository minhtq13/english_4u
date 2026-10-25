<script setup lang="ts">
import type { Database, Enums, Tables } from "~/types/database.types"
import type { Answer, Lesson, Response } from "~/utils/course"

// Remount per attempt, so "next" in the grading queue loads the following student's work.
definePageMeta({ roles: ["teacher"], key: route => route.fullPath })

const route = useRoute()
const client = useSupabaseClient<Database>()
const attemptId = route.params.id as string

type AttemptRow = Tables<"attempts"> & { profiles: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null }
const attempt = shallowRef<AttemptRow | null>(null)
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
  const { data } = await client.from("attempts").select("*, profiles(id, full_name, email)").eq("id", attemptId).maybeSingle()
  attempt.value = data as AttemptRow | null
  if (data) {
    const [f, e, l, r] = await Promise.all([
      client.from("feedback").select("*").eq("attempt_id", attemptId).order("created_at", { ascending: false }),
      client.from("error_log").select("*").eq("user_id", data.user_id),
      lesson.value?.id === data.lesson_id ? lesson.value : getLesson(data.lesson_id),
      client.from("attempt_results").select("answers").eq("attempt_id", attemptId).maybeSingle(),
    ])
    answers.value = r.data ? (r.data.answers as unknown as Record<string, Answer>) : null
    feedback.value = f.data ?? []
    errors.value = e.data ?? []
    lesson.value = l
  }
  loaded.value = true
}
onMounted(load)
const { t } = useI18n()
useHead({ title: () => `${t("grading.grade")} ${attempt.value?.lesson_id ?? ""}` })

async function reloadErrors() {
  if (!attempt.value) return
  const { data } = await client.from("error_log").select("*").eq("user_id", attempt.value.user_id)
  errors.value = data ?? []
}

// ---- releasing results / letting the student redo ----
const acting = ref(false)
const actionMsg = ref("")
async function releaseResults() {
  if (!attempt.value) return
  acting.value = true
  const { error } = await client.from("attempts").update({ status: "graded" }).eq("id", attempt.value.id)
  acting.value = false
  actionMsg.value = error ? t("attemptPage.releaseFailed", { msg: errorText(error.message) }) : t("attemptPage.released")
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
const queuePos = computed(() => waitingIds.value.indexOf(attemptId) + 1)
const queueLink = (id: string) => queue.link(id, queueLesson, queueClass)

/** After grading this one: the oldest still waiting (this one is no longer in the list). */
async function goNext() {
  await loadQueue()
  const next = waitingIds.value.find(id => id !== attemptId)
  if (next) return navigateTo(queueLink(next))
  queueDone.value = true
  await load()
}
/** Skip without grading: the next one after this in submission order, wrapping around. */
function skip() {
  const i = waitingIds.value.indexOf(attemptId)
  const next = waitingIds.value[i + 1] ?? waitingIds.value.find(id => id !== attemptId)
  if (next) navigateTo(queueLink(next))
}

// ---- comment templates (each teacher's own) ----
const templates = shallowRef<Tables<"comment_templates">[]>([])
async function loadTemplates() {
  const { data } = await client.from("comment_templates").select("*").order("created_at")
  templates.value = data ?? []
}
onMounted(loadTemplates)
function useTemplate(t: string) {
  body.value = body.value.trim() ? `${body.value.trim()}\n${t}` : t
}
async function saveTemplate() {
  const text = body.value.trim()
  if (!text || templates.value.some(t => t.body === text)) return
  await client.from("comment_templates").insert({ body: text })
  await loadTemplates()
}
async function removeTemplate(id: string) {
  await client.from("comment_templates").delete().eq("id", id)
  await loadTemplates()
}

const redoArmed = ref(false)
async function allowRedo() {
  if (!attempt.value) return
  if (!redoArmed.value) {
    redoArmed.value = true
    setTimeout(() => { redoArmed.value = false }, 4000)
    return
  }
  redoArmed.value = false
  acting.value = true
  // One transaction: the graded results go and the attempt reopens together.
  const { error } = await client.rpc("allow_redo", { target: attempt.value.id })
  acting.value = false
  actionMsg.value = error ? t("attemptPage.redoFailed", { msg: errorText(error.message) }) : t("attemptPage.redone")
  await load()
}

// ---- editing / deleting earlier feedback ----
const editing = ref<string | null>(null)
const editBody = ref("")
const editTags = ref<string[]>([])
const deleteArmed = ref<string | null>(null)
const feedbackBusy = ref(false)

function startEdit(f: Tables<"feedback">) {
  editing.value = f.id
  editBody.value = f.body
  editTags.value = [...f.error_tags]
}

async function saveEdit(id: string) {
  if (!editBody.value.trim()) return
  feedbackBusy.value = true
  const { error } = await client.from("feedback").update({ body: editBody.value.trim(), error_tags: editTags.value }).eq("id", id)
  feedbackBusy.value = false
  if (error) {
    message.value = t("common.notChanged", { msg: errorText(error.message) })
    return
  }
  editing.value = null
  await load()
}

async function removeFeedback(id: string) {
  if (deleteArmed.value !== id) {
    deleteArmed.value = id
    setTimeout(() => { if (deleteArmed.value === id) deleteArmed.value = null }, 4000)
    return
  }
  deleteArmed.value = null
  feedbackBusy.value = true
  const { error } = await client.from("feedback").delete().eq("id", id)
  feedbackBusy.value = false
  if (error) message.value = t("editor.notDeleted", { msg: errorText(error.message) })
  await load()
}

// ---- grading form ----
const body = ref("")
const tags = ref<Enums<"error_category">[]>([])
const newErrors = ref<{ category: Enums<"error_category">; note: string }[]>([])
const saving = ref(false)
const message = ref("")

const addErrorRow = () => newErrors.value.push({ category: "grammar", note: "" })

async function saveGrade() {
  if (!attempt.value || !body.value.trim()) return
  saving.value = true
  message.value = ""
  const { error } = await client.from("feedback").insert({
    attempt_id: attempt.value.id,
    body: body.value.trim(),
    error_tags: tags.value,
  })
  const rows = newErrors.value.filter(e => e.note.trim()).map(e => ({
    user_id: attempt.value!.user_id,
    lesson_id: attempt.value!.lesson_id,
    category: e.category,
    note: e.note.trim(),
  }))
  const errorInsert = rows.length ? await client.from("error_log").insert(rows) : { error: null }
  saving.value = false
  if (error || errorInsert.error) {
    message.value = t("common.notSaved", { msg: errorText((error ?? errorInsert.error)!.message) })
    return
  }
  body.value = ""
  tags.value = []
  newErrors.value = []
  message.value = t("attemptPage.saved")
  if (inQueue) return goNext()
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
      <h1>{{ student?.full_name || student?.email }} · {{ lesson.label }} - {{ lesson.title }}</h1>
      <p class="sub">
        {{ lesson.title }} · {{ $t("attemptPage.scoreLine", { ok: score?.ok ?? 0, done: score?.done ?? 0, total: lessonTotal(lesson) }) }}
        · <span class="badge" :class="attempt.status">{{ ATTEMPT_STATUS[attempt.status] }}</span>
        · <NuxtLink :to="`/teacher/students/${attempt.user_id}`">{{ $t("attemptPage.profile") }}</NuxtLink>
      </p>
      <div class="row actions">
        <button v-if="attempt.status === 'submitted'" class="btn primary" :disabled="acting" @click="releaseResults">
          {{ inQueue ? $t("attemptPage.releaseNext") : $t("attemptPage.release") }}
        </button>
        <button v-if="attempt.status !== 'in_progress'" class="btn" :class="redoArmed ? 'danger' : 'ghost'" :disabled="acting" @click="allowRedo">
          {{ redoArmed ? $t("attemptPage.redoConfirm") : $t("attemptPage.redo") }}
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
      <section class="card">
        <h2>{{ $t("attemptPage.comment") }}</h2>
        <div class="stack">
          <div v-if="templates.length" class="templates">
            <span class="small muted">{{ $t("attemptPage.templates") }}</span>
            <span v-for="t in templates" :key="t.id" class="tpl">
              <button class="tpl-text" :title="t.body" @click="useTemplate(t.body)">{{ t.body }}</button>
              <button class="tpl-x" :title="$t('attemptPage.removeTemplate')" @click="removeTemplate(t.id)">×</button>
            </span>
          </div>
          <textarea id="feedback-body" v-model="body" :placeholder="$t('attemptPage.commentEx')" />
          <div>
            <div class="small muted">{{ $t("attemptPage.errorTags") }}</div>
            <div class="row checks">
              <label v-for="(label, key) in ERROR_CATEGORIES" :key="key" class="row small">
                <input v-model="tags" type="checkbox" :value="key"> {{ label }}
              </label>
            </div>
          </div>
          <div>
            <div class="small muted">{{ $t("attemptPage.newErrors") }}</div>
            <div v-for="(e, i) in newErrors" :key="i" class="row error-row">
              <select v-model="e.category">
                <option v-for="(label, key) in ERROR_CATEGORIES" :key="key" :value="key">{{ label }}</option>
              </select>
              <input v-model="e.note" type="text" :placeholder="$t('attemptPage.errorEx')">
              <button class="btn ghost" @click="newErrors.splice(i, 1)">{{ $t("common.delete") }}</button>
            </div>
            <button class="btn ghost" @click="addErrorRow">{{ $t("attemptPage.addError") }}</button>
          </div>
          <div class="row">
            <button class="btn primary" :disabled="saving || !body.trim()" @click="saveGrade">
              {{ saving ? $t("common.saving") : inQueue ? $t("attemptPage.saveNext") : $t("attemptPage.save") }}
            </button>
            <button
              class="btn ghost" :disabled="!body.trim() || templates.some(t => t.body === body.trim())"
              :title="$t('attemptPage.saveTemplateTitle')" @click="saveTemplate"
            >{{ $t("attemptPage.saveTemplate") }}</button>
            <span v-if="message" class="small">{{ message }}</span>
          </div>
        </div>

        <div v-for="f in feedback" :key="f.id" class="feedback-box old">
          <div class="fb-head">
            <span><b>{{ $t("attemptPage.commented") }}</b> <span class="muted small">· {{ formatDate(f.created_at) }}</span></span>
            <span v-if="editing !== f.id" class="row fb-actions">
              <button class="btn ghost small" :disabled="feedbackBusy" @click="startEdit(f)">{{ $t("common.edit") }}</button>
              <button class="btn small" :class="deleteArmed === f.id ? 'danger' : 'ghost'" :disabled="feedbackBusy" @click="removeFeedback(f.id)">
                {{ deleteArmed === f.id ? $t("common.confirmAgain") : $t("common.delete") }}
              </button>
            </span>
          </div>
          <div v-if="editing === f.id" class="stack edit">
            <textarea v-model="editBody" />
            <div class="row checks">
              <label v-for="(label, key) in ERROR_CATEGORIES" :key="key" class="row small">
                <input v-model="editTags" type="checkbox" :value="key"> {{ label }}
              </label>
            </div>
            <div class="row">
              <button class="btn primary" :disabled="feedbackBusy || !editBody.trim()" @click="saveEdit(f.id)">{{ $t("common.save") }}</button>
              <button class="btn ghost" @click="editing = null">{{ $t("common.cancel") }}</button>
            </div>
          </div>
          <template v-else>
            <p>{{ f.body }}</p>
            <div v-if="f.error_tags.length" class="row tags">
              <span v-for="t in f.error_tags" :key="t" class="badge open">{{ ERROR_CATEGORIES[t as keyof typeof ERROR_CATEGORIES] ?? t }}</span>
            </div>
          </template>
        </div>
      </section>

      <section class="card">
        <h2>{{ $t("attemptPage.tracked") }}</h2>
        <p class="hint">{{ $t("attemptPage.trackedHint") }}</p>
        <ErrorLogList :entries="errors" editable @changed="reloadErrors" />
      </section>

    </template>
  </div>
</template>

<style scoped>
.checks { gap: 6px 16px; }
.error-row { margin-bottom: 8px; flex-wrap: nowrap; }
.error-row select { width: auto; max-width: 45%; }
.old { margin: 16px 0 0; }
.actions { margin-bottom: 16px; }
.queue-bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;
  padding: 10px 14px; border-radius: 10px; background: var(--accent-soft); color: var(--accent); }
.queue-bar .btn { padding: 2px 10px; }
.templates { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tpl { display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: 999px; background: var(--bg); max-width: 100%; }
.tpl:hover { border-color: var(--accent); }
.tpl-text { border: 0; background: none; color: var(--text); font: inherit; font-size: .85rem; padding: 3px 4px 3px 12px; cursor: pointer;
  max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpl-x { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 0 10px 0 4px; }
.fb-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.fb-actions { gap: 4px; }
.fb-actions .btn { padding: 2px 10px; }
.edit { margin-top: 8px; }
.edit textarea { min-height: 110px; background: var(--card); }
.tags { margin-top: 8px; }
@media (max-width: 560px) { .error-row { flex-wrap: wrap; } .error-row select { max-width: none; width: 100%; } }
</style>
