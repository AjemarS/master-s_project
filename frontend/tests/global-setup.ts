import { chromium } from "@playwright/test";

async function globalSetup() {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Skipping auth setup — set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD");
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  try {
    // Set locale to English so sign-in page renders in English
    await page.context().addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: new URL(baseUrl).hostname, path: "/" },
    ]);
    await page.goto(`${baseUrl}/sign-in`, { waitUntil: "networkidle" });
    await page.fill("#email", email);
    await page.fill("#password", password);

    // Start waiting for URL before clicking to avoid race
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 15000 }),
      page.getByRole("button", { name: /sign in/i }).click(),
    ]);

    await context.storageState({ path: "tests/.auth/user.json" });
    console.log("Auth setup complete — saved storage state");
  } catch (err) {
    console.error("Auth setup failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
