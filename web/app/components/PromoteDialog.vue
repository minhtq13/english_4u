<script setup lang="ts">
import type { Database } from "~/types/database.types"
import { planPromotion, type PlanClass } from "~/utils/promotion"
import { errorText } from "~/utils/serverErrors"

// "Lên lớp": shows every move of the new school year (students per class and where they go), and runs the ticked ones
// from the highest grade down. Nothing moves before the confirm button; attempts and feedback stay with the students.
const props = defineProps<{ classes: PlanClass[] }>()
const emit = defineEmits<{ close: []; done: [] }>()
const { t } = useI18n()
const client = useSupabaseClient<Database>()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => { if (!running.value) emit("close") })
const titleId = useId()

const steps = computed(() => planPromotion(props.classes))
const picked = ref(new Set(steps.value.filter(s => !s.problem && s.from.students > 0).map(s => s.from.id)))
const toggle = (id: string) => { const s = new Set(picked.value); if (s.has(id)) s.delete(id); else s.add(id); picked.value = s }
const todo = computed(() => steps.value.filter(s => picked.value.has(s.from.id) && !s.problem))
const total = computed(() => todo.value.reduce((n, s) => n + s.from.students, 0))

const sure = ref(false)
const running = ref(false)
const error = ref("")
const doneCount = ref(0)

async function run() {
  if (!sure.value || !todo.value.length) return
  running.value = true
  error.value = ""
  for (const s of todo.value) {
    const { error: e } = s.graduates
      ? await client.rpc("graduate_class", { source_class: s.from.id })
      : await client.rpc("promote_class", { source_class: s.from.id, target_class: s.to!.id })
    if (e) { error.value = t("promotion.failed", { name: s.from.name, msg: errorText(e.message) }); break }
    doneCount.value++
  }
  running.value = false
  if (doneCount.value) emit("done")
  if (!error.value) emit("close")
}
</script>

<template>
  <div class="overlay scroll" @click.self="!running && emit('close')">
    <div ref="dialog" class="dialog wide" role="dialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId">
      <header class="bar">
        <b :id="titleId">{{ $t("promotion.title") }}</b>
        <button class="btn small" :disabled="running" @click="emit('close')">{{ $t("common.close") }} <Icon name="x" /></button>
      </header>
      <div class="body">
        <p class="hint">{{ $t("promotion.hint") }}</p>
        <EmptyState v-if="!steps.length" icon="users" :title="$t('promotion.none')" />
        <ul v-else class="steps">
          <li v-for="s in steps" :key="s.from.id" :class="{ off: s.problem }">
            <label>
              <input type="checkbox" :checked="picked.has(s.from.id)" :disabled="!!s.problem || running" @change="toggle(s.from.id)">
              <b>{{ s.from.name }}</b>
              <span class="muted small">{{ $t("common.students", s.from.students) }}</span>
              <Icon name="chevronRight" />
              <span v-if="s.graduates">{{ $t("promotion.graduate") }}</span>
              <b v-else-if="s.to">{{ s.to.name }}</b>
              <span v-else class="bad small">{{ $t(`promotion.problem.${s.problem}`) }}</span>
            </label>
          </li>
        </ul>
        <p class="small"><b>{{ $t("promotion.summary", { classes: todo.length, students: total }) }}</b></p>
        <p v-if="error" class="fb no" role="alert">{{ error }}</p>
        <label class="row small"><input v-model="sure" type="checkbox" :disabled="running"> {{ $t("promotion.sure") }}</label>
        <div class="row">
          <button class="btn primary" :class="{ loading: running }" :disabled="!sure || !todo.length || running" @click="run">{{ $t("promotion.run", todo.length) }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog { width: min(600px, 100%); }
.body { display: flex; flex-direction: column; gap: var(--space-md); }
.body p { margin: 0; }
.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.steps li { border: 1px solid var(--line); border-radius: var(--radius-md); }
.steps label { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); cursor: pointer; flex-wrap: wrap; }
.steps li.off { opacity: .6; }
.bad { color: var(--bad); }
</style>
