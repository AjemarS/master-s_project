import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has the correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/TechHub/);
  });

  test("renders the hero section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /побутова техніка/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /каталог/i })
    ).toBeVisible();
  });

  test("renders the why choose us section", async ({ page }) => {
    await expect(
      page.locator("[data-slot='card-title']").getByText(/безкоштовна доставка/i)
    ).toBeVisible();
    await expect(
      page.locator("[data-slot='card-title']").getByText(/безпечна оплата/i)
    ).toBeVisible();
    await expect(
      page.locator("[data-slot='card-title']").getByText(/цілодобова підтримка/i)
    ).toBeVisible();
    await expect(
      page.locator("[data-slot='card-title']").getByText(/гарантія якості/i)
    ).toBeVisible();
  });

  test("renders the CTA section", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /зареєструватися/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /каталог/i })
    ).toBeVisible();
  });

  test("renders the header with TechHub logo", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByText("TechHub")).toBeVisible();
  });

  test("renders the footer", async ({ page }) => {
    await expect(page.locator("footer")).toBeVisible();
  });
});
