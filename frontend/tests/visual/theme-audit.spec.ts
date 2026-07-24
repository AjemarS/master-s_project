import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/ua", name: "homepage" },
  { path: "/ua/products", name: "products" },
  { path: "/ua/admin/summary", name: "admin-summary" },
];

test.describe("Theme Audit — Dark & Light Mode", () => {
  for (const { path, name } of PAGES) {
    test(`light mode: ${name}`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() =>
        document.documentElement.classList.remove("dark"),
      );
      await page.waitForTimeout(500);
      await expect(page.locator("footer, main")).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `tests/visual/screenshots/light-${name}.png`,
        fullPage: true,
      });
    });

    test(`dark mode: ${name}`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() =>
        document.documentElement.classList.add("dark"),
      );
      await page.waitForTimeout(500);
      await expect(page.locator("footer, main")).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `tests/visual/screenshots/dark-${name}.png`,
        fullPage: true,
      });
    });
  }
});
