<script setup lang="ts">
import type { Lesson, Response } from "~/utils/course"

// The editor's preview: the lesson (or one section) exactly as students see it, in a dialog.
// "Làm như học sinh" hides right/wrong until "Chấm thử"; "Hiện đáp án" shows the key at once.
const props = defineProps<{ lesson: Lesson; title: string }>()
const emit = defineEmits<{ close: [] }>()

const responses = ref<Record<string, Response>>({})
const showKey = ref(false)
const checked = ref(false)
const round = ref(0)
const results = computed(() => (showKey.value || checked.value ? gradeLocal(props.lesson, responses.value) : null))
const score = computed(() => scoreOf(results.value ?? {}, lessonTotal(props.lesson)))

function respond(qid: string, r: Response | null) {
  const next = { ...responses.value }
  if (r) next[qid] = r
  else delete next[qid]
  responses.value = next
}
function reset() {
  responses.value = {}
  checked.value = false
  round.value++
}

const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") emit("close") }
onMounted(() => {
  document.addEventListener("keydown", onKey)
  document.body.style.overflow = "hidden"
})
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey)
  document.body.style.overflow = ""
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="dialog" role="dialog" aria-modal="true" :aria-label="title">
      <header class="bar">
        <b>{{ title }}</b>
        <span class="row tools">
          <label class="row inline small"><input v-model="showKey" type="checkbox"> {{ $t("preview.showKey") }}</label>
          <button v-if="!showKey" class="btn small primary" @click="checked = true">{{ $t("preview.check") }}</button>
          <button class="btn small ghost" @click="reset">{{ $t("preview.reset") }}</button>
          <button class="btn small" :aria-label="$t('preview.closeLabel')" @click="emit('close')">{{ $t("common.close") }} ✕</button>
        </span>
      </header>
      <div class="body">
        <p class="fb key note">{{ $t("preview.note") }}</p>
        <h1>{{ lesson.heading }}</h1>
        <p v-if="lesson.sub" class="sub">{{ lesson.sub }}</p>
        <p v-if="!lesson.sections.length" class="muted">{{ $t("preview.empty") }}</p>
        <section v-for="(s, i) in lesson.sections" :key="`${round}-${i}`" class="card">
          <span v-if="s.time" class="time">{{ s.time }}</span>
          <h2>{{ i + 1 }}. {{ s.title }}</h2>
          <p v-if="s.hint" class="hint" v-html="s.hint" />
          <div v-if="s.type === 'explain'" class="explain" v-html="s.html" />
          <LessonCardsSection v-else-if="s.type === 'cards'" :items="s.items" />
          <LessonQuestions v-else-if="isScored(s)" :section="s" :responses="responses" :results="results" :show-key="showKey" @respond="respond" />
          <textarea v-else-if="s.type === 'writing'" :placeholder="s.placeholder" />
        </section>
        <p v-if="results && lessonTotal(lesson)" class="fb ok">{{ $t("preview.score", { ok: score.ok, total: score.total }) }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, .45); display: flex; justify-content: center;
  align-items: flex-start; padding: 24px 16px; overflow-y: auto; }
.dialog { width: 100%; max-width: 820px; background: var(--bg); border-radius: 14px; box-shadow: 0 12px 40px rgba(0, 0, 0, .3); }
.bar { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; align-items: center; gap: 8px;
  flex-wrap: wrap; padding: 10px 16px; background: var(--card); border-bottom: 1px solid var(--line); border-radius: 14px 14px 0 0; }
.tools { gap: 6px; }
.tools .btn { padding: 4px 12px; }
.inline { gap: 6px; }
.body { padding: 16px 20px 24px; }
.note { margin: 0 0 12px; }
@media (max-width: 560px) { .overlay { padding: 0; } .dialog { border-radius: 0; min-height: 100%; } }
</style>
