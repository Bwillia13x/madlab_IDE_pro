import { defineConfig, devices } from '@playwright/test';

// Optional: force full tracing via config profile instead of env var
const TRACE_ALL = process.env.TRACE_ALL === '1' || process.env.PW_TRACE_ALL === '1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'playwright-report/results.xml' }],
      ]
    : [['html', { open: 'never', outputFolder: 'playwright-report' }]],
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://localhost:3010',
    trace: TRACE_ALL ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Enable data-testid attribute support
    testIdAttribute: 'data-testid',
    // Increase timeout for grid animations
    actionTimeout: 20000,
    navigationTimeout: 45000,
    // Add viewport for consistent testing
    viewport: { width: 1280, height: 720 },
    timezoneId: 'UTC',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Use Next dev server for E2E to ensure consistent hydration across browsers
  webServer: {
    command: 'pnpm dev:test',
    url: 'http://localhost:3010',
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  },
});
