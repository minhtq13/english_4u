<script setup lang="ts">
import type { Database } from "~/types/database.types"
import { STATUSES, countStatuses, dayLabel, todayIso, type AttendanceStatus, type ClassScoreData, type ClassScoreRow, type Term } from "~/utils/classScores"
import { deleteSession, saveAttendance } from "~/utils/classScoreStore"

// Attendance of one session: pick the day, mark each student (everyone present by default), save. Past sessions of
// the term are listed below; opening one loads its marks back into the form.
const props = defineProps<{ classId: string; term: Term; rows: ClassScoreRow[]; data: ClassScoreData }>()
const emit = defineEmits<{ changed: [] }>()
const { t, locale } = useI18n()
const client = useSupabaseClient<Database>()
const toast = useToast()
const { armed, arm } = useTwoClick()

const day = ref(todayIso())
const marks = ref<Record<string, AttendanceStatus>>({})
const busy = ref(false)

const session = computed(() => props.data.sessions.find(s => s.held_on === day.value) ?? null)

function fill() {
  const saved = new Map(props.data.attendance.filter(a => a.session_id === session.value?.id).map(a => [a.student_id, a.status]))
  marks.value = Object.fromEntries(props.rows.map(r => [r.userId, saved.get(r.userId) ?? "present"]))
}
watch([day, () => props.data, () => props.rows], fill, { immediate: true })

const counts = computed(() => countStatuses(Object.values(marks.value)))

function allPresent() {
  marks.value = Object.fromEntries(props.rows.map(r => [r.userId, "present" as const]))
}

async function save() {
  if (!day.value) return
  busy.value = true
  const { error } = await saveAttendance(client, props.classId, day.value, props.term, Object.entries(marks.value).map(([student_id, status]) => ({ student_id, status })))
  busy.value = false
  if (error) return toast.error(error)
  toast.ok(t("classScores.attendanceSaved"))
  emit("changed")
}

async function remove(id: string) {
  if (!arm(`session:${id}`)) return
  const error = await deleteSession(client, id)
  if (error) return toast.error(error)
  toast.ok(t("classScores.sessionDeleted"))
  emit("changed")
}

const pastSessions = computed(() =>
  [...props.data.sessions].sort((a, b) => b.held_on.localeCompare(a.held_on)).map(s => ({
    ...s,
    counts: countStatuses(props.data.attendance.filter(a => a.session_id === s.id).map(a => a.status)),
  })),
)
</script>

<template>
  <div>
    <section class="card">
      <div class="section-head">
        <h2>{{ $t("classScores.tab.attendance") }}</h2>
        <button class="btn small" type="button" @click="allPresent"><Icon name="check" /> {{ $t("classScores.allPresent") }}</button>
      </div>
      <div class="field">
        <label for="att-day"><b>{{ $t("classScores.day") }}</b></label>
        <div class="row">
          <input id="att-day" v-model="day" type="date" required>
          <span class="badge" :class="{ graded: session }">{{ session ? $t("classScores.sessionBadge.saved") : $t("classScores.sessionBadge.new") }}</span>
        </div>
        <p class="hint">{{ session ? $t("classScores.sessionSaved") : $t("classScores.sessionNew") }}</p>
      </div>
      <ul class="rows">
        <li v-for="r in rows" :key="r.userId">
          <span class="name">{{ r.name }}</span>
          <span class="opts" role="radiogroup" :aria-label="r.name">
            <button
              v-for="s in STATUSES"
              :key="s"
              type="button"
              role="radio"
              :aria-checked="marks[r.userId] === s"
              :class="[s, { on: marks[r.userId] === s }]"
              @click="marks[r.userId] = s"
            >{{ $t(`classScores.status.${s}`) }}</button>
          </span>
        </li>
      </ul>
    </section>

    <div class="scorebar savebar">
      <span class="row counts" role="status">
        <span v-for="s in STATUSES" :key="s" class="badge">{{ $t(`classScores.status.${s}`) }} <b>{{ counts[s] }}</b></span>
      </span>
      <button class="btn primary" :class="{ loading: busy }" :disabled="busy || !day || !rows.length" @click="save">{{ $t("classScores.saveAttendance") }}</button>
    </div>

    <section class="card">
      <h2>{{ $t("classScores.pastSessions") }}</h2>
      <p v-if="!pastSessions.length" class="muted small">{{ $t("classScores.noSessions") }}</p>
      <div v-for="s in pastSessions" :key="s.id" class="list-row">
        <span>
          <b>{{ dayLabel(s.held_on, locale) }}</b>
          <span v-if="s.held_on === day" class="badge graded now">{{ $t("classScores.viewing") }}</span>
          <small>{{ $t("classScores.sessionCounts", { absent: s.counts.absent, late: s.counts.late, excused: s.counts.excused }) }}</small>
        </span>
        <span class="row">
          <button class="btn small ghost" type="button" :disabled="s.held_on === day" @click="day = s.held_on">{{ $t("classScores.openSession") }}</button>
          <button class="btn small" type="button" :class="armed === `session:${s.id}` ? 'danger' : 'ghost'" @click="remove(s.id)">
            {{ armed === `session:${s.id}` ? $t("common.confirmAgain") : $t("common.delete") }}
          </button>
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-sm); }
.section-head h2 { margin: 0; }
.section-head .btn { padding: 4px 12px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--space-md); }
.field input[type=date] { flex: 0 0 auto; width: auto; min-width: 11rem; }
.field .hint { margin: 0; font-size: var(--fs-sm); }
.rows { list-style: none; margin: 0; padding: 0; }
.rows li { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--line); }
.name { flex: 1 1 180px; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.opts button.present.on { background: var(--ok-soft); border-color: var(--ok); color: var(--ok); font-weight: 600; }
.opts button.late.on { background: var(--warn-soft); border-color: var(--warn); color: var(--warn); font-weight: 600; }
.opts button.excused.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); font-weight: 600; }
.opts button.absent.on { background: var(--bad-soft); border-color: var(--bad); color: var(--bad); font-weight: 600; }
.counts { gap: 6px; }
.counts .badge b { color: var(--text); }
.scorebar { margin-bottom: var(--space-lg); }
.now { margin-left: var(--space-sm); }
.list-row small { margin-top: 2px; }
.list-row > .row { flex: none; flex-wrap: nowrap; }
/* Same four columns in every row, so the buttons line up whichever one is chosen (the chosen one is bold, hence wider). */
@media (min-width: 641px) {
  .opts { display: grid; grid-template-columns: 6rem 4.75rem 8.75rem 4.75rem; gap: var(--space-sm); }
  .opts button { text-align: center; }
}
@media (max-width: 640px) {
  .rows li { display: block; }
  .opts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 6px; }
  .opts button { min-height: 44px; padding: 6px 4px; text-align: center; font-size: var(--fs-xs); line-height: 1.2; }
  /* One slim row on a phone: the counts (plain text) on the left, the save button on the right. */
  .scorebar { flex-wrap: nowrap; }
  .counts { flex: 1; min-width: 0; gap: 2px 8px; }
  .counts .badge { border: 0; padding: 0; font-size: var(--fs-xs); }
}
</style>
