<script setup lang="ts">
import { parseCardId } from "~/utils/srs"

// "Ôn tập hôm nay": the flashcards a student has studied that are due again, one at a time (spaced repetition).
definePageMeta({ roles: ["student"] })
const { t } = useI18n()
useHead({ title: () => t("review.pageTitle") })

const { getLesson } = useCourse()
const cards = useCardReviews()

interface Deck { card: string; front: string; back: string; lesson: string }
const deck = shallowRef<Deck[]>([])
const index = ref(0)
const flipped = ref(false)
const loaded = ref(false)
const saved = ref(0)
const failed = ref(false)

onMounted(async () => {
  const due = await cards.due(30)
  const lessons = new Map<string, Awaited<ReturnType<typeof getLesson>>>()
  for (const id of new Set(due.map(d => parseCardId(d.card)?.lessonId).filter(Boolean) as string[])) lessons.set(id, await getLesson(id))
  deck.value = due.flatMap((d): Deck[] => {
    const p = parseCardId(d.card)
    const lesson = p && lessons.get(p.lessonId)
    const section = lesson?.sections[p!.section]
    const pair = section?.type === "cards" ? section.items[p!.index] : undefined
    return pair && lesson ? [{ card: d.card, front: pair[0], back: pair[1], lesson: `${lesson.label} - ${lesson.title}` }] : []
  })
  loaded.value = true
})

const current = computed(() => deck.value[index.value] ?? null)
const finished = computed(() => loaded.value && index.value >= deck.value.length)
async function answer(remembered: boolean) {
  if (!current.value) return
  if (await cards.mark(current.value.card, remembered)) saved.value++
  else failed.value = true
  flipped.value = false
  index.value++
}
</script>

<template>
  <div>
    <h1>{{ $t("review.title") }}</h1>
    <p class="sub">{{ $t("review.intro") }}</p>
    <Skeleton v-if="!loaded" />
    <EmptyState v-else-if="!deck.length" icon="check" :title="$t('review.noneTitle')" :text="$t('review.none')">
      <NuxtLink to="/" class="btn small primary">{{ $t("progress.seeRoadmap") }}</NuxtLink>
    </EmptyState>
    <EmptyState v-else-if="finished" icon="check" :title="$t('review.doneTitle')" :text="$t('review.done', { n: saved })">
      <NuxtLink to="/" class="btn small primary">{{ $t("progress.seeRoadmap") }}</NuxtLink>
    </EmptyState>
    <section v-else-if="current" class="card study">
      <p class="muted small">{{ $t("review.position", { n: index + 1, total: deck.length }) }} · {{ current.lesson }}</p>
      <div class="face" :class="{ back: flipped }" aria-live="polite">
        <div class="word" v-html="flipped ? current.back : current.front" />
        <SpeakButton v-if="!flipped" :text="current.front" />
      </div>
      <div class="row actions">
        <button v-if="!flipped" class="btn primary" @click="flipped = true">{{ $t("review.show") }}</button>
        <template v-else>
          <button class="btn primary" @click="answer(true)">{{ $t("cards.remembered") }}</button>
          <button class="btn" @click="answer(false)">{{ $t("cards.notYet") }}</button>
        </template>
      </div>
      <p v-if="failed" class="fb no">{{ $t("cards.failed") }}</p>
    </section>
  </div>
</template>

<style scoped>
.study { display: flex; flex-direction: column; gap: 12px; align-items: stretch; }
.face { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 180px; padding: 20px; border-radius: 14px; background: var(--accent-soft); text-align: center; }
.face.back { background: var(--bg); border: 1px solid var(--line); }
.word { font-size: 1.5rem; font-weight: 700; }
.face.back .word { font-weight: 500; font-size: 1.2rem; }
.actions { justify-content: center; }
.actions .btn { min-height: 48px; min-width: 120px; }
</style>
