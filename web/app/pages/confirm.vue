<script setup lang="ts">
definePageMeta({ layout: false })

const user = useSupabaseUser()
const redirect = useSupabaseCookieRedirect()

watch(user, (u) => {
  if (u) navigateTo(redirect.pluck() || "/")
}, { immediate: true })
</script>

<template>
  <main class="container">
    <p class="muted">Đang đăng nhập…</p>
  </main>
</template>
