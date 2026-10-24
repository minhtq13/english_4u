<script setup lang="ts">
definePageMeta({ roles: ["teacher"] })

const route = useRoute()
const user = useSupabaseUser()
const { isAdmin } = useProfile()
const { listCourses, load } = useCourse()
const courseId = route.params.id as string
const [courses, firstOutline] = await Promise.all([listCourses(), load(courseId, true)])
const outline = shallowRef(firstOutline)
const info = courses.find(c => c.id === courseId)
if (!info) throw createError({ statusCode: 404, statusMessage: tr("coursesPage.notFound"), fatal: true })
useHead({ title: () => `${localName(info.name)} - Grammar` })

// Which classes each lesson is assigned to; teachers see and change their own classes.
const assign = useAssignments()
onMounted(() => assign.load(courseId))
const canEdit = (createdBy: string | null) => isAdmin.value || (!!createdBy && createdBy === user.value?.sub)

// Deleting takes two clicks and says what goes with the lesson; the outline is reloaded afterwards.
const { deleteLesson } = useLessonDelete()
const deleteArmed = ref("")
const deleting = ref("")
const deleteMsg = ref<{ ok: boolean; text: string } | null>(null)
let armTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(armTimer))
async function removeLesson(l: { id: string; label: string; title: string }) {
  if (deleteArmed.value !== l.id) {
    deleteArmed.value = l.id
    deleteMsg.value = null
    clearTimeout(armTimer)
    armTimer = setTimeout(() => { deleteArmed.value = "" }, 8000)
    return
  }
  deleteArmed.value = ""
  deleting.value = l.id
  const failure = await deleteLesson(l.id)
  if (failure) deleteMsg.value = { ok: false, text: `${l.label} - ${l.title}: ${failure}` }
  else {
    outline.value = await load(courseId, true)
    await assign.load(courseId)
    deleteMsg.value = { ok: true, text: tr("lessonDelete.deleted", { name: `${l.label} - ${l.title}` }) }
  }
  deleting.value = ""
}
const assignedTo = (id: string) => assign.classesOf(id).map(c => c.name)

// Search, kind, term, author and "given to one of my classes", paged in the browser (the outline is loaded whole).
const lessonFilter = useLessonFilter(outline, {
  match: (l, status) => (status === "given") === assign.classesOf(l.id).length > 0,
})
const statuses = computed(() => (["given", "notGiven"] as const).map(key => ({ key, label: tr(`lessonFilter.status.${key}`) })))
</script>

<template>
  <div>
    <BackLink to="/courses" :label="$t('nav.lessons')" />
    <div class="head">
      <div>
        <h1>{{ localName(info!.name) }}</h1>
        <p class="sub">{{ info!.description }}</p>
      </div>
      <NuxtLink to="/teacher/lessons/new" class="btn primary">+ {{ $t("nav.newLesson") }}</NuxtLink>
    </div>
    <p class="hint">
      <span v-html="$t('coursesPage.help')" />
    </p>
    <p v-if="assign.error.value" class="fb no">{{ assign.error.value }}</p>
    <p v-if="deleteMsg" class="fb" :class="deleteMsg.ok ? 'ok' : 'no'" role="status">{{ deleteMsg.text }}</p>
    <p v-if="!outline.order.length" class="card muted">{{ $t("classPage.noLessons") }}</p>
    <LessonFilters v-else :filter="lessonFilter" :phases="outline.phases" :statuses="statuses" />
    <p v-if="outline.order.length && !lessonFilter.total" class="card muted">{{ $t("lessonFilter.none") }}</p>
    <section v-for="phase in lessonFilter.groups" :key="phase.id" class="card">
      <h2>{{ localName(phase.name) }}</h2>
      <div v-for="l in phase.lessons" :key="l.id" class="lesson-row">
        <div class="info">
          <NuxtLink :to="`/lessons/${l.id}`"><b>{{ l.label }} - {{ l.title }}</b></NuxtLink>
          <small>
            {{ l.desc }} · {{ $t("coursesPage.autoGraded", { n: l.total }) }}
            <template v-if="!l.published"> · <em>{{ $t("coursesPage.unpublished") }}</em></template>
            <template v-if="l.createdBy"> · {{ $t("classPage.byTeacher") }}</template>
          </small>
          <LessonAssign :lesson-id="l.id" :assign="assign" />
          <p v-if="deleteArmed === l.id" class="warn small" role="alert">
            {{ $t("lessonDelete.warn", { name: `${l.label} - ${l.title}` }) }}
            <template v-if="assignedTo(l.id).length">
              {{ $t("lessonDelete.warnAssigned", { n: assignedTo(l.id).length, classes: assignedTo(l.id).join(", ") }) }}
            </template>
          </p>
        </div>
        <div class="row actions">
          <NuxtLink :to="`/lessons/${l.id}`" class="btn small">{{ $t("sectionEd.preview") }}</NuxtLink>
          <NuxtLink :to="`/teacher/print/${l.id}`" class="btn ghost small" :title="$t('coursesPage.printTitle')">{{ $t("coursesPage.print") }}</NuxtLink>
          <NuxtLink v-if="canEdit(l.createdBy)" :to="`/teacher/lessons/${l.id}`" class="btn ghost small">{{ $t("common.edit") }}</NuxtLink>
          <template v-if="canEdit(l.createdBy)">
            <button class="btn small" :class="deleteArmed === l.id ? 'danger' : 'ghost'" :disabled="deleting === l.id" @click="removeLesson(l)">
              {{ deleteArmed === l.id ? $t("lessonDelete.confirm") : $t("common.delete") }}
            </button>
            <button v-if="deleteArmed === l.id" class="btn ghost small" @click="deleteArmed = ''">{{ $t("lessonDelete.cancel") }}</button>
          </template>
        </div>
      </div>
    </section>
    <Pager v-model:page="lessonFilter.page" :page-size="lessonFilter.pageSize" :total="lessonFilter.total" />
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.lesson-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); }
.lesson-row:first-of-type { border-top: 0; }
.info { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.info a { color: var(--text); text-decoration: none; }
.info a:hover b { color: var(--accent); }
.info small { color: var(--muted); }
.actions { flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.warn { margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--bad-soft); color: var(--bad); }
.actions .btn { padding: 4px 12px; }
@media (max-width: 560px) { .lesson-row { flex-direction: column; align-items: flex-start; } }
</style>
