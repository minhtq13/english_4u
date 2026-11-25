<script setup lang="ts">
import type { useClassWorkspace } from "~/composables/useClassWorkspace"

// The unfolded part of one given lesson on the class page: submitted / accuracy / waiting numbers, close, take back,
// who may work, deadline, and the results / shuffle switches. All changes go through the page's workspace.
const props = defineProps<{ workspace: ReturnType<typeof useClassWorkspace>; classId: string; lessonId: string; label: string }>()
const emit = defineEmits<{ progress: [] }>()
const { t } = useI18n()
const queue = useGradingQueue()
const workspace = props.workspace
const { settings: unlocked, picks, students, busy, armed, lessonStats, canTakeBack, takeBack, setClosed, setSetting, releaseAll, togglePick } = workspace

const whoOpen = ref<string | null>(null)
// ---- who may work on a lesson (default: the whole class) ----
const whoText = (lessonId: string) => {
  const st = unlocked.value.get(lessonId)
  return st?.for_all ? t("classPage.wholeClass") : t("classPage.someStudents", { n: picks.value.get(lessonId)?.size ?? 0, total: students.value.length })
}

// ---- deadline: past it students cannot work, and the lesson closes itself (pg_cron, every minute) ----
const dueEditing = ref<string | null>(null)
const dueValue = ref("")
function editDue(lessonId: string) {
  const current = unlocked.value.get(lessonId)?.due_at
  // Default: one week from now at 21:00.
  const d = new Date(Date.now() + 7 * 864e5)
  d.setHours(21, 0, 0, 0)
  dueValue.value = toLocalInput(current ?? d.toISOString())
  dueEditing.value = lessonId
}
async function saveDue(lessonId: string, clear = false) {
  if (await workspace.saveDue(lessonId, clear ? null : new Date(dueValue.value).toISOString())) dueEditing.value = null
}
</script>

<template>
  <div class="lesson-body">
    <div class="lesson-stats">
      <div class="stat-cell">
        <span class="small muted">{{ $t("classPage.submitted") }}</span>
        <StatBar :value="percentOf(lessonStats(lessonId).done, students.length)" :text="`${lessonStats(lessonId).done}/${students.length}`" />
      </div>
      <div class="stat-cell">
        <span class="small muted">{{ $t("classPage.accuracy") }}</span>
        <StatBar :value="lessonStats(lessonId).accuracy" />
      </div>
      <div class="stat-cell waiting">
        <span class="small muted">{{ $t("classPage.waiting") }}</span>
        <span class="row">
          <span class="badge" :class="lessonStats(lessonId).waiting ? 'submitted' : ''">{{ lessonStats(lessonId).waiting }}</span>
          <template v-if="lessonStats(lessonId).waiting">
            <button class="link small" @click="queue.start(lessonId, classId)">{{ $t("classPage.queue") }}</button>
            <button
              class="btn small" :class="armed === `release-${lessonId}` ? 'danger' : 'ghost'" :disabled="busy === `release-${lessonId}`"
              :title="$t('classPage.releaseTitle')" @click="releaseAll(lessonId)"
            >{{ armed === `release-${lessonId}` ? $t("common.confirmAgain") : $t("classPage.release") }}</button>
          </template>
        </span>
      </div>
    </div>

    <div>
      <button type="button" class="btn small" @click="emit('progress')"><Icon name="clipboard" /> {{ $t("classPage.lessonProgress.open") }}</button>
    </div>

    <div class="lesson-controls">
      <span class="row">
        <button v-if="unlocked.get(lessonId)!.closed" class="btn ghost small" :disabled="busy === lessonId" @click="setClosed(lessonId, false)">{{ $t("classPage.reopen") }}</button>
        <button
          v-else class="btn small" :class="armed === `close-${lessonId}` ? 'danger' : 'ghost'" :disabled="busy === lessonId"
          :title="$t('classPage.closeTitle')" @click="setClosed(lessonId, true)"
        >{{ armed === `close-${lessonId}` ? $t("classPage.closeConfirm") : $t("classPage.close") }}</button>
        <button
          v-if="canTakeBack(lessonId)" class="btn small" :class="armed === `back-${lessonId}` ? 'danger' : 'ghost'" :disabled="busy === lessonId"
          :title="$t('classPage.takeBackTitle')" @click="takeBack(lessonId)"
        >{{ armed === `back-${lessonId}` ? $t("classPage.takeBackConfirm") : $t("classPage.takeBack") }}</button>
        <span v-else class="opt">
          <button type="button" class="btn small ghost" disabled>{{ $t("classPage.takeBack") }}</button>
          <InfoTip :text="$t('classPage.takeBackBlockedTip', lessonStats(lessonId).started)" />
        </span>
        <button class="btn ghost small" @click="whoOpen = whoOpen === lessonId ? null : lessonId">
          <Icon name="users" /> {{ whoText(lessonId) }} <Icon :name="whoOpen === lessonId ? 'chevronUp' : 'chevronDown'" />
        </button>
      </span>

      <span class="due">
        <template v-if="dueEditing === lessonId">
          <input v-model="dueValue" type="datetime-local" :aria-label="$t('classPage.dueLabel', { name: label })">
          <button class="btn small primary" :disabled="!dueValue || busy === `due-${lessonId}`" @click="saveDue(lessonId)">{{ $t("common.save") }}</button>
          <button v-if="unlocked.get(lessonId)!.due_at" class="btn small ghost" :disabled="busy === `due-${lessonId}`" @click="saveDue(lessonId, true)">{{ $t("classPage.dueClear") }}</button>
          <button class="btn small ghost" @click="dueEditing = null">{{ $t("common.cancel") }}</button>
        </template>
        <template v-else-if="unlocked.get(lessonId)!.due_at">
          <span class="small" :class="{ late: isPastDue(unlocked.get(lessonId)!.due_at) }">
            <Icon name="clock" /> {{ formatDate(unlocked.get(lessonId)!.due_at) }} · {{ timeLeft(unlocked.get(lessonId)!.due_at) || $t("classPage.duePassed") }}
          </span>
          <button v-if="!unlocked.get(lessonId)!.closed" class="link small" @click="editDue(lessonId)">{{ $t("common.edit") }}</button>
        </template>
        <button v-else-if="!unlocked.get(lessonId)!.closed" class="link small" @click="editDue(lessonId)">{{ $t("classPage.dueAdd") }}</button>
      </span>

      <span class="toggles">
        <span class="opt">
          <label class="toggle small">
            <input type="checkbox" :checked="unlocked.get(lessonId)!.show_results" :disabled="busy === `show-${lessonId}`" @change="setSetting(lessonId, 'show', { show_results: ($event.target as HTMLInputElement).checked })">
            {{ $t("classPage.showResults") }}
          </label>
          <InfoTip :text="$t('giveForm.showResultsTip')" />
        </span>
        <span class="opt">
          <label class="toggle small">
            <input type="checkbox" :checked="unlocked.get(lessonId)!.shuffle" :disabled="busy === `shuffle-${lessonId}`" @change="setSetting(lessonId, 'shuffle', { shuffle: ($event.target as HTMLInputElement).checked })">
            {{ $t("classPage.shuffle") }}
          </label>
          <InfoTip :text="$t('giveForm.shuffleTip')" />
        </span>
      </span>
    </div>

    <div v-if="whoOpen === lessonId" class="who-panel">
      <span class="row">
        <label class="toggle"><input type="radio" :checked="unlocked.get(lessonId)!.for_all" :disabled="busy === `who-${lessonId}`" @change="setSetting(lessonId, 'who', { for_all: true })"> {{ $t("classPage.whoAll") }}</label>
        <label class="toggle"><input type="radio" :checked="!unlocked.get(lessonId)!.for_all" :disabled="busy === `who-${lessonId}`" @change="setSetting(lessonId, 'who', { for_all: false })"> {{ $t("classPage.whoSome") }}</label>
      </span>
      <template v-if="!unlocked.get(lessonId)!.for_all">
        <p v-if="!students.length" class="muted small">{{ $t("classPage.noStudents") }}</p>
        <div v-else class="row picks">
          <label v-for="st in students" :key="st.user_id ?? ''" class="pick" :class="{ on: picks.get(lessonId)?.has(st.user_id ?? '') }">
            <input type="checkbox" :checked="picks.get(lessonId)?.has(st.user_id ?? '')" :disabled="busy === `pick-${lessonId}-${st.user_id}`" @change="togglePick(lessonId, st.user_id ?? '')">
            {{ personName(st) }}
          </label>
        </div>
        <p class="hint">{{ $t("classPage.whoHint") }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lesson-body { display: flex; flex-direction: column; gap: 10px; }
.lesson-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-md); }
.stat-cell { display: flex; flex-direction: column; gap: var(--space-xs); min-width: 0; }
.stat-cell :deep(.meter) { min-width: 0; }
.waiting .row { gap: var(--space-sm); flex-wrap: wrap; }
.waiting .btn { padding: 2px 8px; }
.lesson-controls { display: flex; align-items: center; gap: 8px 16px; flex-wrap: wrap; padding-top: 10px; border-top: 1px dashed var(--line); }
.lesson-controls .row { gap: 6px; }
.lesson-controls .btn { padding: 3px 10px; }
.due { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.due input { width: auto; padding: 2px 6px; }
.toggles { display: inline-flex; gap: 6px 14px; flex-wrap: wrap; }
.opt { display: inline-flex; align-items: center; gap: 6px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.late { color: var(--bad); }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.who-panel { display: flex; flex-direction: column; gap: var(--space-sm); background: var(--bg); border-radius: var(--radius-md); padding: 10px 12px; }
.picks { gap: 6px; }
.pick { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--line); border-radius: var(--radius-full);
  background: var(--card); cursor: pointer; font-size: var(--fs-sm); }
.pick.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
@media (max-width: 640px) { .lesson-stats { grid-template-columns: 1fr 1fr; } .stat-cell.waiting { grid-column: span 2; } }
</style>
