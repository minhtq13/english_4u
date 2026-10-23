<script setup lang="ts">
import type { Database } from "~/types/database.types"
import type { GiveSettings } from "~/utils/classLesson"

// The panel under a lesson that is not given to the class yet: what the lesson contains, which classes of the grade
// already have it, and how to give it (deadline, who, results at submit, shuffle). Nothing is saved until "Giao cho lớp".
const props = defineProps<{
  lessonId: string
  className: string
  students: { id: string; name: string }[]
  /** Names of the teacher's classes of this grade that already have the lesson. */
  assignedTo: string[]
  busy: boolean
}>()
const emit = defineEmits<{ give: [settings: GiveSettings]; cancel: [] }>()

const client = useSupabaseClient<Database>()
const { t } = useI18n()

// ---- what the lesson contains ----
interface Info { description: string; subtitle: string; sections: { position: number; type: string; title: string; time: string | null; n: number; scored: boolean }[] }
const info = ref<Info | null>(null)
const infoError = ref("")
onMounted(async () => {
  const { data, error } = await client.from("lessons")
    .select("description, subtitle, lesson_sections(position, type, score_key, title, time_label, section_items(count))")
    .eq("id", props.lessonId).maybeSingle()
  if (error || !data) {
    infoError.value = t("classPage.setup.infoFailed")
    return
  }
  const row = data as unknown as {
    description: string; subtitle: string
    lesson_sections: { position: number; type: string; score_key: string | null; title: string; time_label: string | null; section_items: { count: number }[] }[]
  }
  info.value = {
    description: row.description,
    subtitle: row.subtitle,
    sections: [...row.lesson_sections].sort((a, b) => a.position - b.position)
      .map(s => ({ position: s.position, type: s.type, title: s.title, time: s.time_label, n: s.section_items[0]?.count ?? 0, scored: !!s.score_key })),
  }
})
const scoredTotal = computed(() => info.value?.sections.reduce((n, s) => n + (s.scored ? s.n : 0), 0) ?? 0)
const typeLabel = (type: string) => SECTION_TYPES[type as keyof typeof SECTION_TYPES]?.label ?? type

// ---- how to give it ----
const due = ref("")
const forAll = ref(true)
const picked = ref<string[]>([])
const showResults = ref(false)
const shuffle = ref(false)
const problem = ref("")
// A message about the previous try goes away as soon as the choice changes.
watch([due, forAll, picked], () => { problem.value = "" })

/** datetime-local value (local time) for `days` from now at 21:00. */
function inDays(days: number) {
  const d = new Date(Date.now() + days * 864e5)
  d.setHours(21, 0, 0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const quick = computed(() => [
  { label: t("classPage.setup.tomorrow"), days: 1 },
  { label: t("classPage.setup.days3"), days: 3 },
  { label: t("classPage.setup.week"), days: 7 },
])
const allPicked = computed(() => props.students.length > 0 && picked.value.length === props.students.length)

function give() {
  const dueAt = due.value ? new Date(due.value).toISOString() : null
  if (dueAt && isPastDue(dueAt)) {
    problem.value = t("classPage.dueInPast")
    return
  }
  if (!forAll.value && !picked.value.length) {
    problem.value = t("classPage.setup.pickSome")
    return
  }
  problem.value = ""
  emit("give", { dueAt, forAll: forAll.value, studentIds: forAll.value ? [] : picked.value, showResults: showResults.value, shuffle: shuffle.value })
}
</script>

<template>
  <div class="setup">
    <section class="block">
      <h4>{{ $t("classPage.setup.info") }}</h4>
      <p v-if="infoError" class="fb no">{{ infoError }}</p>
      <p v-else-if="!info" class="small muted">{{ $t("common.loading") }}</p>
      <template v-else>
        <p v-if="info.description" class="desc">{{ info.description }}</p>
        <p class="small muted">
          {{ info.subtitle }}<template v-if="info.subtitle"> · </template>{{ $t("classPage.setup.scoredN", { n: scoredTotal }) }} · {{ $t("structure.sectionsN", { n: info.sections.length }) }}
        </p>
        <ol class="sections">
          <li v-for="s in info.sections" :key="s.position">
            <span class="badge">{{ typeLabel(s.type) }}</span>
            <span class="title">{{ s.title }}</span>
            <span v-if="s.n" class="small muted">{{ $t("classPage.setup.itemsN", { n: s.n }) }}</span>
            <span v-if="s.time" class="small muted">{{ s.time }}</span>
          </li>
        </ol>
      </template>
      <p class="small given-to">
        <b>{{ $t("classPage.setup.givenTo") }}</b>
        <template v-if="assignedTo.length"><span v-for="n in assignedTo" :key="n" class="chip-class on">✓ {{ n }}</span></template>
        <span v-else class="muted">{{ $t("classPage.setup.givenNone") }}</span>
      </p>
      <p class="row links small">
        <NuxtLink :to="`/lessons/${lessonId}`" class="btn small">{{ $t("sectionEd.preview") }}</NuxtLink>
        <NuxtLink :to="`/teacher/print/${lessonId}`" class="btn ghost small">{{ $t("coursesPage.print") }}</NuxtLink>
      </p>
    </section>

    <section class="block">
      <h4>{{ $t("classPage.setup.title", { name: className }) }}</h4>

      <div class="field">
        <label :for="`due-${lessonId}`"><b>{{ $t("classPage.setup.due") }}</b> <span class="muted small">{{ $t("sectionEd.optional") }}</span></label>
        <div class="row">
          <input :id="`due-${lessonId}`" v-model="due" type="datetime-local">
          <button v-for="q in quick" :key="q.days" type="button" class="btn small ghost" @click="due = inDays(q.days)">{{ q.label }}</button>
          <button v-if="due" type="button" class="btn small ghost" @click="due = ''">{{ $t("classPage.dueClear") }}</button>
        </div>
        <p class="hint">{{ $t("classPage.setup.dueHint") }}</p>
      </div>

      <div class="field">
        <b>{{ $t("classPage.setup.who") }}</b>
        <div class="row">
          <label class="toggle"><input v-model="forAll" type="radio" :value="true"> {{ $t("classPage.whoAll") }}</label>
          <label class="toggle"><input v-model="forAll" type="radio" :value="false"> {{ $t("classPage.whoSome") }}</label>
        </div>
        <template v-if="!forAll">
          <p v-if="!students.length" class="muted small">{{ $t("classPage.noStudents") }}</p>
          <template v-else>
            <div class="row picks">
              <label v-for="st in students" :key="st.id" class="pick" :class="{ on: picked.includes(st.id) }">
                <input v-model="picked" type="checkbox" :value="st.id"> {{ st.name }}
              </label>
            </div>
            <p class="row small">
              <button type="button" class="link" @click="picked = allPicked ? [] : students.map(s => s.id)">
                {{ allPicked ? $t("editor.selectNone") : $t("editor.selectAll") }}
              </button>
              <span class="muted">{{ $t("classPage.someStudents", { n: picked.length, total: students.length }) }}</span>
            </p>
            <p class="hint">{{ $t("classPage.whoHint") }}</p>
          </template>
        </template>
      </div>

      <div class="field">
        <b>{{ $t("classPage.setup.options") }}</b>
        <label class="toggle"><input v-model="showResults" type="checkbox"> {{ $t("classPage.showResults") }}</label>
        <p class="hint indent">{{ $t("classPage.setup.showResultsHint") }}</p>
        <label class="toggle" :title="$t('classPage.shuffleTitle')"><input v-model="shuffle" type="checkbox"> {{ $t("classPage.shuffle") }}</label>
        <p class="hint indent">{{ $t("classPage.shuffleTitle") }}</p>
      </div>

      <p v-if="problem" class="fb no" role="alert">{{ problem }}</p>
      <div class="row actions">
        <button class="btn primary" :disabled="busy" @click="give">{{ busy ? $t("common.saving") : $t("classPage.setup.confirm", { name: className }) }}</button>
        <button class="btn ghost" :disabled="busy" @click="emit('cancel')">{{ $t("common.cancel") }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.setup { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; background: var(--bg); border-radius: 10px; padding: 12px; }
.block { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.block h4 { margin: 0; font-size: .95rem; }
.block p { margin: 0; }
.desc { font-size: .93rem; }
.sections { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.sections li { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: .9rem; }
.sections .title { font-weight: 500; }
.given-to { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.chip-class { border: 1px solid var(--line); border-radius: 999px; padding: 1px 10px; font-size: .85rem; background: var(--bg); }
.chip-class.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.links { gap: 6px; }
.links .btn { padding: 3px 10px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field input[type=datetime-local] { flex: 0 0 auto; width: auto; min-width: 12.5rem; padding: 4px 8px; }
.field .row { gap: 6px 10px; }
.field .btn { padding: 2px 10px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: .92rem; }
.hint { color: var(--muted); font-size: .85rem; margin: 0; }
.hint.indent { margin-left: 24px; }
.picks { gap: 6px; }
.pick { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); cursor: pointer; font-size: .88rem; }
.pick.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.actions { margin-top: 4px; }
@media (max-width: 760px) { .setup { grid-template-columns: 1fr; } }
</style>
