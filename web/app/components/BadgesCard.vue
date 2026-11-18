<script setup lang="ts">
// Every badge with its progress: earned ones in colour with the date, the rest greyed with how far the student is.
const { list, loaded, earned, load } = useBadges()
onMounted(load)
</script>

<template>
  <section v-if="loaded && list.length" class="card" :aria-label="$t('badges.title')">
    <h2>{{ $t("badges.title") }} <span class="muted small">{{ earned.length }}/{{ list.length }}</span></h2>
    <ul class="grid">
      <li v-for="b in list" :key="b.badge" class="badge-item" :class="{ on: !!b.earned_at }">
        <span class="ico"><Icon :name="BADGE_ICONS[b.badge] ?? 'award'" size="22" /></span>
        <span class="txt">
          <b>{{ $t(`badges.${b.badge}.name`) }}</b>
          <small class="muted">{{ $t(`badges.${b.badge}.how`) }}</small>
          <small v-if="b.earned_at" class="got">{{ $t("badges.earned", { date: formatDate(b.earned_at) }) }}</small>
          <StatBar v-else :value="Math.round((b.progress / b.target) * 100)" :text="`${b.progress}/${b.target}`" />
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: var(--space-md); }
.badge-item { display: flex; gap: var(--space-md); align-items: flex-start; padding: var(--space-md); border: 1px solid var(--line); border-radius: var(--radius-lg); opacity: .75; }
.badge-item.on { opacity: 1; border-color: var(--purple); background: var(--purple-soft); }
.ico { display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: 50%; background: var(--line); color: var(--muted); }
.on .ico { background: var(--purple); color: var(--card); }
.txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.got { color: var(--purple); font-weight: 600; }
</style>
