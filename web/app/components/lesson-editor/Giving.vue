<script setup lang="ts">
import type { ClassPlan, useLessonGiving } from "~/composables/useLessonGiving"

// "Giao bài cho lớp": one row per class of the lesson's grade. Tick a class to give the lesson when it is saved, and
// unfold it for the deadline, who may work, results at submit and shuffle. Nothing is written until the lesson is saved.
const props = defineProps<{ giving: ReturnType<typeof useLessonGiving>; editing: boolean }>()
const { t } = useI18n()

/** One line of what a class will get, shown while its settings are folded. */
function summary(p: ClassPlan) {
  const f = p.form
  return [
    f.due ? t("giveForm.sumDue", { date: formatDate(new Date(f.due).toISOString()) }) : t("giveForm.sumNoDue"),
    f.forAll ? t("classPage.wholeClass") : t("giveForm.sumSome", f.studentIds.length),
    ...(f.showResults ? [t("giveForm.sumResults")] : []),
    ...(f.shuffle ? [t("giveForm.sumShuffle")] : []),
  ].join(" · ")
}
const others = (p: ClassPlan) => props.giving.plans.filter(x => x !== p && x.on && !x.locked).length
</script>

<template>
  <section id="giving" class="card giving">
    <h2>4. {{ $t("giveForm.title") }} <span class="muted small">{{ $t("sectionEd.optional") }}</span></h2>
    <p class="hint">{{ $t(editing ? "giveForm.introEdit" : "giveForm.intro") }}</p>
    <p v-if="!giving.plans.length" class="muted small">{{ $t("assign.noClasses") }}</p>

    <div v-for="p in giving.plans" :key="p.classId" class="plan" :class="{ on: p.on }">
      <div class="plan-head">
        <label class="chip" :class="{ on: p.on, fixed: p.existing }">
          <input type="checkbox" :checked="p.on" :disabled="p.existing" @change="giving.toggle(p)"> {{ p.name }}
        </label>
        <span v-if="p.existing" class="badge done">{{ $t("giveForm.given") }}</span>
        <span v-if="p.on && !p.locked" class="small muted summary">{{ summary(p) }}</span>
        <button v-if="p.on && !p.locked" type="button" class="link small" :aria-expanded="p.open" @click="giving.unfold(p)">
          {{ $t("giveForm.settings") }} <Icon :name="p.open ? 'chevronUp' : 'chevronDown'" />
        </button>
      </div>
      <p v-if="p.locked" class="hint">
        {{ $t("giveForm.locked") }} <NuxtLink :to="`/teacher/classes/${p.classId}`">{{ $t("giveForm.classPage") }}</NuxtLink>
      </p>
      <div v-else-if="p.on && p.open" class="plan-body">
        <GiveSettingsForm :form="p.form" :students="p.students ?? []" :uid="p.classId" />
        <button v-if="others(p)" type="button" class="link small" @click="giving.copyToOthers(p)">{{ $t("giveForm.copyToOthers") }}</button>
      </div>
    </div>

    <p v-if="giving.plans.some(p => p.existing)" class="hint">{{ $t("giveForm.takeBackHint") }}</p>
  </section>
</template>

<style scoped>
.giving { display: flex; flex-direction: column; gap: 10px; }
.giving h2 { margin: 0; }
.hint { color: var(--muted); font-size: .85rem; margin: 0; }
.plan { border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; }
.plan.on { border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); }
.plan-head { display: flex; align-items: center; gap: 4px 10px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--bg); cursor: pointer; font-size: .9rem; font-weight: 500; }
.chip.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.chip.fixed { cursor: default; }
.summary { flex: 1 1 200px; min-width: 0; }
.plan-body { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; border-top: 1px dashed var(--line); }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; width: fit-content; }
.link:hover { text-decoration: underline; }
</style>
