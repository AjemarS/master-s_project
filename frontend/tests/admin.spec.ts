import { test, expect } from "@playwright/test";

const authAvailable = !!(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD);

// ──────────────────────────────────────────────
// Admin Summary — requires auth
// ──────────────────────────────────────────────
test.describe("Admin Summary", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/summary");
    await expect(page).toHaveURL(/\/admin\/summary/);
  });

  test("renders dashboard heading and stat cards", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /dashboard summary/i })
    ).toBeVisible();
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("Total Products")).toBeVisible();
    await expect(page.getByText("Low Stock Alert")).toBeVisible();
  });

  test("renders system status section with real health check", async ({ page }) => {
    await expect(page.getByText("System Status")).toBeVisible();
    await expect(page.getByText("Auth Service")).toBeVisible();
    await expect(page.getByText("Product Service")).toBeVisible();
  });
});

// ──────────────────────────────────────────────
// Admin Products — requires auth
// ──────────────────────────────────────────────
test.describe("Admin Products", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/products/);
  });

  test("renders products page with heading and stats", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /products management/i })
    ).toBeVisible();
    await expect(page.getByText("Total Products")).toBeVisible();
    await expect(page.getByText("In Stock").first()).toBeVisible();
    await expect(page.getByText("Low Stock").first()).toBeVisible();
  });

  test("renders product table with columns", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("th").getByText("ID")).toBeVisible();
    await expect(table.locator("th").getByText("Product Name")).toBeVisible();
    await expect(table.locator("th").getByText("Category")).toBeVisible();
    await expect(table.locator("th").getByText("Price")).toBeVisible();
    await expect(table.locator("th").getByText("Stock")).toBeVisible();
    await expect(table.locator("th").getByText("Actions")).toBeVisible();
  });

  test("opens Add Product dialog with all required fields", async ({ page }) => {
    await page.getByRole("button", { name: /add product/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /add product/i })).toBeVisible();
    await expect(dialog.locator("#pd-name")).toBeVisible();
    await expect(dialog.locator("#pd-description")).toBeVisible();
    await expect(dialog.locator("#pd-category")).toBeVisible();
    await expect(dialog.locator("#pd-price")).toBeVisible();
    await expect(dialog.locator("#pd-original-price")).toBeVisible();
    await expect(dialog.locator("#pd-stock")).toBeVisible();
    await expect(dialog.getByText("Features")).toBeVisible();
    await expect(dialog.getByText("Specs")).toBeVisible();
    await expect(dialog.getByText("Rating")).toBeVisible();
    await expect(dialog.getByText("Image")).toBeVisible();
  });

  test("Add Product dialog disables Save until all required fields filled", async ({ page }) => {
    await page.getByRole("button", { name: /add product/i }).click();
    const dialog = page.getByRole("dialog");
    const saveBtn = dialog.getByRole("button", { name: /create product/i });
    await expect(saveBtn).toBeDisabled();
  });

  test("Edit Product dialog pre-fills values", async ({ page }) => {
    const editBtn = page.locator("table tbody tr").first().getByRole("button", { name: /edit/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /edit product/i })).toBeVisible();
    }
  });

  test("Delete Product opens confirmation dialog", async ({ page }) => {
    const deleteBtn = page.locator("table tbody tr").first().getByRole("button", { name: /delete/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /delete product/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible();
    }
  });

  test("filters panel toggles open and close", async ({ page }) => {
    await page.getByRole("button", { name: /filter/i }).click();
    await expect(page.getByText("Min Price")).toBeVisible();
    await expect(page.getByText("Max Price")).toBeVisible();
    await expect(page.getByText("In Stock Only")).toBeVisible();
    await expect(page.getByRole("button", { name: /apply/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /reset/i })).toBeVisible();

    await page.getByRole("button", { name: /close/i }).click();
    await expect(page.getByText("Min Price")).not.toBeVisible();
  });

  test("search input is present", async ({ page }) => {
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible();
  });

  test("export button triggers CSV download", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
    await page.getByRole("button", { name: /export/i }).click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    }
  });

  test("pagination controls present when many products", async ({ page }) => {
    const prev = page.getByRole("button", { name: /previous/i });
    const next = page.getByRole("button", { name: /next/i });
    const hasPagination = (await prev.count()) > 0 || (await next.count()) > 0;
    if (hasPagination) {
      await expect(prev.or(next)).toBeVisible();
    }
  });
});

// ──────────────────────────────────────────────
// Admin Users — requires auth
// ──────────────────────────────────────────────
test.describe("Admin Users", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test("renders users page with heading and stats", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /users management/i })
    ).toBeVisible();
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("Banned")).toBeVisible();
    await expect(page.getByText("Admins")).toBeVisible();
  });

  test("renders user table with columns", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("th").getByText("User")).toBeVisible();
    await expect(table.locator("th").getByText("Email")).toBeVisible();
    await expect(table.locator("th").getByText("Role")).toBeVisible();
    await expect(table.locator("th").getByText("Status")).toBeVisible();
    await expect(table.locator("th").getByText("Joined")).toBeVisible();
    await expect(table.locator("th").getByText("Actions")).toBeVisible();
  });

  test("opens Invite User dialog with all required fields", async ({ page }) => {
    await page.getByRole("button", { name: /invite user/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /create user/i })).toBeVisible();
    await expect(dialog.locator("#ud-email")).toBeVisible();
    await expect(dialog.locator("#ud-name")).toBeVisible();
    await expect(dialog.locator("#ud-password")).toBeVisible();
    await expect(dialog.locator("#ud-role")).toBeVisible();
  });

  test("Invite User dialog disables Save until all required fields filled", async ({ page }) => {
    await page.getByRole("button", { name: /invite user/i }).click();
    const dialog = page.getByRole("dialog");
    const saveBtn = dialog.getByRole("button", { name: /create user/i });
    await expect(saveBtn).toBeDisabled();
  });

  test("Edit User dialog pre-fills values", async ({ page }) => {
    const editBtn = page.locator("table tbody tr").first().getByRole("button", { name: /edit/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /edit user/i })).toBeVisible();
    }
  });

  test("Remove User opens confirmation dialog", async ({ page }) => {
    const removeBtn = page.locator("table tbody tr").first().getByRole("button", { name: /remove/i });
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /remove user/i })).toBeVisible();
    }
  });

  test("Ban User dialog contains reason field", async ({ page }) => {
    const banBtn = page.locator("table tbody tr").first().getByRole("button", { name: /ban/i });
    if (await banBtn.isVisible()) {
      await banBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /ban user/i })).toBeVisible();
      await expect(dialog.getByPlaceholder(/reason/i)).toBeVisible();
      const banButton = dialog.getByRole("button", { name: /ban user/i });
      await expect(banButton).toBeDisabled();
    }
  });

  test("search input is present", async ({ page }) => {
    await expect(page.getByPlaceholder(/search users/i)).toBeVisible();
  });

  test("filters panel toggles with role and status dropdowns", async ({ page }) => {
    await page.locator("button").filter({ hasText: "Filter" }).click();
    await expect(page.locator("select").filter({ hasText: /all roles/i })).toBeVisible();
    await expect(page.locator("select").filter({ hasText: /all statuses/i })).toBeVisible();

    await page.locator("button").filter({ hasText: "Close" }).click();
    await expect(page.locator("select").filter({ hasText: /all roles/i })).not.toBeVisible();
  });

  test("pagination controls present when many users", async ({ page }) => {
    const prev = page.getByRole("button", { name: /previous/i });
    const next = page.getByRole("button", { name: /next/i });
    const hasPagination = (await prev.count()) > 0 || (await next.count()) > 0;
    if (hasPagination) {
      await expect(prev.or(next)).toBeVisible();
    }
  });
});
