import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL || "https://qing-school-staging.vercel.app";

/**
 * Optional E2E against staging. Install: npm i -D @playwright/test && npx playwright install chromium
 * Run: BASE_URL=https://qing-school-staging.vercel.app npx playwright test
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
