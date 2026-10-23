<script setup lang="ts">
// Two-button language switch (Tiếng Việt / English).
const { locale, setLang } = useLang()
</script>

<template>
  <span class="lang" role="group" :aria-label="$t('lang.label')">
    <button type="button" :class="{ on: locale === 'vi' }" :aria-pressed="locale === 'vi'" @click="setLang('vi')">VI</button>
    <button type="button" :class="{ on: locale === 'en' }" :aria-pressed="locale === 'en'" @click="setLang('en')">EN</button>
  </span>
</template>

<style scoped>
.lang { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; flex: none; }
.lang button { border: 0; background: none; color: var(--muted); font: inherit; font-size: .75rem; font-weight: 600; padding: 3px 9px; cursor: pointer; }
.lang button.on { background: var(--accent); color: var(--on-accent); }
</style>
