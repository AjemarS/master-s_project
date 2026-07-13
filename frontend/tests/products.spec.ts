import { test, expect } from "@playwright/test";

test.describe("Products Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products");
  });

  test("renders the page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /товари/i })
    ).toBeVisible();
  });

  test("renders navigation header", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByText("TechHub")).toBeVisible();
  });

  test("renders the footer", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("header logo navigates to home from products", async ({ page }) => {
    await page.locator("header").getByRole("link", { name: /TechHub/i }).click();
    await expect(page).toHaveURL("/");
  });
});
