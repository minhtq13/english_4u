<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import type { DraftSection, LessonDraft, PresetKey, SectionType } from "~/utils/lessonDraft"
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
const reviewDraft = useState<{ classId: string; studentId: string; title: string; sections: DraftSection[] } | null>("review-draft", () => null)
/** A review made for one student is given to that student only. */
const reviewStudent = ref("")
const courseId = ref("")
const phaseId = ref<number | null>(null)
/** Classes to assign the new lesson to right after saving. */
const assignTo = ref<string[]>(fromClass ? [fromClass] : [])
// Teachers create lessons in the grades they teach; admins in any grade.
const courseChoices = computed(() =>
  isAdmin.value ? courses.value : courses.value.filter(k => classes.value.some(c => c.course_id === k.id)))
const gradeClasses = computed(() => classes.value.filter(c => c.course_id === courseId.value))

const draft = reactive<LessonDraft>({ label: "", title: "", description: "", subtitle: "", sections: STANDARD_STRUCTURE() })

onMounted(async () => {
  try {
    const [c, k] = await Promise.all([
      client.from("classes").select("id, name, course_id").order("name"),
      listCourses(),
    ])
    classes.value = c.data ?? []
    courses.value = k
    if (editId) await loadExisting(editId)
    else if (route.query.from === "review" && reviewDraft.value?.classId === fromClass) {
      // A review worksheet built from wrong answers (/teacher/review/<class>).
      Object.assign(draft, { label: t("editor.reviewLabel"), title: reviewDraft.value.title, sections: reviewDraft.value.sections })
      reviewStudent.value = reviewDraft.value.studentId
      reviewDraft.value = null
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
  assignTo.value = assignTo.value.filter(cid => classes.value.some(c => c.id === cid && c.course_id === id))
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

// ---- structure templates ----
const templateId = ref("standard")
const withContent = ref(false)
const templateSections = shallowRef<DraftSection[]>(STANDARD_STRUCTURE())
const picked = ref<number[]>(templateSections.value.map(s => s.uid))
const templateBusy = ref(false)

watch([templateId, withContent], async () => {
  templateBusy.value = true
  try {
    if (templateId.value === "standard") {
      templateSections.value = STANDARD_STRUCTURE()
    } else {
      const { data } = await client.from("lesson_sections").select("*, section_items(*)").eq("lesson_id", templateId.value)
      templateSections.value = sectionsFromRows((data ?? []) as SectionRow[], withContent.value)
    }
    picked.value = templateSections.value.map(s => s.uid)
  } finally {
    templateBusy.value = false
  }
})

const applyArmed = ref(false)
function applyTemplate() {
  const hasWork = draft.sections.some(s => s.body || s.items.some(i => i.prompt || i.back || i.words))
  if (hasWork && !applyArmed.value) {
    applyArmed.value = true
    setTimeout(() => { applyArmed.value = false }, 4000)
    return
  }
  applyArmed.value = false
  draft.sections = templateSections.value.filter(s => picked.value.includes(s.uid)).map(cloneSection)
}

// ---- sections ----
// The add menu offers plain section types and ready-made exam formats ("preset:<key>").
const newType = ref<string>("mcq")
function addSection() {
  const v = newType.value
  draft.sections.push(v.startsWith("preset:")
    ? SECTION_PRESETS[v.slice(7) as PresetKey].make()
    : emptySection(v as SectionType, { title: SECTION_TYPES[v as SectionType].label }))
}
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
  if (problems.value.length) return
  saving.value = true
  // New lessons get the next free id of the grade (6.101, 6.102, …) from the database.
  const next = editId ? { data: editId, error: null } : await client.rpc("next_lesson_id", { course: courseId.value })
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
  if (!editId && assignTo.value.length) {
    await client.from("class_lessons").insert(assignTo.value.map(cid => ({ class_id: cid, lesson_id: id, unlocked_by: user.value?.sub })))
    if (reviewStudent.value && assignTo.value.includes(fromClass)) {
      await client.from("class_lessons").update({ for_all: false }).eq("class_id", fromClass).eq("lesson_id", id)
      await client.from("class_lesson_students").insert({ class_id: fromClass, lesson_id: id, student_id: reviewStudent.value })
    }
  }
  saving.value = false
  await loadOutline(courseId.value, true)
  await navigateTo(doneTo.value)
}

const deleteArmed = ref(false)
async function removeLesson() {
  if (!editId) return
  if (!deleteArmed.value) {
    deleteArmed.value = true
    setTimeout(() => { deleteArmed.value = false }, 4000)
    return
  }
  const { error: e } = await client.from("lessons").delete().eq("id", editId)
  if (e) {
    message.value = t("editor.notDeleted", { msg: errorText(e.message) })
    return
  }
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
        <div v-if="!editId && gradeClasses.length" class="assign">
          <span class="small muted">{{ $t("editor.assignNow") }}</span>
          <div class="row">
            <label v-for="c in gradeClasses" :key="c.id" class="chip-check" :class="{ on: assignTo.includes(c.id) }">
              <input v-model="assignTo" type="checkbox" :value="c.id"> {{ c.name }}
            </label>
          </div>
        </div>
        <p v-else-if="editId" class="hint">{{ $t("editor.assignLater") }}</p>
      </section>

      <section class="card stack">
        <h2>2. {{ $t("editor.step2") }}</h2>
        <p class="hint">{{ $t("editor.step2Help") }}</p>
        <div class="grid3">
          <label>{{ $t("editor.template") }}
            <select v-model="templateId">
              <option value="standard">{{ $t("editor.standard") }}</option>
              <option v-for="tp in templates" :key="tp.id" :value="tp.id">{{ $t("editor.fromLesson", { name: `${tp.label} - ${tp.title}` }) }}</option>
            </select>
          </label>
          <label v-if="templateId !== 'standard'" class="row inline"><input v-model="withContent" type="checkbox"> {{ $t("editor.withContent") }}</label>
        </div>
        <div class="picks">
          <label v-for="(s, i) in templateSections" :key="s.uid" class="pick" :class="{ on: picked.includes(s.uid) }">
            <input v-model="picked" type="checkbox" :value="s.uid">
            <span class="pick-text">
              <b>{{ i + 1 }}. {{ SECTION_TYPES[s.type].label }}</b>
              <span class="small">{{ s.title }}</span>
              <span v-if="s.time" class="small muted">{{ s.time }}</span>
            </span>
          </label>
        </div>
        <div class="row pick-tools small">
          <button class="link" @click="picked = templateSections.map(s => s.uid)">{{ $t("editor.selectAll") }}</button>
          <button class="link" @click="picked = []">{{ $t("editor.selectNone") }}</button>
        </div>
        <div>
          <button class="btn" :class="applyArmed ? 'danger' : 'primary'" :disabled="templateBusy || !picked.length" @click="applyTemplate">
            {{ applyArmed ? $t("editor.applyConfirm") : $t("editor.apply", { n: picked.length }) }}
          </button>
        </div>
      </section>

      <section class="card stack">
        <h2>3. {{ $t("editor.step3") }}</h2>
        <div class="grid3">
          <label>{{ $t("editor.label") }} <span class="muted">{{ $t("editor.labelEx") }}</span><input v-model="draft.label" type="text"></label>
          <label class="span2">{{ $t("editor.lessonTitle") }}<input v-model="draft.title" type="text" :placeholder="$t('editor.lessonTitleEx')"></label>
        </div>
        <label>{{ $t("editor.desc") }} <span class="muted">{{ $t("editor.descHelp") }}</span><input v-model="draft.description" type="text"></label>
        <label>{{ $t("editor.subtitle") }} <span class="muted">{{ $t("sectionEd.optional") }}</span><input v-model="draft.subtitle" type="text" :placeholder="$t('editor.subtitleEx')"></label>
      </section>

      <LessonEditorSection
        v-for="(s, i) in draft.sections"
        :key="s.uid"
        :section="s" :index="i" :count="draft.sections.length" :course-id="courseId"
        @move="moveSection(i, $event)"
        @remove="draft.sections.splice(i, 1)"
        @preview="previewSection(i)"
      />

      <div class="card row add">
        <select v-model="newType">
          <optgroup :label="$t('editor.sectionTypes')">
            <option v-for="(t, key) in SECTION_TYPES" :key="key" :value="key">{{ t.label }}</option>
          </optgroup>
          <optgroup :label="$t('editor.presets')">
            <option v-for="(p, key) in SECTION_PRESETS" :key="key" :value="`preset:${key}`">{{ p.label }}</option>
          </optgroup>
        </select>
        <button class="btn" @click="addSection">{{ $t("editor.addSection") }}</button>
      </div>

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
    <LessonPreview v-if="preview" :lesson="preview.lesson" :title="preview.title" @close="preview = null" />
  </div>
</template>

<style scoped>
.stack label { display: flex; flex-direction: column; gap: 4px; font-size: .88rem; font-weight: 500; }
.stack label .muted { font-weight: 400; }
.stack label.inline { flex-direction: row; align-items: center; gap: 8px; font-weight: 400; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.span2 { grid-column: span 2; }
.assign { display: flex; flex-direction: column; gap: 6px; }
.stack label.chip-check { flex-direction: row; align-items: center; gap: 6px; padding: 4px 12px; border: 1px solid var(--line);
  border-radius: 999px; background: var(--bg); cursor: pointer; font-weight: 500; }
.stack label.chip-check.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.picks { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.stack label.pick { flex-direction: row; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid var(--line);
  border-radius: 10px; background: var(--bg); cursor: pointer; font-weight: 400; }
.stack label.pick:hover { border-color: var(--accent); }
.stack label.pick.on { border-color: var(--accent); background: var(--accent-soft); }
.pick input { margin-top: 3px; }
.pick-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pick-tools { gap: 12px; }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.add select { width: auto; }
.fb ul { margin: 6px 0 0; padding-left: 20px; }
.savebar { position: sticky; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px var(--shadow); }
.spacer { flex: 1; }
@media (max-width: 640px) { .grid3 { grid-template-columns: 1fr; } .span2 { grid-column: auto; } }
</style>
