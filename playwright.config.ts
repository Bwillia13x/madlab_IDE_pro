import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Avoid keeping an HTTP server open after tests
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev:test',
    url: 'http://localhost:3010',
    // Let Playwright manage starting/stopping the server so the command exits automatically
    reuseExistingServer: false,
  },
});