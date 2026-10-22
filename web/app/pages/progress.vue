<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Score } from "~/utils/course"

useHead({ title: "Tiến độ — Grammar B1→B2" })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

type AttemptRow = Pick<Tables<"attempts">, "id" | "lesson_id" | "score" | "status" | "updated_at"> & {
  feedback: Pick<Tables<"feedback">, "id" | "body" | "created_at">[]
}
const attempts = shallowRef<AttemptRow[]>([])
const errors = shallowRef<Tables<"error_log">[]>([])
const loaded = ref(false)

onMounted(async () => {
  const me = user.value?.sub
  if (!me) return
  const [a, e] = await Promise.all([
    client.from("attempts").select("id, lesson_id, score, status, updated_at, feedback(id, body, created_at)")
      .eq("user_id", me).order("updated_at", { ascending: false }),
    client.from("error_log").select("*").eq("user_id", me),
  ])
  attempts.value = (a.data ?? []) as AttemptRow[]
  errors.value = e.data ?? []
  loaded.value = true
})

const score = (row: AttemptRow) => row.score as unknown as Score
const latestFeedback = (row: AttemptRow) =>
  [...row.feedback].sort((x, y) => y.created_at.localeCompare(x.created_at))[0]
</script>

<template>
  <div>
    <h1>Tiến độ của bạn</h1>
    <p class="sub">Lỗi giáo viên ghi lại sau mỗi bài viết. Lỗi nào còn "Đang mắc" sẽ được ưu tiên ôn lại trước khi học bài mới.</p>

    <p v-if="!loaded" class="muted">Đang tải…</p>
    <template v-else>
      <section class="card">
        <h2>Lỗi đang theo dõi</h2>
        <ErrorLogList :entries="errors" />
      </section>

      <section class="card">
        <h2>Lịch sử làm bài</h2>
        <p v-if="!attempts.length" class="muted small">Bạn chưa làm bài nào. <NuxtLink to="/">Bắt đầu với bài 19.1</NuxtLink>.</p>
        <NuxtLink v-for="row in attempts" :key="row.id" :to="`/lessons/${row.lesson_id}`" class="list-row">
          <span>
            <b>Bài {{ row.lesson_id }} — {{ LESSONS[row.lesson_id]?.title ?? "" }}</b>
            <small>
              {{ score(row).ok ?? 0 }}/{{ score(row).done ?? 0 }} câu đúng · {{ formatDate(row.updated_at) }}
              <template v-if="latestFeedback(row)"> · Nhận xét: “{{ latestFeedback(row)!.body.slice(0, 90) }}{{ latestFeedback(row)!.body.length > 90 ? "…" : "" }}”</template>
            </small>
          </span>
          <span class="badge" :class="row.status">{{ ATTEMPT_STATUS[row.status] }}</span>
        </NuxtLink>
      </section>
    </template>
  </div>
</template>
