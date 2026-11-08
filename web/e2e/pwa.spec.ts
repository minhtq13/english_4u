import { expect, test } from "@playwright/test"
import { signIn } from "./helpers"

// The service worker exists only in a production build (npm run build && npm run preview -- --port 3001), so these
// run only when E2E_PWA=1 and E2E_BASE_URL point at it.
test.skip(!process.env.E2E_PWA, "needs a production build: set E2E_PWA=1 and E2E_BASE_URL")

test("manifest is served and the service worker takes control", async ({ page, request }) => {
  const res = await request.get("/manifest.webmanifest")
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.display).toBe("standalone")
  expect(manifest.icons.length).toBeGreaterThan(0)
  await page.goto("/login")
  const active = await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active)
  expect(active).toBe(true)
})

test("going offline shows the offline notice, coming back hides it", async ({ page, context }) => {
  await signIn(page, "STUDENT")
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await expect(page.locator(".pwa-bar[role=status]")).toBeVisible()
  await context.setOffline(false)
  await expect(page.locator(".pwa-bar")).toHaveCount(0)
})
