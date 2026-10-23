<script setup lang="ts">
definePageMeta({ roles: ["teacher"] })
const { t } = useI18n()
useHead({ title: () => `${t("nav.students")} - Grammar` })
</script>

<template>
  <AccountManager role="student" />
</template>
