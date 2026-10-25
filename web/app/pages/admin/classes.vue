<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"

definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: () => `${t("nav.classes")} - Admin` })

const client = useSupabaseClient<Database>()

type ClassRow = Pick<Tables<"classes">, "id" | "course_id" | "name" | "join_code"> & {
  class_teachers: Pick<Tables<"class_teachers">, "teacher_id">[]
}
type CourseRow = Pick<Tables<"courses">, "id" | "name" | "kind" | "is_published">
const classes = shallowRef<ClassRow[]>([])
const courses = shallowRef<CourseRow[]>([])
// Only teachers/admins (for assigning) and per-class student counts are fetched, not every profile.
const teachers = shallowRef<Pick<Tables<"profiles">, "id" | "full_name" | "email" | "role">[]>([])
const students = shallowRef<Record<string, number>>({})
const loaded = ref(false)
const message = ref("")
const busy = ref<string | null>(null)

async function load() {
  const [c, k, t, o] = await Promise.all([
    client.from("classes").select("id, course_id, name, join_code, class_teachers(teacher_id)").order("name"),
    client.from("courses").select("id, name, kind, is_published").order("position"),
    client.from("profiles").select("id, full_name, email, role").in("role", ["teacher", "admin"]).order("full_name"),
    client.from("class_overview").select("class_id, students"),
  ])
  classes.value = (c.data ?? []) as ClassRow[]
  courses.value = (k.data ?? []) as CourseRow[]
  teachers.value = t.data ?? []
  students.value = Object.fromEntries((o.data ?? []).map(r => [r.class_id ?? "", r.students ?? 0]))
  loaded.value = true
}
onMounted(load)

const nameOf = (id: string) => {
  const p = teachers.value.find(x => x.id === id)
  return p?.full_name || p?.email || "?"
}
const studentCount = (classId: string) => students.value[classId] ?? 0
const byCourse = computed(() =>
  courses.value
    .map(c => ({ course: c, classes: classes.value.filter(x => x.course_id === c.id) }))
    .filter(g => g.classes.length || g.course.kind === "grade"),
)

async function run(key: string, action: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
  busy.value = key
  message.value = ""
  const { error } = await action()
  busy.value = null
  message.value = error ? t("classesPage.failed", { msg: errorText(error.message) }) : ok
  if (!error) await load()
}

// ---- create ----
const newCourse = ref("lop-6")
const newName = ref("")
function createClass() {
  const name = newName.value.trim().toUpperCase()
  if (!name) return
  run("create", () => client.from("classes").insert({ course_id: newCourse.value, name }), t("classesPage.created", { name }))
  newName.value = ""
}

// ---- teachers ----
const assignPick = ref<Record<string, string>>({})
function assign(c: ClassRow) {
  const teacherId = assignPick.value[c.id]
  if (!teacherId) return
  run(`assign-${c.id}`, () => client.from("class_teachers").insert({ class_id: c.id, teacher_id: teacherId }),
    t("classesPage.assigned", { teacher: nameOf(teacherId), name: c.name }))
  assignPick.value[c.id] = ""
}
function unassign(c: ClassRow, teacherId: string) {
  run(`unassign-${c.id}-${teacherId}`, () => client.from("class_teachers").delete().eq("class_id", c.id).eq("teacher_id", teacherId),
    t("classesPage.unassigned", { teacher: nameOf(teacherId), name: c.name }))
}

// ---- code / delete ----
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("")
function regenerate(c: ClassRow) {
  run(`code-${c.id}`, () => client.from("classes").update({ join_code: newCode() }).eq("id", c.id),
    t("classesPage.codeChanged", { name: c.name }))
}
const deleteArmed = ref<string | null>(null)
function remove(c: ClassRow) {
  if (deleteArmed.value !== c.id) {
    deleteArmed.value = c.id
    setTimeout(() => { if (deleteArmed.value === c.id) deleteArmed.value = null }, 4000)
    return
  }
  deleteArmed.value = null
  run(`delete-${c.id}`, () => client.from("classes").delete().eq("id", c.id), t("classesPage.deleted", { name: c.name }))
}
</script>

<template>
  <div>
    <h1>{{ $t("nav.classes") }}</h1>
    <p class="sub">{{ $t("classesPage.intro") }}</p>
    <p v-if="message" class="fb ok">{{ message }}</p>

    <form class="card row create" @submit.prevent="createClass">
      <b>{{ $t("classesPage.new") }}</b>
      <select id="new-class-course" v-model="newCourse">
        <option v-for="c in courses" :key="c.id" :value="c.id">{{ localName(c.name) }}</option>
      </select>
      <input id="new-class-name" v-model="newName" type="text" class="short" :placeholder="$t('classesPage.nameEx')">
      <button class="btn primary" :disabled="busy === 'create' || !newName.trim()">{{ $t("classesPage.create") }}</button>
    </form>

    <Skeleton v-if="!loaded" />
    <section v-for="g in byCourse" :key="g.course.id" class="card">
      <h2>{{ localName(g.course.name) }} <span v-if="!g.course.is_published" class="badge">{{ $t("coursesPage.adminOnly") }}</span></h2>
      <p v-if="!g.classes.length" class="muted small">{{ $t("classesPage.none") }}</p>
      <div v-for="c in g.classes" :key="c.id" class="class-row">
        <div class="cell name">
          <NuxtLink :to="`/teacher/classes/${c.id}`"><b>{{ c.name }}</b></NuxtLink>
          <span class="small muted">{{ $t("common.students", studentCount(c.id)) }}</span>
        </div>
        <div class="cell code">
          <span class="small muted">{{ $t("classesPage.code") }}</span> <b>{{ c.join_code }}</b>
          <button class="btn ghost small" :disabled="busy === `code-${c.id}`" @click="regenerate(c)">{{ $t("classesPage.newCode") }}</button>
        </div>
        <div class="cell teachers">
          <span v-if="!c.class_teachers.length" class="small muted">{{ $t("classesPage.noTeacher") }}</span>
          <span v-for="t in c.class_teachers" :key="t.teacher_id" class="chip-tag">
            {{ nameOf(t.teacher_id) }}
            <button class="x" :title="$t('classesPage.unassignTitle', { name: nameOf(t.teacher_id) })" @click="unassign(c, t.teacher_id)">×</button>
          </span>
          <!-- Admins are not listed: they can already grade every class. An admin assigned earlier keeps their chip. -->
          <select :id="`assign-${c.id}`" :value="assignPick[c.id] ?? ''" @change="assignPick[c.id] = ($event.target as HTMLSelectElement).value; assign(c)">
            <option value="">{{ $t("classesPage.assign") }}</option>
            <option
              v-for="t in teachers.filter(t => t.role === 'teacher' && !c.class_teachers.some(x => x.teacher_id === t.id))"
              :key="t.id"
              :value="t.id"
            >{{ t.full_name || t.email }}</option>
          </select>
        </div>
        <div class="cell">
          <button
            class="btn small"
            :class="deleteArmed === c.id ? 'danger' : 'ghost'"
            :disabled="studentCount(c.id) > 0"
            :title="studentCount(c.id) > 0 ? $t('classesPage.deleteBlocked') : ''"
            @click="remove(c)"
          >{{ deleteArmed === c.id ? $t("common.confirmAgain") : $t("classesPage.delete") }}</button>
        </div>
      </div>
    </section>
    <p v-if="loaded && !teachers.some(t => t.role === 'teacher')" class="muted small">
      {{ $t("classesPage.noTeachers") }} <NuxtLink to="/admin/teachers">{{ $t("nav.teachers") }}</NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.create { gap: 10px; }
.create select { width: auto; }
.class-row { display: grid; grid-template-columns: 140px 200px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); }
.class-row:first-of-type { border-top: 0; }
.cell { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.name { flex-direction: column; align-items: flex-start; gap: 0; }
.name a { text-decoration: none; font-size: 1.1rem; }
.code b { letter-spacing: .12em; font-variant-numeric: tabular-nums; }
.btn.small { padding: 3px 10px; font-size: .85rem; }
.teachers select { width: auto; max-width: 240px; }
.chip-tag { display: inline-flex; align-items: center; gap: 4px; background: var(--accent-soft); border-radius: 999px; padding: 2px 4px 2px 10px; font-size: .88rem; }
.chip-tag .x { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 4px; }
.chip-tag .x:hover { color: var(--bad); }
@media (max-width: 760px) { .class-row { grid-template-columns: 1fr; } }
</style>
