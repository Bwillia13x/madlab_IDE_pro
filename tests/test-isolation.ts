/**
 * Test Isolation Utilities
 *
 * Provides comprehensive test isolation utilities to prevent test pollution
 * and ensure clean test environments.
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Store original implementations for cleanup
const originalConsole = { ...console };
const originalFetch = global.fetch;
const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;
const originalResizeObserver = global.ResizeObserver;
const originalIntersectionObserver = global.IntersectionObserver;
const originalGetContext = HTMLCanvasElement.prototype.getContext;

/**
 * Comprehensive test isolation utilities
 */
export const TestIsolation = {
  /**
   * Reset all global mocks to their original state
   */
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
    global.requestAnimationFrame = originalRequestAnimationFrame || vi.fn();
    global.cancelAnimationFrame = originalCancelAnimationFrame || vi.fn();

    // Reset observers
    global.ResizeObserver = originalResizeObserver || vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    global.IntersectionObserver = originalIntersectionObserver || vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Clear all mocks
    vi.clearAllMocks();
  },

  /**
   * Setup canvas mocks for visualization tests
   */
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

  /**
   * Reset canvas mocks
   */
  resetCanvasMocks: () => {
    if (HTMLCanvasElement.prototype.getContext) {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
    delete HTMLCanvasElement.prototype._width;
    delete HTMLCanvasElement.prototype._height;
  },

  /**
   * Setup DOM mocks for widget tests
   */
  setupDOMMocks: () => {
    // Mock additional DOM APIs that jsdom doesn't implement
    Object.defineProperty(Element.prototype, 'hasPointerCapture', {
      value: vi.fn(() => false),
      writable: true,
    });

    // Mock URL APIs
    Object.defineProperty(window.URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'mock-url'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
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

  /**
   * Setup animation frame mocks
   */
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
    });
    global.cancelAnimationFrame = vi.fn((id) => {
      if (typeof global.clearImmediate !== 'undefined') {
        clearImmediate(id as unknown as NodeJS.Immediate);
      } else {
        clearTimeout(id as unknown as NodeJS.Timeout);
      }
    });

    // Also ensure it's available on window
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame = global.requestAnimationFrame;
      window.cancelAnimationFrame = global.cancelAnimationFrame;
    }
  },

  /**
   * Create a mock canvas for visualization tests
   */
  createMockCanvas: (eventListeners: Record<string, Function[]>) => ({
    getContext: vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true
    })),
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: Function) => {
      if (eventListeners[event]) {
        const index = eventListeners[event].indexOf(handler);
        if (index > -1) {
          eventListeners[event].splice(index, 1);
        }
      }
    }),
    dispatchEvent: vi.fn((event: Event) => {
      const handlers = eventListeners[event.type];
      if (handlers) {
        handlers.forEach(handler => handler(event));
      }
    }),
    toDataURL: vi.fn((type?: string) => {
      const format = type?.includes('jpeg') ? 'jpeg' : 'png';
      return `data:image/${format};base64,mockImageData`;
    }),
    width: 800,
    height: 600,
    style: {},
    getBoundingClientRect: vi.fn(() => ({
      width: 800,
      height: 600,
      left: 0,
      top: 0
    }))
  } as any),
};

/**
 * Setup test isolation for widget tests
 * Call this in beforeEach for widget tests
 */
export const setupWidgetTest = () => {
  TestIsolation.resetGlobalMocks();
  TestIsolation.setupDOMMocks();
};

/**
 * Setup test isolation for visualization tests
 * Call this in beforeEach for visualization tests
 */
export const setupVisualizationTest = () => {
  TestIsolation.resetGlobalMocks();
  TestIsolation.setupCanvasMocks();
  TestIsolation.setupAnimationMocks();
};

/**
 * Cleanup for all tests
 * Call this in afterEach for all tests
 */
export const cleanupTest = () => {
  cleanup();
  vi.clearAllTimers();
};

/**
 * Hook functions for easy test setup
 */
export const createTestHooks = () => ({
  beforeEach: (fn: () => void) => {
    beforeEach(() => {
      setupWidgetTest();
      fn();
    });
  },

  afterEach: (fn?: () => void) => {
    afterEach(() => {
      fn?.();
      cleanupTest();
    });
  },
});