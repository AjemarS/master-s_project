import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has the correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Store|Products|Shop/);
  });

  test("renders the hero section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Your One-Stop Shop for" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Shop Now" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View Showcase" })
    ).toBeVisible();
  });

  test("renders the why choose us section", async ({ page }) => {
    await expect(
      page.locator("[data-slot='card-title']").getByText("Free Shipping", { exact: true })
    ).toBeVisible();
    await expect(
      page.locator("[data-slot='card-title']").getByText("Secure Checkout", { exact: true })
    ).toBeVisible();
    await expect(
      page.locator("[data-slot='card-title']").getByText("24/7 Support", { exact: true })
    ).toBeVisible();
    await expect(
      page.locator("[data-slot='card-title']").getByText("Quality Guarantee", { exact: true })
    ).toBeVisible();
  });

  test("renders the CTA section", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Sign Up Now" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse Products" })
    ).toBeVisible();
  });

  test("renders the header with navigation links", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByText("Store")).toBeVisible();
    await expect(header.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(
      header.getByRole("link", { name: "Products" })
    ).toBeVisible();
    await expect(
      header.getByRole("link", { name: "Log in" })
    ).toBeVisible();
    await expect(
      header.getByRole("link", { name: "Sign up" })
    ).toBeVisible();
  });

  test("renders the footer with links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText("All Products")).toBeVisible();
    await expect(footer.getByText("Help Center")).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Privacy", exact: true })
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Terms", exact: true })
    ).toBeVisible();
  });

  test("renders testimonials section", async ({ page }) => {
    await expect(page.getByText("What Our Customers Say")).toBeVisible();
  });

  test("Shop Now links to /products", async ({ page }) => {
    const shopNow = page.getByRole("link", { name: "Shop Now" }).first();
    await expect(shopNow).toHaveAttribute("href", /products/);
  });

  test("Sign Up Now CTA links to /sign-up (not /auth/sign-up)", async ({ page }) => {
    const signUp = page.getByRole("link", { name: "Sign Up Now" });
    await expect(signUp).toHaveAttribute("href", "/sign-up");
  });
});
