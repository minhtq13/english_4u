<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"

definePageMeta({ key: route => route.fullPath })

const route = useRoute()
const lesson = LESSONS[route.params.id as string]
if (!lesson) throw createError({ statusCode: 404, statusMessage: "Không tìm thấy bài học", fatal: true })

useHead({ title: `Bài ${lesson.id} — ${lesson.title}` })

const client = useSupabaseClient<Database>()
const attempt = useAttempt(lesson)
const { state, score, total } = attempt
const feedback = shallowRef<Tables<"feedback">[]>([])

onMounted(async () => {
  await attempt.load()
  if (state.id) {
    const { data } = await client.from("feedback").select("*").eq("attempt_id", state.id).order("created_at", { ascending: false })
    feedback.value = data ?? []
  }
})
onBeforeUnmount(() => { attempt.flush() })

const writing = computed({
  get: () => state.writing,
  set: (v: string) => attempt.setWriting(v),
})
const hasWriting = lesson.sections.some(s => s.type === "writing")

const saveText = computed(() => ({
  idle: "Mỗi câu được lưu tự động",
  saving: "Đang lưu…",
  saved: "Đã lưu",
  error: "Chưa lưu được — kiểm tra kết nối, bài làm sẽ được lưu ở lần thay đổi tiếp theo",
}[state.save]))

const submitting = ref(false)
const submitMsg = ref("")
async function submit() {
  submitting.value = true
  submitMsg.value = (await attempt.submit())
    ? "Đã nộp. Giáo viên sẽ chấm phần viết và nhận xét ở đầu bài này."
    : "Chưa nộp được, hãy thử lại."
  submitting.value = false
}

const resetArmed = ref(false)
async function reset() {
  if (!resetArmed.value) {
    resetArmed.value = true
    setTimeout(() => { resetArmed.value = false }, 4000)
    return
  }
  resetArmed.value = false
  await attempt.reset()
}

const idx = LESSON_ORDER.indexOf(lesson.id)
const next = LESSON_ORDER[idx + 1] ? LESSONS[LESSON_ORDER[idx + 1]!] : null
</script>

<template>
  <div>
    <NuxtLink to="/" class="small">← Lộ trình</NuxtLink>
    <h1>Bài {{ lesson.id }} — {{ lesson.fullTitle }}</h1>
    <p class="sub">{{ lesson.sub }}</p>

    <div v-for="f in feedback" :key="f.id" class="feedback-box">
      <b>Nhận xét của giáo viên</b> <span class="muted small">· {{ formatDate(f.created_at) }}</span>
      <p>{{ f.body }}</p>
      <div v-if="f.error_tags.length" class="row tags">
        <span v-for="t in f.error_tags" :key="t" class="badge open">{{ ERROR_CATEGORIES[t as keyof typeof ERROR_CATEGORIES] ?? t }}</span>
      </div>
    </div>

    <p v-if="!state.loaded" class="muted">Đang tải bài làm…</p>
    <template v-else>
      <section v-for="(s, i) in lesson.sections" :key="i" class="card">
        <span v-if="s.time" class="time">{{ s.time }}</span>
        <h2>{{ i + 1 }}. {{ s.title }}</h2>
        <p v-if="s.hint" class="hint" v-html="s.hint" />

        <div v-if="s.type === 'explain'" class="explain" v-html="s.html" />
        <LessonCardsSection v-else-if="s.type === 'cards'" :items="s.items" />
        <LessonMcqSection
          v-else-if="s.type === 'mcq'"
          :section-key="s.key" :items="s.items" :answers="state.answers"
          @answer="attempt.record"
        />
        <LessonTypedSection
          v-else-if="s.type === 'typed'"
          :section-key="s.key" :items="s.items" :short="s.short" :answers="state.answers"
          @answer="attempt.record"
        />
        <LessonOrderSection
          v-else-if="s.type === 'order'"
          :section-key="s.key" :items="s.items" :answers="state.answers"
          @answer="attempt.record"
        />
        <textarea v-else-if="s.type === 'writing'" :id="`writing-${lesson.id}`" v-model="writing" :placeholder="s.placeholder" />
      </section>

      <div class="actions">
        <button class="btn" :class="resetArmed ? 'danger' : 'ghost'" @click="reset">
          {{ resetArmed ? "Bấm lần nữa để xoá bài làm" : "Làm lại bài này từ đầu" }}
        </button>
        <NuxtLink v-if="next" :to="`/lessons/${next.id}`" class="btn ghost">Bài tiếp: {{ next.id }} →</NuxtLink>
      </div>
      <p v-if="submitMsg" class="fb ok">{{ submitMsg }}</p>

      <div class="scorebar">
        <div class="meta">
          <b>Điểm: {{ score.ok }} / {{ score.done }} · bài có {{ total }} câu</b>
          <small>{{ saveText }} · {{ ATTEMPT_STATUS[state.status] }}</small>
        </div>
        <button v-if="hasWriting" class="btn primary" :disabled="submitting || !state.writing.trim()" @click="submit">
          {{ state.status === "in_progress" ? "Nộp bài cho giáo viên" : "Nộp lại" }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.actions { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin: 4px 0 16px; }
.tags { margin-top: 8px; }
</style>
