<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { AttemptHistoryRow } from "~/components/AttemptHistory.vue"

definePageMeta({ roles: ["student"] })
const { t } = useI18n()
useHead({ title: () => t("progress.pageTitle") })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

const attempts = shallowRef<AttemptHistoryRow[]>([])
/** Lessons of the class whose results show as soon as they are submitted. */
const showsAtOnce = shallowRef<Set<string>>(new Set())
const { myClass } = useProfile()
const errors = shallowRef<Tables<"error_log">[]>([])
const loaded = ref(false)

onMounted(async () => {
  const me = user.value?.sub
  if (!me) return
  const [a, e, c] = await Promise.all([
    client.from("attempts").select("id, lesson_id, score, status, updated_at, feedback(id, body, created_at), lessons(title, label)")
      .eq("user_id", me).order("updated_at", { ascending: false }),
    client.from("error_log").select("*").eq("user_id", me),
    myClass.value
      ? client.from("class_lessons").select("lesson_id").eq("class_id", myClass.value.id).eq("show_results", true)
      : { data: [] },
  ])
  showsAtOnce.value = new Set((c.data ?? []).map(r => r.lesson_id))
  attempts.value = (a.data ?? []) as AttemptHistoryRow[]
  errors.value = e.data ?? []
  loaded.value = true
})
</script>

<template>
  <div>
    <h1>{{ $t("progress.title") }}</h1>
    <p class="sub">{{ $t("progress.intro") }}</p>

    <Skeleton v-if="!loaded" />
    <template v-else>
      <section class="card">
        <h2>{{ $t("progress.errors") }}</h2>
        <ErrorLogList :entries="errors" />
      </section>

      <section class="card">
        <h2>{{ $t("progress.history") }}</h2>
        <AttemptHistory :rows="attempts" viewer="student" :shows-at-once="showsAtOnce" :link="r => `/lessons/${r.lesson_id}`">
          <template #empty>
            <p class="muted small">{{ $t("progress.none") }} <NuxtLink to="/">{{ $t("progress.seeRoadmap") }}</NuxtLink>.</p>
          </template>
        </AttemptHistory>
      </section>
    </template>
  </div>
</template>
