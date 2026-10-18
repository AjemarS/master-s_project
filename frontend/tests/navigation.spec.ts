import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("header logo links to home", async ({ page }) => {
    await page.goto("/products");
    await page.locator("header").getByRole("link", { name: /TechHub/i }).click();
    // the proxy prefixes every path with the locale
    await expect(page).toHaveURL("/ua");
  });

  // the desktop header has no products link since the July redesign; the footer catalog link does
  test("footer all-products link navigates to /products", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: "Усі товари", exact: true }).click();
    await expect(page).toHaveURL(/products/);
  });
});

test.describe("Route Protection", () => {
  const adminRoutes = ["/admin", "/admin/summary", "/admin/products", "/admin/users", "/admin/orders", "/admin/warehouses", "/admin/suppliers", "/admin/goods-receipts", "/admin/pos", "/admin/reports"];

  for (const route of adminRoutes) {
    test(`${route} redirects to home without auth`, async ({ page }) => {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/admin/);
    });
  }

  test("sign-in page is accessible without auth", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/sign-in/);
    await expect(page.locator("#email")).toBeVisible();
  });

  test("sign-up page is accessible without auth", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/sign-up/);
    await expect(page.locator("#repeatPassword")).toBeVisible();
  });

  test("products page is accessible without auth", async ({ page }) => {
    await page.goto("/products");
    await expect(page).toHaveURL(/products/);
  });

  test("home page is accessible without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /побутова техніка/i })).toBeVisible();
  });

  test("mfa page is accessible without auth", async ({ page }) => {
    await page.goto("/mfa");
    await expect(page).toHaveURL(/mfa/);
    await expect(
      page.getByRole("heading", { name: /двофакторна/i })
    ).toBeVisible();
  });

  test("forgot-password page is accessible without auth", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.locator("#fp-email")).toBeVisible();
  });

  test("reset-password page is accessible without auth", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page).toHaveURL(/reset-password/);
  });

  test("checkout page is accessible without auth", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/checkout/);
  });

  test("account page redirects without auth", async ({ page }) => {
    await page.goto("/account");
    await expect(page).not.toHaveURL(/\/account/);
  });

  test("account notifications page redirects without auth", async ({ page }) => {
    await page.goto("/account/notifications");
    await expect(page).not.toHaveURL(/account/);
  });
});
