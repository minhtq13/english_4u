<script setup lang="ts">
import type { BankRow as Row } from "~/composables/useQuestionBank"
import type { DraftItem, SectionType } from "~/utils/lessonDraft"

// Pick questions of one type from earlier lessons (question_bank view: what the teacher may see with
// answers) and copy them into the section being edited.
const props = defineProps<{ type: SectionType; courseId: string }>()
const emit = defineEmits<{ pick: [items: DraftItem[]]; close: [] }>()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => emit("close"))

const { listCourses } = useCourse()

const courses = shallowRef<{ id: string; name: string }[]>([])
const course = ref(props.courseId)
const search = ref("")
const tag = ref("")
const picked = ref(new Map<string, Row>())

const bank = useQuestionBank({ course, type: toRef(props, "type"), search, tag })
onMounted(async () => {
  courses.value = (await listCourses()).map(c => ({ id: c.id, name: c.name }))
  await bank.load()
})

function toggle(r: Row) {
  const next = new Map(picked.value)
  if (next.has(r.id ?? "")) next.delete(r.id ?? "")
  else next.set(r.id ?? "", r)
  picked.value = next
}

function add() {
  emit("pick", [...picked.value.values()].map(r => itemToDraft(r, r.type)))
}

</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div ref="dialog" class="dialog" role="dialog" tabindex="-1" aria-modal="true" :aria-label="$t('bank.title')">
      <header class="bar">
        <b>{{ $t("bank.title") }} · {{ SECTION_TYPES[type].label }}</b>
        <span class="row">
          <button class="btn small primary" :disabled="!picked.size" @click="add">{{ $t("bank.add", { n: picked.size }) }}</button>
          <button class="btn small" @click="emit('close')">{{ $t("common.close") }} <Icon name="x" /></button>
        </span>
      </header>
      <div class="body">
        <div class="row filters">
          <select v-model="course">
            <option value="">{{ $t("bank.allGrades") }}</option>
            <option v-for="c in courses" :key="c.id" :value="c.id">{{ localName(c.name) }}</option>
          </select>
          <input v-model="search" type="search" :placeholder="$t('bank.search')">
          <input v-model="tag" type="search" class="tag" :placeholder="$t('bank.tag')">
        </div>
        <p v-if="bank.error" class="fb no">{{ bank.error }}</p>
        <p v-else-if="!bank.rows.length" class="muted small">{{ $t("bank.none") }}</p>
        <label v-for="r in bank.rows" :key="r.id ?? ''" class="q-row" :class="{ on: picked.has(r.id ?? '') }">
          <input type="checkbox" :checked="picked.has(r.id ?? '')" @change="toggle(r)">
          <span class="q-text">
            <span>{{ questionText(r) }}</span>
            <small class="muted">
              → <b>{{ stripTags(answerText(r)) }}</b>
              <template v-if="r.tag"> · [{{ r.tag }}]</template>
              · {{ r.lesson_label }} - {{ r.lesson_title }}
            </small>
          </span>
        </label>
        <Pager v-model:page="bank.page" :page-size="bank.pageSize" :total="bank.total" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, .45); display: flex; justify-content: center;
  align-items: flex-start; padding: 24px 16px; overflow-y: auto; }
.dialog { width: 100%; max-width: 760px; background: var(--card); border-radius: 14px; box-shadow: 0 12px 40px rgba(0, 0, 0, .3); }
.bar { position: sticky; top: 0; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 16px; background: var(--card); border-bottom: 1px solid var(--line); border-radius: 14px 14px 0 0; }
.bar .btn { padding: 4px 12px; }
.body { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.filters select { width: auto; }
.filters input { flex: 1; min-width: 160px; }
.filters .tag { max-width: 220px; }
.q-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; }
.q-row:hover { border-color: var(--accent); }
.q-row.on { border-color: var(--accent); background: var(--accent-soft); }
.q-row input { margin-top: 4px; }
.q-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
</style>
