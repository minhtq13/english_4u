<script setup lang="ts">
import { ABSENT_COST, ATTENDANCE_FULL, LATE_COST, KINDS, STATUSES, columnsOf, scoreText, type ClassScoreData, type ClassScoreRow, type Term } from "~/utils/classScores"
import { downloadXlsx, fileSlug } from "~/utils/spreadsheet"

// Per student, the term in one line: attendance (counts and mark), points, the mean of each kind of marks. The Excel
// file has this sheet plus one sheet per kind with every column.
const props = defineProps<{ className: string; term: Term; rows: ClassScoreRow[]; data: ClassScoreData }>()
const { t } = useI18n()

const rule = computed(() => t("classScores.rule", { full: ATTENDANCE_FULL, absent: ABSENT_COST, late: LATE_COST }))

async function exportXlsx() {
  const name = props.className
  const summary = {
    sheetName: t("classScores.tab.summary"),
    title: t("classScores.sheetTitle", { name, term: props.term }),
    note: rule.value,
    rows: [
      [t("common.student"), ...STATUSES.map(s => t(`classScores.status.${s}`)), t("classScores.attendanceMark"), t("classScores.points"), ...KINDS.map(k => t(`classScores.kind.${k}`))],
      ...props.rows.map(r => [r.name, ...STATUSES.map(s => r.counts[s]), r.attendance, r.points, ...KINDS.map(k => r.averages[k])]),
    ],
  }
  const perKind = KINDS.map((k) => {
    const cols = columnsOf(props.data.columns, k)
    return {
      sheetName: t(`classScores.kind.${k}`),
      title: `${t(`classScores.kind.${k}`)} - ${name}`,
      rows: [
        [t("common.student"), ...cols.map(c => `${c.title} (${c.held_on.slice(8, 10)}/${c.held_on.slice(5, 7)})`), t("classScores.average")],
        ...props.rows.map(r => [r.name, ...cols.map(c => r.marks.get(c.id) ?? null), r.averages[k]]),
      ],
    }
  })
  await downloadXlsx(`${fileSlug(t("classScores.fileName"))}-${fileSlug(name)}-${t("classScores.termShort")}${props.term}`, [summary, ...perKind])
}
</script>

<template>
  <section class="card">
    <div class="section-head">
      <h2>{{ $t("classScores.tab.summary") }}</h2>
      <button class="btn small" :disabled="!rows.length" @click="exportXlsx"><Icon name="file" /> {{ $t("gradebook.export") }}</button>
    </div>
    <p class="hint">{{ rule }}</p>
    <div class="table-wrap">
      <table class="stack-table stats-table">
        <thead>
          <tr>
            <th>{{ $t("common.student") }}</th>
            <th>{{ $t("classScores.sessionsCol") }}</th>
            <th>{{ $t("classScores.attendanceMark") }}</th>
            <th class="n">{{ $t("classScores.points") }}</th>
            <th v-for="k in KINDS" :key="k" class="n">{{ $t(`classScores.kind.${k}`) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.userId">
            <td><b>{{ r.name }}</b></td>
            <td :data-label="$t('classScores.sessionsCol')" class="small muted">
              {{ $t("classScores.sessionCounts", { absent: r.counts.absent, late: r.counts.late, excused: r.counts.excused }) }}
            </td>
            <td :data-label="$t('classScores.attendanceMark')">
              <StatBar :value="r.attendance === null ? null : r.attendance * 10" :text="scoreText(r.attendance)" />
            </td>
            <td :data-label="$t('classScores.points')" class="n"><span class="badge" :class="{ graded: r.points > 0 }">+{{ r.points }}</span></td>
            <td v-for="k in KINDS" :key="k" :data-label="$t(`classScores.kind.${k}`)" class="n"><ClassScoresMark :value="r.averages[k]" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.section-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-sm); }
.section-head h2 { margin: 0; }
.section-head .btn { padding: 4px 12px; }
.hint { font-size: .85rem; margin-bottom: var(--space-sm); }
.stats-table th { white-space: nowrap; }
.stats-table td:has(.meter) { min-width: 140px; }
.n { text-align: right; font-variant-numeric: tabular-nums; }
</style>
