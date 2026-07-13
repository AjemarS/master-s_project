import { test, expect } from "@playwright/test";

const authAvailable = !!(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD);

test.describe("Admin Summary", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/summary");
    await expect(page).toHaveURL(/\/admin\/summary/);
  });

  test("renders dashboard heading and stat cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/загальна кількість/i)).toBeVisible();
  });
});

test.describe("Admin Products", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/products/);
  });

  test("renders products page with table", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("th").getByText(/назва/i)).toBeVisible();
  });
});

test.describe("Admin Orders", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/orders/);
  });

  test("renders orders page with heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible();
  });

  test("renders status filter tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: /всі/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /в обробці/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /відправлено/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /доставлено/i })).toBeVisible();
  });

  test("renders channel filter tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: /всі канали/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /онлайн/i })).toBeVisible();
  });

  test("renders orders table with columns", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("th").getByText(/номер/i)).toBeVisible();
    await expect(table.locator("th").getByText(/статус/i)).toBeVisible();
    await expect(table.locator("th").getByText(/канал/i)).toBeVisible();
    await expect(table.locator("th").getByText(/сума/i)).toBeVisible();
  });
});

test.describe("Admin Warehouses", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/warehouses");
    await expect(page).toHaveURL(/\/admin\/warehouses/);
  });

  test("renders warehouses page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /warehouses/i })).toBeVisible();
  });
});

test.describe("Admin Suppliers", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/suppliers");
    await expect(page).toHaveURL(/\/admin\/suppliers/);
  });

  test("renders suppliers page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /suppliers/i })).toBeVisible();
  });
});

test.describe("Admin Goods Receipts", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/goods-receipts");
    await expect(page).toHaveURL(/\/admin\/goods-receipts/);
  });

  test("renders goods receipts page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /goods receipts/i })).toBeVisible();
  });
});

test.describe("Admin POS", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/pos");
    await expect(page).toHaveURL(/\/admin\/pos/);
  });

  test("renders POS page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /pos/i })).toBeVisible();
  });

  test("has product search input", async ({ page }) => {
    await expect(page.getByPlaceholder(/пошук/i)).toBeVisible();
  });
});

test.describe("Admin Reports", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/admin\/reports/);
  });

  test("renders reports page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /reports/i })).toBeVisible();
  });
});

test.describe("Admin Sidebar Navigation", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test("sidebar contains all nav items", async ({ page }) => {
    await page.goto("/admin/summary");
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Products")).toBeVisible();
    await expect(page.getByText("Orders")).toBeVisible();
    await expect(page.getByText("POS")).toBeVisible();
    await expect(page.getByText("Warehouses")).toBeVisible();
    await expect(page.getByText("Suppliers")).toBeVisible();
    await expect(page.getByText("Goods Receipts")).toBeVisible();
    await expect(page.getByText("Reports")).toBeVisible();
    await expect(page.getByText("Users")).toBeVisible();
  });
});

test.describe("Admin Users", () => {
  test.skip(!authAvailable, "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test("renders users page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
  });

  test("renders user table with columns", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("th").getByText(/ім'я/i)).toBeVisible();
    await expect(table.locator("th").getByText(/email/i)).toBeVisible();
    await expect(table.locator("th").getByText(/роль/i)).toBeVisible();
  });
});

test.describe("Admin Auth: Anonymous Access", () => {
  test("redirects anonymous users from /admin/summary to sign-in", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    try {
      await page.goto("/admin/summary", { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/sign-in/);
    } finally {
      await context.close();
    }
  });

  test("redirects anonymous users from /admin/users to sign-in", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    try {
      await page.goto("/admin/users", { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/sign-in/);
    } finally {
      await context.close();
    }
  });

  test("redirects anonymous users from /admin/orders to sign-in", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    try {
      await page.goto("/admin/orders", { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/sign-in/);
    } finally {
      await context.close();
    }
  });
});
