<script setup lang="ts">
import type { Database, Views } from "~/types/database.types"

definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("teacherHome.pageTitle") })

const client = useSupabaseClient<Database>()
const { isAdmin } = useProfile()
const { listCourses } = useCourse()

type ClassRow = Pick<Views<"class_overview">, "class_id" | "course_id" | "name" | "join_code" | "students" | "unlocked" | "waiting">
const classes = shallowRef<ClassRow[]>([])
const courseName = shallowRef<Record<string, string>>({})
const loaded = ref(false)
const error = ref("")

onMounted(async () => {
  try {
    // RLS: teachers get their assigned classes (and count only their students); admins get everything.
    const [c, courses] = await Promise.all([
      client.from("class_overview").select("class_id, course_id, name, join_code, students, unlocked, waiting"),
      listCourses(),
    ])
    if (c.error) throw c.error
    const position = new Map(courses.map(k => [k.id, k.position]))
    courseName.value = Object.fromEntries(courses.map(k => [k.id, k.name]))
    classes.value = ((c.data ?? []) as ClassRow[]).sort((x, y) =>
      (position.get(x.course_id ?? "") ?? 0) - (position.get(y.course_id ?? "") ?? 0) || (x.name ?? "").localeCompare(y.name ?? ""))
  } catch (e) {
    error.value = t("teacherHome.loadFailed", { msg: (e as Error).message })
  }
  loaded.value = true
})
</script>

<template>
  <div>
    <h1>{{ isAdmin ? $t("teacherHome.allClasses") : $t("nav.myClasses") }}</h1>
    <p class="sub">{{ $t("teacherHome.intro") }}</p>
    <p v-if="error" class="fb no">{{ error }}</p>
    <Skeleton v-if="!loaded" />
    <p v-else-if="!classes.length" class="card muted">
      {{ $t("teacherHome.none") }}
    </p>
    <div class="grid">
      <NuxtLink v-for="c in classes" :key="c.class_id ?? ''" :to="`/teacher/classes/${c.class_id}`" class="card class-card">
        <div class="top">
          <b class="name">{{ c.name }}</b>
          <span class="muted small">{{ localName(courseName[c.course_id ?? ""]) }}</span>
        </div>
        <div class="code">{{ $t("classPage.code") }} <b>{{ c.join_code }}</b></div>
        <div class="nums small">
          <span><b>{{ c.students }}</b> {{ $t("teacherHome.students") }}</span>
          <span><b>{{ c.unlocked }}</b> {{ $t("teacherHome.given") }}</span>
          <span :class="{ warn: c.waiting }"><b>{{ c.waiting }}</b> {{ $t("teacherHome.waiting") }}</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.class-card { display: flex; flex-direction: column; gap: 8px; text-decoration: none; color: var(--text); margin: 0; }
.class-card:hover { border-color: var(--accent); }
.top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.name { font-size: 1.4rem; }
.code { font-size: .9rem; color: var(--muted); }
.code b { color: var(--text); letter-spacing: .12em; font-variant-numeric: tabular-nums; }
.nums { display: flex; gap: 12px; flex-wrap: wrap; color: var(--muted); }
.nums b { color: var(--text); font-variant-numeric: tabular-nums; }
.nums .warn b { color: var(--warn); }
</style>
