/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  // Exclude default folders (node_modules, dist, etc.) and our e2e tests
  exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  coverage: {
    reporter: ['text', 'json', 'html'],
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
})