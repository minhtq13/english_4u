<script setup lang="ts">
// A card of the exam builder that can be folded to its title line. While folded it shows a one-line `summary` of what is
// inside. The contents stay mounted (v-show), so what was typed or filtered is still there when it is opened again.
// The toggle is a div with role=button, not a <button>: the builder wraps its cards in a <fieldset disabled> for people
// who may only view an exam, and a real button there would be dead, while folding is harmless for them.
const props = defineProps<{ id: string; title: string; summary?: string }>()
const { isFolded, toggle } = useFolds()
const folded = computed(() => isFolded(props.id))
const bodyId = computed(() => `fold-${props.id.replace(/[^a-z0-9]+/gi, "-")}`)
</script>

<template>
  <section class="card fold">
    <div class="fold-head">
      <div
        class="fold-title" role="button" tabindex="0" :aria-expanded="!folded" :aria-controls="bodyId"
        :title="$t(folded ? 'examPage.unfold' : 'examPage.fold')"
        @click="toggle(id)" @keydown.enter.prevent="toggle(id)" @keydown.space.prevent="toggle(id)"
      >
        <Icon :name="folded ? 'chevronRight' : 'chevronDown'" />
        <h2>{{ title }}</h2>
        <span v-if="folded && summary" class="small muted summary">{{ summary }}</span>
      </div>
      <div v-if="$slots.actions" class="fold-actions"><slot name="actions" /></div>
    </div>
    <div v-show="!folded" :id="bodyId" class="fold-body"><slot /></div>
  </section>
</template>

<style scoped>
.fold-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); flex-wrap: wrap; }
.fold-title { display: flex; align-items: center; gap: var(--space-sm); flex: 1 1 auto; min-width: 0; cursor: pointer; user-select: none;
  border-radius: var(--radius-md); }
.fold-title:hover h2 { color: var(--accent); }
.fold-title h2 { margin: 0; }
.fold-title .icon { color: var(--muted); }
.summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.fold-body { margin-top: var(--space-sm); }
</style>
