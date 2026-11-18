<script setup lang="ts">
import type { ExamVariant } from "~/utils/examGenerator"
import type { SheetAt } from "~/utils/examDraft"
import type { ExamInfo } from "~/utils/exportDocx"

// Step 5 of the exam builder: the papers of every code with their downloads (Word, PDF through the print page, Excel key)
// and the on-page preview. docx / exceljs are imported only when a file is made.
const props = defineProps<{ problems: string[]; variants: ExamVariant[]; docInfo: ExamInfo; sheetAt: SheetAt; savedId: string | null }>()
const { t } = useI18n()
const toast = useToast()
const ready = computed(() => !props.problems.length)
const docInfo = computed(() => props.docInfo)
const variants = computed(() => props.variants)
const sheetAt = computed(() => props.sheetAt)
const savedId = computed(() => props.savedId)
const problems = computed(() => props.problems)
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

</script>

<template>
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
</template>

<style scoped>
.problems { margin: 0; padding-left: 28px; }
.code-tabs, .downloads { margin-bottom: var(--space-md); }
.inline { gap: 6px; margin-left: auto; }
</style>
