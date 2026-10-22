import { test, expect } from "@playwright/test";

// The smallest phone width still in use (iPhone SE): nothing may scroll sideways
test.use({ viewport: { width: 320, height: 640 } });

const pages = ["/", "/products", "/checkout", "/sign-in", "/sign-up", "/about", "/faq", "/en/products"];

test.describe("Mobile layout", () => {
  for (const path of pages) {
    test(`${path} has no horizontal scroll at 320px`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("load");
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(320);
    });
  }

  test("language and theme are in the mobile menu", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("button", { name: /меню/i }).click();
    await expect(page.getByRole("link", { name: "English" })).toBeVisible();
    await expect(page.getByText("Тема", { exact: true })).toBeVisible();
  });
});
