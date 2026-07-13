import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const authEnabled = !!(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD);
const storageStatePath = path.resolve(__dirname, 'tests', '.auth', 'user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,

  /* Run once before all workers: authenticate if credentials are set */
  globalSetup: './tests/global-setup.ts',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/admin.spec.ts'],
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/admin.spec.ts'],
    },

    {
      name: 'auth-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authEnabled ? storageStatePath : undefined,
      },
      testMatch: ['**/admin.spec.ts'],
    },
  ],

});
