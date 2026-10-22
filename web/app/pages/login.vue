<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: "Đăng nhập — Grammar B1→B2" })

const client = useSupabaseClient()
const user = useSupabaseUser()
const pending = ref(false)
const error = ref("")

watch(user, (u) => { if (u) navigateTo("/") }, { immediate: true })

async function signIn() {
  pending.value = true
  error.value = ""
  const { error: e } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/confirm` },
  })
  if (e) {
    error.value = `Không mở được trang đăng nhập Google: ${e.message}`
    pending.value = false
  }
}
</script>

<template>
  <main class="login">
    <div class="card panel">
      <p class="eyebrow">B1 → B2 · 30 phút mỗi ngày</p>
      <h1>Grammar B1→B2</h1>
      <p class="muted">
        16 bài ngữ pháp từ mệnh đề quan hệ đến bài viết tổng hợp. Bài tập được chấm ngay,
        bài viết được giáo viên nhận xét, lỗi lặp lại được theo dõi qua từng buổi.
      </p>
      <button class="btn primary google" :disabled="pending" @click="signIn">
        {{ pending ? "Đang chuyển tới Google…" : "Đăng nhập bằng Google" }}
      </button>
      <p v-if="error" class="fb no">{{ error }}</p>
    </div>
  </main>
</template>

<style scoped>
.login { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
.panel { max-width: 440px; width: 100%; display: flex; flex-direction: column; gap: 12px; padding: 28px; }
.panel h1 { margin: 0; }
.panel p { margin: 0; }
.eyebrow { font-size: .78rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
.google { text-align: center; padding: 10px 16px; }
</style>
