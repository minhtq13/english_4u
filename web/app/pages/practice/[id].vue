<script setup lang="ts">
import type { Database } from "~/types/database.types"
import type { Answer } from "~/utils/course"
import { practiceLesson } from "~/utils/practice"

// Practice the questions you got wrong in a lesson whose results you have already seen. Answers are checked on the
// screen at once, nothing is saved, and the score of the real attempt does not change.
definePageMeta({ roles: ["student"], key: route => route.fullPath })

const { t } = useI18n()
const route = useRoute()
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { getLesson } = useCourse()

const lessonId = route.params.id as string
const full = await getLesson(lessonId)
useHead({ title: () => t("practice.pageTitle", { lesson: full ? `${full.label} - ${full.title}` : lessonId }) })

/** The questions answered wrongly in the student's own attempt, once its results are out. */
const wrong = ref<Set<string> | null>(null)
const key = ref(0)
/** Answers are shown after "Check", not question by question. */
const checked = ref(false)
onMounted(async () => {
  const me = user.value?.sub
  if (!me || !full) { wrong.value = new Set(); return }
  const { data: a } = await client.from("attempts").select("id, status").eq("user_id", me).eq("lesson_id", lessonId).maybeSingle()
  const res = a && a.status !== "in_progress"
    ? (await client.from("attempt_results").select("answers").eq("attempt_id", a.id).maybeSingle()).data
    : null
  const answers = (res?.answers ?? {}) as unknown as Record<string, Answer>
  wrong.value = new Set(Object.entries(answers).filter(([, v]) => !v.ok).map(([k]) => k))
})

const practice = computed(() => (full && wrong.value ? practiceLesson(full, wrong.value) : null))
/** The in-browser attempt (preview mode: graded on the screen, never saved), built once the wrong questions are known. */
const live = shallowRef<ReturnType<typeof useAttempt> | null>(null)
const nuxt = useNuxtApp()
function start() {
  const lesson = practice.value
  // useAttempt needs the Nuxt context (Supabase client), which a watcher callback no longer has.
  live.value = lesson ? (nuxt.runWithContext(() => useAttempt(lesson, { preview: true })) as ReturnType<typeof useAttempt>) : null
  live.value?.load()
}
watch(practice, start)
const total = computed(() => (practice.value ? lessonTotal(practice.value) : 0))
const done = computed(() => Object.values(live.value?.results.value ?? {}).filter(a => a.ok).length)
function again() { key.value++; checked.value = false; start() }
</script>

<template>
  <div>
    <BackLink :to="`/lessons/${lessonId}`" :label="full?.title ?? $t('nav.roadmap')" />
    <h1>{{ $t("practice.title") }}</h1>
    <p v-if="full" class="sub">{{ full.label }} - {{ full.title }}</p>
    <Skeleton v-if="wrong === null" />
    <EmptyState v-else-if="!full || !total" icon="check" :title="$t('practice.nothingTitle')" :text="$t('practice.nothing')">
      <NuxtLink :to="`/lessons/${lessonId}`" class="btn small">{{ $t("practice.back") }}</NuxtLink>
    </EmptyState>
    <template v-else-if="practice && live">
      <p class="hint">{{ $t("practice.howTo") }}</p>
      <section v-for="(s, i) in practice.sections" :key="`${key}-${i}`" class="card">
        <h2>{{ s.title }}</h2>
        <p v-if="s.hint" class="hint" v-html="s.hint" />
        <LessonQuestions
          v-if="isScored(s)" :section="s" :responses="live.state.responses" :results="checked ? live.results.value : null" :locked="checked" :show-key="false"
          @respond="live.respond"
        />
      </section>
      <div class="scorebar">
        <div class="meta">
          <b v-if="checked">{{ $t("practice.progress", { done, total }) }}</b>
          <b v-else>{{ $t("practice.answered", { n: Object.keys(live.state.responses).length, total }) }}</b>
          <small>{{ $t("practice.notSaved") }}</small>
        </div>
        <button v-if="!checked" class="btn primary" @click="checked = true">{{ $t("practice.check") }}</button>
        <button v-else class="btn" @click="again">{{ $t("practice.again") }}</button>
      </div>
    </template>
  </div>
</template>
