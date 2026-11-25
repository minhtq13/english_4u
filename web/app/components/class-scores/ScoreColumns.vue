<script setup lang="ts">
import type { Database } from "~/types/database.types"
import { columnsOf, dayLabel, meanOf, parseScore, scoreText, todayIso, type ClassScoreData, type ClassScoreRow, type ColumnRow, type ScoreKind, type Term } from "~/utils/classScores"
import { createColumn, deleteColumn, saveEntries, updateColumn } from "~/utils/classScoreStore"

// Columns of marks 0-10 of one kind (oral checks or homework): the term's columns as a table like the gradebook
// (each student's marks and mean, the class mean underneath), the open column for typing marks, and a form for a new one.
const props = defineProps<{ classId: string; term: Term; kind: ScoreKind; rows: ClassScoreRow[]; data: ClassScoreData }>()
const emit = defineEmits<{ changed: [] }>()
const { t, locale } = useI18n()
const client = useSupabaseClient<Database>()
const toast = useToast()
const { armed, arm } = useTwoClick()

const columns = computed(() => columnsOf(props.data.columns, props.kind))
const openId = ref<string | null>(null)
const open = computed(() => columns.value.find(c => c.id === openId.value) ?? null)
const classMean = (id: string) => meanOf(props.rows.flatMap(r => (r.marks.has(id) ? [r.marks.get(id)!] : [])))

// New column
const adding = ref(false)
const newTitle = ref("")
const newDay = ref(todayIso())
const busy = ref(false)

async function add() {
  busy.value = true
  const { row, error } = await createColumn(client, props.classId, { kind: props.kind, title: newTitle.value, held_on: newDay.value, term: props.term })
  busy.value = false
  if (error || !row) return toast.error(error ?? t("classScores.saveNothing"))
  adding.value = false
  newTitle.value = ""
  openId.value = row.id
  emit("changed")
}

// The open column: its title, day and one box per student
const title = ref("")
const day = ref("")
const boxes = ref<Record<string, string>>({})

function fill(c: ColumnRow | null) {
  if (!c) return
  title.value = c.title
  day.value = c.held_on
  const saved = new Map(props.data.entries.filter(e => e.column_id === c.id).map(e => [e.student_id, Number(e.score)]))
  boxes.value = Object.fromEntries(props.rows.map(r => [r.userId, saved.has(r.userId) ? scoreText(saved.get(r.userId)!) : ""]))
}
watch([open, () => props.rows], () => fill(open.value), { immediate: true })

const invalid = computed(() => Object.entries(boxes.value).filter(([, v]) => Number.isNaN(parseScore(v))).map(([id]) => id))
const entered = computed(() => Object.values(boxes.value).filter(v => v.trim()).length)

async function saveOpen() {
  const c = open.value
  if (!c || invalid.value.length) return
  busy.value = true
  let error = (title.value.trim() !== c.title || day.value !== c.held_on)
    ? await updateColumn(client, c.id, { kind: c.kind, title: title.value, held_on: day.value, term: props.term })
    : null
  if (!error) {
    const saved = new Map(props.data.entries.filter(e => e.column_id === c.id).map(e => [e.student_id, Number(e.score)]))
    const changed = new Map<string, number | null>()
    for (const [id, text] of Object.entries(boxes.value)) {
      const n = parseScore(text)
      if (n !== (saved.get(id) ?? null)) changed.set(id, n)
    }
    if (changed.size) error = await saveEntries(client, c.id, changed)
  }
  busy.value = false
  if (error) return toast.error(error)
  toast.ok(t("classScores.marksSaved"))
  emit("changed")
}

async function removeOpen() {
  const c = open.value
  if (!c || !arm(`column:${c.id}`)) return
  const error = await deleteColumn(client, c.id)
  if (error) return toast.error(error)
  openId.value = null
  toast.ok(t("classScores.columnDeleted"))
  emit("changed")
}

/** Enter in a mark box goes to the next student's box, so a whole column can be typed without the mouse. */
function next(e: KeyboardEvent) {
  const box = (e.target as HTMLElement).closest("li")?.nextElementSibling?.querySelector("input")
  box?.focus()
  box?.select()
}

const shortDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
</script>

<template>
  <div>
    <section class="card">
      <div class="section-head">
        <h2>{{ $t(`classScores.kind.${kind}`) }}</h2>
        <button v-if="!adding" class="btn primary small" type="button" @click="adding = true"><Icon name="plus" /> {{ $t("classScores.addColumn") }}</button>
      </div>

      <form v-if="adding" class="panel" @submit.prevent="add">
        <div class="row fields">
          <div class="field grow">
            <label for="new-title"><b>{{ $t("classScores.columnTitle") }}</b></label>
            <input id="new-title" v-model="newTitle" type="text" maxlength="80" required autocomplete="off" :placeholder="$t(`classScores.titlePlaceholder.${kind}`)">
          </div>
          <div class="field">
            <label for="new-day"><b>{{ $t("classScores.day") }}</b></label>
            <input id="new-day" v-model="newDay" type="date" required>
          </div>
        </div>
        <div class="row">
          <button class="btn primary small" :class="{ loading: busy }" :disabled="busy">{{ $t("classScores.createColumn") }}</button>
          <button class="btn ghost small" type="button" @click="adding = false">{{ $t("common.cancel") }}</button>
        </div>
      </form>

      <EmptyState v-if="!columns.length && !adding" icon="clipboard" :title="$t('classScores.noColumns')" :text="$t('classScores.noColumnsHint')">
        <button class="btn primary small" type="button" @click="adding = true"><Icon name="plus" /> {{ $t("classScores.addColumn") }}</button>
      </EmptyState>
      <template v-else-if="columns.length">
        <div class="scroll" tabindex="0" role="region" :aria-label="$t(`classScores.kind.${kind}`)">
          <table class="grid">
            <thead>
              <tr>
                <th class="who">{{ $t("common.student") }}</th>
                <th v-for="c in columns" :key="c.id">
                  <button type="button" class="col" :class="{ on: c.id === openId }" :aria-pressed="c.id === openId" :title="$t('classScores.openColumn')" @click="openId = c.id">
                    <span class="t">{{ c.title }} <Icon name="pencil" size="12" /></span>
                    <span class="d">{{ shortDay(c.held_on) }}</span>
                  </button>
                </th>
                <th class="avg">{{ $t("classScores.average") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.userId">
                <th class="who" scope="row">{{ r.name }}</th>
                <td v-for="c in columns" :key="c.id"><ClassScoresMark :value="r.marks.get(c.id) ?? null" /></td>
                <td class="avg"><ClassScoresMark :value="r.averages[kind]" /></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th class="who" scope="row">{{ $t("classScores.classAverage") }}</th>
                <td v-for="c in columns" :key="c.id" class="avg">{{ scoreText(classMean(c.id)) }}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="small muted legend">{{ $t("classScores.bandLegend") }}</p>
      </template>
    </section>

    <section v-if="open" class="card">
      <div class="section-head">
        <div>
          <h2>{{ $t("classScores.typeMarks", { title: open.title }) }}</h2>
          <span class="small muted">{{ dayLabel(open.held_on, locale) }}</span>
        </div>
        <button class="btn small" type="button" :class="armed === `column:${open.id}` ? 'danger' : 'ghost'" @click="removeOpen">
          {{ armed === `column:${open.id}` ? $t("common.confirmAgain") : $t("classScores.deleteColumn") }}
        </button>
      </div>
      <div class="row fields">
        <div class="field grow">
          <label for="col-title"><b>{{ $t("classScores.columnTitle") }}</b></label>
          <input id="col-title" v-model="title" type="text" maxlength="80" required autocomplete="off">
        </div>
        <div class="field">
          <label for="col-day"><b>{{ $t("classScores.day") }}</b></label>
          <input id="col-day" v-model="day" type="date" required>
        </div>
      </div>
      <p class="hint">{{ $t("classScores.marksHint") }}</p>
      <ul class="marks">
        <li v-for="r in rows" :key="r.userId">
          <label :for="`m-${r.userId}`">{{ r.name }}</label>
          <input
            :id="`m-${r.userId}`"
            v-model="boxes[r.userId]"
            type="text"
            inputmode="decimal"
            maxlength="5"
            autocomplete="off"
            :class="{ bad: invalid.includes(r.userId) }"
            :aria-invalid="invalid.includes(r.userId)"
            @keydown.enter.prevent="next"
          >
        </li>
      </ul>
    </section>

    <div v-if="open" class="scorebar savebar">
      <span v-if="invalid.length" class="fb no" role="alert">{{ $t("classScores.badMarks", { n: invalid.length }) }}</span>
      <span v-else class="small muted" role="status">{{ $t("classScores.entered", { n: entered, total: rows.length }) }}</span>
      <button class="btn primary" :class="{ loading: busy }" :disabled="busy || invalid.length > 0" @click="saveOpen">{{ $t("classScores.saveMarks") }}</button>
    </div>
  </div>
</template>

<style scoped>
.section-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-sm); }
.section-head h2 { margin: 0; }
.section-head .btn { padding: 4px 12px; }
.panel { background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: var(--space-md) var(--space-lg); margin-bottom: var(--space-lg);
  display: flex; flex-direction: column; gap: var(--space-md); }
.fields { align-items: flex-end; gap: var(--space-md); }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.grow { flex: 1 1 220px; min-width: 0; }
.field input[type=date] { flex: 0 0 auto; width: auto; min-width: 11rem; }
.hint { margin: var(--space-sm) 0 var(--space-md); font-size: var(--fs-sm); }
.scroll { overflow-x: auto; }
.grid { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.grid th, .grid td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: center; white-space: nowrap; vertical-align: middle; }
.grid thead th { background: var(--card); font-size: var(--fs-sm); color: var(--muted); }
.grid tbody th.who { color: var(--text); }
.who { position: sticky; left: 0; background: var(--card); text-align: left !important; z-index: 1; min-width: 150px; }
.col { display: inline-grid; gap: 1px; justify-items: center; padding: 4px 10px; background: none; color: var(--text); border: 1px solid transparent;
  border-radius: var(--radius-md); cursor: pointer; font-weight: 600; transition: border-color var(--transition-fast), background-color var(--transition-fast); }
.col:hover { border-color: var(--accent); }
.col.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.col .d { font-size: var(--fs-xs); font-weight: 400; color: var(--muted); }
.col .icon { opacity: .6; }
.avg { font-weight: 700; }
.grid tfoot th, .grid tfoot td { border-bottom: 0; border-top: 2px solid var(--line); color: var(--muted); }
.legend { margin: var(--space-sm) 0 0; }
.marks { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); column-gap: var(--space-2xl); }
.marks li { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); padding: 6px 0; border-top: 1px solid var(--line); }
.marks label { min-width: 0; overflow-wrap: anywhere; }
.marks input { width: 5rem; flex: none; text-align: center; font-variant-numeric: tabular-nums; }
.marks input.bad { border-color: var(--bad); background: var(--bad-soft); }
.scorebar .fb { margin: 0; }
@media (max-width: 640px) {
  .marks input { min-height: 44px; }
}
</style>
