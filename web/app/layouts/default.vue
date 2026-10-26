<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const { t } = useI18n()
const { profile, myClass, role, refresh } = useProfile()

watch(() => user.value?.sub, (id) => { if (id) refresh() }, { immediate: true })
// One session per account, 10 minutes without activity, locked accounts (see useSessionGuard).
const session = useSessionGuard()

interface NavGroup { title: string; links: { to: string; label: string }[] }

// Each role only sees the menu for its own work; admins see everything.
const groups = computed<NavGroup[]>(() => {
  const link = (to: string, key: string) => ({ to, label: t(`nav.${key}`) })
  const student = { title: t("nav.groupStudy"), links: [link("/", "roadmap"), link("/progress", "progress")] }
  const teacher = {
    title: t("nav.groupTeach"),
    links: [link("/teacher", "myClasses"), link("/teacher/students", "students"), link("/teacher/grading", "grading"),
      link("/courses", "lessons"), link("/teacher/lessons/new", "newLesson"), link("/teacher/bank", "bank")],
  }
  const admin = {
    title: t("nav.groupAdmin"),
    links: [link("/admin", "dashboard"), link("/admin/classes", "classes"), link("/admin/teachers", "teachers"), link("/admin/users", "users")],
  }
  if (role.value === "admin") return [admin, teacher]
  if (role.value === "teacher") return [teacher]
  return profile.value?.class_id ? [student] : []
})
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
const displayName = computed(() => profile.value?.full_name || (profile.value ? loginOf(profile.value) : ""))
</script>

<template>
  <div :class="{ shell: user }">
    <a href="#main" class="skip-link">{{ $t("nav.skipToContent") }}</a>
    <template v-if="user">
      <header class="mobilebar">
        <button ref="menuBtn" class="menu-btn" :aria-expanded="open" aria-controls="sidebar" :aria-label="$t('nav.openMenu')" @click="open = !open">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        </button>
        <NuxtLink :to="homeFor(role)" class="brand">Grammar</NuxtLink>
        <span v-if="badge" class="role">{{ badge }}</span>
      </header>
      <div v-if="open" class="backdrop" @click="open = false" />

      <aside id="sidebar" class="sidebar" :class="{ open }">
        <div class="side-head">
          <NuxtLink :to="homeFor(role)" class="brand">Grammar</NuxtLink>
          <span v-if="badge" class="role">{{ badge }}</span>
        </div>
        <nav class="side-nav" :aria-label="$t('nav.mainMenu')">
          <div v-for="g in groups" :key="g.title" class="group">
            <div class="group-title">{{ g.title }}</div>
            <NuxtLink v-for="l in g.links" :key="l.to" :to="l.to" class="nav-link" :class="{ active: isActive(l.to) }">
              {{ l.label }}
            </NuxtLink>
          </div>
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
            <button class="btn ghost small" @click="logout">{{ $t("nav.logout") }}</button>
          </div>
        </div>
      </aside>
    </template>
    <main id="main" tabindex="-1" class="container" :class="{ wide: /^\/(admin|teacher|courses)/.test($route.path) }">
      <slot />
    </main>
    <ScrollTop v-if="user" />
    <SessionEndedDialog v-if="session.ended.value" :reason="session.ended.value" @close="session.signInAgain" />
  </div>
</template>

<style scoped>
#main:focus { outline: none; }
.brand { font-weight: 700; color: var(--text); text-decoration: none; font-size: 1.1rem; }
.role { font-size: .8rem; font-weight: 600; color: var(--accent); background: var(--accent-soft); padding: 2px 10px; border-radius: 999px; white-space: nowrap; }

.sidebar { position: fixed; inset: 0 auto 0 0; width: 232px; background: var(--card); border-right: 1px solid var(--line);
  display: flex; flex-direction: column; z-index: 30; }
.side-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 18px 16px 12px; }
.side-nav { flex: 1; overflow-y: auto; padding: 4px 10px; }
.group + .group { margin-top: 14px; }
.group-title { font-size: .72rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 6px 10px; }
.nav-link { display: block; padding: 8px 10px; border-radius: 8px; color: var(--text); text-decoration: none; font-weight: 500; }
.nav-link:hover { background: var(--bg); }
.nav-link.active { background: var(--accent-soft); color: var(--accent); }

.me { display: flex; flex-direction: column; gap: 10px; padding: 12px 12px 14px; border-top: 1px solid var(--line); }
.who { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 6px; margin: -6px; border-radius: 8px; text-decoration: none; color: var(--text); }
.who:hover, .who.router-link-active { background: var(--accent-soft); }
.avatar { width: 32px; height: 32px; border-radius: 50%; flex: none; }
.initial { display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); font-weight: 700; font-size: .9rem; }
.who-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.name { font-size: .9rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.me-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.prefs { display: flex; align-items: center; gap: 6px; }

.mobilebar { display: none; }
.backdrop { display: none; }
.shell .container { margin-left: max(232px, calc(232px + (100vw - 232px - 800px) / 2)); margin-right: auto; }
.shell .container.wide { max-width: 1180px; margin-left: max(232px, calc(232px + (100vw - 232px - 1180px) / 2)); }
.container.wide { max-width: 1180px; }

@media (max-width: 900px) {
  .mobilebar { display: flex; align-items: center; gap: 10px; position: sticky; top: 0; z-index: 20;
    background: var(--card); border-bottom: 1px solid var(--line); padding: 8px 16px; }
  .menu-btn { background: none; border: 0; color: var(--text); width: 40px; height: 40px; margin: -4px 0 -4px -10px; border-radius: 8px;
    cursor: pointer; display: grid; place-items: center; }
  .menu-btn:hover { background: var(--bg); }
  /* Hidden off-screen and out of the Tab order while closed; visibility switches after the slide-out ends. */
  .sidebar { transform: translateX(-100%); visibility: hidden; transition: transform .2s ease, visibility 0s .2s; box-shadow: 0 0 24px var(--shadow); }
  .sidebar.open { transform: none; visibility: visible; transition: transform .2s ease; }
  .backdrop { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, .35); z-index: 25; }
  .shell .container, .shell .container.wide { margin-left: auto; margin-right: auto; }
}
</style>
