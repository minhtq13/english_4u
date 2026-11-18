<script setup lang="ts">
// "New badge" popup: shown once for the badges the database has just awarded.
const { fresh } = useBadges()
const dialog = ref<HTMLElement | null>(null)
const open = computed(() => fresh.value.length > 0)
const close = () => { fresh.value = [] }
useDialog(dialog, close)
const titleId = useId()
</script>

<template>
  <div v-if="open" class="overlay" @click.self="close">
    <div ref="dialog" class="dialog card" role="dialog" tabindex="-1" aria-modal="true" :aria-labelledby="titleId">
      <ConfettiBurst />
      <h2 :id="titleId">{{ $t("badges.newTitle", fresh.length) }}</h2>
      <div v-for="k in fresh" :key="k" class="one">
        <span class="ico"><Icon :name="BADGE_ICONS[k] ?? 'award'" size="30" /></span>
        <b>{{ $t(`badges.${k}.name`) }}</b>
        <span class="muted small">{{ $t(`badges.${k}.how`) }}</span>
      </div>
      <button class="btn primary" @click="close">{{ $t("common.close") }}</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 55; background: rgba(0, 0, 0, .45); display: grid; place-items: center; padding: var(--space-lg); }
.dialog { max-width: 360px; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-md); margin: 0; }
.one { display: flex; flex-direction: column; align-items: center; gap: var(--space-xs); }
.ico { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--purple-soft); color: var(--purple); }
h2 { margin: 0; }
</style>
