<script setup lang="ts">
// A bell with the number of unread notifications, linking to /notifications. Shown to students.
const { unread, keepFresh, load } = useNotifications()
keepFresh()
const route = useRoute()
// Opening the list marks nothing by itself; coming back from it refreshes the count.
watch(() => route.path, () => { if (route.path !== "/notifications") load() })
</script>

<template>
  <NuxtLink to="/notifications" class="bell" :aria-label="unread ? $t('notifications.bellUnread', unread) : $t('notifications.title')" :title="$t('notifications.title')">
    <Icon name="bell" size="20" />
    <span v-if="unread" class="dot" aria-hidden="true">{{ unread > 9 ? "9+" : unread }}</span>
  </NuxtLink>
</template>

<style scoped>
.bell { position: relative; display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 8px; color: var(--text); text-decoration: none; }
.bell:hover, .bell.router-link-active { background: var(--accent-soft); color: var(--accent); }
.dot { position: absolute; top: 2px; right: 0; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--bad); color: var(--card);
  font-size: .7rem; font-weight: 700; display: grid; place-items: center; font-variant-numeric: tabular-nums; }
</style>
