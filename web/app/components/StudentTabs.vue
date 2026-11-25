<script setup lang="ts">
// Bottom tab bar for students on a phone: roadmap, progress, account. Hidden on wide screens (the sidebar is there)
// and while working on a lesson (its own bar with the Submit button sits at the bottom).
const route = useRoute()
const hidden = computed(() => route.path.startsWith("/lessons/"))
const tabs = [
  { to: "/learn", icon: "home", key: "roadmap" },
  { to: "/review", icon: "layers", key: "review" },
  { to: "/progress", icon: "chart", key: "progress" },
  { to: "/account", icon: "user", key: "account" },
] as const
const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)
</script>

<template>
  <nav v-if="!hidden" class="student-tabs savebar" :aria-label="$t('nav.mainMenu')">
    <NuxtLink v-for="t in tabs" :key="t.to" :to="t.to" class="tab" :class="{ active: isActive(t.to) }" :aria-current="isActive(t.to) ? 'page' : undefined">
      <span class="pill"><Icon :name="t.icon" size="22" /></span>
      <span>{{ $t(`nav.${t.key}`) }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.student-tabs { display: none; }
@media (max-width: 900px) {
  .student-tabs { display: grid; grid-template-columns: repeat(4, 1fr); position: fixed; left: 0; right: 0; bottom: 0; z-index: calc(var(--z-nav) - 3);
    background: color-mix(in srgb, var(--card) 92%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom); }
  .tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 60px; padding: 6px 4px;
    color: var(--muted); text-decoration: none; font-size: var(--fs-xs); font-weight: var(--fw-semibold); }
  .pill { display: grid; place-items: center; width: 52px; height: 30px; border-radius: var(--radius-full); transition: background-color var(--transition-fast); }
  .tab.active { color: var(--accent); }
  .tab.active .pill { background: var(--accent-soft); }
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
