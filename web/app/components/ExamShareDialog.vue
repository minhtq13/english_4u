<script setup lang="ts">
import type { Database } from "~/types/database.types"
import { addShare, listShares, removeShare, searchStaff, setShareEdit, staffByIds, type Person, type ShareRow } from "~/utils/examStore"

// Who an exam set is shared with: the owner (or an admin) adds other teachers and admins, chooses whether each may only
// view it or also change it, and takes people off. The database refuses anyone who is not a teacher or an admin; the
// search only lists those. Teachers cannot read each other's profiles, so names come from the staff directory.
const props = defineProps<{ examId: string; title: string }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { t } = useI18n()
const client = useSupabaseClient<Database>()
const toast = useToast()
const dialog = ref<HTMLElement | null>(null)
useDialog(dialog, () => emit("close"))
const titleId = useId()

const shares = shallowRef<ShareRow[]>([])
const people = shallowRef(new Map<string, Person>())
const loading = ref(true)
const error = ref("")
const term = ref("")
const results = shallowRef<Person[]>([])
const searching = ref(false)
const busy = ref("")

const remember = (list: Person[]) => {
  const next = new Map(people.value)
  for (const p of list) next.set(p.id, p)
  people.value = next
}
const nameOf = (id: string) => {
  const p = people.value.get(id)
  return p ? personName(p) || "?" : "?"
}
const shared = computed(() => new Set(shares.value.map(s => s.user_id)))
const candidates = computed(() => results.value.filter(p => !shared.value.has(p.id)))

onMounted(async () => {
  try {
    shares.value = await listShares(client, props.examId)
    remember(await staffByIds(client, shares.value.map(s => s.user_id)))
    results.value = await searchStaff(client, "")
    remember(results.value)
  } catch (e) {
    error.value = (e as Error).message
  }
  loading.value = false
})

let timer: ReturnType<typeof setTimeout> | undefined
let request = 0
watch(term, () => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const mine = ++request
    searching.value = true
    try {
      const found = await searchStaff(client, likeTerm(term.value))
      if (mine !== request) return
      results.value = found
      remember(found)
      error.value = ""
    } catch (e) {
      if (mine === request) error.value = (e as Error).message
    }
    if (mine === request) searching.value = false
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))

async function add(p: Person) {
  if (busy.value) return
  busy.value = p.id
  const failure = await addShare(client, props.examId, p.id, false)
  busy.value = ""
  if (failure) return toast.error(failure)
  shares.value = [...shares.value, { user_id: p.id, can_edit: false }]
  remember([p])
  toast.ok(t("examShare.added", { name: personName(p) }))
  emit("changed")
}
async function setEdit(s: ShareRow, canEdit: boolean) {
  if (busy.value) return
  busy.value = s.user_id
  const failure = await setShareEdit(client, props.examId, s.user_id, canEdit)
  busy.value = ""
  if (failure) return toast.error(failure)
  shares.value = shares.value.map(x => (x.user_id === s.user_id ? { ...x, can_edit: canEdit } : x))
  emit("changed")
}
async function remove(s: ShareRow) {
  if (busy.value) return
  busy.value = s.user_id
  const failure = await removeShare(client, props.examId, s.user_id)
  busy.value = ""
  if (failure) return toast.error(failure)
  shares.value = shares.value.filter(x => x.user_id !== s.user_id)
  toast.ok(t("examShare.removed", { name: nameOf(s.user_id) }))
  emit("changed")
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div ref="dialog" class="dialog" role="dialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId">
      <header class="bar">
        <b :id="titleId">{{ $t("examShare.title", { title }) }}</b>
        <button class="btn small" @click="emit('close')">{{ $t("common.close") }} <Icon name="x" /></button>
      </header>

      <div class="body">
        <p class="hint">{{ $t("examShare.intro") }}</p>
        <p v-if="error" class="fb no">{{ error }}</p>
        <Skeleton v-if="loading" :rows="3" :card="false" />
        <template v-else>
          <h3>{{ $t("examShare.sharedWith", { n: shares.length }) }}</h3>
          <p v-if="!shares.length" class="muted small">{{ $t("examShare.nobody") }}</p>
          <ul v-else class="people">
            <li v-for="s in shares" :key="s.user_id" data-test="share-row">
              <span class="who">
                <b>{{ nameOf(s.user_id) }}</b>
                <small class="muted">{{ people.get(s.user_id)?.username }} · {{ people.get(s.user_id) ? ROLE_LABEL[people.get(s.user_id)!.role] : "" }}</small>
              </span>
              <select
                :value="s.can_edit ? 'edit' : 'view'" :disabled="busy === s.user_id" :aria-label="$t('examShare.permission')"
                @change="setEdit(s, ($event.target as HTMLSelectElement).value === 'edit')"
              >
                <option value="view">{{ $t("examShare.view") }}</option>
                <option value="edit">{{ $t("examShare.edit") }}</option>
              </select>
              <button class="btn small ghost" :disabled="busy === s.user_id" :title="$t('examShare.remove')" :aria-label="$t('examShare.remove')" @click="remove(s)"><Icon name="x" /></button>
            </li>
          </ul>

          <h3>{{ $t("examShare.add") }}</h3>
          <input v-model="term" type="search" :placeholder="$t('examShare.search')" :aria-label="$t('examShare.search')">
          <p v-if="!candidates.length && !searching" class="muted small">{{ $t("examShare.noMatch") }}</p>
          <ul class="people">
            <li v-for="p in candidates" :key="p.id" data-test="candidate-row">
              <span class="who">
                <b>{{ personName(p) || "?" }}</b>
                <small class="muted">{{ p.username }} · {{ ROLE_LABEL[p.role] }}</small>
              </span>
              <button class="btn small primary" :disabled="!!busy" @click="add(p)">{{ $t("examShare.share") }}</button>
            </li>
          </ul>
        </template>
      </div>

      <footer class="foot">
        <button class="btn" @click="emit('close')">{{ $t("common.close") }}</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; background: rgba(10, 14, 22, .55); }
.dialog { display: flex; flex-direction: column; width: min(560px, 100%); max-height: calc(100dvh - 32px); background: var(--card);
  color: var(--text); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 12px 40px var(--shadow); }
.bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
.bar b { min-width: 0; overflow-wrap: anywhere; }
.body { padding: 14px 16px; overflow-y: auto; }
.body h3 { margin: 14px 0 6px; font-size: 1rem; }
.people { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
.people li { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; }
.who { display: flex; flex-direction: column; flex: 1; min-width: 0; overflow-wrap: anywhere; }
.people select { width: auto; flex: none; padding: 4px 8px; }
.foot { display: flex; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid var(--line); }
</style>
