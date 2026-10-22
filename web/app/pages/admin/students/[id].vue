<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Score } from "~/utils/course"

definePageMeta({ middleware: "admin" })

const route = useRoute()
const client = useSupabaseClient<Database>()
const studentId = route.params.id as string

const student = shallowRef<Tables<"profiles"> | null>(null)
const attempts = shallowRef<Tables<"attempts">[]>([])
const errors = shallowRef<Tables<"error_log">[]>([])
const loaded = ref(false)

async function loadErrors() {
  const { data } = await client.from("error_log").select("*").eq("user_id", studentId)
  errors.value = data ?? []
}

onMounted(async () => {
  const [p, a] = await Promise.all([
    client.from("profiles").select("*").eq("id", studentId).maybeSingle(),
    client.from("attempts").select("*").eq("user_id", studentId).order("updated_at", { ascending: false }),
    loadErrors(),
  ])
  student.value = p.data
  attempts.value = a.data ?? []
  loaded.value = true
})
useHead({ title: computed(() => student.value?.full_name || "Học viên") })

const score = (row: Tables<"attempts">) => row.score as unknown as Score
const accuracy = computed(() => {
  const done = attempts.value.reduce((n, a) => n + (score(a).done ?? 0), 0)
  const ok = attempts.value.reduce((n, a) => n + (score(a).ok ?? 0), 0)
  return done ? Math.round((ok / done) * 100) : null
})
</script>

<template>
  <div>
    <NuxtLink to="/admin" class="small">← Chấm bài</NuxtLink>
    <p v-if="!loaded" class="muted">Đang tải…</p>
    <p v-else-if="!student" class="muted">Không tìm thấy học viên.</p>
    <template v-else>
      <h1>{{ student.full_name || student.email }}</h1>
      <p class="sub">{{ student.email }} · tham gia {{ formatDate(student.created_at) }}</p>

      <div class="stats">
        <div class="stat"><b>{{ attempts.length }}</b><span>bài đã mở</span></div>
        <div class="stat"><b>{{ accuracy === null ? "—" : `${accuracy}%` }}</b><span>tỉ lệ đúng</span></div>
        <div class="stat"><b>{{ errors.filter(e => e.status !== "fixed").length }}</b><span>lỗi chưa sửa</span></div>
      </div>

      <section class="card">
        <h2>Nhật ký lỗi</h2>
        <ErrorLogList :entries="errors" editable @changed="loadErrors" />
      </section>

      <section class="card">
        <h2>Bài làm</h2>
        <p v-if="!attempts.length" class="muted small">Chưa làm bài nào.</p>
        <NuxtLink v-for="a in attempts" :key="a.id" :to="`/admin/attempts/${a.id}`" class="list-row">
          <span>
            <b>Bài {{ a.lesson_id }} — {{ LESSONS[a.lesson_id]?.title ?? "" }}</b>
            <small>{{ score(a).ok ?? 0 }}/{{ score(a).done ?? 0 }} câu đúng · {{ formatDate(a.updated_at) }}</small>
          </span>
          <span class="badge" :class="a.status">{{ ATTEMPT_STATUS[a.status] }}</span>
        </NuxtLink>
      </section>
    </template>
  </div>
</template>
