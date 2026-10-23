<script setup lang="ts">
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => t("coursesPage.pageTitle") })

const { listCourses } = useCourse()
// RLS returns only the courses of the teacher's classes (all of them for admins).
const courses = await listCourses(true)
</script>

<template>
  <div>
    <h1>{{ $t("nav.lessons") }}</h1>
    <p class="sub">{{ $t("coursesPage.intro") }}</p>
    <p v-if="!courses.length" class="card muted">{{ $t("coursesPage.none") }}</p>
    <NuxtLink v-for="c in courses" :key="c.id" :to="`/courses/${c.id}`" class="card course-link">
      <b>{{ localName(c.name) }}</b>
      <span v-if="!c.is_published" class="badge">{{ $t("coursesPage.adminOnly") }}</span>
      <p class="muted small">{{ c.description }}</p>
    </NuxtLink>
  </div>
</template>

<style scoped>
.course-link { display: block; text-decoration: none; color: var(--text); }
.course-link:hover { border-color: var(--accent); }
.course-link p { margin: 4px 0 0; }
.course-link .badge { margin-left: 8px; }
</style>
