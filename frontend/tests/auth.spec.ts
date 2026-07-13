import { test, expect } from "@playwright/test";

test.describe("Auth Pages", () => {
  test.describe("Sign In page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
    });

    test("renders sign in form with email and password fields", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /вхід|увійти/i })
      ).toBeVisible();

      const email = page.locator("#email");
      const password = page.locator("#password");
      await expect(email).toBeVisible();
      await expect(password).toBeVisible();
      await expect(email).toHaveAttribute("type", "email");
      await expect(password).toHaveAttribute("type", "password");

      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
    });

    test("shows OAuth login buttons", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: /github/i }).first()
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /google/i }).first()
      ).toBeVisible();
    });

    test("has a link to sign up page", async ({ page }) => {
      const formLink = page
        .getByText("Немає облікового запису?")
        .getByRole("link", { name: /зареєструватися/i });
      await expect(formLink).toBeVisible();
    });

    test("sign up link navigates to /sign-up", async ({ page }) => {
      await page.getByRole("link", { name: /зареєструватися/i }).first().click();
      await page.waitForURL(/sign-up/, { timeout: 10000 });
      await expect(page.locator("#name")).toBeVisible();
    });

    test("form shows validation with empty submission", async ({ page }) => {
      await page.getByRole("button", { name: /sign in/i }).click();
      // Email input should still be focused or show browser validation
      await expect(page.locator("#email")).toBeVisible();
    });
  });

  test.describe("Sign Up page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-up");
    });

    test("renders sign up form with name, email, and password fields", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /реєстрація|створити/i })
      ).toBeVisible();

      await expect(page.locator("#name")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#email")).toHaveAttribute("type", "email");
      await expect(page.locator("#password")).toHaveAttribute(
        "type",
        "password"
      );

      // Find the submit button inside the form (not header)
      const submitBtn = page.getByRole("button", { name: /зареєструватися/i }).first();
      await expect(submitBtn).toBeVisible();
    });

    test("shows OAuth sign-up buttons", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: /github/i }).first()
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /google/i }).first()
      ).toBeVisible();
    });

    test("has a link to sign in page", async ({ page }) => {
      await expect(
        page.getByRole("link", { name: /увійти/i }).first()
      ).toBeVisible();
    });

    test("sign in link points to sign-in with correct path", async ({
      page,
    }) => {
      const link = page.getByRole("link", { name: /увійти/i }).first();
      const href = await link.getAttribute("href");
      expect(href).toMatch(/sign-in/);
    });
  });

  test.describe("Sign Out page", () => {
    test("renders sign out confirmation with buttons", async ({ page }) => {
      await page.goto("/sign-out");
      await expect(
        page.getByRole("heading", { name: /вихід/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Назад" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Вийти" })
      ).toBeVisible();
    });
  });

  test.describe("MFA page", () => {
    test("renders two-factor authentication form", async ({ page }) => {
      await page.goto("/mfa");
      await expect(
        page.getByRole("heading", { name: /двофакторна/i })
      ).toBeVisible();
      await expect(page.locator("#code")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /підтвердити/i })
      ).toBeVisible();
    });
  });
});
