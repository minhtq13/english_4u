<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const { profile, isAdmin, refresh } = useProfile()

watch(() => user.value?.sub, () => refresh(), { immediate: true })

async function logout() {
  await client.auth.signOut()
  profile.value = null
  await navigateTo("/login")
}
</script>

<template>
  <div>
    <header v-if="user" class="topbar">
      <nav class="topbar-inner">
        <NuxtLink to="/" class="brand">Grammar B1→B2</NuxtLink>
        <div class="links">
          <NuxtLink to="/">Lộ trình</NuxtLink>
          <NuxtLink to="/progress">Tiến độ</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin">Chấm bài</NuxtLink>
        </div>
        <div class="me">
          <img v-if="profile?.avatar_url" :src="profile.avatar_url" alt="" class="avatar" referrerpolicy="no-referrer">
          <span class="name">{{ profile?.full_name || profile?.email }}</span>
          <button class="btn ghost" @click="logout">Đăng xuất</button>
        </div>
      </nav>
    </header>
    <main class="container">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.topbar { background: var(--card); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 10; }
.topbar-inner { max-width: 800px; margin: 0 auto; padding: 8px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.brand { font-weight: 700; color: var(--text); text-decoration: none; }
.links { display: flex; gap: 14px; flex: 1; }
.links a { color: var(--muted); text-decoration: none; font-weight: 500; }
.links a.router-link-exact-active, .links a:hover { color: var(--accent); }
.me { display: flex; align-items: center; gap: 8px; min-width: 0; }
.avatar { width: 28px; height: 28px; border-radius: 50%; }
.name { font-size: .9rem; color: var(--muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 560px) { .name { display: none; } }
</style>
