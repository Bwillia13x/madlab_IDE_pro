import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Store original implementations for cleanup
const originalConsole = { ...console };
const originalFetch = global.fetch;
const originalRequestAnimationFrame = global.requestAnimationFrame || null;
const originalCancelAnimationFrame = global.cancelAnimationFrame || null;
const originalResizeObserver = global.ResizeObserver;
const originalIntersectionObserver = global.IntersectionObserver;

// Mock environment variables - use vi.stubEnv instead of Object.defineProperty
vi.stubEnv('NODE_ENV', 'test');

// Global mock setup for AI agent
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock canvas API for chart components
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  putImageData: vi.fn(),
  canvas: {
    width: 800,
    height: 600,
  },
}));

// Mock canvas properties
Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  get: function () {
    return this._width || 800;
  },
  set: function (value) {
    this._width = value;
  },
});

Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  get: function () {
    return this._height || 600;
  },
  set: function (value) {
    this._height = value;
  },
});

// Mock requestAnimationFrame and cancelAnimationFrame in multiple contexts
const mockRequestAnimationFrame = vi.fn((cb) => {
  // Use setImmediate if available (Node.js), otherwise setTimeout
  if (typeof global.setImmediate !== 'undefined') {
    const timeoutId = setImmediate(cb);
    return timeoutId as unknown as number;
  } else {
    const timeoutId = setTimeout(cb, 16);
    return timeoutId as unknown as number;
  }
});

const mockCancelAnimationFrame = vi.fn((id) => {
  if (typeof global.clearImmediate !== 'undefined' && typeof id === 'object') {
    clearImmediate(id as unknown as NodeJS.Immediate);
  } else if (typeof id === 'number') {
    clearTimeout(id as unknown as NodeJS.Timeout);
  }
}) as any;

// Set on global first
global.requestAnimationFrame = mockRequestAnimationFrame;
global.cancelAnimationFrame = mockCancelAnimationFrame;

// Also ensure it's available on window
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = mockRequestAnimationFrame;
  window.cancelAnimationFrame = mockCancelAnimationFrame;
}

// Make sure it's available as a property that can be accessed by modules
Object.defineProperty(global, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
  writable: true,
  configurable: true,
});

// Mock additional DOM APIs that jsdom doesn't implement
Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: vi.fn(() => false),
  writable: true,
});

// Mock ResizeObserver with proper interface for @floating-ui/dom
global.ResizeObserver = vi.fn().mockImplementation((callback) => {
  const mockObserver = {
    observe: vi.fn((target) => {
      // Simulate initial resize callback if target has dimensions
      if (target && typeof callback === 'function') {
        const mockEntry = {
          target,
          contentRect: {
            width: target.offsetWidth || target.clientWidth || 800,
            height: target.offsetHeight || target.clientHeight || 600,
            left: 0,
            top: 0,
            right: target.offsetWidth || target.clientWidth || 800,
            bottom: target.offsetHeight || target.clientHeight || 600,
          },
          borderBoxSize: [
            {
              blockSize: target.offsetHeight || target.clientHeight || 600,
              inlineSize: target.offsetWidth || target.clientWidth || 800,
            },
          ],
          contentBoxSize: [
            {
              blockSize: target.offsetHeight || target.clientHeight || 600,
              inlineSize: target.offsetWidth || target.clientWidth || 800,
            },
          ],
          devicePixelContentBoxSize: [
            {
              blockSize:
                (target.offsetHeight || target.clientHeight || 600) * window.devicePixelRatio,
              inlineSize:
                (target.offsetWidth || target.clientWidth || 800) * window.devicePixelRatio,
            },
          ],
        };
        callback([mockEntry]);
      }
    }),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
  return mockObserver;
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL globally
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url'),
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Note: VisualizationEngine is now mocked individually in each test file
// to avoid conflicts between global and local mocks

// Comprehensive Lucide React icon mocks - simplified approach for better reliability
vi.mock('lucide-react', () => ({
  // Mock all the icons used in the application
  Download: vi.fn(() => React.createElement('div', { 'data-testid': 'download-icon' })),
  Upload: vi.fn(() => React.createElement('div', { 'data-testid': 'upload-icon' })),
  Search: vi.fn(() => React.createElement('div', { 'data-testid': 'search-icon' })),
  Filter: vi.fn(() => React.createElement('div', { 'data-testid': 'filter-icon' })),
  Eye: vi.fn(() => React.createElement('div', { 'data-testid': 'eye-icon' })),
  TrendingUp: vi.fn(() => React.createElement('div', { 'data-testid': 'trending-up' })),
  TrendingDown: vi.fn(() => React.createElement('div', { 'data-testid': 'trending-down' })),
  ChevronDown: vi.fn(() => React.createElement('div', { 'data-testid': 'chevron-down' })),
  ChevronUp: vi.fn(() => React.createElement('div', { 'data-testid': 'chevron-up' })),
  ChevronLeft: vi.fn(() => React.createElement('div', { 'data-testid': 'chevron-left' })),
  ChevronRight: vi.fn(() => React.createElement('div', { 'data-testid': 'chevron-right' })),
  RefreshCw: vi.fn(() => React.createElement('div', { 'data-testid': 'refresh-icon' })),
  Settings: vi.fn(() => React.createElement('div', { 'data-testid': 'settings-icon' })),
  ZoomIn: vi.fn(() => React.createElement('div', { 'data-testid': 'zoom-in-icon' })),
  ZoomOut: vi.fn(() => React.createElement('div', { 'data-testid': 'zoom-out-icon' })),
  RotateCcw: vi.fn(() => React.createElement('div', { 'data-testid': 'reset-icon' })),
  Image: vi.fn(() => React.createElement('div', { 'data-testid': 'image-icon' })),
  AlertCircle: vi.fn(() => React.createElement('div', { 'data-testid': 'alert-icon' })),
  CheckCircle: vi.fn(() => React.createElement('div', { 'data-testid': 'check-icon' })),
  XCircle: vi.fn(() => React.createElement('div', { 'data-testid': 'x-icon' })),
  Info: vi.fn(() => React.createElement('div', { 'data-testid': 'info-icon' })),
  Plus: vi.fn(() => React.createElement('div', { 'data-testid': 'plus-icon' })),
  Minus: vi.fn(() => React.createElement('div', { 'data-testid': 'minus-icon' })),
  MoreHorizontal: vi.fn(() => React.createElement('div', { 'data-testid': 'more-horizontal' })),
  MoreVertical: vi.fn(() => React.createElement('div', { 'data-testid': 'more-vertical' })),
  Edit: vi.fn(() => React.createElement('div', { 'data-testid': 'edit-icon' })),
  Trash: vi.fn(() => React.createElement('div', { 'data-testid': 'trash-icon' })),
  Trash2: vi.fn(() => React.createElement('div', { 'data-testid': 'trash2-icon' })),
  Copy: vi.fn(() => React.createElement('div', { 'data-testid': 'copy-icon' })),
  Share: vi.fn(() => React.createElement('div', { 'data-testid': 'share-icon' })),
  DollarSign: vi.fn(() => React.createElement('div', { 'data-testid': 'dollar-sign-icon' })),
  // WidgetShell specific icons
  BarChart3: vi.fn(() => React.createElement('div', { 'data-testid': 'bar-chart-icon' })),
  Activity: vi.fn(() => React.createElement('div', { 'data-testid': 'activity-icon' })),
  PieChart: vi.fn(() => React.createElement('div', { 'data-testid': 'pie-chart-icon' })),
  Wifi: vi.fn(() => React.createElement('div', { 'data-testid': 'wifi-icon' })),
  Database: vi.fn(() => React.createElement('div', { 'data-testid': 'database-icon' })),
  Zap: vi.fn(() => React.createElement('div', { 'data-testid': 'zap-icon' })),
  // Mobile navigation icons
  Home: vi.fn(() => React.createElement('div', { 'data-testid': 'home-icon' })),
  Briefcase: vi.fn(() => React.createElement('div', { 'data-testid': 'briefcase-icon' })),
  // Additional UI icons
  Check: vi.fn(() => React.createElement('div', { 'data-testid': 'check-icon' })),
  X: vi.fn(() => React.createElement('div', { 'data-testid': 'x-icon' })),
  // Mobile chart specific icons
  Smartphone: vi.fn(() => React.createElement('div', { 'data-testid': 'smartphone-icon' })),
  Tablet: vi.fn(() => React.createElement('div', { 'data-testid': 'tablet-icon' })),
  Monitor: vi.fn(() => React.createElement('div', { 'data-testid': 'monitor-icon' })),
  // Additional visualization icons
  Maximize: vi.fn(() => React.createElement('div', { 'data-testid': 'maximize-icon' })),
  Minimize: vi.fn(() => React.createElement('div', { 'data-testid': 'minimize-icon' })),
  Move: vi.fn(() => React.createElement('div', { 'data-testid': 'move-icon' })),
  RotateCw: vi.fn(() => React.createElement('div', { 'data-testid': 'rotate-cw-icon' })),
  Grid3X3: vi.fn(() => React.createElement('div', { 'data-testid': 'grid-icon' })),
}));

// Mock document.createElement globally with proper DOM elements
const originalCreateElement = document.createElement;
vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
  const element = originalCreateElement.call(document, tagName);

  if (tagName === 'a') {
    Object.assign(element, {
      href: '',
      download: '',
      click: vi.fn(),
    });
  }

  if (tagName === 'canvas') {
    const mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      setTransform: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
      })),
      putImageData: vi.fn(),
    };

    Object.assign(element, {
      getContext: vi.fn(() => mockContext),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      width: 800,
      height: 600,
      style: {},
      getBoundingClientRect: vi.fn(() => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
      })),
      toDataURL: vi.fn(() => 'data:image/png;base64,mock-image-data'),
      toBlob: vi.fn(),
    });
  }

  return element;
});

// Note: Do not enable fake timers globally.
// Individual tests should opt-in with vi.useFakeTimers() as needed.

// Test store utilities for integration tests
export function createTestStore() {
  return {
    // Mock store implementation
    getState: vi.fn(() => ({})),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
    reset: vi.fn(),
  };
}

// Test wrapper component for integration tests
export function TestWrapper({ children, store }: { children: React.ReactNode; store?: any }) {
  // Simple wrapper for testing - returns children as-is for now
  return children;
}

// Test isolation utilities
export const TestIsolation = {
  // Reset all global mocks to their original state
  resetGlobalMocks: () => {
    // Reset fetch
    global.fetch = originalFetch || vi.fn();

    // Reset console methods
    global.console = {
      ...originalConsole,
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Reset animation frame functions
    if (originalRequestAnimationFrame) {
      global.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      global.requestAnimationFrame = vi.fn();
    }
    if (originalCancelAnimationFrame) {
      global.cancelAnimationFrame = originalCancelAnimationFrame;
    } else {
      global.cancelAnimationFrame = vi.fn();
    }

    // Reset observers
    global.ResizeObserver =
      originalResizeObserver ||
      vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }));

    global.IntersectionObserver =
      originalIntersectionObserver ||
      vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }));

    // Clear all mocks
    vi.clearAllMocks();
  },

  // Setup canvas mocks for visualization tests
  setupCanvasMocks: () => {
    // Mock canvas API for chart components
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      setTransform: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
      })),
      putImageData: vi.fn(),
    }));

    // Mock canvas properties
    Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
      get: function () {
        return this._width || 800;
      },
      set: function (value) {
        this._width = value;
      },
    });

    Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
      get: function () {
        return this._height || 600;
      },
      set: function (value) {
        this._height = value;
      },
    });
  },

  // Reset canvas mocks
  resetCanvasMocks: () => {
    if (HTMLCanvasElement.prototype.getContext) {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
    delete HTMLCanvasElement.prototype._width;
    delete HTMLCanvasElement.prototype._height;
  },

  // Setup DOM mocks for widget tests
  setupDOMMocks: () => {
    // Mock additional DOM APIs that jsdom doesn't implement
    Object.defineProperty(Element.prototype, 'hasPointerCapture', {
      value: vi.fn(() => false),
      writable: true,
    });

    // Mock document.createElement globally with proper DOM elements
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);

      if (tagName === 'a') {
        Object.assign(element, {
          href: '',
          download: '',
          click: vi.fn(),
        });
      }

      if (tagName === 'canvas') {
        const mockContext = {
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          arc: vi.fn(),
          closePath: vi.fn(),
          fillText: vi.fn(),
          strokeText: vi.fn(),
          measureText: vi.fn(() => ({ width: 0 })),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          setTransform: vi.fn(),
          createLinearGradient: vi.fn(() => ({
            addColorStop: vi.fn(),
          })),
          createRadialGradient: vi.fn(() => ({
            addColorStop: vi.fn(),
          })),
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(4),
            width: 1,
            height: 1,
          })),
          putImageData: vi.fn(),
        };

        Object.assign(element, {
          getContext: vi.fn(() => mockContext),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
          width: 800,
          height: 600,
          style: {},
          getBoundingClientRect: vi.fn(() => ({
            width: 800,
            height: 600,
            left: 0,
            top: 0,
          })),
          toDataURL: vi.fn(() => 'data:image/png;base64,mock-image-data'),
          toBlob: vi.fn(),
        });
      }

      return element;
    });
  },

  // Setup animation frame mocks
  setupAnimationMocks: () => {
    // Mock requestAnimationFrame and cancelAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      // Use setImmediate if available (Node.js), otherwise setTimeout
      if (typeof global.setImmediate !== 'undefined') {
        const timeoutId = setImmediate(cb);
        return timeoutId as unknown as number;
      } else {
        const timeoutId = setTimeout(cb, 16);
        return timeoutId as unknown as number;
      }
    }) as any;
    global.cancelAnimationFrame = vi.fn((id) => {
      if (typeof global.clearImmediate !== 'undefined') {
        clearImmediate(id as unknown as NodeJS.Immediate);
      } else {
        clearTimeout(id as unknown as NodeJS.Timeout);
      }
    }) as any;

    // Also ensure it's available on window
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame = global.requestAnimationFrame;
      window.cancelAnimationFrame = global.cancelAnimationFrame;
    }
  },
};

// Store original getContext for canvas reset
const originalGetContext = HTMLCanvasElement.prototype.getContext;
