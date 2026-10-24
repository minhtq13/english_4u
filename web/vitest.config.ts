import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Unit tests for plain modules (utils, and composables that import what they use). They run in Node,
// without Nuxt: the modules under test import their dependencies explicitly instead of relying on auto-imports.
export default defineConfig({
  resolve: { alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
})
