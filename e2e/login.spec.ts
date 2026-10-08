import { test, expect } from "@playwright/test";

/**
 * Requires SMOKE_EMAIL / SMOKE_PASSWORD env when running against a real staging.
 * Skips if password not set (CI safe).
 */
test.describe("staging login", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|log in/i }).or(page.locator('button[type="submit"]'))).toBeVisible();
  });

  test("admin can sign in", async ({ page }) => {
    const email = process.env.SMOKE_EMAIL || "admin@kms.sch.ng";
    const password = process.env.SMOKE_PASSWORD;
    test.skip(!password, "Set SMOKE_PASSWORD to run authenticated E2E");

    await page.goto("/login");
    await page.locator('input[type="email"], input[name="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password!);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/dashboard|portal|platform/, { timeout: 30_000 });
    await expect(page.locator("body")).toContainText(/dashboard|welcome|fees|students/i);
  });
});
