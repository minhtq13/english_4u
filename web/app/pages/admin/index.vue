<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Score } from "~/utils/course"

definePageMeta({ middleware: "admin" })
useHead({ title: "Chấm bài — Grammar B1→B2" })

const client = useSupabaseClient<Database>()

type AttemptRow = Pick<Tables<"attempts">, "id" | "lesson_id" | "score" | "status" | "submitted_at" | "updated_at" | "user_id"> & {
  profiles: Pick<Tables<"profiles">, "full_name" | "email"> | null
}
const attempts = shallowRef<AttemptRow[]>([])
const students = shallowRef<Tables<"profiles">[]>([])
const loaded = ref(false)

onMounted(async () => {
  const [a, p] = await Promise.all([
    client.from("attempts")
      .select("id, lesson_id, score, status, submitted_at, updated_at, user_id, profiles(full_name, email)")
      .order("updated_at", { ascending: false }).limit(300),
    client.from("profiles").select("*").order("created_at", { ascending: false }),
  ])
  attempts.value = (a.data ?? []) as AttemptRow[]
  students.value = p.data ?? []
  loaded.value = true
})

const waiting = computed(() =>
  attempts.value.filter(a => a.status === "submitted")
    .sort((x, y) => (x.submitted_at ?? "").localeCompare(y.submitted_at ?? "")),
)
const recent = computed(() => attempts.value.filter(a => a.status !== "submitted").slice(0, 20))
const name = (p: { full_name: string | null; email: string } | null) => p?.full_name || p?.email || "Học viên"
const score = (row: AttemptRow) => row.score as unknown as Score
const countFor = (userId: string) => attempts.value.filter(a => a.user_id === userId).length
</script>

<template>
  <div>
    <h1>Chấm bài</h1>
    <p class="sub">Bài đã nộp xếp theo thời gian nộp, cũ nhất lên đầu.</p>

    <p v-if="!loaded" class="muted">Đang tải…</p>
    <template v-else>
      <section class="card">
        <h2>Chờ chấm ({{ waiting.length }})</h2>
        <p v-if="!waiting.length" class="muted small">Không có bài nào đang chờ.</p>
        <NuxtLink v-for="a in waiting" :key="a.id" :to="`/admin/attempts/${a.id}`" class="list-row">
          <span>
            <b>{{ name(a.profiles) }} · Bài {{ a.lesson_id }}</b>
            <small>{{ score(a).ok ?? 0 }}/{{ score(a).done ?? 0 }} câu đúng · nộp {{ formatDate(a.submitted_at) }}</small>
          </span>
          <span class="badge submitted">Chấm bài</span>
        </NuxtLink>
      </section>

      <section class="card">
        <h2>Học viên ({{ students.length }})</h2>
        <NuxtLink v-for="s in students" :key="s.id" :to="`/admin/students/${s.id}`" class="list-row">
          <span><b>{{ name(s) }}</b><small>{{ s.email }} · {{ countFor(s.id) }} bài đã mở</small></span>
          <span class="badge" :class="s.role === 'admin' ? 'graded' : ''">{{ s.role === "admin" ? "Giáo viên" : "Học viên" }}</span>
        </NuxtLink>
      </section>

      <section class="card">
        <h2>Hoạt động gần đây</h2>
        <p v-if="!recent.length" class="muted small">Chưa có hoạt động.</p>
        <NuxtLink v-for="a in recent" :key="a.id" :to="`/admin/attempts/${a.id}`" class="list-row">
          <span>
            <b>{{ name(a.profiles) }} · Bài {{ a.lesson_id }}</b>
            <small>{{ score(a).ok ?? 0 }}/{{ score(a).done ?? 0 }} câu đúng · {{ formatDate(a.updated_at) }}</small>
          </span>
          <span class="badge" :class="a.status">{{ ATTEMPT_STATUS[a.status] }}</span>
        </NuxtLink>
      </section>
    </template>
  </div>
</template>
