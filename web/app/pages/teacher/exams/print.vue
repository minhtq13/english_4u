<script setup lang="ts">
import type { Database } from "~/types/database.types"
import { buildParts, buildVariants, parseCodes } from "~/utils/examGenerator"
import { docInfoOf, readDraft } from "~/utils/examDraft"
import { draftOf, getExamSet } from "~/utils/examStore"

// The papers of the exam set being written, laid out for A4 and printed from the browser: choosing "Save as PDF" as the
// printer gives a PDF file whose text can be selected and searched. ?id=<exam set> prints a saved set: the working copy
// of this browser when it is that set (unsaved edits included), otherwise the set read from the database; without ?id it
// is the new exam being written. ?code=<exam code> prints one code, ?code=all every code; ?key=1 is the copy with answers.
definePageMeta({ roles: ["teacher"], layout: false })
const { t } = useI18n()
useHead({ title: () => t("examPrint.pageTitle") })

const route = useRoute()
const { listCourses } = useCourse()
const client = useSupabaseClient<Database>()
const id = typeof route.query.id === "string" ? route.query.id : ""
const local = import.meta.client ? readDraft() : null
const stored = id && local?.examId !== id ? await getExamSet(client, id).catch(() => null) : null
const draft = shallowRef(id ? (local?.examId === id ? local : stored ? draftOf(stored) : null) : local)
const courses = await listCourses().catch(() => [])

const withKey = ref(route.query.key === "1")
const wanted = String(route.query.code ?? "all")
const info = computed(() => {
  const d = draft.value
  if (!d) return null
  const grade = localName(courses.find(c => c.id === d.info.courseId)?.name)
  return docInfoOf(d.info, grade, t("examPage.untitled"), d.partHints)
})
const variants = computed(() => {
  const d = draft.value
  if (!d) return []
  const all = buildVariants(buildParts(d.questions), parseCodes(d.codesText), d.mode)
  return wanted === "all" ? all : all.filter(v => v.code === wanted)
})

const print = () => window.print()
// The print dialog opens by itself once the papers are on screen; the button below opens it again.
onMounted(() => {
  if (variants.value.length) setTimeout(print, 400)
})
</script>

<template>
  <div class="print-page">
    <div class="toolbar no-print">
      <BackLink :to="id ? `/teacher/exams/${id}` : '/teacher/exams/new'" :label="$t('common.back')" />
      <label class="row inline"><input v-model="withKey" type="checkbox"> {{ $t("examPrint.withKey") }}</label>
      <button class="btn primary" :disabled="!variants.length" @click="print"><Icon name="printer" /> {{ $t("examPrint.print") }}</button>
    </div>
    <p class="hint no-print">{{ $t("examPrint.hint") }}</p>

    <p v-if="!variants.length" class="muted">{{ $t("examPrint.empty") }}</p>
    <template v-else-if="info">
      <ExamPreview
        v-for="v in variants" :key="v.code" class="one" :info="info" :variant="v" :with-key="withKey" :sheet="draft?.sheetAt ?? 'top'"
      />
    </template>
  </div>
</template>

<style scoped>
.print-page { max-width: 820px; margin: 0 auto; padding: 16px; }
.toolbar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
.toolbar :deep(.back-link) { margin: 0; }
.toolbar .inline { gap: 6px; font-size: .9rem; }
.one { margin-bottom: 20px; }
@media print {
  @page { size: A4; margin: 14mm; }
  .no-print { display: none !important; }
  .print-page { padding: 0; max-width: none; }
  :global(body) { background: #fff !important; }
  .one { border: 0 !important; border-radius: 0 !important; padding: 0 !important; margin: 0; break-after: page; }
  .one:last-of-type { break-after: auto; }
}
</style>
