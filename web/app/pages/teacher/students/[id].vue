<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { Score } from "~/utils/course"

definePageMeta({ roles: ["teacher"] })

const route = useRoute()
const client = useSupabaseClient<Database>()
const studentId = route.params.id as string

const student = shallowRef<Tables<"profiles"> | null>(null)
type AttemptRow = Pick<Tables<"attempts">, "id" | "lesson_id" | "score" | "status" | "updated_at"> & {
  lessons: Pick<Tables<"lessons">, "title" | "label"> | null
}
const attempts = shallowRef<AttemptRow[]>([])
const errors = shallowRef<Tables<"error_log">[]>([])
const loaded = ref(false)

async function loadErrors() {
  const { data } = await client.from("error_log").select("*").eq("user_id", studentId)
  errors.value = data ?? []
}

onMounted(async () => {
  const [p, a] = await Promise.all([
    client.from("profiles").select("*").eq("id", studentId).maybeSingle(),
    client.from("attempts").select("id, lesson_id, score, status, updated_at, lessons(title, label)").eq("user_id", studentId).order("updated_at", { ascending: false }),
    loadErrors(),
  ])
  student.value = p.data
  attempts.value = (a.data ?? []) as AttemptRow[]
  loaded.value = true
})
const { t } = useI18n()
useHead({ title: () => student.value?.full_name || t("common.student") })

const score = (row: AttemptRow) => row.score as unknown as Score
const accuracy = computed(() => {
  const done = attempts.value.reduce((n, a) => n + (score(a).done ?? 0), 0)
  const ok = attempts.value.reduce((n, a) => n + (score(a).ok ?? 0), 0)
  return done ? Math.round((ok / done) * 100) : null
})
</script>

<template>
  <div>
    <BackLink to="/teacher/students" :label="$t('nav.students')" />
    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <p v-else-if="!student" class="muted">{{ $t("studentPage.notFound") }}</p>
    <template v-else>
      <h1>{{ student.full_name || student.email }}</h1>
      <p class="sub">{{ loginOf(student) }} · tham gia {{ formatDate(student.created_at) }}</p>
      <p v-if="student.class_id">
        <NuxtLink :to="`/teacher/review/${student.class_id}?student=${student.id}`" class="btn ghost">{{ $t("studentPage.review") }}</NuxtLink>
      </p>

      <div class="stats">
        <div class="stat"><b>{{ attempts.length }}</b><span>{{ $t("studentPage.lessons") }}</span></div>
        <div class="stat"><b>{{ accuracy === null ? "-" : `${accuracy}%` }}</b><span>{{ $t("studentPage.accuracy") }}</span></div>
        <div class="stat"><b>{{ errors.filter(e => e.status !== "fixed").length }}</b><span>{{ $t("studentPage.openErrors") }}</span></div>
      </div>

      <section class="card">
        <h2>{{ $t("studentPage.errorLog") }}</h2>
        <ErrorLogList :entries="errors" editable @changed="loadErrors" />
      </section>

      <section class="card">
        <h2>{{ $t("studentPage.work") }}</h2>
        <p v-if="!attempts.length" class="muted small">{{ $t("studentPage.noWork") }}</p>
        <NuxtLink v-for="a in attempts" :key="a.id" :to="`/teacher/attempts/${a.id}`" class="list-row">
          <span>
            <b>{{ a.lessons?.label ?? a.lesson_id }} - {{ a.lessons?.title ?? "" }}</b>
            <small><template v-if="a.status !== 'in_progress'">{{ $t("progress.correct", { ok: score(a).ok ?? 0, total: score(a).total ?? score(a).done ?? 0 }) }} · </template>{{ formatDate(a.updated_at) }}</small>
          </span>
          <span class="badge" :class="a.status">{{ ATTEMPT_STATUS[a.status] }}</span>
        </NuxtLink>
      </section>
    </template>
  </div>
</template>
