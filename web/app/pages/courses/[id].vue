<script setup lang="ts">
definePageMeta({ roles: ["teacher"] })

const route = useRoute()
const user = useSupabaseUser()
const { isAdmin } = useProfile()
const { listCourses, load } = useCourse()
const courseId = route.params.id as string
const [courses, outline] = await Promise.all([listCourses(), load(courseId, true)])
const info = courses.find(c => c.id === courseId)
if (!info) throw createError({ statusCode: 404, statusMessage: tr("coursesPage.notFound"), fatal: true })
useHead({ title: () => `${localName(info.name)} - Grammar` })

// Which classes each lesson is assigned to; teachers see and change their own classes.
const assign = useAssignments()
onMounted(() => assign.load(courseId))
const canEdit = (createdBy: string | null) => isAdmin.value || (!!createdBy && createdBy === user.value?.sub)
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
    <p v-if="!outline.order.length" class="card muted">{{ $t("classPage.noLessons") }}</p>
    <section v-for="phase in outline.phases" :key="phase.id" class="card">
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
        </div>
        <div class="row actions">
          <NuxtLink :to="`/lessons/${l.id}`" class="btn small">{{ $t("sectionEd.preview") }}</NuxtLink>
          <NuxtLink :to="`/teacher/print/${l.id}`" class="btn ghost small" :title="$t('coursesPage.printTitle')">{{ $t("coursesPage.print") }}</NuxtLink>
          <NuxtLink v-if="canEdit(l.createdBy)" :to="`/teacher/lessons/${l.id}`" class="btn ghost small">{{ $t("common.edit") }}</NuxtLink>
        </div>
      </div>
    </section>
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
.actions { flex-wrap: nowrap; gap: 6px; }
.actions .btn { padding: 4px 12px; }
@media (max-width: 560px) { .lesson-row { flex-direction: column; align-items: flex-start; } }
</style>
