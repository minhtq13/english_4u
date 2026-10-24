<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { DraftSection, LessonDraft } from "~/utils/lessonDraft"
import type { Lesson } from "~/utils/course"

definePageMeta({ roles: ["teacher"] })

// /teacher/lessons/new creates a lesson of a grade (?class=<id> preselects that class's grade and assignment);
// /teacher/lessons/<id> edits one. Lessons start assigned to no class; only assigned classes see them.
const route = useRoute()
const client = useSupabaseClient<Database>()
const { isAdmin } = useProfile()
const user = useSupabaseUser()
const { listCourses, load: loadOutline } = useCourse()
const editId = route.params.id === "new" ? null : (route.params.id as string)
const { t } = useI18n()
useHead({ title: () => t(editId ? "editor.pageEdit" : "editor.pageNew") })

type ClassRow = Pick<Tables<"classes">, "id" | "name" | "course_id">
type PhaseRow = Pick<Tables<"phases">, "id" | "name" | "position">
type SectionRow = Tables<"lesson_sections"> & { section_items: Tables<"section_items">[] }

const classes = shallowRef<ClassRow[]>([])
const courses = shallowRef<Pick<Tables<"courses">, "id" | "name">[]>([])
const phases = shallowRef<PhaseRow[]>([])
const loaded = ref(false)
const error = ref("")
/** Editing is closed once a student has done the lesson (answers are stored by question number). */
const hasAttempts = ref(false)
/** Only the author (or an admin) edits a lesson; others can still preview and assign it. */
const canEdit = ref(true)

const fromClass = typeof route.query.class === "string" ? route.query.class : ""
const handoff = useLessonHandoff()
const courseId = ref("")
const phaseId = ref<number | null>(null)
/** Giving the lesson to classes (deadline, who, results at submit, shuffle) when it is saved. */
const giving = useLessonGiving()
if (!editId && fromClass) giving.want(fromClass)
// Teachers create lessons in the grades they teach; admins in any grade.
const courseChoices = computed(() =>
  isAdmin.value ? courses.value : courses.value.filter(k => classes.value.some(c => c.course_id === k.id)))
const gradeClasses = computed(() => classes.value.filter(c => c.course_id === courseId.value))
watch(gradeClasses, list => giving.setClasses(list), { immediate: true })
/** The lesson's id once it is saved, so saving again after a failure to give it to a class updates it instead of making another. */
const savedId = ref(editId)

const draft = reactive<LessonDraft>({ label: "", title: "", description: "", subtitle: "", sections: STANDARD_STRUCTURE() })

// A new lesson goes through two stages: "setup" (grade, term, structure) then "content" (info and questions).
// An existing lesson opens at its content; the stepper leads back to the setup.
const stage = ref<"setup" | "content">(editId ? "content" : "setup")
const grade = computed(() => courses.value.find(k => k.id === courseId.value))
const phase = computed(() => phases.value.find(p => p.id === phaseId.value))
const canContinue = computed(() => !!courseId.value && !!phaseId.value && draft.sections.length > 0)
function go(next: "setup" | "content") {
  if (next === "content" && !canContinue.value) return
  stage.value = next
  window.scrollTo({ top: 0, behavior: "smooth" })
}

/** The last step is the card at the end of the content stage: open that stage and scroll to it. */
async function goGive() {
  if (!canContinue.value) return
  stage.value = "content"
  await nextTick()
  document.getElementById("giving")?.scrollIntoView({ behavior: "smooth", block: "start" })
}

onMounted(async () => {
  try {
    const [c, k] = await Promise.all([
      client.from("classes").select("id, name, course_id").order("name"),
      listCourses(),
    ])
    classes.value = c.data ?? []
    courses.value = k
    if (editId) {
      await loadExisting(editId)
      await giving.loadGiven(editId, gradeClasses.value.map(c => c.id))
    }
    else if (handoff.value && route.query.from === handoff.value.from) {
      // A lesson built elsewhere: a review sheet from wrong answers, or questions picked in the bank.
      const h = handoff.value
      Object.assign(draft, { label: h.label, title: h.title, sections: h.sections })
      courseId.value = h.courseId
      // A review made for one student is given to that student only.
      if (h.studentId && h.classId === fromClass) giving.want(fromClass, h.studentId)
      handoff.value = null
      stage.value = "content"
    }
    else courseId.value = classes.value.find(x => x.id === fromClass)?.course_id
      ?? (courseChoices.value.length === 1 ? courseChoices.value[0]!.id : "")
  } catch (e) {
    error.value = t("editor.loadFailed", { msg: (e as Error).message })
  }
  loaded.value = true
})

async function loadExisting(id: string) {
  const [{ data, error: e }, { count }] = await Promise.all([
    client.from("lessons")
      .select("id, phase_id, label, title, description, subtitle, created_by, phases(course_id), lesson_sections(*, section_items(*))")
      .eq("id", id).maybeSingle(),
    client.from("attempts").select("id", { count: "exact", head: true }).eq("lesson_id", id),
  ])
  if (e) throw e
  if (!data) throw new Error(t("editor.notFound"))
  hasAttempts.value = (count ?? 0) > 0
  canEdit.value = isAdmin.value || data.created_by === user.value?.sub
  courseId.value = (data.phases as { course_id: string } | null)?.course_id ?? ""
  phaseId.value = data.phase_id
  Object.assign(draft, {
    label: data.label === data.id ? "" : data.label,
    title: data.title,
    description: data.description,
    subtitle: data.subtitle,
    sections: sectionsFromRows(data.lesson_sections as SectionRow[], true),
  })
}

// Phases and template lessons follow the chosen grade.
const templates = shallowRef<{ id: string; label: string; title: string }[]>([])
watch(courseId, async (id) => {
  phases.value = []
  templates.value = []
  if (!id) return
  const [p, outline] = await Promise.all([
    client.from("phases").select("id, name, position").eq("course_id", id).order("position"),
    loadOutline(id, true),
  ])
  phases.value = p.data ?? []
  if (!phases.value.some(x => x.id === phaseId.value)) phaseId.value = phases.value.at(-1)?.id ?? null
  templates.value = outline.order
    .map(lid => outline.byId[lid]!)
    .filter(l => l.id !== editId)
    .map(l => ({ id: l.id, label: l.label, title: l.title }))
}, { immediate: true })

// ---- sections ----
function moveSection(i: number, delta: number) {
  const [s] = draft.sections.splice(i, 1)
  draft.sections.splice(i + delta, 0, s!)
}

// ---- preview (from the draft, nothing saved) ----
const preview = shallowRef<{ title: string; lesson: Lesson } | null>(null)
const asLesson = (sections: DraftSection[]) =>
  draftToLesson({ ...draft, sections }, { id: editId ?? "preview", courseId: courseId.value, phase: phaseId.value ?? 0 })
const previewAll = () => { preview.value = { title: t("editor.previewAll"), lesson: asLesson(draft.sections) } }
const previewSection = (i: number) => {
  preview.value = { title: t("editor.previewSection", { n: i + 1 }), lesson: { ...asLesson([draft.sections[i]!]), heading: draft.title || t("sectionEd.preview") } }
}

// ---- save / delete ----
const saving = ref(false)
const problems = ref<string[]>([])
const message = ref("")
const doneTo = computed(() => (fromClass ? `/teacher/classes/${fromClass}` : `/courses/${courseId.value}`))

async function save() {
  message.value = ""
  problems.value = validateDraft(draft)
  if (!courseId.value) problems.value.unshift(t("editor.pickGrade"))
  else if (!phaseId.value) problems.value.unshift(t("editor.pickPhase"))
  problems.value.push(...giving.problems())
  if (problems.value.length) return
  saving.value = true
  // New lessons get the next free id of the grade (6.101, 6.102, …) from the database.
  const next = savedId.value ? { data: savedId.value, error: null } : await client.rpc("next_lesson_id", { course: courseId.value })
  const id = next.data
  if (!id) {
    saving.value = false
    message.value = t("common.notSaved", { msg: next.error ? errorText(next.error.message) : t("editor.noId") })
    return
  }
  const { error: e } = await client.rpc("save_lesson", {
    lesson: draftPayload(draft, { id, phaseId: phaseId.value! }),
  })
  if (e) {
    saving.value = false
    message.value = t("common.notSaved", { msg: errorText(e.message) })
    return
  }
  savedId.value = id
  const failures = await giving.apply(id)
  if (failures.length) {
    // The lesson is saved; saving again retries only what failed.
    saving.value = false
    message.value = t("giveForm.notGiven", { list: failures.join("; ") })
    await loadOutline(courseId.value, true)
    return
  }
  saving.value = false
  await loadOutline(courseId.value, true)
  await navigateTo(doneTo.value)
}

const deleteArmed = ref(false)
const { deleteLesson } = useLessonDelete()
async function removeLesson() {
  if (!editId) return
  if (!deleteArmed.value) {
    deleteArmed.value = true
    setTimeout(() => { deleteArmed.value = false }, 4000)
    return
  }
  const failure = await deleteLesson(editId)
  if (failure) {
    message.value = t("editor.notDeleted", { msg: failure })
    return
  }
  await loadOutline(courseId.value, true)
  await navigateTo(doneTo.value)
}
</script>

<template>
  <div>
    <BackLink :to="fromClass ? `/teacher/classes/${fromClass}` : '/courses'" :label="fromClass ? $t('nav.classes') : $t('nav.lessons')" />
    <h1>{{ editId ? $t("editor.titleEdit") : $t("editor.titleNew") }}</h1>
    <p class="sub">
      {{ $t("editor.intro") }}
    </p>

    <p v-if="!loaded" class="muted">{{ $t("common.loading") }}</p>
    <p v-else-if="error" class="fb no">{{ error }}</p>
    <div v-else-if="hasAttempts" class="card">
      <h2>{{ $t("editor.hasAttempts") }}</h2>
      <p class="muted">{{ $t("editor.hasAttemptsText") }}</p>
      <NuxtLink :to="`/teacher/lessons/new${fromClass ? `?class=${fromClass}` : ''}`" class="btn primary">{{ $t("editor.newLesson") }}</NuxtLink>
    </div>
    <div v-else-if="!canEdit" class="card">
      <h2>{{ $t("editor.notMine") }}</h2>
      <p class="muted">{{ $t("editor.notMineText") }}</p>
      <div class="row">
        <NuxtLink :to="`/lessons/${editId}`" class="btn">{{ $t("sectionEd.preview") }}</NuxtLink>
        <NuxtLink to="/teacher/lessons/new" class="btn primary">{{ $t("editor.newLesson") }}</NuxtLink>
      </div>
    </div>
    <template v-else>
      <ol class="steps" :aria-label="$t('editor.steps')">
        <li :class="{ on: stage === 'setup', done: stage === 'content' }">
          <button type="button" @click="go('setup')"><span class="dot">{{ stage === "content" ? "✓" : 1 }}</span>{{ $t("editor.stepGrade") }}</button>
        </li>
        <li :class="{ on: stage === 'setup', done: stage === 'content' }">
          <button type="button" @click="go('setup')"><span class="dot">{{ stage === "content" ? "✓" : 2 }}</span>{{ $t("editor.stepStructure") }}</button>
        </li>
        <li :class="{ on: stage === 'content' }">
          <button type="button" :disabled="!canContinue" :aria-current="stage === 'content' ? 'step' : undefined" @click="go('content')">
            <span class="dot">3</span>{{ $t("editor.stepContent") }}
          </button>
        </li>
        <li>
          <button type="button" :disabled="!canContinue" @click="goGive">
            <span class="dot">4</span>{{ $t("editor.stepGive") }}
          </button>
        </li>
      </ol>

      <template v-if="stage === 'setup'">
        <section class="card stack">
          <h2>1. {{ $t("editor.step1") }}</h2>
          <div class="grid3">
            <label>{{ $t("editor.grade") }}
              <select v-model="courseId" :disabled="!!editId">
                <option value="">{{ $t("editor.pickGradeOption") }}</option>
                <option v-for="k in courseChoices" :key="k.id" :value="k.id">{{ localName(k.name) }}</option>
              </select>
            </label>
            <label>{{ $t("editor.phase") }}
              <select v-model="phaseId" :disabled="!phases.length">
                <option v-if="!phases.length" :value="null">{{ courseId ? $t("editor.noPhases") : $t("editor.gradeFirst") }}</option>
                <option v-for="p in phases" :key="p.id" :value="p.id">{{ localName(p.name) }}</option>
              </select>
            </label>
          </div>
        </section>

        <LessonEditorStructure v-model="draft.sections" :lessons="templates" />

        <div class="savebar">
          <span v-if="!canContinue" class="small muted">{{ $t("editor.nextNeed") }}</span>
          <span class="spacer" />
          <button class="btn primary" :disabled="!canContinue" @click="go('content')">{{ $t("editor.next") }}</button>
        </div>
      </template>

      <template v-else>
        <div class="card row summary">
          <span class="grow">
            <b>{{ grade ? localName(grade.name) : "" }}</b> · {{ phase ? localName(phase.name) : "" }} · {{ $t("structure.sectionsN", { n: draft.sections.length }) }}
          </span>
          <button class="btn small" @click="go('setup')">{{ $t("editor.changeSetup") }}</button>
        </div>

        <section class="card stack">
          <h2>3. {{ $t("editor.step3") }}</h2>
          <div class="grid3">
            <label><span class="lab">{{ $t("editor.label") }} <span class="muted">{{ $t("editor.labelEx") }}</span></span><input v-model="draft.label" type="text"></label>
            <label class="span2"><span class="lab">{{ $t("editor.lessonTitle") }}</span><input v-model="draft.title" type="text" :placeholder="$t('editor.lessonTitleEx')"></label>
          </div>
          <label><span class="lab">{{ $t("editor.desc") }} <span class="muted">{{ $t("editor.descHelp") }}</span></span><input v-model="draft.description" type="text"></label>
          <label><span class="lab">{{ $t("editor.subtitle") }} <span class="muted">{{ $t("sectionEd.optional") }}</span></span><input v-model="draft.subtitle" type="text" :placeholder="$t('editor.subtitleEx')"></label>
        </section>

        <LessonEditorSection
          v-for="(s, i) in draft.sections"
          :key="s.uid"
          :section="s" :index="i" :count="draft.sections.length" :course-id="courseId"
          @move="moveSection(i, $event)"
          @remove="draft.sections.splice(i, 1)"
          @preview="previewSection(i)"
        />

        <div class="card">
          <LessonEditorAddSection @add="draft.sections.push($event)" />
        </div>

        <LessonEditorGiving :giving="giving" :editing="!!editId" />
      </template>

      <template v-if="stage === 'content'">
      <div v-if="problems.length" class="fb no">
        <b>{{ $t("editor.fixFirst") }}</b>
        <ul><li v-for="p in problems" :key="p">{{ p }}</li></ul>
      </div>
      <p v-if="message" class="fb no">{{ message }}</p>

      <div class="savebar">
        <button v-if="editId" class="btn" :class="deleteArmed ? 'danger' : 'ghost'" @click="removeLesson">
          {{ deleteArmed ? $t("editor.deleteConfirm") : $t("editor.delete") }}
        </button>
        <span class="spacer" />
        <NuxtLink v-if="editId" :to="`/lessons/${editId}`" class="btn ghost">{{ $t("editor.openSaved") }}</NuxtLink>
        <button class="btn" :disabled="!draft.sections.length" @click="previewAll">👁 {{ $t("editor.previewAll") }}</button>
        <button class="btn primary" :disabled="saving" @click="save">{{ saving ? $t("common.saving") : $t("editor.save") }}</button>
      </div>
      </template>
    </template>
    <LessonPreview v-if="preview" :lesson="preview.lesson" :title="preview.title" @close="preview = null" />
  </div>
</template>

<style scoped>
.stack label { display: flex; flex-direction: column; gap: 4px; font-size: .88rem; font-weight: 500; }
.stack label .muted { font-weight: 400; }
.stack label.inline { flex-direction: row; align-items: center; gap: 8px; font-weight: 400; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-items: end; }
/* Label and its hint share one line, so neighbouring inputs start at the same height. */
.stack label .lab { display: block; }
.span2 { grid-column: span 2; }
.steps { list-style: none; margin: 0 0 16px; padding: 0; display: flex; gap: 8px; flex-wrap: wrap; }
.steps li { flex: 1 1 150px; }
.steps button { width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px;
  background: var(--card); color: var(--muted); font: inherit; font-size: .9rem; font-weight: 500; cursor: pointer; text-align: left; }
.steps button:disabled { opacity: .55; cursor: default; }
.steps .dot { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; background: var(--bg); border: 1px solid var(--line); font-size: .8rem; font-weight: 700; }
.steps li.on button { border-color: var(--accent); color: var(--text); }
.steps li.on .dot { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.steps li.done .dot { background: var(--ok-soft); border-color: var(--ok); color: var(--ok); }
.summary { justify-content: space-between; padding: 10px 14px; }
.summary .grow { flex: 1; min-width: 0; }
.fb ul { margin: 6px 0 0; padding-left: 20px; }
.savebar { position: sticky; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px var(--shadow); }
.spacer { flex: 1; }
@media (max-width: 640px) { .grid3 { grid-template-columns: 1fr; } .span2 { grid-column: auto; } }
</style>
