import { test, expect } from "@playwright/test";

test.describe("Products Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products");
  });

  test("renders the page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Products" })
    ).toBeVisible();
  });

  test("renders the category filter with All option", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "All" })
    ).toBeVisible();
  });

  test("renders navigation header", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Products" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Home" })).toBeVisible();
  });

  test("renders the footer", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("header logo navigates to home from products", async ({ page }) => {
    await page.locator("header").getByText("Store").click();
    await expect(page).toHaveURL("/");
  });
});
