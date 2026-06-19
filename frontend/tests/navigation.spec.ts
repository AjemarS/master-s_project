import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("header logo links to home", async ({ page }) => {
    await page.goto("/products");
    await page.locator("header").getByText("Store").click();
    await expect(page).toHaveURL("/");
  });

  test("header Products nav link navigates to /products", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Products" }).first().waitFor({ state: "visible" });
    await page.getByRole("link", { name: "Products" }).first().click();
    await expect(page).toHaveURL(/products/);
  });

  test("home page Browse Products CTA points to /products", async ({
    page,
  }) => {
    await page.goto("/");
    const href = await page
      .getByRole("link", { name: "Browse Products" })
      .getAttribute("href");
    expect(href).toMatch(/products/);
  });
});

test.describe("Route Protection", () => {
  const adminRoutes = ["/admin", "/admin/summary", "/admin/products", "/admin/users"];
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
    await expect(page.locator("#name")).toBeVisible();
  });

  test("products page is accessible without auth", async ({ page }) => {
    await page.goto("/products");
    await expect(page).toHaveURL(/products/);
    await expect(
      page.getByRole("heading", { name: "Products" })
    ).toBeVisible();
  });

  test("home page is accessible without auth", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Your One-Stop Shop for" })
    ).toBeVisible();
  });

  test("mfa page is accessible without auth", async ({ page }) => {
    await page.goto("/mfa");
    await expect(page).toHaveURL(/mfa/);
    await expect(
      page.getByRole("heading", { name: /two-factor/i })
    ).toBeVisible();
  });
});
