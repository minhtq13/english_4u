<script setup lang="ts">
import type { Database } from "~/types/database.types"
import type { ClassScoreRow, PointRow, Term } from "~/utils/classScores"
import { addPoint, undoPoint } from "~/utils/classScoreStore"

// +1 for speaking up: one tap on a student's card stores one award (with the note, if any). The last award can be
// undone at once; the term's awards are listed below, newest first, each one can be taken back.
const props = defineProps<{ classId: string; term: Term; rows: ClassScoreRow[]; points: PointRow[] }>()
const emit = defineEmits<{ added: [row: PointRow]; removed: [id: string] }>()
const { t, locale } = useI18n()
const client = useSupabaseClient<Database>()
const toast = useToast()
const { armed, arm } = useTwoClick()

const note = ref("")
const busy = ref<string | null>(null)
const justId = ref<string | null>(null)
const last = shallowRef<{ row: PointRow; name: string } | null>(null)

const nameOf = computed(() => new Map(props.rows.map(r => [r.userId, r.name])))

async function award(r: ClassScoreRow) {
  if (busy.value) return
  busy.value = r.userId
  const { row, error } = await addPoint(client, props.classId, r.userId, props.term, note.value)
  busy.value = null
  if (error || !row) return toast.error(error ?? t("classScores.saveNothing"))
  last.value = { row, name: r.name }
  note.value = ""
  justId.value = r.userId
  setTimeout(() => { if (justId.value === r.userId) justId.value = null }, 600)
  emit("added", row)
}

async function undo(id: string, confirm: boolean) {
  if (confirm && !arm(`point:${id}`)) return
  const error = await undoPoint(client, id)
  if (error) return toast.error(error)
  if (last.value?.row.id === id) last.value = null
  emit("removed", id)
}

const recent = computed(() => [...props.points].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30))
const timeText = (iso: string) => new Date(iso).toLocaleString(locale.value === "en" ? "en-GB" : "vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
</script>

<template>
  <div>
    <section class="card">
      <div class="section-head"><h2>{{ $t("classScores.tab.points") }}</h2></div>
      <p class="hint">{{ $t("classScores.pointsHint") }}</p>
      <div class="field">
        <label for="pt-note"><b>{{ $t("classScores.note") }}</b> <span class="muted small">{{ $t("sectionEd.optional") }}</span></label>
        <input id="pt-note" v-model="note" type="text" maxlength="200" autocomplete="off" :placeholder="$t('classScores.notePlaceholder')">
      </div>
      <p v-if="last" class="fb ok award" role="status">
        <span><Icon name="check" /> {{ $t("classScores.lastAward", { name: last.name }) }}</span>
        <button class="btn small" type="button" @click="undo(last.row.id, false)">{{ $t("classScores.undo") }}</button>
      </p>
      <div class="cards">
        <button
          v-for="r in rows"
          :key="r.userId"
          type="button"
          class="stu"
          :class="{ just: justId === r.userId }"
          :disabled="busy === r.userId"
          :aria-label="$t('classScores.awardTo', { name: r.name, n: r.points })"
          @click="award(r)"
        >
          <span class="who">{{ r.name }}</span>
          <span class="tot"><b>+{{ r.points }}</b> <small>{{ $t("classScores.pointsTerm") }}</small></span>
          <span class="plus" aria-hidden="true"><Icon name="plus" /></span>
        </button>
      </div>
    </section>

    <section class="card">
      <h2>{{ $t("classScores.recentPoints") }}</h2>
      <p v-if="!recent.length" class="muted small">{{ $t("classScores.noPoints") }}</p>
      <div v-for="p in recent" :key="p.id" class="list-row">
        <span>
          <b>{{ nameOf.get(p.student_id) ?? "-" }}</b> <span class="badge graded">+{{ p.points }}</span>
          <small>{{ timeText(p.created_at) }}<template v-if="p.note"> · {{ p.note }}</template></small>
        </span>
        <button class="btn small" type="button" :class="armed === `point:${p.id}` ? 'danger' : 'ghost'" @click="undo(p.id, true)">
          {{ armed === `point:${p.id}` ? $t("common.confirmAgain") : $t("classScores.takeBack") }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-sm); }
.section-head h2 { margin: 0; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--space-md); max-width: 480px; }
.award { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); flex-wrap: wrap; margin: 0 0 var(--space-md); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: var(--space-md); }
.stu { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-xs); min-height: 76px; text-align: left;
  padding: var(--space-md) 56px var(--space-md) var(--space-lg); background: var(--card); color: var(--text); border: 1px solid var(--line);
  border-radius: var(--radius-lg); cursor: pointer; touch-action: manipulation;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast); }
@media (hover: hover) {
  .stu:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--accent); }
}
.stu:active:not(:disabled) { transform: scale(.98); }
.stu:disabled { opacity: .6; cursor: default; }
.stu.just { border-color: var(--accent); animation: pick-pop var(--transition-normal) ease-out; }
.who { font-weight: 600; overflow-wrap: anywhere; }
.tot b { font-size: 1.25rem; color: var(--accent); font-variant-numeric: tabular-nums; }
.tot small { color: var(--muted); }
.plus { position: absolute; right: var(--space-md); top: 50%; transform: translateY(-50%); display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); }
.list-row small { margin-top: 2px; }
@media (max-width: 640px) {
  .cards { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-sm); }
  .stu { padding-right: 48px; }
}
@media (prefers-reduced-motion: reduce) {
  .stu.just { animation: none; }
}
</style>
