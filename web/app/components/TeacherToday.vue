<script setup lang="ts">
import type { Database } from "~/types/database.types"
import type { Course } from "~/utils/course"
import { dueSoonTasks, DUE_SOON_MS, inactiveCutoff, inactiveTasks, waitingTasks } from "~/utils/todayTasks"

// "Việc hôm nay": work waiting for a grade, deadlines in the next two days with students who have not handed in,
// and students silent for a week. Reads the class views (RLS shows a teacher only their own classes).
const props = defineProps<{ classes: { class_id: string | null; name: string | null; course_id: string | null }[] }>()
const client = useSupabaseClient<Database>()
const { load } = useCourse()
const queue = useGradingQueue()

const className = (id: string) => props.classes.find(c => c.class_id === id)?.name ?? ""
const outlines = shallowRef<Record<string, Course>>({})
const lessonName = (id: string) => {
  for (const o of Object.values(outlines.value)) if (o.byId[id]) return `${o.byId[id]!.label} - ${o.byId[id]!.title}`
  return id
}

const waiting = shallowRef<ReturnType<typeof waitingTasks>>([])
const due = shallowRef<ReturnType<typeof dueSoonTasks>>([])
const quiet = shallowRef<ReturnType<typeof inactiveTasks>>([])
const loaded = ref(false)
const failed = ref(false)

onMounted(async () => {
  const now = Date.now()
  const [w, m, q] = await Promise.all([
    client.from("class_lesson_stats").select("class_id, lesson_id, waiting").gt("waiting", 0),
    client.from("class_missing_work").select("class_id, lesson_id, due_at, user_id")
      .gt("due_at", new Date(now).toISOString()).lt("due_at", new Date(now + DUE_SOON_MS).toISOString()),
    client.from("student_progress").select("user_id, full_name, username, email, class_id, last_activity")
      .or(`last_activity.is.null,last_activity.lt.${inactiveCutoff(now)}`).neq("active", false).limit(50),
  ])
  failed.value = !!(w.error || m.error || q.error)
  waiting.value = waitingTasks(w.data ?? [])
  due.value = dueSoonTasks(m.data ?? [], now)
  quiet.value = inactiveTasks(q.data ?? [], now)
  const courses = [...new Set(props.classes.map(c => c.course_id).filter(Boolean) as string[])]
  const loadedOutlines = await Promise.all(courses.map(id => load(id, true).then(o => [id, o] as const).catch(() => null)))
  outlines.value = Object.fromEntries(loadedOutlines.filter(Boolean) as [string, Course][])
  loaded.value = true
})

const nothing = computed(() => !waiting.value.length && !due.value.length && !quiet.value.length)
const quietShown = computed(() => quiet.value.slice(0, 8))
const dueText = (iso: string) => formatDate(iso)
</script>

<template>
  <section class="card today" :aria-label="$t('teacherHome.today.title')">
    <h2>{{ $t("teacherHome.today.title") }}</h2>
    <Skeleton v-if="!loaded" />
    <template v-else>
      <p v-if="failed" class="fb no">{{ $t("teacherHome.today.failed") }}</p>
      <p v-else-if="nothing" class="muted">{{ $t("teacherHome.today.nothing") }}</p>

      <div v-if="waiting.length" class="group">
        <h3>{{ $t("teacherHome.today.waiting") }}</h3>
        <ul>
          <li v-for="w in waiting" :key="`${w.classId}|${w.lessonId}`">
            <span><b>{{ className(w.classId) }}</b> · {{ lessonName(w.lessonId) }} <span class="badge submitted">{{ $t("grading.waitingCount", { n: w.count }) }}</span></span>
            <button class="btn small primary" @click="queue.start(w.lessonId, w.classId)">{{ $t("classPage.queue") }} →</button>
          </li>
        </ul>
      </div>

      <div v-if="due.length" class="group">
        <h3>{{ $t("teacherHome.today.due") }}</h3>
        <ul>
          <li v-for="d in due" :key="`${d.classId}|${d.lessonId}`">
            <span><b>{{ className(d.classId) }}</b> · {{ lessonName(d.lessonId) }} · {{ $t("teacherHome.today.dueAt", { date: dueText(d.due) }) }}
              <span class="badge open">{{ $t("teacherHome.today.notSubmitted", { n: d.count }) }}</span></span>
            <NuxtLink :to="`/teacher/classes/${d.classId}`" class="btn small ghost">{{ $t("teacherHome.today.openClass") }}</NuxtLink>
          </li>
        </ul>
      </div>

      <div v-if="quiet.length" class="group">
        <h3>{{ $t("teacherHome.today.quiet", { n: quiet.length }) }}</h3>
        <ul>
          <li v-for="s in quietShown" :key="s.userId">
            <span><NuxtLink :to="`/teacher/students/${s.userId}`"><b>{{ s.name }}</b></NuxtLink> · {{ className(s.classId) }}
              <span class="muted small">{{ s.days === null ? $t("teacherHome.today.never") : $t("teacherHome.today.daysAgo", { n: s.days }) }}</span></span>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.today { margin-bottom: 16px; }
.group + .group { margin-top: 12px; }
h3 { font-size: 1rem; margin: 0 0 6px; }
ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
li { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 0; border-top: 1px solid var(--line); }
li:first-child { border-top: 0; }
</style>
