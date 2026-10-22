<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Score } from "~/utils/course"

useHead({ title: "Lộ trình — Grammar B1→B2" })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

type Row = Pick<Tables<"attempts">, "lesson_id" | "score" | "status" | "updated_at">
const attempts = shallowRef<Record<string, Row>>({})
const openErrors = ref(0)
const loaded = ref(false)

onMounted(async () => {
  const me = user.value?.sub
  if (!me) return
  const [{ data: rows }, { count }] = await Promise.all([
    client.from("attempts").select("lesson_id, score, status, updated_at").eq("user_id", me),
    client.from("error_log").select("id", { count: "exact", head: true }).eq("user_id", me).neq("status", "fixed"),
  ])
  attempts.value = Object.fromEntries((rows ?? []).map(r => [r.lesson_id, r]))
  openErrors.value = count ?? 0
  loaded.value = true
})

const scoreOfRow = (id: string) => attempts.value[id]?.score as unknown as Score | undefined

function badge(id: string) {
  const lesson = LESSONS[id]!
  const s = scoreOfRow(id)
  const total = lessonTotal(lesson)
  const status = attempts.value[id]?.status
  if (status === "graded") return { cls: "graded", text: `Đã chấm · ${s?.ok ?? 0}/${total}` }
  if (status === "submitted") return { cls: "submitted", text: `Chờ chấm · ${s?.ok ?? 0}/${total}` }
  if (s && s.done >= total) return { cls: "done", text: `✓ ${s.ok}/${total}` }
  if (s && s.done > 0) return { cls: "partial", text: `Đang làm ${s.done}/${total}` }
  return { cls: "", text: "Chưa làm" }
}

const isFinished = (id: string) => (scoreOfRow(id)?.done ?? 0) >= lessonTotal(LESSONS[id]!)
const completed = computed(() => LESSON_ORDER.filter(isFinished).length)

const accuracy = computed(() => {
  const scores = Object.keys(attempts.value).map(scoreOfRow).filter((s): s is Score => !!s && s.done > 0)
  const done = scores.reduce((n, s) => n + s.done, 0)
  return done ? Math.round((scores.reduce((n, s) => n + s.ok, 0) / done) * 100) : null
})

// Continue the most recently touched unfinished lesson, otherwise the first one not started.
const nextLesson = computed(() => {
  const unfinished = Object.values(attempts.value)
    .filter(r => LESSONS[r.lesson_id] && !isFinished(r.lesson_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  const id = unfinished?.lesson_id ?? LESSON_ORDER.find(id => !attempts.value[id]) ?? LESSON_ORDER[0]!
  return LESSONS[id]!
})
</script>

<template>
  <div>
    <h1>Lộ trình B1 → B2</h1>
    <p class="sub">30 phút mỗi ngày. Mỗi câu trả lời được lưu ngay khi bạn làm; nộp bài để giáo viên chấm phần viết.</p>

    <div class="stats">
      <div class="stat"><b>{{ completed }}/{{ LESSON_ORDER.length }}</b><span>bài đã làm xong</span></div>
      <div class="stat"><b>{{ accuracy === null ? "—" : `${accuracy}%` }}</b><span>tỉ lệ đúng (lần đầu)</span></div>
      <NuxtLink to="/progress" class="stat stat-link"><b>{{ openErrors }}</b><span>lỗi đang theo dõi</span></NuxtLink>
    </div>

    <div v-if="loaded" class="card next">
      <span class="time">Học tiếp</span>
      <h2>Bài {{ nextLesson.id }} — {{ nextLesson.title }}</h2>
      <p class="muted small">{{ nextLesson.desc }}</p>
      <NuxtLink :to="`/lessons/${nextLesson.id}`" class="btn primary">Vào bài học</NuxtLink>
    </div>

    <section v-for="phase in PHASES" :key="phase.name" class="card">
      <h2>{{ phase.name }}</h2>
      <NuxtLink v-for="l in phase.lessons" :key="l.id" :to="`/lessons/${l.id}`" class="list-row">
        <span><b>{{ l.id }}. {{ l.title }}</b><small>{{ l.desc }}</small></span>
        <span class="badge" :class="badge(l.id).cls">{{ loaded ? badge(l.id).text : "…" }}</span>
      </NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.stat-link { text-decoration: none; color: var(--text); }
.stat-link:hover { border-color: var(--accent); }
.next h2 { margin-bottom: 0; }
.next p { margin: 4px 0 12px; }
</style>
