<script setup lang="ts">
import type { Database, Enums, Tables } from "~/types/database.types"
import type { AttemptWithStudent } from "~/utils/attemptReview"
import { gradingAction, isTyping } from "~/utils/gradingKeys"

// A teacher's feedback on one attempt: the comment form (templates, error tags, new entries for the learner's error log),
// the earlier comments with edit / delete, and the grading shortcuts. The page decides what follows a save (next in the queue).
const props = defineProps<{ attempt: AttemptWithStudent; feedback: Tables<"feedback">[]; inQueue: boolean }>()
const emit = defineEmits<{ saved: []; changed: []; skip: []; previous: [] }>()
const client = useSupabaseClient<Database>()
const { t } = useI18n()
const { armed, arm } = useTwoClick()
const attempt = computed(() => props.attempt)

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
  const error = await saveFeedback(client, {
    attemptId: attempt.value.id, userId: attempt.value.user_id, lessonId: attempt.value.lesson_id,
    body: body.value, tags: tags.value, newErrors: newErrors.value,
  })
  saving.value = false
  if (error) {
    message.value = error
    return
  }
  body.value = ""
  tags.value = []
  newErrors.value = []
  message.value = t("attemptPage.saved")
  emit('saved')
}

// ---- keyboard: Ctrl/⌘+Enter saves, J / K walk the queue, 1-6 tick the error tags ----
function onKey(e: KeyboardEvent) {
  if (props.attempt.status === "in_progress") return
  const action = gradingAction(e, isTyping(e.target as HTMLElement | null), Object.keys(ERROR_CATEGORIES).length)
  if (!action) return
  e.preventDefault()
  if (action.type === "save") {
    if (body.value.trim() && !saving.value) saveGrade()
  } else if (action.type === "next") {
    if (props.inQueue) emit('skip')
  } else if (action.type === "previous") {
    if (props.inQueue) emit('previous')
  } else {
    const key = Object.keys(ERROR_CATEGORIES)[action.index] as Enums<"error_category">
    tags.value = tags.value.includes(key) ? tags.value.filter(k => k !== key) : [...tags.value, key]
  }
}
onMounted(() => window.addEventListener("keydown", onKey))
onBeforeUnmount(() => window.removeEventListener("keydown", onKey))

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

// ---- editing / deleting earlier feedback ----
const editing = ref<string | null>(null)
const editBody = ref("")
const editTags = ref<string[]>([])
const feedbackBusy = ref(false)

function startEdit(f: Tables<"feedback">) {
  editing.value = f.id
  editBody.value = f.body
  editTags.value = [...f.error_tags]
}

async function saveEdit(id: string) {
  if (!editBody.value.trim()) return
  feedbackBusy.value = true
  const error = await editFeedback(client, id, editBody.value, editTags.value)
  feedbackBusy.value = false
  if (error) {
    message.value = error
    return
  }
  editing.value = null
  emit('changed')
}

async function removeFeedback(id: string) {
  if (!arm(id)) return
  feedbackBusy.value = true
  const error = await deleteFeedback(client, id)
  feedbackBusy.value = false
  if (error) message.value = error
  emit('changed')
}
</script>

<template>
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
          <p class="small muted keys"><Icon name="clock" size="14" /> {{ $t(inQueue ? "attemptPage.keysQueue" : "attemptPage.keys") }}</p>
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
              <button class="btn small" :class="armed === f.id ? 'danger' : 'ghost'" :disabled="feedbackBusy" @click="removeFeedback(f.id)">
                {{ armed === f.id ? $t("common.confirmAgain") : $t("common.delete") }}
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
</template>

<style scoped>
.checks { gap: 6px 16px; }
.error-row { margin-bottom: var(--space-sm); flex-wrap: nowrap; }
.error-row select { width: auto; max-width: 45%; }
.old { margin: 16px 0 0; }
.templates { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tpl { display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: var(--radius-full); background: var(--bg); max-width: 100%; }
.tpl:hover { border-color: var(--accent); }
.tpl-text { border: 0; background: none; color: var(--text); font: inherit; font-size: .85rem; padding: 3px 4px 3px 12px; cursor: pointer;
  max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpl-x { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 0 10px 0 4px; }
.fb-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.fb-actions { gap: var(--space-xs); }
.fb-actions .btn { padding: 2px 10px; }
.edit { margin-top: var(--space-sm); }
.edit textarea { min-height: 110px; background: var(--card); }
.tags { margin-top: var(--space-sm); }
@media (max-width: 560px) { .error-row { flex-wrap: wrap; } .error-row select { max-width: none; width: 100%; } }
</style>
