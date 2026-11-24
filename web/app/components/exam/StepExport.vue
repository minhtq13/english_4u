<script setup lang="ts">
import type { ExamVariant, ShuffleRounds } from "~/utils/examGenerator"
import type { SheetAt } from "~/utils/examDraft"
import type { ExamInfo } from "~/utils/exportDocx"

// Step 5 of the exam builder: the papers of every code with their downloads (Word, PDF through the print page, Excel key)
// and the on-page preview. docx / exceljs are imported only when a file is made.
// The downloads are grouped by format (Word, PDF, the whole set) so each button only says what is specific to it. The
// answer sheet ("phiếu trả lời") is a switch here, next to the preview it changes: a class that circles answers on the
// paper itself does not need it.
const props = defineProps<{ problems: string[]; variants: ExamVariant[]; docInfo: ExamInfo; savedId: string | null; canReshuffle: boolean }>()
const sheetAt = defineModel<SheetAt>("sheetAt", { required: true })
// Shuffling a code again: every code is shuffled by a seed made from the code, so it always gives the same paper. A
// counter per code (kept with the exam set) makes another paper for the same code; the teacher can step back to the last one.
const rounds = defineModel<ShuffleRounds>("shuffleRounds", { required: true })
const { t } = useI18n()
const toast = useToast()
const ready = computed(() => !props.problems.length)
const docInfo = computed(() => props.docInfo)
const variants = computed(() => props.variants)
const savedId = computed(() => props.savedId)
const problems = computed(() => props.problems)
const activeCode = ref("")
const shown = computed(() => variants.value.find(v => v.code === activeCode.value) ?? variants.value[0] ?? null)
const withKey = ref(false)

const roundOf = (code: string) => rounds.value[code] ?? 0
function setRound(code: string, n: number) {
  const next = { ...rounds.value }
  if (n > 0) next[code] = Math.min(MAX_ROUND, n)
  else delete next[code]
  rounds.value = next
}
const again = (code: string) => setRound(code, roundOf(code) + 1)
const previous = (code: string) => setRound(code, roundOf(code) - 1)
function againAll() {
  const next = { ...rounds.value }
  for (const v of variants.value) next[v.code] = Math.min(MAX_ROUND, (next[v.code] ?? 0) + 1)
  rounds.value = next
}

// The switch keeps the place the sheet had, so turning it off and on again does not forget "bottom".
const lastPlace = ref<"top" | "bottom">(sheetAt.value === "bottom" ? "bottom" : "top")
watch(sheetAt, (v) => { if (v !== "none") lastPlace.value = v })
const sheetOn = computed({
  get: () => sheetAt.value !== "none",
  set: (on: boolean) => { sheetAt.value = on ? lastPlace.value : "none" },
})

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
const label = (key: string, text: string) => (busy.value === key ? t("examPage.making") : text)
</script>

<template>
  <ExamCollapse id="exam:export" :title="`5. ${$t('examPage.exportTitle')}`" :summary="$t('examPage.sum.export', { n: variants.length })">
    <ul v-if="!ready" class="fb no problems"><li v-for="p in problems" :key="p">{{ p }}</li></ul>
    <template v-else-if="shown">
      <div class="options">
        <div class="opt codes-opt">
          <span class="small muted">{{ $t("examPage.codeLabel") }}</span>
          <button v-for="v in variants" :key="v.code" class="btn small" :class="{ primary: v.code === shown.code }" @click="activeCode = v.code">{{ v.code }}</button>
        </div>
        <div class="opt">
          <label class="toggle"><input v-model="sheetOn" type="checkbox"> {{ $t("examPage.sheetOn") }}</label>
          <select v-if="sheetOn" v-model="sheetAt" class="place" :aria-label="$t('examPage.sheetPlace')">
            <option value="top">{{ $t("examPage.sheetTop") }}</option>
            <option value="bottom">{{ $t("examPage.sheetBottom") }}</option>
          </select>
          <InfoTip :text="$t('examPage.sheetTip')" />
        </div>
        <label class="toggle opt"><input v-model="withKey" type="checkbox"> {{ $t("examPage.showKey") }}</label>
      </div>

      <div class="reshuffle">
        <button class="btn small" :disabled="!canReshuffle" @click="again(shown.code)"><Icon name="shuffle" /> {{ $t("examPage.reshuffle", { code: shown.code }) }}</button>
        <button v-if="roundOf(shown.code) > 0" class="btn small ghost" @click="previous(shown.code)"><Icon name="undo" /> {{ $t("examPage.reshufflePrev") }}</button>
        <button v-if="variants.length > 1" class="btn small ghost" :disabled="!canReshuffle" @click="againAll"><Icon name="shuffle" /> {{ $t("examPage.reshuffleAll", { n: variants.length }) }}</button>
        <span class="small muted" role="status">
          <template v-if="!canReshuffle">{{ $t("examPage.reshuffleNone") }}</template>
          <template v-else-if="roundOf(shown.code) === 0">{{ $t("examPage.reshuffleFirst", { code: shown.code }) }}</template>
          <template v-else>{{ $t("examPage.reshuffleCount", { code: shown.code, n: roundOf(shown.code) }) }}</template>
        </span>
        <InfoTip :text="$t('examPage.reshuffleTip')" />
      </div>

      <div class="downloads">
        <div class="dl-group">
          <b class="dl-title"><Icon name="file" /> {{ $t("examPage.dl.word") }}</b>
          <button class="btn small primary" :disabled="!!busy" @click="saveOne(false)">{{ label("one", $t("examPage.dl.paper", { code: shown.code })) }}</button>
          <button class="btn small" :disabled="!!busy" @click="saveOne(true)">{{ label("key", $t("examPage.dl.withKey")) }}</button>
        </div>
        <div class="dl-group">
          <b class="dl-title"><Icon name="printer" /> {{ $t("examPage.dl.pdf") }}</b>
          <NuxtLink class="btn small" :to="pdfLink(shown.code, false)" target="_blank">{{ $t("examPage.dl.paper", { code: shown.code }) }}</NuxtLink>
          <NuxtLink class="btn small" :to="pdfLink(shown.code, true)" target="_blank">{{ $t("examPage.dl.withKey") }}</NuxtLink>
          <NuxtLink class="btn small" :to="pdfLink('all', false)" target="_blank">{{ $t("examPage.dl.pdfAll", { n: variants.length }) }}</NuxtLink>
        </div>
        <div class="dl-group">
          <b class="dl-title"><Icon name="clipboard" /> {{ $t("examPage.dl.whole", { n: variants.length }) }}</b>
          <button class="btn small" :disabled="!!busy" @click="saveAll">{{ label("all", $t("examPage.dl.zip")) }}</button>
          <button class="btn small" :disabled="!!busy" @click="saveKey">{{ label("xlsx", $t("examPage.dl.xlsx")) }}</button>
        </div>
      </div>
      <p class="small muted">{{ $t("examPage.pdfNote") }}</p>
      <ExamPreview :info="docInfo" :variant="shown" :with-key="withKey" :sheet="sheetAt" />
    </template>
  </ExamCollapse>
</template>

<style scoped>
.problems { margin: 0; padding-left: 28px; }
.options { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-sm) var(--space-xl); margin-bottom: var(--space-md); }
.opt { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: .92rem; }
.place { width: auto; padding: 3px 8px; }
.reshuffle { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md); }
.downloads { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-md); margin-bottom: var(--space-sm); }
.dl-group { display: flex; flex-direction: column; align-items: stretch; gap: 6px; padding: var(--space-md); background: var(--bg);
  border: 1px solid var(--line); border-radius: var(--radius-lg); }
.dl-title { display: flex; align-items: center; gap: 6px; font-size: .92rem; margin-bottom: 2px; }
.dl-group .btn { text-align: center; }
@media (max-width: 860px) { .downloads { grid-template-columns: 1fr; } }
</style>
