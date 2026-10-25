<script setup lang="ts">
import type { Database, Tables, Views } from "~/types/database.types"
import type { Course } from "~/utils/course"

// Build a review worksheet from the questions a class (or one student) got wrong in chosen lessons.
// The picked questions open in the lesson editor as a new lesson, to check, save and give to the class.
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("reviewPage.pageTitle") })

const route = useRoute()
const classId = route.params.classId as string
const client = useSupabaseClient<Database>()
const { load } = useCourse()

type WrongRow = Database["public"]["Functions"]["wrong_questions"]["Returns"][number]
const cls = shallowRef<Pick<Tables<"classes">, "id" | "name" | "course_id"> | null>(null)
const outline = shallowRef<Course | null>(null)
const students = shallowRef<Pick<Views<"student_progress">, "user_id" | "full_name" | "username">[]>([])
/** Lessons given to the class that have submitted work, in course order. */
const lessons = shallowRef<{ id: string; name: string; submitted: number }[]>([])
const chosenLessons = ref<string[]>([])
const student = ref(typeof route.query.student === "string" ? route.query.student : "")
const rows = shallowRef<WrongRow[]>([])
const picked = ref(new Set<string>())
const searched = ref(false)
const loading = ref(false)
const error = ref("")

onMounted(async () => {
  const { data } = await client.from("classes").select("id, name, course_id").eq("id", classId).maybeSingle()
  cls.value = data
  if (!data) return
  const [o, st, stats] = await Promise.all([
    load(data.course_id),
    client.from("student_progress").select("user_id, full_name, username").eq("class_id", classId).order("full_name"),
    client.from("class_lesson_stats").select("lesson_id, submitted").eq("class_id", classId).gt("submitted", 0),
  ])
  outline.value = o
  students.value = st.data ?? []
  const done = new Map((stats.data ?? []).map(r => [r.lesson_id ?? "", r.submitted ?? 0]))
  lessons.value = o.order.filter(id => done.has(id)).map(id => ({
    id, name: `${o.byId[id]!.label} - ${o.byId[id]!.title}`, submitted: done.get(id)!,
  }))
  chosenLessons.value = lessons.value.slice(-3).map(l => l.id)
})

const TOP = 15
async function find() {
  if (!chosenLessons.value.length) return
  loading.value = true
  error.value = ""
  const { data, error: e } = await client.rpc("wrong_questions", {
    target_class: classId, target_lessons: chosenLessons.value, ...(student.value ? { target_student: student.value } : {}),
  })
  loading.value = false
  searched.value = true
  if (e) {
    error.value = t("reviewPage.findFailed", { msg: errorText(e.message) })
    return
  }
  rows.value = data ?? []
  picked.value = new Set(rows.value.slice(0, TOP).map(r => r.item_id))
}
function toggle(id: string) {
  const next = new Set(picked.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  picked.value = next
}

const lessonLabel = (id: string) => outline.value?.byId[id]?.label ?? id

// The review lesson draft travels to the editor through shared state.
const handoff = useLessonHandoff()
async function build() {
  const chosen = rows.value.filter(r => picked.value.has(r.item_id))
  const who = students.value.find(s => s.user_id === student.value)
  handoff.value = {
    from: "review",
    classId,
    studentId: student.value,
    courseId: cls.value!.course_id,
    label: t("editor.reviewLabel"),
    title: who ? t("reviewPage.titleStudent", { name: who.full_name || who.username }) : t("reviewPage.titleClass", { name: cls.value?.name }),
    sections: sectionsFromQuestions(chosen, type => t(`reviewPage.section.${type}`)),
  }
  await navigateTo(`/teacher/lessons/new?class=${classId}&from=review`)
}
</script>

<template>
  <div>
    <BackLink :to="`/teacher/classes/${classId}`" :label="cls ? $t('nav.classBadge', { name: cls.name }) : $t('nav.classes')" />
    <h1>{{ $t("reviewPage.title") }}</h1>
    <p class="sub">{{ $t("reviewPage.intro") }}</p>
    <Skeleton v-if="!cls" />
    <template v-else>
      <section class="card stack">
        <h2>1. {{ $t("reviewPage.step1") }}</h2>
        <p v-if="!lessons.length" class="muted small">{{ $t("reviewPage.noSubmitted") }}</p>
        <div v-else class="picks">
          <label v-for="l in lessons" :key="l.id" class="pick" :class="{ on: chosenLessons.includes(l.id) }">
            <input v-model="chosenLessons" type="checkbox" :value="l.id">
            <span>{{ l.name }} <small class="muted">· {{ $t("reviewPage.submissions", { n: l.submitted }) }}</small></span>
          </label>
        </div>
        <label class="field">{{ $t("common.student") }}
          <select v-model="student">
            <option value="">{{ $t("classPage.wholeClass") }}</option>
            <option v-for="s in students" :key="s.user_id ?? ''" :value="s.user_id ?? ''">{{ s.full_name || s.username }}</option>
          </select>
        </label>
        <div><button class="btn primary" :disabled="loading || !chosenLessons.length" @click="find">{{ loading ? $t("reviewPage.finding") : $t("reviewPage.find") }}</button></div>
        <p v-if="error" class="fb no">{{ error }}</p>
      </section>

      <section v-if="searched" class="card stack">
        <div class="head">
          <h2>2. {{ $t("reviewPage.step2", { n: picked.size, total: rows.length }) }}</h2>
          <span class="row">
            <button class="btn small ghost" @click="picked = new Set(rows.slice(0, TOP).map(r => r.item_id))">{{ $t("reviewPage.top", { n: TOP }) }}</button>
            <button class="btn small ghost" @click="picked = new Set(rows.map(r => r.item_id))">{{ $t("editor.selectAll") }}</button>
            <button class="btn small ghost" @click="picked = new Set()">{{ $t("editor.selectNone") }}</button>
          </span>
        </div>
        <p v-if="!rows.length" class="muted"><Icon name="checkCircle" /> {{ $t("reviewPage.noneWrong") }}</p>
        <label v-for="r in rows" :key="r.item_id" class="q-row" :class="{ on: picked.has(r.item_id) }">
          <input type="checkbox" :checked="picked.has(r.item_id)" @change="toggle(r.item_id)">
          <span class="q-text">
            <span><span class="badge">{{ SECTION_TYPES[r.type].label }}</span> {{ questionText(r) }}</span>
            <small class="muted">
              → <b>{{ stripTags(answerText(r)) }}</b> · <b class="bad">{{ r.wrong }}/{{ r.answered }}</b> {{ $t("reviewPage.gotWrong") }}
              · {{ lessonLabel(r.lesson_id) }} {{ r.qid }}<template v-if="r.tag"> · [{{ r.tag }}]</template>
            </small>
          </span>
        </label>
        <div v-if="rows.length"><button class="btn primary" :disabled="!picked.size" @click="build">{{ $t("reviewPage.build", { n: picked.size }) }} →</button></div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 4px; font-size: .88rem; font-weight: 500; max-width: 320px; }
.picks { display: flex; flex-direction: column; gap: 6px; }
.pick, .q-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; }
.pick.on, .q-row.on { border-color: var(--accent); background: var(--accent-soft); }
.pick input, .q-row input { margin-top: 4px; }
.q-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.head .btn { padding: 2px 10px; }
.bad { color: var(--bad); }
</style>
