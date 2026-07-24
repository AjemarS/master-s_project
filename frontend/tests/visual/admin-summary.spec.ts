import { test, expect } from "@playwright/test";

test.describe("Visual Regression — Admin Summary", () => {
  test.use({ storageState: "tests/.auth/user.json" });

  test("admin dashboard matches baseline", async ({ page }) => {
    await page.goto("/ua/admin/summary");
    await expect(
      page.locator("h1").first(),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("admin-summary.png", { fullPage: true });
  });
});
