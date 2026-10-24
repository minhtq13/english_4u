<script setup lang="ts">
import type { GiveForm } from "~/utils/classLesson"

// How a lesson is given to one class: deadline, who may work on it, results at submit, shuffle.
// Shared by the class page's give panel and the lesson editor. The parent owns `form` and edits it through here.
const props = defineProps<{
  form: GiveForm
  /** The class's students, for "chosen students". */
  students: { id: string; name: string }[]
  /** Keeps ids unique when several forms are on one page. */
  uid: string
}>()

const { t } = useI18n()
const quick = computed(() => [
  { label: t("classPage.setup.tomorrow"), days: 1 },
  { label: t("classPage.setup.days3"), days: 3 },
  { label: t("classPage.setup.week"), days: 7 },
])
const allPicked = computed(() => props.students.length > 0 && props.form.studentIds.length === props.students.length)
</script>

<template>
  <div class="give-form">
    <div class="field">
      <label :for="`due-${uid}`"><b>{{ $t("classPage.setup.due") }}</b> <span class="muted small">{{ $t("sectionEd.optional") }}</span></label>
      <div class="row">
        <input :id="`due-${uid}`" v-model="form.due" type="datetime-local">
        <button v-for="q in quick" :key="q.days" type="button" class="btn small ghost" @click="form.due = inDays(q.days)">{{ q.label }}</button>
        <button v-if="form.due" type="button" class="btn small ghost" @click="form.due = ''">{{ $t("classPage.dueClear") }}</button>
      </div>
      <p class="hint">{{ $t("classPage.setup.dueHint") }}</p>
    </div>

    <div class="field">
      <b>{{ $t("classPage.setup.who") }}</b>
      <div class="row">
        <label class="toggle"><input v-model="form.forAll" type="radio" :name="`who-${uid}`" :value="true"> {{ $t("classPage.whoAll") }}</label>
        <label class="toggle"><input v-model="form.forAll" type="radio" :name="`who-${uid}`" :value="false"> {{ $t("classPage.whoSome") }}</label>
      </div>
      <template v-if="!form.forAll">
        <p v-if="!students.length" class="muted small">{{ $t("classPage.noStudents") }}</p>
        <template v-else>
          <div class="row picks">
            <label v-for="st in students" :key="st.id" class="pick" :class="{ on: form.studentIds.includes(st.id) }">
              <input v-model="form.studentIds" type="checkbox" :value="st.id"> {{ st.name }}
            </label>
          </div>
          <p class="row small">
            <button type="button" class="link" @click="form.studentIds = allPicked ? [] : students.map(s => s.id)">
              {{ allPicked ? $t("editor.selectNone") : $t("editor.selectAll") }}
            </button>
            <span class="muted">{{ $t("classPage.someStudents", { n: form.studentIds.length, total: students.length }) }}</span>
          </p>
          <p class="hint">{{ $t("classPage.whoHint") }}</p>
        </template>
      </template>
    </div>

    <div class="field">
      <b>{{ $t("classPage.setup.options") }}</b>
      <span class="opt">
        <label class="toggle"><input v-model="form.showResults" type="checkbox"> {{ $t("classPage.showResults") }}</label>
        <InfoTip :text="$t('giveForm.showResultsTip')" />
      </span>
      <span class="opt">
        <label class="toggle"><input v-model="form.shuffle" type="checkbox"> {{ $t("classPage.shuffle") }}</label>
        <InfoTip :text="$t('giveForm.shuffleTip')" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.give-form { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field input[type=datetime-local] { flex: 0 0 auto; width: auto; min-width: 12.5rem; padding: 4px 8px; }
.field .row { gap: 6px 10px; }
.field .btn { padding: 2px 10px; }
.opt { display: inline-flex; align-items: center; gap: 8px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: .92rem; }
.hint { color: var(--muted); font-size: .85rem; margin: 0; }
.picks { gap: 6px; }
.pick { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); cursor: pointer; font-size: .88rem; }
.pick.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
</style>
