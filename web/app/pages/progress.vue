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

const trend = computed(() => trendPoints(attempts.value, showsAtOnce.value))
const mistakes = computed(() => errorCounts(errors.value))

onMounted(async () => {
  const me = user.value?.sub
  if (!me) return
  const [a, e, c] = await Promise.all([
    client.from("attempts").select("id, lesson_id, score, status, updated_at, feedback(id, body, created_at), lessons(title, label)")
      .eq("user_id", me).order("updated_at", { ascending: false }),
    client.from("error_log").select("*").eq("user_id", me),
    myClass.value ? lessonsShowingResults(client, myClass.value.id) : new Set<string>(),
  ])
  showsAtOnce.value = c
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
        <h2>{{ $t("trend.title") }}</h2>
        <ScoreTrend :points="trend" />
      </section>

      <section v-if="mistakes.length" class="card">
        <h2>{{ $t("trend.mistakes") }}</h2>
        <ul class="bars">
          <li v-for="m in mistakes" :key="m.category">
            <span>{{ ERROR_CATEGORIES[m.category as keyof typeof ERROR_CATEGORIES] ?? m.category }}</span>
            <StatBar :value="Math.round((m.n / mistakes[0]!.n) * 100)" :text="String(m.n)" />
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>{{ $t("progress.history") }}</h2>
        <AttemptHistory :rows="attempts" viewer="student" :shows-at-once="showsAtOnce" :link="r => `/lessons/${r.lesson_id}`">
          <template #empty>
            <EmptyState icon="clipboard" :title="$t('progress.none')" :text="$t('progress.noneHint')">
              <NuxtLink to="/" class="btn small primary">{{ $t("progress.seeRoadmap") }}</NuxtLink>
            </EmptyState>
          </template>
        </AttemptHistory>
      </section>
    </template>
  </div>
</template>

<style scoped>
.bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.bars li { display: grid; grid-template-columns: minmax(110px, 1fr) minmax(100px, 2fr); gap: 10px; align-items: center; }
</style>
