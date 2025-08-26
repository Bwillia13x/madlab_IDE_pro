/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Exclude default folders (node_modules, dist, etc.) and our e2e tests
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'next.config.js',
        'postcss.config.js',
        'tailwind.config.ts',
        'playwright.config.ts',
        'vitest.config.ts',
        '.next/',
        'public/',
        'scripts/',
        'apps/',
        'packages/',
        'docs/',
        'styles/',
        'types/',
        'lighthouse-report*',
        'test-results/',
        'playwright-report/',
        '**/*.md',
        '**/layout.tsx',
        '**/globals.css',
        '**/page.tsx', // Next.js page files
        'coverage/',
        '__visual_baselines__/',
        '__visual_diffs__/',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
      all: true,
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
      ],
      // V8-specific optimizations
      ignoreEmptyLines: true,
      skipFull: false,
      clean: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
