<script setup lang="ts">
import type { Database } from "~/types/database.types"
import { KINDS, STATUSES, attendanceScore, columnsOf, countStatuses, dayLabel, meanOf, scoreText, termOf, type ClassScoreData, type Term } from "~/utils/classScores"
import { loadMyScores } from "~/utils/classScoreStore"

// A student's own class marks in one term (attendance, points for speaking up, oral checks, homework), as their
// teachers recorded them. RLS gives the student only their own rows.
const { t, locale } = useI18n()
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

const term = ref<Term>(termOf(new Date()))
const data = shallowRef<ClassScoreData | null>(null)
const error = ref("")

async function load() {
  const me = user.value?.sub
  if (!me) return
  try {
    data.value = await loadMyScores(client, me, term.value)
    error.value = ""
  } catch (e) {
    error.value = t("classScores.loadFailed", { msg: (e as Error).message })
  }
}
onMounted(load)
watch(term, load)

const view = computed(() => {
  const d = data.value
  if (!d) return null
  const sessionIds = new Set(d.sessions.map(s => s.id))
  const counts = countStatuses(d.attendance.filter(a => sessionIds.has(a.session_id)).map(a => a.status))
  const marks = new Map(d.entries.map(e => [e.column_id, Number(e.score)]))
  const kinds = KINDS.map((k) => {
    const cols = columnsOf(d.columns, k).filter(c => marks.has(c.id))
    return { kind: k, cols: cols.map(c => ({ ...c, score: marks.get(c.id)! })), mean: meanOf(cols.map(c => marks.get(c.id)!)) }
  })
  const points = d.points.reduce((a, p) => a + p.points, 0)
  const absences = d.sessions
    .map(s => ({ s, status: d.attendance.find(a => a.session_id === s.id)?.status }))
    .filter((x): x is { s: typeof x.s; status: NonNullable<typeof x.status> } => !!x.status && x.status !== "present")
    .sort((a, b) => b.s.held_on.localeCompare(a.s.held_on))
  return { counts, attendance: attendanceScore(counts), points, kinds, absences, empty: !d.sessions.length && !d.points.length && !d.entries.length }
})
const countsText = (c: Record<string, number>) => STATUSES.filter(s => c[s]).map(s => `${t(`classScores.status.${s}`)}: ${c[s]}`).join(" · ") || "-"
</script>

<template>
  <section class="card">
    <div class="section-head">
      <h2>{{ $t("classScores.mine") }}</h2>
      <select v-model.number="term" :aria-label="$t('classScores.term')">
        <option :value="1">{{ $t("classScores.termN", { n: 1 }) }}</option>
        <option :value="2">{{ $t("classScores.termN", { n: 2 }) }}</option>
      </select>
    </div>
    <p v-if="error" class="fb no">{{ error }}</p>
    <Skeleton v-else-if="!view" />
    <p v-else-if="view.empty" class="muted">{{ $t("classScores.mineEmpty") }}</p>
    <template v-else>
      <div class="stats">
        <div class="stat">
          <b>{{ scoreText(view.attendance) }}</b>
          <span>{{ $t("classScores.attendanceMark") }}</span>
          <span class="detail">{{ countsText(view.counts) }}</span>
        </div>
        <div class="stat">
          <b>+{{ view.points }}</b>
          <span>{{ $t("classScores.points") }}</span>
        </div>
        <div v-for="k in view.kinds" :key="k.kind" class="stat">
          <b>{{ scoreText(k.mean) }}</b>
          <span>{{ $t(`classScores.kind.${k.kind}`) }}</span>
          <span class="detail">{{ $t("classScores.marksCount", { n: k.cols.length }) }}</span>
        </div>
      </div>
      <template v-for="k in view.kinds.filter(x => x.cols.length)" :key="k.kind">
        <h3>{{ $t(`classScores.kind.${k.kind}`) }}</h3>
        <div v-for="c in k.cols" :key="c.id" class="list-row">
          <span><b>{{ c.title }}</b><small>{{ dayLabel(c.held_on, locale) }}</small></span>
          <ClassScoresMark :value="c.score" />
        </div>
      </template>
      <template v-if="view.absences.length">
        <h3>{{ $t("classScores.notPresent") }}</h3>
        <div v-for="x in view.absences" :key="x.s.id" class="list-row">
          <span><b>{{ dayLabel(x.s.held_on, locale) }}</b></span>
          <span class="badge" :class="x.status">{{ $t(`classScores.status.${x.status}`) }}</span>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.section-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-sm); }
.section-head h2 { margin: 0; }
.section-head select { width: auto; max-width: 100%; }
.stat .detail { display: block; }
.badge.late { color: var(--warn); border-color: var(--warn); background: var(--warn-soft); }
.badge.excused { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
.badge.absent { color: var(--bad); border-color: var(--bad); background: var(--bad-soft); }
</style>
