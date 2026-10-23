<script setup lang="ts">
import type { Database, Json, Tables } from "~/types/database.types"
import type { DraftSection } from "~/utils/lessonDraft"

// Step "lesson structure" of the lesson editor: pick a starting point (built-in, saved by the teacher, or
// another lesson), shape the list of sections, and save it as a reusable structure. Edits the page's draft sections.
type SectionRow = Tables<"lesson_sections"> & { section_items: Tables<"section_items">[] }
type Saved = Pick<Tables<"lesson_structures">, "id" | "name" | "sections">

const sections = defineModel<DraftSection[]>({ required: true })
defineProps<{ lessons: { id: string; label: string; title: string }[] }>()

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { t } = useI18n()

// Anything that throws away typed work (or a saved structure) needs a second click within 4 seconds.
const armed = ref("")
let armTimer: ReturnType<typeof setTimeout> | undefined
function arm(key: string) {
  armed.value = key
  clearTimeout(armTimer)
  armTimer = setTimeout(() => { armed.value = "" }, 4000)
}
onBeforeUnmount(() => clearTimeout(armTimer))

const hasWork = computed(() => sections.value.some(hasContent))
async function replaceWith(key: string, make: () => DraftSection[] | Promise<DraftSection[]>) {
  if (hasWork.value && armed.value !== key) return arm(key)
  armed.value = ""
  sections.value = await make()
}

const starters = computed(() => [
  { key: "standard", icon: "📘", label: t("structure.standard"), desc: t("structure.standardDesc"), make: STANDARD_STRUCTURE },
  { key: "exam", icon: "📝", label: t("structure.exam"), desc: t("structure.examDesc"), make: EXAM_STRUCTURE },
  { key: "blank", icon: "➕", label: t("structure.blank"), desc: t("structure.blankDesc"), make: (): DraftSection[] => [] },
])

// ---- saved structures ----
const saved = shallowRef<Saved[]>([])
const loadError = ref("")
async function loadSaved() {
  const { data, error } = await client.from("lesson_structures").select("id, name, sections").order("created_at", { ascending: false })
  if (error) loadError.value = t("structure.loadFailed", { msg: errorText(error.message) })
  else saved.value = data ?? []
}
onMounted(loadSaved)

const saveName = ref("")
const saving = ref(false)
const saveMsg = ref<{ ok: boolean; text: string } | null>(null)
async function saveTemplate() {
  const name = saveName.value.trim()
  if (!name || !sections.value.length) return
  if (saved.value.some(x => x.name === name) && armed.value !== "save") return arm("save")
  armed.value = ""
  saving.value = true
  saveMsg.value = null
  const { error } = await client.from("lesson_structures").upsert(
    { name, sections: structureOf(sections.value) as unknown as Json, teacher_id: user.value?.sub },
    { onConflict: "teacher_id,name" },
  )
  saving.value = false
  if (error) {
    saveMsg.value = { ok: false, text: t("structure.saveFailed", { msg: errorText(error.message) }) }
    return
  }
  saveMsg.value = { ok: true, text: t("structure.savedAs", { name }) }
  saveName.value = ""
  await loadSaved()
}
async function removeSaved(sv: Saved) {
  if (armed.value !== `del:${sv.id}`) return arm(`del:${sv.id}`)
  armed.value = ""
  const { error } = await client.from("lesson_structures").delete().eq("id", sv.id)
  if (error) saveMsg.value = { ok: false, text: errorText(error.message) }
  else await loadSaved()
}

// ---- structure of an existing lesson ----
const lessonId = ref("")
const withContent = ref(false)
const busy = ref(false)
const fromLesson = () => replaceWith("lesson", async () => {
  busy.value = true
  try {
    const { data } = await client.from("lesson_sections").select("*, section_items(*)").eq("lesson_id", lessonId.value)
    return sectionsFromRows((data ?? []) as SectionRow[], withContent.value)
  } finally {
    busy.value = false
  }
})

// ---- the outline ----
function move(i: number, delta: number) {
  const [s] = sections.value.splice(i, 1)
  sections.value.splice(i + delta, 0, s!)
}
function removeAt(i: number) {
  const s = sections.value[i]!
  if (hasContent(s) && armed.value !== `rm:${s.uid}`) return arm(`rm:${s.uid}`)
  armed.value = ""
  sections.value.splice(i, 1)
}
const canShrink = (s: DraftSection) => s.items.length > 1 && !hasContent({ ...s, body: "", placeholder: "", items: s.items.slice(-1) })
const countLabel = (s: DraftSection) => t(s.type === "cards" ? "structure.cardsN" : "structure.questionsN", { n: s.items.length })
</script>

<template>
  <section class="card structure">
    <h2>2. {{ $t("editor.step2") }}</h2>
    <p class="hint">{{ $t("editor.step2Help") }}</p>

    <h3>{{ $t("structure.startFrom") }}</h3>
    <div class="starters">
      <button
        v-for="st in starters" :key="st.key" type="button" class="starter" :class="{ armed: armed === st.key }"
        @click="replaceWith(st.key, st.make)"
      >
        <span class="icon" aria-hidden="true">{{ st.icon }}</span>
        <b>{{ armed === st.key ? $t("structure.replaceConfirm") : st.label }}</b>
        <span v-if="armed !== st.key" class="small muted">{{ st.desc }}</span>
      </button>
    </div>

    <details class="more">
      <summary>{{ $t("structure.mine", { n: saved.length }) }}</summary>
      <p v-if="loadError" class="fb no">{{ loadError }}</p>
      <p v-else-if="!saved.length" class="small muted">{{ $t("structure.mineEmpty") }}</p>
      <ul v-else class="saved">
        <li v-for="sv in saved" :key="sv.id">
          <span class="name">
            <b>{{ sv.name }}</b>
            <span class="small muted">{{ $t("structure.sectionsN", { n: Array.isArray(sv.sections) ? sv.sections.length : 0 }) }}</span>
          </span>
          <span class="row">
            <button class="btn small" :class="{ danger: armed === `sv:${sv.id}` }" @click="replaceWith(`sv:${sv.id}`, () => sectionsFromStructure(sv.sections))">
              {{ armed === `sv:${sv.id}` ? $t("structure.replaceConfirm") : $t("structure.use") }}
            </button>
            <button class="btn small" :class="armed === `del:${sv.id}` ? 'danger' : 'ghost'" @click="removeSaved(sv)">
              {{ armed === `del:${sv.id}` ? $t("structure.deleteConfirm") : $t("structure.delete") }}
            </button>
          </span>
        </li>
      </ul>
    </details>

    <details class="more">
      <summary>{{ $t("structure.fromLesson") }}</summary>
      <div class="row from-lesson">
        <select v-model="lessonId" :aria-label="$t('structure.fromLesson')">
          <option value="">{{ $t("structure.pickLesson") }}</option>
          <option v-for="l in lessons" :key="l.id" :value="l.id">{{ l.label }} - {{ l.title }}</option>
        </select>
        <label class="inline"><input v-model="withContent" type="checkbox"> {{ $t("editor.withContent") }}</label>
        <button class="btn" :class="{ danger: armed === 'lesson' }" :disabled="!lessonId || busy" @click="fromLesson">
          {{ armed === "lesson" ? $t("structure.replaceConfirm") : $t("structure.use") }}
        </button>
      </div>
    </details>

    <h3>{{ $t("structure.outline", { n: sections.length }) }}</h3>
    <p v-if="!sections.length" class="empty">{{ $t("structure.outlineEmpty") }}</p>
    <ol v-else class="outline">
      <li v-for="(s, i) in sections" :key="s.uid">
        <span class="n">{{ i + 1 }}</span>
        <span class="main">
          <span class="row top">
            <span class="badge">{{ SECTION_TYPES[s.type].label }}</span>
            <span v-if="hasItems(s.type)" class="count small muted">
              <button type="button" class="step" :disabled="!canShrink(s)" :title="$t('structure.fewer')" @click="resizeItems(s, s.items.length - 1)">−</button>
              {{ countLabel(s) }}
              <button type="button" class="step" :title="$t('structure.more')" @click="resizeItems(s, s.items.length + 1)">+</button>
            </span>
          </span>
          <input v-model="s.title" type="text" :placeholder="$t('sectionEd.titleEx')" :aria-label="$t('sectionEd.title')">
        </span>
        <span class="tools">
          <button class="btn ghost small" :disabled="i === 0" :title="$t('sectionEd.up')" @click="move(i, -1)">↑</button>
          <button class="btn ghost small" :disabled="i === sections.length - 1" :title="$t('sectionEd.down')" @click="move(i, 1)">↓</button>
          <button class="btn small" :class="armed === `rm:${s.uid}` ? 'danger' : 'ghost'" :title="$t('sectionEd.remove')" @click="removeAt(i)">
            {{ armed === `rm:${s.uid}` ? $t("sectionEd.removeConfirm") : "✕" }}
          </button>
        </span>
      </li>
    </ol>

    <LessonEditorAddSection @add="sections.push($event)" />

    <div class="save-as">
      <h3>{{ $t("structure.saveAs") }}</h3>
      <div class="row">
        <input v-model="saveName" type="text" maxlength="80" :placeholder="$t('structure.saveNameEx')" :aria-label="$t('structure.saveName')" @keydown.enter.prevent="saveTemplate">
        <button class="btn" :class="{ danger: armed === 'save' }" :disabled="saving || !saveName.trim() || !sections.length" @click="saveTemplate">
          {{ armed === "save" ? $t("structure.overwriteConfirm") : saving ? $t("common.saving") : $t("structure.saveButton") }}
        </button>
      </div>
      <p v-if="saveMsg" class="small" :class="saveMsg.ok ? 'ok-text' : 'bad-text'" role="status">{{ saveMsg.text }}</p>
      <p v-else class="small muted">{{ $t("structure.saveHelp") }}</p>
    </div>
  </section>
</template>

<style scoped>
.structure { display: flex; flex-direction: column; gap: 10px; }
.structure h3 { margin: 6px 0 0; font-size: .95rem; }
.structure .hint { margin: 0; }
.starters { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
.starter { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; padding: 12px 14px; border: 1px solid var(--line);
  border-radius: 10px; background: var(--bg); color: var(--text); font: inherit; cursor: pointer; }
.starter:hover { border-color: var(--accent); }
.starter.armed { border-color: var(--bad); color: var(--bad); }
.starter .icon { font-size: 1.2rem; line-height: 1.2; }
.more { border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; }
.more summary { cursor: pointer; font-size: .92rem; font-weight: 500; }
.more[open] summary { margin-bottom: 8px; }
.saved { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.saved li { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 0; border-top: 1px dashed var(--line); }
.saved li:first-child { border-top: 0; }
.saved .name { display: flex; flex-direction: column; min-width: 0; }
.from-lesson select { width: auto; max-width: 100%; flex: 1 1 220px; }
.inline { display: flex; align-items: center; gap: 6px; font-size: .88rem; }
.empty { margin: 0; padding: 14px; border: 1px dashed var(--line); border-radius: 10px; color: var(--muted); text-align: center; }
.outline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.outline li { display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); }
.n { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); font-weight: 700; font-size: .85rem; }
.main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.top { gap: 10px; }
.count { display: inline-flex; align-items: center; gap: 6px; }
.step { width: 24px; height: 24px; line-height: 1; border: 1px solid var(--line); border-radius: 6px; background: var(--card); color: var(--text); cursor: pointer; font: inherit; }
.step:hover:not(:disabled) { border-color: var(--accent); }
.step:disabled { opacity: .4; cursor: default; }
.tools { display: flex; gap: 4px; }
.tools .btn { padding: 2px 10px; }
.save-as { border-top: 1px solid var(--line); padding-top: 4px; display: flex; flex-direction: column; gap: 6px; }
.save-as .small { margin: 0; }
.ok-text { color: var(--ok); }
.bad-text { color: var(--bad); }
@media (max-width: 560px) {
  .outline li { grid-template-columns: 28px 1fr; }
  .tools { grid-column: 2; justify-content: flex-end; }
}
</style>
