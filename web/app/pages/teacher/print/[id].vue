<script setup lang="ts">
import type { Lesson } from "~/utils/course"

// A printable A4 worksheet of a lesson (browser print → paper or PDF). ?key=1 prints the answer version.
definePageMeta({ roles: ["teacher"], layout: false })

const route = useRoute()
const { getLesson } = useCourse()
const lesson = shallowRef<Lesson | null>(await getLesson(route.params.id as string))
const { t } = useI18n()
useHead({ title: () => (lesson.value ? `${lesson.value.label} - ${lesson.value.title}` : t("lessonPage.print")) })

// Several pages link here, so "back" returns to the page the teacher came from; the course is the fallback.
const router = useRouter()
const cameFrom = computed(() => {
  const back = router.options.history.state.back
  return typeof back === "string" && back.startsWith("/") ? back : lesson.value ? `/courses/${lesson.value.courseId}` : "/courses"
})
const withKey = ref(route.query.key === "1")
const withTheory = ref(true)
const print = () => window.print()
</script>

<template>
  <div class="print-page">
    <div class="toolbar no-print">
      <BackLink :to="cameFrom" :label="$t('common.back')" />
      <label class="row inline"><input v-model="withKey" type="checkbox"> {{ $t("printPage.withKey") }}</label>
      <label class="row inline"><input v-model="withTheory" type="checkbox"> {{ $t("printPage.withTheory") }}</label>
      <button class="btn primary" @click="print"><Icon name="printer" /> {{ $t("printPage.print") }}</button>
    </div>

    <p v-if="!lesson" class="muted">{{ $t("lessonPage.notFound") }}</p>
    <LessonWorksheet v-else :lesson="lesson" :with-key="withKey" :with-theory="withTheory" />
  </div>
</template>

<style scoped>
.print-page { max-width: 820px; margin: 0 auto; padding: 16px; }
.toolbar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.toolbar :deep(.back-link) { margin: 0; }
.toolbar .inline { gap: 6px; font-size: .9rem; }
@media print {
  @page { size: A4; margin: 14mm; }
  .no-print { display: none !important; }
  .print-page { padding: 0; max-width: none; }
  :global(body) { background: #fff !important; }
}
</style>
