<script setup lang="ts">
import { GOALS } from "~/utils/streak"

// The student's streak, how many days they studied this week against their own goal, and the last 12 weeks as a calendar.
const { loaded, goal, streak, thisWeek, cells, load } = useStudyDays()
onMounted(load)
const reached = computed(() => thisWeek.value >= goal.value)
const percent = computed(() => Math.min(100, Math.round((thisWeek.value / goal.value) * 100)))
const dayLabel = (d: { date: string; active: boolean }) => `${formatDate(d.date)}: ${d.active ? t("streak.studied") : t("streak.rest")}`
const { t } = useI18n()
</script>

<template>
  <section v-if="loaded" class="card streak" :aria-label="$t('streak.title')">
    <div class="row top">
      <div class="flame" :class="{ on: streak.current > 0 }"><Icon name="flame" size="26" /></div>
      <div>
        <b class="n">{{ $t("streak.days", streak.current) }}</b>
        <p class="muted small">
          {{ streak.doneToday ? $t("streak.today") : streak.current ? $t("streak.keep") : $t("streak.start") }}
          · {{ $t("streak.best", { n: streak.best }) }}
        </p>
      </div>
    </div>

    <div class="goal">
      <div class="row between">
        <span class="small"><b>{{ $t("streak.week", { n: thisWeek, goal }) }}</b> <span v-if="reached" class="ok"><Icon name="check" size="14" /> {{ $t("streak.reached") }}</span></span>
        <label class="small muted">{{ $t("streak.goal") }}
          <select v-model.number="goal" :aria-label="$t('streak.goal')"><option v-for="g in GOALS" :key="g" :value="g">{{ $t("streak.perWeek", { n: g }) }}</option></select>
        </label>
      </div>
      <StatBar :value="percent" :text="`${thisWeek}/${goal}`" />
    </div>

    <div class="heat" role="img" :aria-label="$t('streak.calendar')">
      <div v-for="(week, w) in cells" :key="w" class="col">
        <span v-for="d in week" :key="d.date" class="cell" :class="{ on: d.active, future: d.future }" :title="dayLabel(d)" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.streak { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.top { align-items: center; gap: 12px; }
.top p { margin: 0; }
.n { font-size: 1.3rem; font-variant-numeric: tabular-nums; }
.flame { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; background: var(--line); color: var(--muted); }
.flame.on { background: var(--warn-soft); color: var(--warn); }
.between { justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.ok { color: var(--ok); font-weight: 600; }
select { width: auto; padding: 2px 6px; }
.heat { display: flex; gap: 4px; overflow-x: auto; }
.col { display: grid; grid-template-rows: repeat(7, 14px); gap: 4px; }
.cell { width: 14px; height: 14px; border-radius: 3px; background: var(--line); }
.cell.on { background: var(--ok); }
.cell.future { background: transparent; border: 1px dashed var(--line); }
</style>
