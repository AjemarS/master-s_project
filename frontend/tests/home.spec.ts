import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has the correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/TechHub/);
  });

  test("has the page title for screen readers", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: /побутова техніка/i })).toBeAttached();
  });

  test("renders the trust line", async ({ page }) => {
    await expect(page.getByText(/самовивіз із шоуруму безкоштовно/i)).toBeVisible();
    await expect(page.getByText(/повернення протягом 14 днів/i)).toBeVisible();
  });

  test("sign-in links keep the page language", async ({ page }) => {
    // next/link without a locale used to send English visitors to /ua/sign-in
    await page.goto("/en");
    await expect(page.locator("header").getByRole("link", { name: /^sign in$/i })).toHaveAttribute("href", "/en/sign-in");
  });

  test("renders the header with TechHub logo", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByText("TechHub")).toBeVisible();
  });

  test("renders the footer", async ({ page }) => {
    await expect(page.locator("footer")).toBeVisible();
  });
});
