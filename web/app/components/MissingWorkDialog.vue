<script setup lang="ts">
// The popup behind a lesson's "Chưa nộp" button: who has not submitted that lesson (the class's open lessons only),
// whether they have started, and ready-made reminder text to paste into the class chat.
const props = defineProps<{
  lesson: string
  /** The class's deadline for the lesson, if any. */
  due: string | null
  people: { user_id: string | null; full_name: string | null; username: string | null; started: boolean | null }[]
  /** Reminder for this lesson, and for every lesson that has someone missing. */
  remind: string
  remindAll: string
}>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => emit("close"))

const copied = ref<"one" | "all" | "">("")
async function copy(text: string, which: "one" | "all") {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = which
    setTimeout(() => { if (copied.value === which) copied.value = "" }, 2000)
  } catch { /* the names stay on screen to copy by hand */ }
}

/** The same list as a file: name, login and whether they started. */
async function exportXlsx() {
  await downloadXlsx(`${fileSlug(t("classPage.missingFile"))}-${fileSlug(props.lesson)}`, { sheetName: t("classPage.missingFile"), title: props.lesson, rows: [
    [t("accounts.fullName"), t("accounts.username"), t("classPage.missingStatus")],
    ...props.people.map(m => [m.full_name ?? "", m.username ?? "", m.started ? t("classPage.inProgress") : t("classPage.notStarted")]),
  ] })
}

const titleId = useId()
</script>

<template>
  <div class="overlay scroll" @click.self="emit('close')">
    <div ref="dialog" class="dialog" role="dialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId">
      <header class="bar">
        <b :id="titleId">{{ $t("classPage.missingTitle", { lesson }) }}</b>
        <button class="btn small" @click="emit('close')">{{ $t("common.close") }} <Icon name="x" /></button>
      </header>
      <div class="body">
        <p class="small meta">
          <span v-if="due" :class="{ late: isPastDue(due) }"><Icon name="clock" /> {{ formatDate(due) }}<template v-if="timeLeft(due)"> · {{ timeLeft(due) }}</template></span>
          <span class="muted">{{ $t("common.students", people.length) }}</span>
        </p>
        <p v-if="!people.length" class="muted">{{ $t("classPage.missingNone") }}</p>
        <template v-else>
          <p class="hint">{{ $t("classPage.missingHint") }}</p>
          <div class="row names">
            <span
              v-for="m in people" :key="m.user_id ?? ''" class="name-chip" :class="{ started: m.started }"
              :title="m.started ? $t('classPage.inProgress') : $t('classPage.notStarted')"
            >{{ personName(m) || "?" }}<template v-if="m.started"> · {{ $t("classPage.inProgress") }}</template></span>
          </div>
          <div class="row actions">
            <button class="btn small primary" @click="copy(remind, 'one')">{{ copied === "one" ? $t("common.copied") : $t("classPage.copyRemind") }}</button>
            <button class="btn small ghost" @click="copy(remindAll, 'all')">{{ copied === "all" ? $t("common.copied") : $t("classPage.copyAll") }}</button>
            <button class="btn small ghost" @click="exportXlsx"><Icon name="file" /> {{ $t("gradebook.export") }}</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar .btn { padding: 4px 12px; }
.body { display: flex; flex-direction: column; gap: 10px; }
.body p { margin: 0; }
.meta { display: flex; gap: 6px 14px; flex-wrap: wrap; }
.hint { color: var(--muted); font-size: var(--fs-sm); }
.late { color: var(--bad); }
.names { gap: 6px; }
.name-chip { font-size: var(--fs-sm); padding: 2px 10px; border-radius: var(--radius-full); border: 1px solid var(--line); background: var(--bg); }
.name-chip.started { border-color: var(--warn); background: var(--warn-soft); color: var(--warn); }
.actions { gap: 6px; }
</style>
