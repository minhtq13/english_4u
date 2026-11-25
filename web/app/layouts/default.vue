<script setup lang="ts">
import type { IconName } from "~/components/Icon.vue"
const client = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const { t } = useI18n()
const { profile, myClass, role, refresh } = useProfile()

watch(() => user.value?.sub, (id) => { if (id) refresh() }, { immediate: true })
// One session per account, 10 minutes without activity, locked accounts (see useSessionGuard).
const session = useSessionGuard()

interface NavGroup { id: string; title: string; links: { to: string; label: string; icon: IconName }[] }
const ICONS: Record<string, IconName> = {
  roadmap: "home", review: "layers", notifications: "bell", progress: "chart", myClasses: "graduationCap", students: "users", grading: "pencil", lessons: "book", newLesson: "plus", bank: "database", exams: "clipboard",
  dashboard: "grid", classes: "graduationCap", teachers: "users", users: "user", logins: "history", audit: "shield", errors: "alert",
}

// Each role only sees the menu for its own work; admins see everything. Links of one kind form a group that folds
// into a submenu; a group of one link is just a link.
const groups = computed<NavGroup[]>(() => {
  const link = (to: string, key: string) => ({ to, label: t(`nav.${key}`), icon: ICONS[key] ?? "file" })
  const student: NavGroup = { id: "study", title: t("nav.groupStudy"), links: [link("/learn", "roadmap"), link("/review", "review"), link("/notifications", "notifications"), link("/progress", "progress")] }
  const teaching: NavGroup[] = [
    { id: "classes", title: t("nav.groupClasses"), links: [link("/teacher", "myClasses"), link("/teacher/students", "students"), link("/teacher/grading", "grading")] },
    { id: "content", title: t("nav.groupContent"), links: [link("/courses", "lessons"), link("/teacher/lessons/new", "newLesson"), link("/teacher/bank", "bank"), link("/teacher/exams", "exams")] },
  ]
  const admin: NavGroup[] = [
    { id: "overview", title: t("nav.dashboard"), links: [link("/admin", "dashboard")] },
    { id: "manage", title: t("nav.groupManage"), links: [link("/admin/classes", "classes"), link("/admin/teachers", "teachers"), link("/admin/users", "users")] },
    { id: "monitor", title: t("nav.groupMonitor"), links: [link("/admin/logins", "logins"), link("/admin/audit", "audit"), link("/admin/errors", "errors")] },
  ]
  if (role.value === "admin") return [...admin, ...teaching]
  if (role.value === "teacher") return teaching
  return profile.value?.class_id ? [student] : []
})
const { forLink } = useNavBadges(role)
const badge = computed(() => {
  if (role.value === "student") return myClass.value ? t("nav.classBadge", { name: myClass.value.name }) : ""
  return role.value ? ROLE_LABEL[role.value] : ""
})

// The highlighted link is the longest one the current path starts with (so sub-pages keep their section lit).
const activeLink = computed(() =>
  groups.value
    .flatMap(g => g.links.map(l => l.to))
    .filter(to => route.path === to || route.path.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)[0])
const isActive = (to: string) => activeLink.value === to

// Submenus: a group is open or folded as the person left it (kept in this browser); the group of the page they are
// on opens by itself. Never opened or folded yet: only the group of the current page is open.
const NAV_KEY = "navOpen"
const openState = ref<Record<string, boolean>>({})
onMounted(() => { try { openState.value = JSON.parse(localStorage.getItem(NAV_KEY) ?? "{}") } catch { /* all folded */ } })
const groupOfActive = computed(() => groups.value.find(g => g.links.some(l => l.to === activeLink.value))?.id)
watch(groupOfActive, (id) => { if (id && openState.value[id] !== true) setGroup(id, true) }, { immediate: true })
function setGroup(id: string, on: boolean) {
  openState.value = { ...openState.value, [id]: on }
  try { localStorage.setItem(NAV_KEY, JSON.stringify(openState.value)) } catch { /* not kept */ }
}
const isGroupOpen = (g: NavGroup) => openState.value[g.id] ?? g.id === groupOfActive.value
/** The counts of a folded group, added up, so work waiting is never hidden. */
const groupCount = (g: NavGroup) => g.links.reduce((n, l) => n + (forLink(l.to) || 0), 0)

// On small screens the sidebar is a drawer: Escape closes it and gives focus back to the menu button.
const open = ref(false)
const menuBtn = ref<HTMLButtonElement | null>(null)
watch(() => route.fullPath, () => { open.value = false })
function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || !open.value) return
  open.value = false
  menuBtn.value?.focus()
}
onMounted(() => document.addEventListener("keydown", onKey))
onBeforeUnmount(() => document.removeEventListener("keydown", onKey))

async function logout() {
  await client.auth.signOut()
  profile.value = null
  myClass.value = null
  await navigateTo("/login")
}
const displayName = computed(() => profile.value ? personName(profile.value) : "")
</script>

<template>
  <div :class="{ shell: user }">
    <a href="#main" class="skip-link">{{ $t("nav.skipToContent") }}</a>
    <template v-if="user">
      <header class="mobilebar">
        <button ref="menuBtn" class="menu-btn" :aria-expanded="open" aria-controls="sidebar" :aria-label="$t('nav.openMenu')" @click="open = !open">
          <Icon name="menu" size="22" />
        </button>
        <NuxtLink :to="homeFor(role)" class="brand" aria-label="English 4U"><BrandLogo /></NuxtLink>
        <span v-if="badge" class="role">{{ badge }}</span>
        <NotificationBell v-if="role === 'student' && myClass" class="bell-mobile" />
      </header>
      <div v-if="open" class="backdrop" @click="open = false" />

      <aside id="sidebar" class="sidebar" :class="{ open }">
        <div class="side-head">
          <NuxtLink :to="homeFor(role)" class="brand" aria-label="English 4U"><BrandLogo /></NuxtLink>
          <span v-if="badge" class="role">{{ badge }}</span>
          <NotificationBell v-if="role === 'student' && myClass" class="bell-side" />
        </div>
        <nav class="side-nav" :aria-label="$t('nav.mainMenu')">
          <template v-for="g in groups" :key="g.id">
            <NuxtLink v-if="g.links.length === 1" :to="g.links[0]!.to" class="nav-link top" :class="{ active: isActive(g.links[0]!.to) }">
              <Icon :name="g.links[0]!.icon" size="18" />
              <span class="label">{{ g.links[0]!.label }}</span>
            </NuxtLink>
            <div v-else class="group">
              <button
                type="button" class="group-title" :aria-expanded="isGroupOpen(g)" :aria-controls="`nav-${g.id}`"
                @click="setGroup(g.id, !isGroupOpen(g))"
              >
                <Icon :name="isGroupOpen(g) ? 'chevronDown' : 'chevronRight'" size="14" />
                <span class="label">{{ g.title }}</span>
                <span v-if="!isGroupOpen(g) && groupCount(g)" class="count" :aria-label="$t('nav.waitingCount', groupCount(g))">{{ groupCount(g) }}</span>
              </button>
              <div v-show="isGroupOpen(g)" :id="`nav-${g.id}`" class="sub">
                <NuxtLink v-for="l in g.links" :key="l.to" :to="l.to" class="nav-link" :class="{ active: isActive(l.to) }">
                  <Icon :name="l.icon" size="18" />
                  <span class="label">{{ l.label }}</span>
                  <span v-if="forLink(l.to)" class="count" :aria-label="$t(l.to === '/review' ? 'nav.dueCount' : l.to === '/notifications' ? 'nav.unreadCount' : 'nav.waitingCount', forLink(l.to))">{{ forLink(l.to) }}</span>
                </NuxtLink>
              </div>
            </div>
          </template>
        </nav>
        <div class="me">
          <NuxtLink to="/account" class="who" :title="$t('nav.accountTitle')">
            <img v-if="profile?.avatar_url" :src="profile.avatar_url" alt="" class="avatar" referrerpolicy="no-referrer">
            <span v-else class="avatar initial" aria-hidden="true">{{ displayName.slice(0, 1).toUpperCase() }}</span>
            <span class="who-text">
              <span class="name">{{ displayName }}</span>
              <span class="small muted">{{ $t("nav.account") }}</span>
            </span>
          </NuxtLink>
          <div class="me-actions">
            <span class="prefs"><LangSwitch /><ThemeSwitch /></span>
            <button class="btn ghost small logout" @click="logout"><Icon name="logOut" size="16" />{{ $t("nav.logout") }}</button>
          </div>
        </div>
      </aside>
    </template>
    <main id="main" tabindex="-1" class="container" :class="{ wide: /^\/(admin|teacher|courses)/.test($route.path) }">
      <slot />
    </main>
    <ScrollTop v-if="user" />
    <StudentTabs v-if="user && role === 'student' && myClass" />
    <BadgePopup v-if="user && role === 'student'" />
    <ToastHost />
    <PwaUpdate />
    <SessionEndedDialog v-if="session.ended.value" :reason="session.ended.value" @close="session.signInAgain" />
  </div>
</template>

<style scoped>
#main:focus { outline: none; }
.brand { font-weight: var(--fw-bold); color: var(--text); text-decoration: none; font-size: 1.1rem; }
.role { font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--accent); background: var(--accent-soft); padding: 2px 10px; border-radius: var(--radius-full); white-space: nowrap; }

.sidebar { position: fixed; inset: 0 auto 0 0; width: 248px; background: var(--card); border-right: 1px solid var(--line);
  display: flex; flex-direction: column; z-index: var(--z-nav); }
.side-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); padding: 20px var(--space-lg) var(--space-md) 20px; }
.side-nav { flex: 1; overflow-y: auto; padding: var(--space-xs) var(--space-md) var(--space-md); }
.group { margin-top: var(--space-md); }
.group-title { display: flex; align-items: center; gap: 6px; width: 100%; border: 0; background: none; cursor: pointer; text-align: left; font: inherit;
  font-size: var(--fs-xs); font-weight: var(--fw-bold); letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
  padding: 6px var(--space-md); border-radius: var(--radius-sm); }
.group-title:hover { color: var(--text); }
.group-title .label { flex: 1; min-width: 0; }
.sub { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; }
.nav-link.top { margin-bottom: var(--space-xs); }
.nav-link { display: flex; align-items: center; gap: var(--space-md); padding: 9px var(--space-md); border-radius: var(--radius-md); color: var(--text);
  text-decoration: none; font-weight: var(--fw-medium); transition: background-color var(--transition-fast), color var(--transition-fast); }
.nav-link :deep(svg) { color: var(--muted); transition: color var(--transition-fast); }
.nav-link:hover { background: var(--bg); }
.nav-link:hover :deep(svg) { color: var(--text); }
.nav-link .label { flex: 1; min-width: 0; }
.nav-link.active { background: var(--accent-soft); color: var(--accent); font-weight: var(--fw-semibold); }
.nav-link.active :deep(svg) { color: var(--accent); }
.count { background: var(--orange); color: var(--card); border-radius: var(--radius-full); font-size: var(--fs-xs); font-weight: var(--fw-bold);
  padding: 1px 8px; letter-spacing: 0; font-variant-numeric: tabular-nums; }

.me { display: flex; flex-direction: column; gap: 10px; margin: var(--space-sm) var(--space-md) var(--space-md); padding: var(--space-md);
  border-radius: var(--radius-lg); background: var(--bg); }
.who { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 6px; margin: -6px; border-radius: var(--radius-md); text-decoration: none; color: var(--text); }
.who:hover, .who.router-link-active { background: var(--accent-soft); }
.avatar { width: 36px; height: 36px; border-radius: 50%; flex: none; }
.initial { display: grid; place-items: center; background: var(--accent); color: var(--on-accent); font-weight: var(--fw-bold); font-size: var(--fs-sm); }
.who-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.name { font-size: var(--fs-sm); font-weight: var(--fw-semibold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.me-actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); flex-wrap: wrap; }
.prefs { display: flex; align-items: center; gap: 6px; }
.logout { display: inline-flex; align-items: center; gap: 6px; }

.mobilebar { display: none; }
.bell-mobile { margin-left: auto; }
.backdrop { display: none; }
.shell .container { margin-left: max(248px, calc(248px + (100vw - 248px - 800px) / 2)); margin-right: auto; }
.shell .container.wide { max-width: 1180px; margin-left: max(248px, calc(248px + (100vw - 248px - 1180px) / 2)); }
.container.wide { max-width: 1180px; }

@media (min-width: 901px) { .bell-mobile { display: none; } }
@media (max-width: 900px) {
  .bell-side { display: none; }
  .mobilebar { display: flex; align-items: center; gap: 10px; position: sticky; top: 0; z-index: calc(var(--z-nav) - 2);
    background: color-mix(in srgb, var(--card) 88%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line); padding: var(--space-sm) var(--space-lg); }
  .menu-btn { background: none; border: 0; color: var(--text); width: 40px; height: 40px; margin: -4px 0 -4px -10px; border-radius: var(--radius-md);
    cursor: pointer; display: grid; place-items: center; }
  .menu-btn:hover { background: var(--bg); }
  /* Hidden off-screen and out of the Tab order while closed; visibility switches after the slide-out ends. */
  .sidebar { transform: translateX(-100%); visibility: hidden; transition: transform .2s ease, visibility 0s .2s; box-shadow: var(--shadow-lg); }
  .sidebar.open { transform: none; visibility: visible; transition: transform .2s ease; }
  .backdrop { display: block; position: fixed; inset: 0; background: var(--overlay); z-index: calc(var(--z-nav) - 1); }
  .shell .container, .shell .container.wide { margin-left: auto; margin-right: auto; }
}
</style>
