<script setup lang="ts">
import type { Theme } from "~/composables/useTheme"
import type { IconName } from "~/components/Icon.vue"

// Three-button theme switch (light / dark / like the device), beside LangSwitch.
const { theme, setTheme } = useTheme()
const OPTIONS: { value: Theme; icon: IconName }[] = [{ value: "light", icon: "sun" }, { value: "dark", icon: "moon" }, { value: "system", icon: "monitor" }]
</script>

<template>
  <span class="theme" role="group" :aria-label="$t('theme.label')">
    <button
      v-for="o in OPTIONS" :key="o.value" type="button" :class="{ on: theme === o.value }" :aria-pressed="theme === o.value"
      :title="$t(`theme.${o.value}`)" @click="setTheme(o.value)"
    ><Icon :name="o.icon" size="14" :label="$t(`theme.${o.value}`)" /></button>
  </span>
</template>

<style scoped>
.theme { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; flex: none; }
.theme button { border: 0; background: none; color: var(--muted); padding: 4px 8px; cursor: pointer; display: grid; place-items: center; }
.theme button:hover:not(.on) { color: var(--text); }
.theme button.on { background: var(--accent); color: var(--on-accent); }
</style>
