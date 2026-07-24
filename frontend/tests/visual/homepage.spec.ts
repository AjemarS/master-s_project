import { test, expect } from "@playwright/test";

test.describe("Visual Regression — Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ua");
  });

  test("homepage full page matches baseline", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /побутова/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("footer")).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("homepage-full.png", { fullPage: true });
  });

  test("homepage hero viewport matches baseline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(
      page.getByRole("heading", { name: /побутова/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("homepage-hero.png");
  });
});
