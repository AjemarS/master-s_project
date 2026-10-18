import { test, expect } from "@playwright/test";

const authAvailable = !!(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD);

test.describe("Visual Regression — Admin Summary", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");
  test.use({ storageState: authAvailable ? "tests/.auth/user.json" : undefined });

  test("admin dashboard matches baseline", async ({ page }) => {
    await page.goto("/ua/admin/summary");
    await expect(
      page.locator("h1").first(),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("admin-summary.png", { fullPage: true });
  });
});
