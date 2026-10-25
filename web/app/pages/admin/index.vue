<script setup lang="ts">
import type { Database, Views } from "~/types/database.types"

definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: "Dashboard - Grammar" })

const client = useSupabaseClient<Database>()

// Numbers come pre-aggregated from the course_summary view; tiles use count-only (head) queries.
const summaries = shallowRef<Views<"course_summary">[]>([])
const totals = reactive({ students: 0, noClass: 0, active: 0, attemptsWeek: 0, waiting: 0, accuracy: null as number | null })
const loaded = ref(false)
const error = ref("")

onMounted(async () => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const [c, all, noClass, week] = await Promise.all([
      client.from("course_summary").select("*").order("position"),
      client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").is("class_id", null),
      client.from("attempts").select("id", { count: "exact", head: true }).gte("updated_at", since),
    ])
    for (const r of [c, all, noClass, week]) if (r.error) throw r.error
    summaries.value = c.data ?? []
    const sum = (k: "active" | "waiting" | "ok" | "done") => summaries.value.reduce((n, x) => n + (x[k] ?? 0), 0)
    totals.students = all.count ?? 0
    totals.noClass = noClass.count ?? 0
    totals.attemptsWeek = week.count ?? 0
    totals.active = sum("active")
    totals.waiting = sum("waiting")
    totals.accuracy = percentOf(sum("ok"), sum("done"))
  } catch (e) {
    error.value = t("dashboard.loadFailed", { msg: (e as Error).message })
  }
  loaded.value = true
})
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <p class="sub">{{ $t("dashboard.intro") }}</p>
    <p v-if="error" class="fb no">{{ error }}</p>

    <div class="stats">
      <div class="stat">
        <b>{{ loaded ? totals.students : "…" }}</b>
        <span>{{ $t("teacherHome.students") }}<template v-if="totals.noClass"> · {{ $t("dashboard.noClass", { n: totals.noClass }) }}</template></span>
      </div>
      <div class="stat"><b>{{ loaded ? totals.active : "…" }}</b><span>{{ $t("dashboard.active") }}</span></div>
      <div class="stat"><b>{{ loaded ? totals.attemptsWeek : "…" }}</b><span>{{ $t("dashboard.attemptsWeek") }}</span></div>
      <div class="stat"><b>{{ loaded ? (totals.accuracy === null ? "-" : `${totals.accuracy}%`) : "…" }}</b><span>{{ $t("dashboard.accuracy") }}</span></div>
      <NuxtLink to="/teacher/grading" class="stat stat-link" :class="{ alert: totals.waiting > 0 }">
        <b>{{ loaded ? totals.waiting : "…" }}</b><span>{{ $t("dashboard.waiting") }} →</span>
      </NuxtLink>
    </div>

    <section class="card">
      <h2>{{ $t("dashboard.byGrade") }}</h2>
      <p class="hint">{{ $t("dashboard.byGradeHint") }}</p>
      <Skeleton v-if="!loaded" :card="false" />
      <div v-else class="table-wrap">
        <table class="course-table">
          <thead>
            <tr>
              <th>{{ $t("editor.grade") }}</th>
              <th class="n">{{ $t("nav.classes") }}</th>
              <th class="n">{{ $t("nav.students") }}</th>
              <th class="n">{{ $t("dashboard.active7") }}</th>
              <th class="n">{{ $t("nav.lessons") }}</th>
              <th class="n">{{ $t("dashboard.attempts") }}</th>
              <th>{{ $t("classPage.submitted") }}</th>
              <th>{{ $t("classPage.accuracy") }}</th>
              <th class="n">{{ $t("classPage.waiting") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in summaries" :key="c.course_id ?? ''">
              <td><NuxtLink :to="`/admin/courses/${c.course_id}`"><b>{{ localName(c.name) }}</b></NuxtLink></td>
              <td class="n">{{ c.classes }}</td>
              <td class="n">{{ c.students }}</td>
              <td class="n">{{ c.active }}</td>
              <td class="n">{{ c.lessons }}</td>
              <td class="n">{{ c.attempts }}</td>
              <td>
                <StatBar
                  :value="percentOf(c.completed, c.attempts)"
                  :text="`${c.completed}/${c.attempts}`"
                  :title="$t('dashboard.completedTitle', { n: c.completed, total: c.attempts })"
                />
              </td>
              <td><StatBar :value="percentOf(c.ok, c.done)" /></td>
              <td class="n">
                <NuxtLink v-if="c.waiting" :to="`/teacher/grading`" class="badge submitted">{{ c.waiting }}</NuxtLink>
                <span v-else class="muted">0</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stat-link { text-decoration: none; color: var(--text); }
.stat-link:hover { border-color: var(--accent); }
.stat.alert { border-color: var(--warn); background: var(--warn-soft); }
.course-table td { white-space: nowrap; }
.course-table th { vertical-align: bottom; }
.course-table td:nth-child(7), .course-table td:nth-child(8) { min-width: 130px; }
.n { text-align: right; font-variant-numeric: tabular-nums; }
.course-table a { text-decoration: none; }
</style>
