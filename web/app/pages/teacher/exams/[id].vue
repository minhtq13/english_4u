<script setup lang="ts">
import type { BankRow, Selection } from "~/composables/useQuestionBank"
import type { Database } from "~/types/database.types"
import type { ExamQuestion, MatrixSpec, PartHints, PartKey, ShuffleMode } from "~/utils/examGenerator"
import {
  SHUFFLE_MODES, addQuestion, buildParts, buildVariant, buildVariants, codeSeries, drawExam, emptyMatrix, moveBlock, moveBlockTo, movePart, movePartTo,
  parseCodes, poolCounts, rngOf, roman,
} from "~/utils/examGenerator"
import { MAX_HINT_LENGTH, cleanHints, docInfoOf, emptyInfo, readDraft, saveDraft, type ExamDraft, type SheetAt } from "~/utils/examDraft"
import { copyExamSet, createExamSet, draftOf, examAccess, getExamSet, snapshotOf, staffByIds, updateExamSet, type ShareRow } from "~/utils/examStore"
import { examDocx, examFileName, examZip } from "~/utils/exportDocx"
import { downloadExamKey, examKeyBytes, examKeyFileName } from "~/utils/exportExcel"
import { fileSlug, saveFile } from "~/utils/spreadsheet"
import { vSortable } from "~/utils/sortable"

// One paper exam set, new (/teacher/exams/new) or saved (/teacher/exams/<id>): heading, questions chosen by hand from the
// question bank or drawn from it by a matrix, exam codes, how each code is shuffled, then Word / PDF papers and the Excel
// answer key. The files are made in the browser; "Lưu" keeps the set in the exam_sets table (utils/examStore.ts). The
// form is also kept in this browser as a working copy, so a new exam that is not saved yet survives a reload.
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
const route = useRoute()
const client = useSupabaseClient<Database>()
const toast = useToast()
const { listCourses, load } = useCourse()
const pool = useExamPool()
/** The saved set this page edits, or null on /teacher/exams/new. */
const examId = computed(() => (String(route.params.id) === "new" ? null : String(route.params.id)))
useHead({ title: () => t(examId.value ? "examPage.pageTitleEdit" : "examPage.pageTitle") })

// ---- the form ----
const info = reactive(emptyInfo())
const questions = shallowRef<ExamQuestion[]>([])
const codesText = ref("101, 102, 103, 104")
const mode = ref<ShuffleMode>("all")
const sheetAt = ref<SheetAt>("top")
/** What the author wrote under part titles, by part (empty or missing: the default prints). */
const partHints = reactive<PartHints>({})
/** The working copy is written only once the form holds what was loaded (or restored), never the empty form before it. */
const restored = ref(false)
const loading = ref(false)
const missing = ref(false)
/** exam_sets.id of the saved set; null while the exam is new. */
const savedId = ref<string | null>(null)
/** Who made the saved set and who it is shared with (as far as this person can see): decides what they may do with it. */
const loadedRow = shallowRef<{ owner_id: string; exam_set_shares: ShareRow[] } | null>(null)
const ownerName = ref("")
const me = computed(() => useSupabaseUser().value?.sub)
const { isAdmin } = useProfile()
/** A new exam is yours; a saved one depends on who made it and how it was shared (the database enforces the same). */
const access = computed(() => (loadedRow.value ? examAccess(loadedRow.value, me.value, isAdmin.value) : "manage"))
const readOnly = computed(() => access.value === "view")
const canManage = computed(() => access.value === "manage")
const sharingOpen = ref(false)
/** What the stored row looks like (snapshotOf): the form differs from it when there is something to save. */
const savedSnapshot = ref("")
const saving = ref(false)

const courses = shallowRef<{ id: string; name: string }[]>([])
const lessons = shallowRef<{ id: string; label: string; title: string }[]>([])
const lessonName = computed(() => new Map(lessons.value.map(l => [l.id, l.label])))

const current = computed<ExamDraft>(() => ({
  examId: savedId.value, info: { ...info }, questions: questions.value, codesText: codesText.value, mode: mode.value, sheetAt: sheetAt.value, partHints: cleanHints(partHints),
}))
const dirty = computed(() => snapshotOf(current.value) !== savedSnapshot.value)

function apply(d: ExamDraft) {
  Object.assign(info, d.info)
  questions.value = d.questions
  codesText.value = d.codesText
  mode.value = d.mode
  sheetAt.value = d.sheetAt
  for (const k of Object.keys(partHints)) delete partHints[k as PartKey]
  Object.assign(partHints, d.partHints)
}
const blank = (): ExamDraft => ({ examId: null, info: emptyInfo(), questions: [], codesText: "101, 102, 103, 104", mode: "all", sheetAt: "top", partHints: {} })

/** Opens what the address says: a saved set from the database, or a new exam (with the unsaved working copy, if any). */
async function start(id: string | null) {
  if (id && id === savedId.value) return // just saved: the form already holds it
  restored.value = false
  missing.value = false
  savedId.value = null
  savedSnapshot.value = ""
  loadedRow.value = null
  ownerName.value = ""
  sharingOpen.value = false
  if (id) {
    loading.value = true
    try {
      const row = await getExamSet(client, id)
      if (row) {
        const d = draftOf(row)
        apply(d)
        savedId.value = id
        savedSnapshot.value = snapshotOf(d)
        loadedRow.value = { owner_id: row.owner_id, exam_set_shares: row.exam_set_shares ?? [] }
        if (row.owner_id !== me.value) {
          try {
            const [owner] = await staffByIds(client, [row.owner_id])
            ownerName.value = (owner && personName(owner)) || ""
          } catch { /* the banner then says "a teacher" */ }
        }
      } else {
        missing.value = true
      }
    } catch (e) {
      toast.error((e as Error).message)
      missing.value = true
    }
    loading.value = false
  } else {
    const saved = readDraft()
    apply(saved && saved.examId === null ? saved : blank())
  }
  restored.value = !missing.value
  if (!courses.value.length) {
    try {
      courses.value = (await listCourses()).map(c => ({ id: c.id, name: c.name }))
    } catch (e) {
      toast.error(errorText((e as Error).message))
    }
  }
  if (!id && !info.courseId) info.courseId = courses.value[0]?.id ?? ""
  if (!info.courseId) await bank.load() // no grade to wait for: the bank lists every grade
}
onMounted(() => start(examId.value))
watch(examId, id => start(id))

watch([info, questions, codesText, mode, sheetAt, savedId, partHints], () => {
  if (restored.value) saveDraft(current.value)
}, { deep: true })

// ---- saving ----
async function save() {
  if (saving.value || loading.value) return
  const d = current.value
  saving.value = true
  if (savedId.value) {
    const error = await updateExamSet(client, savedId.value, d)
    if (error) toast.error(error)
    else {
      savedSnapshot.value = snapshotOf(d)
      toast.ok(t("examPage.saved"))
    }
  } else {
    const made = await createExamSet(client, d)
    if (made.error || !made.id) toast.error(made.error ?? "")
    else {
      savedId.value = made.id
      savedSnapshot.value = snapshotOf({ ...d, examId: made.id })
      toast.ok(t("examPage.created"))
      await navigateTo(`/teacher/exams/${made.id}`, { replace: true })
    }
  }
  saving.value = false
}
const copying = ref(false)
async function makeCopy() {
  if (!savedId.value || copying.value) return
  copying.value = true
  const made = await copyExamSet(client, savedId.value)
  copying.value = false
  if (made.error || !made.id) return toast.error(made.error ?? "")
  toast.ok(t("examList.copied"))
  await navigateTo(`/teacher/exams/${made.id}`)
}
const statusText = computed(() => (!savedId.value ? t("examPage.statusNew") : dirty.value ? t("examPage.statusDirty") : t("examPage.statusSaved")))

// Edits of a saved set are lost when the page is left without saving (the next visit reads the set from the database).
const leaveOk = () => !(savedId.value && dirty.value) || window.confirm(t("examPage.leaveConfirm"))
onBeforeRouteLeave(() => leaveOk())
onBeforeRouteUpdate(() => leaveOk())
function warnUnload(e: BeforeUnloadEvent) {
  if (savedId.value && dirty.value) e.preventDefault()
}
onMounted(() => window.addEventListener("beforeunload", warnUnload))
onBeforeUnmount(() => window.removeEventListener("beforeunload", warnUnload))

const confirm = useTwoClick()
function reset() {
  if (!confirm.arm("reset")) return
  apply({ ...blank(), info: { ...emptyInfo(), courseId: info.courseId } })
}

// ---- lessons of the grade (for the matrix and for naming where a question comes from) ----
const chosenLessons = ref<string[]>([])
const lessonsLoading = ref(false)
watch(() => info.courseId, async (id) => {
  lessons.value = []
  chosenLessons.value = []
  if (!id) return
  lessonsLoading.value = true
  try {
    const outline = await load(id)
    if (id !== info.courseId) return
    lessons.value = outline.order.map(l => outline.byId[l]!).filter(l => l.total > 0).map(l => ({ id: l.id, label: l.label, title: l.title }))
    chosenLessons.value = lessons.value.map(l => l.id)
  } catch (e) {
    toast.error(errorText((e as Error).message))
  }
  if (id === info.courseId) lessonsLoading.value = false
}, { immediate: true })

// ---- choosing questions ----
const tab = ref<"manual" | "auto">("manual")
const inExam = computed(() => new Set(questions.value.map(q => q.id)))

// By hand: the question bank, filtered and paged in the database.
const type = ref("")
const search = ref("")
const tag = ref("")
const selection = ref<Selection>("all")
const bank = useQuestionBank({ course: toRef(info, "courseId"), type, search, tag, selection, picked: () => questions.value.map(q => q.id) }, 10)
/** Ids being added right now: several ticks in a row are all kept, each waits for its own question to load. */
const adding = reactive(new Set<string>())
/** A question with its section and passage, read once and kept while the page is open. */
const fetched = new Map<string, ExamQuestion>()
async function fetchQuestion(id: string) {
  const known = fetched.get(id) ?? questions.value.find(q => q.id === id)
  if (known) return known
  const [found] = await pool.ofIds([id])
  if (found) fetched.set(id, found)
  return found
}
async function toggle(r: BankRow) {
  const id = r.id ?? ""
  if (!id || adding.has(id)) return
  if (inExam.value.has(id)) return remove(id)
  adding.add(id)
  try {
    const found = await fetchQuestion(id)
    // Read the list again after the wait: other ticks may have changed it meanwhile.
    if (found) questions.value = addQuestion(questions.value, found)
  } catch (e) {
    toast.error(errorText((e as Error).message))
  }
  adding.delete(id)
}

// Looking at one question in full before choosing it (a bank row, or a question already in the exam).
const previewed = shallowRef<ExamQuestion | null>(null)
const previewLoading = ref("")
async function openPreview(id: string | null) {
  if (!id || previewLoading.value) return
  previewLoading.value = id
  try {
    previewed.value = (await fetchQuestion(id)) ?? null
  } catch (e) {
    toast.error(errorText((e as Error).message))
  }
  previewLoading.value = ""
}
async function togglePreviewed() {
  const q = previewed.value
  if (!q) return
  if (inExam.value.has(q.id)) remove(q.id)
  else questions.value = addQuestion(questions.value, q)
}
const remove = (id: string) => { questions.value = questions.value.filter(q => q.id !== id) }
const move = (blockId: string, dir: -1 | 1) => { questions.value = moveBlock(questions.value, blockId, dir) }
// Dragging (v-sortable) and the arrow buttons both change the order of the list, which is the printed order.
const dragBlock = (part: PartKey, from: number, to: number) => { questions.value = moveBlockTo(questions.value, part, from, to) }
const dragPart = (from: number, to: number) => { questions.value = movePartTo(questions.value, from, to) }
const movePartBy = (key: PartKey, dir: -1 | 1) => { questions.value = movePart(questions.value, key, dir) }

// By matrix: the questions of the chosen lessons, loaded when the tab is open.
const matrix = reactive<MatrixSpec>(emptyMatrix())
const poolRows = shallowRef<ExamQuestion[]>([])
const poolLoading = ref(false)
const available = computed(() => poolCounts(poolRows.value))
const LOOSE: readonly Exclude<PartKey, "reading">[] = ["phonetics", "grammar", "error", "match", "order", "typed"]
let poolRequest = 0
watch([tab, chosenLessons], async () => {
  if (tab.value !== "auto") return
  const mine = ++poolRequest
  poolLoading.value = true
  try {
    const rows = await pool.ofLessons(chosenLessons.value)
    if (mine === poolRequest) poolRows.value = rows
  } catch (e) {
    if (mine === poolRequest) toast.error(errorText((e as Error).message))
  }
  if (mine === poolRequest) poolLoading.value = false
})
const matrixTotal = computed(() => LOOSE.reduce((n, k) => n + (Number(matrix[k]) || 0), 0) + (Number(matrix.passages) || 0) * (Number(matrix.perPassage) || 0))
const shortText = ref("")
function draw() {
  if (questions.value.length && !confirm.arm("draw")) return
  const d = drawExam(poolRows.value, matrix, rngOf(`${Date.now()}:${Math.random()}`))
  questions.value = d.questions
  const short = Object.entries(d.short).map(([k, n]) => t("examPage.shortPart", { n, part: t(`exam.part.${k}.title`) }))
  shortText.value = short.length ? t("examPage.short", { list: short.join("; ") }) : ""
  if (d.questions.length) toast.ok(t("examPage.drawn", { n: d.questions.length }))
}

// ---- the base exam, the codes and the papers ----
const parts = computed(() => buildParts(questions.value))
const base = computed(() => buildVariant(parts.value, "", "base"))
const codes = computed(() => parseCodes(codesText.value))
const variants = computed(() => buildVariants(parts.value, codes.value, mode.value))
const codeCount = ref(4)
const codeStart = ref(101)
const fillCodes = () => { codesText.value = codeSeries(codeCount.value, codeStart.value).join(", ") }

const docInfo = computed(() => docInfoOf(info, localName(courses.value.find(c => c.id === info.courseId)?.name), t("examPage.untitled"), partHints))
const problems = computed(() => [
  ...(!info.title.trim() ? [t("examPage.needTitle")] : []),
  ...(!questions.value.length ? [t("examPage.needQuestions")] : []),
  ...(!codes.value.length ? [t("examPage.needCodes")] : []),
])
const ready = computed(() => !problems.value.length)

const activeCode = ref("")
const shown = computed(() => variants.value.find(v => v.code === activeCode.value) ?? variants.value[0] ?? null)
const withKey = ref(false)

const busy = ref("")
async function run(key: string, job: () => Promise<void>) {
  if (busy.value) return
  busy.value = key
  try {
    await job()
  } catch (e) {
    toast.error(t("examPage.exportFailed", { msg: (e as Error).message }))
  }
  busy.value = ""
}
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const saveOne = (key: boolean) => run(key ? "key" : "one", async () => {
  const v = shown.value
  if (!v) return
  saveFile(examFileName(docInfo.value, v.code, key), await examDocx(docInfo.value, v, { withKey: key, answerSheet: sheetAt.value }), DOCX)
})
const saveAll = () => run("all", async () => {
  const key = { name: examKeyFileName(docInfo.value), bytes: await examKeyBytes(docInfo.value, variants.value) }
  const zip = await examZip(docInfo.value, variants.value, { answerSheet: sheetAt.value }, key)
  saveFile(`${fileSlug(docInfo.value.title) || "de-thi"}.zip`, zip, "application/zip")
})
const pdfLink = (code: string, key: boolean) => ({ path: "/teacher/exams/print", query: { code, ...(key ? { key: "1" } : {}), ...(savedId.value ? { id: savedId.value } : {}) } })
const saveKey = () => run("xlsx", () => downloadExamKey(docInfo.value, variants.value))

const sourceOf = (q: ExamQuestion) => {
  const row = lessons.value.find(l => l.id === q.lessonId)
  return row ? `${row.label} - ${row.title}` : q.lessonId
}
const oneLine = (q: ExamQuestion) =>
  (q.type === "error" ? q.options.join(" ") : q.type === "order" ? q.words.join(" / ") : stripTags(q.prompt)) || q.sectionTitle
</script>

<template>
  <div class="exam-page">
    <BackLink to="/teacher/exams" :label="$t('examList.back')" />
    <div class="page-head">
      <div>
        <h1>{{ $t(examId ? "examPage.pageTitleEdit" : "examPage.pageTitle") }}</h1>
        <p class="sub">{{ $t("examPage.intro") }}</p>
      </div>
      <button
        v-if="canManage && !missing && !loading" class="btn" :disabled="!savedId" :title="savedId ? '' : $t('examPage.shareNeedsSave')"
        @click="sharingOpen = true"
      ><Icon name="users" /> {{ $t("examPage.shareBtn") }}</button>
    </div>
    <p v-if="readOnly || access === 'edit'" class="fb key">
      {{ $t(readOnly ? "examPage.viewBanner" : "examPage.editBanner", { name: ownerName || $t("examPage.ownerUnknown") }) }}
    </p>

    <EmptyState v-if="missing" icon="file" :title="$t('examPage.missing')" :text="$t('examPage.missingText')">
      <NuxtLink class="btn primary" to="/teacher/exams">{{ $t("examList.back") }}</NuxtLink>
    </EmptyState>
    <Skeleton v-else-if="loading" :rows="6" />
    <template v-else>
    <fieldset class="plain" :disabled="readOnly">
    <section class="card">
      <h2>1. {{ $t("examPage.infoTitle") }}</h2>
      <div class="grid">
        <label class="wide"><span>{{ $t("examPage.title") }}</span>
          <input v-model="info.title" type="text" :placeholder="$t('examPage.titleHint')">
        </label>
        <label><span>{{ $t("examPage.grade") }}</span>
          <select v-model="info.courseId">
            <option v-for="c in courses" :key="c.id" :value="c.id">{{ localName(c.name) }}</option>
          </select>
        </label>
        <label><span>{{ $t("examPage.minutes") }}</span>
          <input v-model.number="info.minutes" type="number" min="1" max="300">
        </label>
        <label class="wide"><span>{{ $t("examPage.school") }}</span>
          <input v-model="info.school" type="text" :placeholder="$t('examPage.schoolHint')">
        </label>
        <label><span>{{ $t("examPage.department") }}</span>
          <input v-model="info.department" type="text" :placeholder="$t('examPage.departmentHint')">
        </label>
        <label><span>{{ $t("examPage.schoolYear") }}</span>
          <input v-model="info.schoolYear" type="text" placeholder="2026 – 2027">
        </label>
        <label><span>{{ $t("examPage.term") }}</span>
          <input v-model="info.term" type="text" :placeholder="$t('examPage.termHint')">
        </label>
      </div>
    </section>

    <section class="card">
      <h2>2. {{ $t("examPage.pickTitle") }}</h2>
      <div class="row tabs" role="tablist">
        <button class="btn small" role="tab" :aria-selected="tab === 'manual'" :class="{ primary: tab === 'manual' }" @click="tab = 'manual'">{{ $t("examPage.manual") }}</button>
        <button class="btn small" role="tab" :aria-selected="tab === 'auto'" :class="{ primary: tab === 'auto' }" @click="tab = 'auto'">{{ $t("examPage.auto") }}</button>
      </div>

      <div v-if="tab === 'manual'">
        <p class="hint">{{ $t("examPage.manualHint") }}</p>
        <div class="row filters">
          <select v-model="selection" :aria-label="$t('examPage.selLabel')">
            <option value="all">{{ $t("examPage.selAll") }}</option>
            <option value="out">{{ $t("examPage.selOut") }}</option>
            <option value="in">{{ $t("examPage.selIn", { n: questions.length }) }}</option>
          </select>
          <select v-model="type" :aria-label="$t('bankPage.allTypes')">
            <option value="">{{ $t("bankPage.allTypes") }}</option>
            <option v-for="k in SCORED_TYPES" :key="k" :value="k">{{ SECTION_TYPES[k].label }}</option>
          </select>
          <input v-model="search" type="search" :placeholder="$t('bank.search')">
          <input v-model="tag" type="search" class="tag" :placeholder="$t('bank.tag')">
          <span class="small muted">{{ $t("bankPage.found", { n: bank.total }) }}</span>
        </div>
        <p v-if="bank.error" class="fb no">{{ bank.error }}</p>
        <Skeleton v-else-if="!bank.rows.length && bank.loading" :rows="4" :card="false" />
        <p v-else-if="!bank.rows.length" class="muted small">{{ $t("bank.none") }}</p>
        <label v-for="r in bank.rows" :key="r.id ?? ''" class="q-row" :class="{ on: inExam.has(r.id ?? '') }">
          <input type="checkbox" :checked="inExam.has(r.id ?? '')" :disabled="adding.has(r.id ?? '')" @change="toggle(r)">
          <span class="q-text">
            <span><span v-if="r.type" class="badge">{{ SECTION_TYPES[r.type].label }}</span> {{ questionText(r) }}</span>
            <small class="muted">→ <b>{{ stripTags(answerText(r)) }}</b><template v-if="r.tag"> · [{{ r.tag }}]</template> · {{ r.lesson_label }} - {{ r.lesson_title }}</small>
          </span>
          <button
            class="btn small ghost preview-btn" :disabled="!!previewLoading" :title="$t('examPage.preview')" :aria-label="$t('examPage.preview')"
            @click.prevent.stop="openPreview(r.id)"
          ><Icon name="eye" /> <span class="label">{{ $t("examPage.preview") }}</span></button>
        </label>
        <Pager v-model:page="bank.page" :page-size="bank.pageSize" :total="bank.total" />
      </div>

      <div v-else>
        <p class="hint">{{ $t("examPage.autoHint") }}</p>
        <details class="lessons">
          <summary>{{ $t("examPage.lessons", { n: chosenLessons.length, total: lessons.length }) }}</summary>
          <div class="row">
            <button class="btn small ghost" @click="chosenLessons = lessons.map(l => l.id)">{{ $t("examPage.allLessons") }}</button>
            <button class="btn small ghost" @click="chosenLessons = []">{{ $t("examPage.noLessons") }}</button>
          </div>
          <label v-for="l in lessons" :key="l.id" class="row lesson">
            <input v-model="chosenLessons" type="checkbox" :value="l.id"> <span>{{ l.label }} - {{ l.title }}</span>
          </label>
        </details>

        <Skeleton v-if="poolLoading || lessonsLoading" :rows="3" :card="false" />
        <div v-else class="matrix">
          <label v-for="k in LOOSE" :key="k" class="m-row">
            <span>{{ $t(`exam.part.${k}.title`) }} <small class="muted">{{ $t("examPage.has", { n: available[k] }) }}</small></span>
            <input v-model.number="matrix[k]" type="number" min="0" :max="available[k]">
          </label>
          <div class="m-row">
            <span>{{ $t("exam.part.reading.title") }} <small class="muted">{{ $t("examPage.hasPassages", { n: available.passages }) }}</small></span>
            <span class="row passages">
              <input v-model.number="matrix.passages" type="number" min="0" :max="available.passages" :aria-label="$t('examPage.passages')">
              <span class="small">{{ $t("examPage.passagesTimes") }}</span>
              <input v-model.number="matrix.perPassage" type="number" min="0" max="20" :aria-label="$t('examPage.perPassage')">
              <span class="small">{{ $t("examPage.perPassage") }}</span>
            </span>
          </div>
        </div>
        <div class="row draw">
          <button class="btn primary" :disabled="poolLoading || lessonsLoading || !poolRows.length || !matrixTotal" @click="draw">
            {{ confirm.armed.value === "draw" ? $t("examPage.drawConfirm") : $t("examPage.draw", { n: matrixTotal }) }}
          </button>
          <span class="small muted">{{ $t("examPage.drawNote") }}</span>
        </div>
        <p v-if="shortText" class="fb no">{{ shortText }}</p>
      </div>
    </section>

    <section class="card">
      <div class="row between">
        <h2>3. {{ $t("examPage.baseTitle", { n: questions.length }) }}</h2>
        <button v-if="questions.length" class="btn small ghost" @click="questions = []">{{ $t("examPage.clear") }}</button>
      </div>
      <p v-if="!questions.length" class="muted small">{{ $t("examPage.baseEmpty") }}</p>
      <p v-if="base.parts.length > 1 || base.parts.some(p => p.blocks.length > 1)" class="small muted">{{ $t("examPage.dragHint") }}</p>
      <div v-sortable="{ handle: '.part-handle', item: '.base-part', onMove: dragPart, disabled: readOnly }" class="parts">
        <div v-for="(p, pi) in base.parts" :key="p.key" class="base-part">
          <div class="part-head">
            <span v-if="base.parts.length > 1" class="grip part-handle" :title="$t('examPage.dragPart')"><Icon name="grip" /></span>
            <h3>{{ $t("examDoc.part", { n: roman(pi + 1) }) }} {{ $t(`exam.part.${p.key}.title`) }}</h3>
            <span v-if="base.parts.length > 1" class="acts">
              <button class="btn small ghost icon" :disabled="pi === 0" :title="$t('examPage.partUp')" :aria-label="$t('examPage.partUp')" @click="movePartBy(p.key, -1)"><Icon name="chevronUp" /></button>
              <button class="btn small ghost icon" :disabled="pi === base.parts.length - 1" :title="$t('examPage.partDown')" :aria-label="$t('examPage.partDown')" @click="movePartBy(p.key, 1)"><Icon name="chevronDown" /></button>
            </span>
          </div>
          <div class="hint-edit">
            <input
              v-model="partHints[p.key]" type="text" class="hint-input" :maxlength="MAX_HINT_LENGTH" :aria-label="$t('examPage.partHint')"
              :placeholder="$t(`exam.part.${p.key}.hint`)"
            >
            <button v-if="partHints[p.key]" class="btn small ghost" @click="delete partHints[p.key]">{{ $t("examPage.partHintReset") }}</button>
          </div>
          <div v-sortable="{ handle: '.block-handle', item: '.block', onMove: (from: number, to: number) => dragBlock(p.key, from, to), disabled: readOnly }" class="blocks">
            <div v-for="(b, bi) in p.blocks" :key="parts[pi]!.blocks[bi]!.id" class="block">
              <span v-if="p.blocks.length > 1" class="grip block-handle" :title="$t('examPage.dragBlock')"><Icon name="grip" /></span>
              <div class="block-body">
                <p v-if="b.passage" class="small muted clip">{{ $t("examPage.passage") }}: {{ stripTags(b.passage) }}</p>
                <div v-for="q in b.questions" :key="q.q.id" class="base-q">
                  <span class="q-text">
                    <span><b>{{ q.n }}.</b> {{ oneLine(q.q) }}</span>
                    <small class="muted">→ <b>{{ q.objective && q.keyText ? `${q.key}. ${q.keyText}` : q.keyText }}</b> · {{ lessonName.get(q.q.lessonId) ?? q.q.lessonId }}</small>
                  </span>
                  <span class="acts">
                    <button class="btn small ghost icon" :title="$t('examPage.preview')" :aria-label="$t('examPage.preview')" @click="openPreview(q.q.id)"><Icon name="eye" /></button>
                    <button class="btn small ghost icon" :title="$t('examPage.remove')" :aria-label="$t('examPage.remove')" @click="remove(q.q.id)"><Icon name="x" /></button>
                  </span>
                </div>
              </div>
              <span v-if="p.blocks.length > 1" class="moves">
                <button class="btn small ghost icon" :disabled="bi === 0" :title="$t('examPage.up')" :aria-label="$t('examPage.up')" @click="move(parts[pi]!.blocks[bi]!.id, -1)"><Icon name="chevronUp" /></button>
                <button class="btn small ghost icon" :disabled="bi === p.blocks.length - 1" :title="$t('examPage.down')" :aria-label="$t('examPage.down')" @click="move(parts[pi]!.blocks[bi]!.id, 1)"><Icon name="chevronDown" /></button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>4. {{ $t("examPage.codesTitle") }}</h2>
      <div class="row series">
        <label><span>{{ $t("examPage.codeCount") }}</span><input v-model.number="codeCount" type="number" min="1" max="24"></label>
        <label><span>{{ $t("examPage.codeStart") }}</span><input v-model.number="codeStart" type="number" min="0"></label>
        <button class="btn small" @click="fillCodes">{{ $t("examPage.fillCodes") }}</button>
      </div>
      <label class="codes"><span>{{ $t("examPage.codes") }}</span>
        <input v-model="codesText" type="text" placeholder="101, 102, 103, 104">
      </label>

      <fieldset class="modes">
        <legend>{{ $t("examPage.modeTitle") }}</legend>
        <label v-for="m in SHUFFLE_MODES" :key="m" class="mode" :class="{ on: mode === m }">
          <input v-model="mode" type="radio" :value="m">
          <span><b>{{ $t(`exam.mode.${m}.label`) }}</b><small class="muted">{{ $t(`exam.mode.${m}.hint`) }}</small></span>
        </label>
      </fieldset>
      <p class="small muted">{{ $t("examPage.seedNote") }}</p>

      <label class="sheet-at"><span>{{ $t("examPage.sheetAt") }}</span>
        <select v-model="sheetAt">
          <option value="top">{{ $t("examPage.sheetTop") }}</option>
          <option value="bottom">{{ $t("examPage.sheetBottom") }}</option>
          <option value="none">{{ $t("examPage.sheetNone") }}</option>
        </select>
      </label>
    </section>

    </fieldset>

    <section class="card">
      <h2>5. {{ $t("examPage.exportTitle") }}</h2>
      <ul v-if="!ready" class="fb no problems"><li v-for="p in problems" :key="p">{{ p }}</li></ul>
      <template v-else-if="shown">
        <div class="row code-tabs">
          <span class="small muted">{{ $t("examPage.codeLabel") }}</span>
          <button v-for="v in variants" :key="v.code" class="btn small" :class="{ primary: v.code === shown.code }" @click="activeCode = v.code">{{ v.code }}</button>
          <label class="row inline small"><input v-model="withKey" type="checkbox"> {{ $t("examPage.showKey") }}</label>
        </div>
        <div class="row downloads">
          <button class="btn primary" :disabled="!!busy" @click="saveOne(false)"><Icon name="file" /> {{ busy === "one" ? $t("examPage.making") : $t("examPage.saveOne", { code: shown.code }) }}</button>
          <button class="btn" :disabled="!!busy" @click="saveOne(true)"><Icon name="file" /> {{ busy === "key" ? $t("examPage.making") : $t("examPage.saveWithKey") }}</button>
          <NuxtLink class="btn" :to="pdfLink(shown.code, false)" target="_blank"><Icon name="printer" /> {{ $t("examPage.savePdf", { code: shown.code }) }}</NuxtLink>
          <NuxtLink class="btn" :to="pdfLink(shown.code, true)" target="_blank"><Icon name="printer" /> {{ $t("examPage.savePdfKey") }}</NuxtLink>
          <NuxtLink class="btn" :to="pdfLink('all', false)" target="_blank"><Icon name="printer" /> {{ $t("examPage.savePdfAll", { n: variants.length }) }}</NuxtLink>
          <button class="btn" :disabled="!!busy" @click="saveAll"><Icon name="file" /> {{ busy === "all" ? $t("examPage.making") : $t("examPage.saveAll", { n: variants.length }) }}</button>
          <button class="btn" :disabled="!!busy" @click="saveKey"><Icon name="clipboard" /> {{ busy === "xlsx" ? $t("examPage.making") : $t("examPage.saveXlsx") }}</button>
        </div>
        <p class="small muted">{{ $t("examPage.pdfNote") }}</p>
        <ExamPreview :info="docInfo" :variant="shown" :with-key="withKey" :sheet="sheetAt" />
      </template>
    </section>

    <QuestionPreviewDialog
      v-if="previewed" :question="previewed" :in-exam="inExam.has(previewed.id)" :source="sourceOf(previewed)"
      @close="previewed = null" @toggle="togglePreviewed"
    />

    <ExamShareDialog v-if="sharingOpen && savedId" :exam-id="savedId" :title="info.title" @close="sharingOpen = false" />

    <p v-if="!savedId" class="reset">
      <button class="btn small danger" @click="reset">{{ confirm.armed.value === "reset" ? $t("common.confirmAgain") : $t("examPage.reset") }}</button>
      <span class="small muted">{{ $t("examPage.draftNote") }}</span>
    </p>

    <div class="savebar">
      <template v-if="readOnly">
        <span class="small muted" role="status">{{ $t("examList.viewOnly") }}</span>
        <span class="spacer" />
        <button class="btn primary" :disabled="copying" @click="makeCopy">{{ $t("examPage.makeCopy") }}</button>
      </template>
      <template v-else>
        <span class="small" :class="savedId && !dirty ? 'muted' : 'warn-text'" role="status">{{ statusText }}</span>
        <span class="spacer" />
        <button class="btn primary" :disabled="saving" @click="save">
          {{ saving ? $t("common.saving") : $t(savedId ? "examPage.saveChanges" : "examPage.saveNew") }}
        </button>
      </template>
    </div>
    </template>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.grid label, .codes, .series label, .sheet-at { display: flex; flex-direction: column; gap: 4px; font-size: .9rem; }
.grid label > span, .codes > span, .series label > span, .sheet-at > span { color: var(--muted); }
.grid .wide { grid-column: span 2; }
.tabs { margin-bottom: 10px; }
.filters { margin-bottom: 10px; }
.filters select { width: auto; }
.filters input { flex: 1 1 180px; min-width: 0; }
.filters .tag { max-width: 200px; }
.q-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px;
  cursor: pointer; margin-bottom: 6px; }
.q-row:hover, .q-row.on { border-color: var(--accent); }
.q-row.on { background: var(--accent-soft); }
.q-row input { margin-top: 5px; }
.q-text { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
.lessons { margin-bottom: 12px; }
.lessons summary { cursor: pointer; color: var(--accent); margin-bottom: 6px; }
.lesson { flex-wrap: nowrap; padding: 3px 0; font-size: .92rem; }
.matrix { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 20px; }
.m-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.m-row input { width: 76px; flex: none; }
.passages { flex-wrap: nowrap; gap: 6px; }
.draw { margin-top: 14px; }
.between { justify-content: space-between; }
.base-part { margin-top: 12px; padding: 4px 0; }
.part-head { display: flex; align-items: center; gap: 8px; }
.part-head h3 { margin: 0; flex: 1; }
.hint-edit { display: flex; gap: 6px; align-items: center; margin: 6px 0 8px; }
.hint-input { font-style: italic; }
.hint-edit .btn { white-space: nowrap; flex: none; }
.grip { display: inline-flex; align-items: center; flex: none; padding: 4px 2px; border-radius: 6px; color: var(--muted); cursor: grab; touch-action: none; user-select: none; }
.grip:hover { background: var(--accent-soft); color: var(--accent); }
.drag-ghost { opacity: .4; outline: 2px dashed var(--accent); outline-offset: 2px; border-radius: 8px; }
.drag-chosen { cursor: grabbing; }
.block { display: flex; gap: 6px; align-items: flex-start; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; margin-bottom: 6px; }
.block-body { flex: 1; min-width: 0; }
.base-q { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; padding: 3px 0; }
.clip { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 2px 0 4px; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.plain { border: 0; padding: 0; margin: 0; min-width: 0; }
.savebar { position: sticky; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); z-index: 3; background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px var(--shadow); margin-top: 12px; }
.spacer { flex: 1; }
.warn-text { color: var(--warn); font-weight: 600; }
.acts { display: flex; gap: 2px; flex: none; }
.preview-btn { flex: none; align-self: center; white-space: nowrap; }
@media (max-width: 560px) { .preview-btn .label { display: none; } }
.moves { display: flex; flex-direction: column; gap: 2px; }
.btn.icon { padding: 2px 6px; line-height: 1; }
.series { align-items: flex-end; margin-bottom: 10px; }
.series input { width: 110px; }
.codes { margin-bottom: 14px; }
.modes { border: 0; padding: 0; margin: 0 0 8px; display: grid; gap: 6px; }
.modes legend { padding: 0; margin-bottom: 6px; font-weight: 600; }
.mode { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; }
.mode.on { border-color: var(--accent); background: var(--accent-soft); }
.mode input { margin-top: 5px; }
.mode span { display: flex; flex-direction: column; }
.sheet-at { max-width: 320px; margin-top: 10px; }
.problems { margin: 0; padding-left: 28px; }
.code-tabs, .downloads { margin-bottom: 12px; }
.inline { gap: 6px; margin-left: auto; }
.reset { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
@media (max-width: 720px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .matrix { grid-template-columns: 1fr; }
}
@media (max-width: 460px) {
  .grid { grid-template-columns: 1fr; }
  .grid .wide { grid-column: auto; }
}
</style>
