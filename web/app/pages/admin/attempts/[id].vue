<script setup lang="ts">
import type { Database, Enums, Tables } from "~/types/database.types"
import type { Answer, Score } from "~/utils/course"

definePageMeta({ middleware: "admin" })

const route = useRoute()
const client = useSupabaseClient<Database>()
const attemptId = route.params.id as string

type AttemptRow = Tables<"attempts"> & { profiles: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null }
const attempt = shallowRef<AttemptRow | null>(null)
const feedback = shallowRef<Tables<"feedback">[]>([])
const errors = shallowRef<Tables<"error_log">[]>([])
const loaded = ref(false)

const lesson = computed(() => (attempt.value ? LESSONS[attempt.value.lesson_id] : undefined))
const answers = computed(() => (attempt.value?.answers ?? {}) as unknown as Record<string, Answer>)
const score = computed(() => attempt.value?.score as unknown as Score | undefined)
const student = computed(() => attempt.value?.profiles)

async function load() {
  const { data } = await client.from("attempts").select("*, profiles(id, full_name, email)").eq("id", attemptId).maybeSingle()
  attempt.value = data as AttemptRow | null
  if (data) {
    const [f, e] = await Promise.all([
      client.from("feedback").select("*").eq("attempt_id", attemptId).order("created_at", { ascending: false }),
      client.from("error_log").select("*").eq("user_id", data.user_id),
    ])
    feedback.value = f.data ?? []
    errors.value = e.data ?? []
  }
  loaded.value = true
}
onMounted(load)
useHead({ title: computed(() => `Chấm bài ${attempt.value?.lesson_id ?? ""}`) })

async function reloadErrors() {
  if (!attempt.value) return
  const { data } = await client.from("error_log").select("*").eq("user_id", attempt.value.user_id)
  errors.value = data ?? []
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
    message.value = `Chưa lưu được: ${(error ?? errorInsert.error)!.message}`
    return
  }
  body.value = ""
  tags.value = []
  newErrors.value = []
  message.value = "Đã lưu nhận xét. Học viên sẽ thấy ở đầu bài học."
  await load()
}
</script>

<template>
  <div>
    <NuxtLink to="/admin" class="small">← Chấm bài</NuxtLink>
    <p v-if="!loaded" class="muted">Đang tải…</p>
    <p v-else-if="!attempt || !lesson" class="muted">Không tìm thấy bài làm này.</p>
    <template v-else>
      <h1>{{ student?.full_name || student?.email }} · Bài {{ lesson.id }}</h1>
      <p class="sub">
        {{ lesson.title }} · {{ score?.ok ?? 0 }}/{{ score?.done ?? 0 }} câu đúng (bài có {{ lessonTotal(lesson) }} câu)
        · <span class="badge" :class="attempt.status">{{ ATTEMPT_STATUS[attempt.status] }}</span>
        · <NuxtLink :to="`/admin/students/${attempt.user_id}`">Hồ sơ học viên</NuxtLink>
      </p>

      <section class="card">
        <h2>Bài viết</h2>
        <p v-if="attempt.writing.trim()" class="pre">{{ attempt.writing }}</p>
        <p v-else class="muted small">Học viên chưa viết.</p>
      </section>

      <section class="card">
        <h2>Nhận xét</h2>
        <div class="stack">
          <textarea id="feedback-body" v-model="body" placeholder="Nhận xét bài viết: điểm làm tốt, lỗi cần sửa (kèm câu sửa), có nên học tiếp bài mới hay ôn lại…" />
          <div>
            <div class="small muted">Nhóm lỗi trong bài này</div>
            <div class="row checks">
              <label v-for="(label, key) in ERROR_CATEGORIES" :key="key" class="row small">
                <input v-model="tags" type="checkbox" :value="key"> {{ label }}
              </label>
            </div>
          </div>
          <div>
            <div class="small muted">Ghi lỗi mới vào nhật ký của học viên</div>
            <div v-for="(e, i) in newErrors" :key="i" class="row error-row">
              <select v-model="e.category">
                <option v-for="(label, key) in ERROR_CATEGORIES" :key="key" :value="key">{{ label }}</option>
              </select>
              <input v-model="e.note" type="text" placeholder="Ví dụ: thừa đại từ sau who (the man who I met him)">
              <button class="btn ghost" @click="newErrors.splice(i, 1)">Xoá</button>
            </div>
            <button class="btn ghost" @click="addErrorRow">+ Thêm lỗi</button>
          </div>
          <div class="row">
            <button class="btn primary" :disabled="saving || !body.trim()" @click="saveGrade">
              {{ saving ? "Đang lưu…" : "Lưu nhận xét" }}
            </button>
            <span v-if="message" class="small">{{ message }}</span>
          </div>
        </div>

        <div v-for="f in feedback" :key="f.id" class="feedback-box old">
          <b>Đã nhận xét</b> <span class="muted small">· {{ formatDate(f.created_at) }}</span>
          <p>{{ f.body }}</p>
        </div>
      </section>

      <section class="card">
        <h2>Lỗi đang theo dõi của học viên</h2>
        <p class="hint">Học viên lặp lại lỗi cũ thì bấm "+1 lần"; khi đã sửa được thì đổi trạng thái.</p>
        <ErrorLogList :entries="errors" editable @changed="reloadErrors" />
      </section>

      <section class="card">
        <h2>Bài tập tự chấm</h2>
        <AttemptReview :lesson="lesson" :answers="answers" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.checks { gap: 6px 16px; }
.checks input, .row input[type=checkbox] { width: auto; }
.error-row { margin-bottom: 8px; flex-wrap: nowrap; }
.error-row select { width: auto; max-width: 45%; }
.old { margin: 16px 0 0; }
@media (max-width: 560px) { .error-row { flex-wrap: wrap; } .error-row select { max-width: none; width: 100%; } }
</style>
