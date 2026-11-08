<script setup lang="ts">
// Short messages from the class's teacher. Students read the latest; a teacher (canPost) writes and deletes them.
const props = defineProps<{ classId: string; canPost?: boolean }>()
const { rows, loaded, load, post, remove } = useAnnouncements(props.classId)
const { arm, armed } = useTwoClick()
const body = ref("")
const busy = ref(false)
const error = ref("")
onMounted(() => load())

async function send() {
  busy.value = true
  error.value = (await post(body.value)) ?? ""
  busy.value = false
  if (!error.value) body.value = ""
}
async function del(id: string) {
  if (!arm(id)) return
  error.value = (await remove(id)) ?? ""
}
</script>

<template>
  <section v-if="canPost || rows.length" class="card ann" :aria-label="$t('announcements.title')">
    <h2>{{ $t("announcements.title") }}</h2>
    <form v-if="canPost" class="compose" @submit.prevent="send">
      <label class="sr-only" for="ann-body">{{ $t("announcements.title") }}</label>
      <textarea id="ann-body" v-model="body" rows="2" maxlength="1000" :placeholder="$t('announcements.placeholder')" />
      <div class="row">
        <button class="btn primary small" :disabled="busy || !body.trim()">{{ busy ? $t("common.saving") : $t("announcements.post") }}</button>
        <span class="muted small">{{ $t("announcements.hint") }}</span>
      </div>
      <p v-if="error" class="fb no">{{ error }}</p>
    </form>
    <p v-if="loaded && !rows.length && canPost" class="muted small">{{ $t("announcements.none") }}</p>
    <ul class="list">
      <li v-for="a in rows" :key="a.id">
        <p class="text">{{ a.body }}</p>
        <div class="row meta">
          <span class="muted small">{{ formatDate(a.created_at) }}</span>
          <button v-if="canPost" class="btn small" :class="armed === a.id ? 'danger' : 'ghost'" @click="del(a.id)">
            {{ armed === a.id ? $t("common.confirmAgain") : $t("common.delete") }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ann { margin-bottom: 16px; }
.compose { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.compose textarea { width: 100%; resize: vertical; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.list li { padding: 8px 0; border-top: 1px solid var(--line); }
.list li:first-child { border-top: 0; }
.text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.meta { justify-content: space-between; align-items: center; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
