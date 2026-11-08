<script setup lang="ts">
// Bottom tab bar for students on a phone: roadmap, progress, account. Hidden on wide screens (the sidebar is there)
// and while working on a lesson (its own bar with the Submit button sits at the bottom).
const route = useRoute()
const hidden = computed(() => route.path.startsWith("/lessons/"))
const tabs = [
  { to: "/", icon: "home", key: "roadmap" },
  { to: "/review", icon: "clock", key: "review" },
  { to: "/progress", icon: "chart", key: "progress" },
  { to: "/account", icon: "user", key: "account" },
] as const
const isActive = (to: string) => (to === "/" ? route.path === "/" : route.path === to || route.path.startsWith(`${to}/`))
</script>

<template>
  <nav v-if="!hidden" class="student-tabs savebar" :aria-label="$t('nav.mainMenu')">
    <NuxtLink v-for="t in tabs" :key="t.to" :to="t.to" class="tab" :class="{ active: isActive(t.to) }" :aria-current="isActive(t.to) ? 'page' : undefined">
      <Icon :name="t.icon" size="22" />
      <span>{{ $t(`nav.${t.key}`) }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.student-tabs { display: none; }
@media (max-width: 900px) {
  .student-tabs { display: grid; grid-template-columns: repeat(4, 1fr); position: fixed; left: 0; right: 0; bottom: 0; z-index: 22;
    background: var(--card); border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom); }
  .tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 56px; padding: 6px 4px;
    color: var(--muted); text-decoration: none; font-size: .75rem; font-weight: 600; }
  .tab.active { color: var(--accent); }
  .tab:focus-visible { outline-offset: -3px; }
}
@media print { .student-tabs { display: none; } }
</style>

<style>
@media (max-width: 900px) {
  body:has(.student-tabs) .container { padding-bottom: 88px; }
  body:has(.student-tabs) .pwa-bar { bottom: 68px; }
}
</style>
