<script setup lang="ts">
import type { Database, Views } from "~/types/database.types"
import { dailyCounts, scoreBands, topClasses, type SubmittedAttempt } from "~/utils/adminCharts"

definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: "Dashboard - Grammar" })

const client = useSupabaseClient<Database>()

// Numbers come pre-aggregated from the course_summary view; tiles use count-only (head) queries.
const summaries = shallowRef<Views<"course_summary">[]>([])
const totals = reactive({ students: 0, noClass: 0, active: 0, attemptsWeek: 0, waiting: 0, accuracy: null as number | null })
const loaded = ref(false)
const error = ref("")
const handIns = shallowRef<SubmittedAttempt[]>([])
const daily = computed(() => dailyCounts(handIns.value))
const maxDaily = computed(() => Math.max(1, ...daily.value.map(d => d.n)))
const top = computed(() => topClasses(handIns.value))
const bands = computed(() => scoreBands(handIns.value))
const bandTotal = computed(() => bands.value.low + bands.value.mid + bands.value.good)

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
  // Charts: the hand-ins of the last 30 days (up to 5000 rows), counted in the browser.
  const from = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { data, error: chartError } = await (client.from("attempts")
    .select("submitted_at, score, profiles!inner(classes!profiles_class_id_fkey(name))")
    .neq("status", "in_progress").gte("submitted_at", from).limit(5000) as unknown as PromiseLike<{ error: { message: string } | null; data: { submitted_at: string | null; score: { ok?: number; total?: number } | null; profiles: { classes: { name: string } | null } | null }[] | null }>)
  if (chartError) error.value = t("dashboard.loadFailed", { msg: chartError.message })
  handIns.value = (data ?? []).map(r => ({ submitted_at: r.submitted_at, ok: r.score?.ok ?? 0, total: r.score?.total ?? 0, className: r.profiles?.classes?.name ?? null }))
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

    <div class="charts" :aria-busy="!loaded">
      <section class="card wide-chart">
        <h2>{{ $t("dashboard.chartDaily") }}</h2>
        <div class="daily" role="img" :aria-label="$t('dashboard.chartDaily')">
          <span v-for="d in daily" :key="d.day" class="col" :title="`${formatDate(d.day)}: ${d.n}`">
            <span class="b" :style="{ height: `${(d.n / maxDaily) * 100}%` }" />
          </span>
        </div>
        <p class="small muted">{{ $t("dashboard.chartDailyHint", { max: maxDaily }) }}</p>
      </section>
      <section class="card">
        <h2>{{ $t("dashboard.chartTop") }}</h2>
        <p v-if="!top.length" class="muted small">{{ $t("dashboard.chartNone") }}</p>
        <div v-for="c in top" :key="c.name" class="trow"><b>{{ c.name }}</b><StatBar :value="Math.round((c.n / top[0]!.n) * 100)" :text="String(c.n)" /></div>
      </section>
      <section class="card">
        <h2>{{ $t("dashboard.chartScores") }}</h2>
        <p v-if="!bandTotal" class="muted small">{{ $t("dashboard.chartNone") }}</p>
        <div v-for="k in (['low', 'mid', 'good'] as const)" :key="k" class="trow">
          <span class="small">{{ $t(`dashboard.band.${k}`) }}</span>
          <span class="meter hist"><span class="track"><span class="fill" :class="k" :style="{ width: `${(bands[k] / Math.max(1, bandTotal)) * 100}%` }" /></span><span class="num">{{ bands[k] }}</span></span>
        </div>
      </section>
    </div>

    <section class="card" style="margin-top: var(--space-lg)">
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
.charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-lg); }
.charts .card { margin: 0; min-height: 176px; }
.charts .wide-chart { min-height: 220px; }
.wide-chart { grid-column: 1 / -1; }
.daily { display: flex; align-items: flex-end; gap: 3px; height: 120px; }
.daily .col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.daily .b { display: block; width: 100%; min-height: 2px; border-radius: 3px 3px 0 0; background: var(--accent); }
.trow { display: grid; grid-template-columns: 90px 1fr; gap: var(--space-sm); align-items: center; padding: 4px 0; }
.hist { display: flex; align-items: center; gap: var(--space-sm); }
.hist .track { flex: 1; height: 8px; border-radius: var(--radius-full); background: var(--line); overflow: hidden; }
.hist .fill { display: block; height: 100%; }
.fill.low { background: var(--bad); } .fill.mid { background: var(--warn); } .fill.good { background: var(--ok); }
.hist .num { font-weight: 600; min-width: 2ch; text-align: right; }
@media (max-width: 700px) { .charts { grid-template-columns: minmax(0, 1fr); } }
.n { text-align: right; font-variant-numeric: tabular-nums; }
.course-table a { text-decoration: none; }
</style>
