/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      ...configDefaults.exclude,
      'tests/e2e/**',
      'vscode/**',
      // Exclude Playwright suites; run via `pnpm e2e`
      'tests/visual/**',
      'tests/integration/**',
      'tests/accessibility/accessibility.suite.test.*',
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'json-summary'],
      provider: 'v8',
      enabled: !!process.env.COVERAGE,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      vscode: path.resolve(__dirname, './tests/mocks/vscode.ts'),
    },
  },
});
