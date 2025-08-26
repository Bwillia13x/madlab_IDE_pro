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

    // Visual regression specific project
    {
      name: 'visual-regression',
      testDir: './tests/visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'only-on-failure',
      },
    },

    // Mobile visual regression
    {
      name: 'visual-regression-mobile',
      testDir: './tests/visual-regression',
      use: {
        ...devices['iPhone 12'],
        screenshot: 'only-on-failure',
      },
    },

    // Tablet visual regression
    {
      name: 'visual-regression-tablet',
      testDir: './tests/visual-regression',
      use: {
        ...devices['iPad Pro'],
        screenshot: 'only-on-failure',
      },
    },
  ],

  webServer: {
    command: 'pnpm dev:test',
    url: 'http://localhost:3010',
    // Allow manual server management for development
    reuseExistingServer: true,
  },

  // Visual regression specific settings
  expect: {
    toHaveScreenshot: {
      threshold: 0.2, // 20% pixel difference threshold
      maxDiffPixelRatio: 0.01, // 1% of pixels can differ
    },
  },
});