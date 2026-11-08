import { defineConfig } from "@playwright/test"

// Browser smoke tests against a running app (default: the dev server on http://localhost:3000; override with
// E2E_BASE_URL). They sign in with the test accounts from the gitignored .env.test, and never submit work.
// Each account has one session at a time, so the tests run one after another.
// Uses the Chrome installed on the machine (channel "chrome"), so no browser is downloaded: set E2E_BROWSER=chromium
// to use Playwright's own build instead (npx playwright install chromium).
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  reporter: [["list"]],
  // A step that waits for something that never comes fails in seconds, not after the whole test timeout.
  expect: { timeout: 8_000 },
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: process.env.E2E_BROWSER === "chromium" ? undefined : "chrome",
    trace: "retain-on-failure",
  },
})
