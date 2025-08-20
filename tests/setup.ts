import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock environment variables - use vi.stubEnv instead of Object.defineProperty
vi.stubEnv('NODE_ENV', 'test')

// Global mock setup for AI agent
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Note: Do not enable fake timers globally.
// Individual tests should opt-in with vi.useFakeTimers() as needed.