<script setup lang="ts">
import type { Database, Tables } from "~/types/database.types"
import { analysisRows, answerBars, reteach, type AnalysisRow } from "~/utils/questionAnalysis"
import { lessonsOfClass } from "~/utils/classLessonStore"
import { downloadXlsx, fileSlug } from "~/utils/spreadsheet"
import { errorText } from "~/utils/serverErrors"

// Which questions a class found hard in one lesson: % right, and the wrong answers given most often.
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("analysis.pageTitle") })

const route = useRoute()
const classId = route.params.classId as string
const client = useSupabaseClient<Database>()
const { load } = useCourse()

const cls = shallowRef<Pick<Tables<"classes">, "id" | "name" | "course_id"> | null>(null)
const lessons = shallowRef<{ id: string; name: string }[]>([])
const lessonId = ref(typeof route.query.lesson === "string" ? route.query.lesson : "")
const rows = shallowRef<AnalysisRow[]>([])
const loaded = ref(false)
const busy = ref(false)
const error = ref("")

onMounted(async () => {
  const { data } = await client.from("classes").select("id, name, course_id").eq("id", classId).maybeSingle()
  cls.value = data
  if (data) {
    const [outline, given] = await Promise.all([load(data.course_id, true), lessonsOfClass(client, classId)])
    lessons.value = outline.order.filter(id => given.settings.has(id)).map(id => ({ id, name: `${outline.byId[id]!.label} - ${outline.byId[id]!.title}` }))
    if (!lessonId.value) lessonId.value = lessons.value[0]?.id ?? ""
  }
  loaded.value = true
})

async function run() {
  if (!lessonId.value) return
  busy.value = true
  error.value = ""
  const { data, error: e } = await client.rpc("question_analysis", { target_class: classId, target_lesson: lessonId.value })
  busy.value = false
  if (e) { error.value = t("analysis.failed", { msg: errorText(e.message) }); rows.value = []; return }
  rows.value = analysisRows(data ?? [])
}
watch(lessonId, run)
watch(loaded, (l) => { if (l && lessonId.value) run() })

const adviceAll = computed(() => reteach(rows.value))
/** Five questions are enough to act on; the rest are counted. */
const advice = computed(() => adviceAll.value.slice(0, 5))
const lessonName = computed(() => lessons.value.find(l => l.id === lessonId.value)?.name ?? "")
async function exportXlsx() {
  await downloadXlsx(`${fileSlug(t("analysis.fileName"))}-${fileSlug(cls.value?.name ?? "")}-${fileSlug(lessonId.value)}`, {
    sheetName: lessonId.value,
    title: t("analysis.sheetTitle", { name: cls.value?.name ?? "", lesson: lessonName.value }),
    note: t("analysis.sheetNote"),
    rows: [
      [t("analysis.question"), t("analysis.text"), t("analysis.answered"), t("analysis.correct"), "%", t("analysis.commonWrong")],
      ...rows.value.map(r => [r.qid, r.question, r.answered, r.ok, r.percent, r.wrong.map(w => `${w.given} (${w.n})`).join("; ")]),
    ],
    percentColumns: [4],
  })
}
</script>

<template>
  <div>
    <BackLink :to="`/teacher/classes/${classId}`" :label="cls?.name ?? $t('nav.myClasses')" />
    <Skeleton v-if="!loaded" />
    <template v-else-if="cls">
      <div class="head">
        <div>
          <h1>{{ $t("analysis.title", { name: cls.name }) }}</h1>
          <p class="sub">{{ $t("analysis.intro") }}</p>
        </div>
        <button class="btn" :disabled="!rows.length" @click="exportXlsx"><Icon name="file" /> {{ $t("gradebook.export") }}</button>
      </div>
      <EmptyState v-if="!lessons.length" icon="clipboard" :title="$t('gradebook.noLessons')" :text="$t('gradebook.noLessonsHint')" />
      <template v-else>
        <div class="card pick">
          <label for="lesson"><b>{{ $t("analysis.lesson") }}</b></label>
          <select id="lesson" v-model="lessonId"><option v-for="l in lessons" :key="l.id" :value="l.id">{{ l.name }}</option></select>
        </div>
        <p v-if="error" class="fb no">{{ error }}</p>
        <Skeleton v-else-if="busy" />
        <EmptyState v-else-if="!rows.length" icon="chart" :title="$t('analysis.noneTitle')" :text="$t('analysis.none', { lesson: lessonName })" />
        <div v-else-if="adviceAll.length" class="fb key advice" role="status">
          <b>{{ $t("analysis.adviceTitle") }}</b>
          <ul>
            <li v-for="r in advice" :key="r.qid">{{ $t("analysis.advice", { qid: r.qid, percent: r.percent }) }}</li>
            <li v-if="adviceAll.length > advice.length" class="muted">{{ $t("analysis.adviceMore", { n: adviceAll.length - advice.length }) }}</li>
          </ul>
        </div>
        <div v-if="!error && !busy && rows.length" class="card scroll" tabindex="0" role="region" :aria-label="$t('analysis.title', { name: cls.name })">
          <table class="tbl">
            <thead><tr><th>{{ $t("analysis.question") }}</th><th class="q">{{ $t("analysis.text") }}</th><th>{{ $t("analysis.answered") }}</th><th>{{ $t("analysis.rightShare") }}</th><th>{{ $t("analysis.commonWrong") }}</th></tr></thead>
            <tbody>
              <tr v-for="r in rows" :key="r.qid">
                <td data-label="#"><b>{{ r.qid }}</b></td>
                <td class="q">{{ r.question || "-" }}</td>
                <td>{{ r.answered }}</td>
                <td><span class="pill" :class="r.band">{{ r.percent }}%</span> <span class="muted small">{{ r.ok }}/{{ r.answered }}</span></td>
                <td>
                  <div class="bars">
                    <div v-for="(b, i) in answerBars(r)" :key="i" class="bar-row" :class="{ right: b.right }">
                      <span class="bl">{{ b.right ? $t("analysis.rightBar") : b.label }}</span>
                      <span class="bt"><span :style="{ width: `${b.percent}%` }" /></span>
                      <span class="bn">{{ b.n }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="small muted legend">{{ $t("analysis.legend") }}</p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); flex-wrap: wrap; }
.pick { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pick select { flex: 1; min-width: 200px; }
.scroll { overflow-x: auto; padding: 0; }
.tbl { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.tbl th, .tbl td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
.tbl thead th { color: var(--muted); font-size: .85rem; }
.q { min-width: 240px; max-width: 420px; overflow-wrap: anywhere; }
.pill { display: inline-block; padding: 1px 10px; border-radius: var(--radius-full); font-weight: 700; }
.pill.easy { background: var(--ok-soft); color: var(--ok); }
.pill.medium { background: var(--warn-soft); color: var(--warn); }
.pill.hard { background: var(--bad-soft); color: var(--bad); }
.wrong { display: inline-block; margin: 0 8px 4px 0; padding: 1px 8px; border-radius: var(--radius-sm); background: var(--bg); border: 1px solid var(--line); }
.legend { margin-top: var(--space-sm); }
.advice { margin-bottom: var(--space-md); }
.advice ul { margin: 4px 0 0; padding-left: 20px; }
.bars { display: flex; flex-direction: column; gap: 3px; min-width: 200px; }
.bar-row { display: grid; grid-template-columns: minmax(60px, 110px) 1fr 24px; gap: var(--space-sm); align-items: center; font-size: .85rem; }
.bl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bt { height: 8px; border-radius: var(--radius-full); background: var(--line); overflow: hidden; }
.bt span { display: block; height: 100%; background: var(--bad); }
.bar-row.right .bt span { background: var(--ok); }
.bn { text-align: right; font-weight: 600; }
</style>
