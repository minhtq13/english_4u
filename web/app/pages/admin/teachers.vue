<script setup lang="ts">
definePageMeta({ roles: ["admin"] })
const { t } = useI18n()
useHead({ title: () => `${t("nav.teachers")} - Admin` })
</script>

<template>
  <AccountManager role="teacher" />
</template>
