/**
 * Enhanced Testing Utilities for MAD LAB
 * Production-grade testing helpers with performance monitoring
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi, expect } from 'vitest';

// Performance monitoring
export interface PerformanceMetrics {
  renderTime: number;
  reRenderCount: number;
  memoryUsage: number;
  domNodes: number;
}

export interface TestEnvironment {
  isMobile: boolean;
  isCI: boolean;
  viewport: { width: number; height: number };
  userAgent: string;
}

/**
 * Enhanced render function with performance monitoring
 */
export function renderWithMetrics(
  ui: ReactElement,
  options?: RenderOptions
): RenderResult & { metrics: PerformanceMetrics } {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  const result = render(ui, options);
  
  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  const metrics: PerformanceMetrics = {
    renderTime: endTime - startTime,
    reRenderCount: 1,
    memoryUsage: endMemory - startMemory,
    domNodes: document.querySelectorAll('*').length,
  };
  
  return { ...result, metrics };
}

/**
 * Test environment detection
 */
export function getTestEnvironment(): TestEnvironment {
  return {
    isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
    isCI: !!process.env.CI,
    viewport: {
      width: window.innerWidth || 1024,
      height: window.innerHeight || 768,
    },
    userAgent: navigator.userAgent,
  };
}

/**
 * Performance budget assertions
 */
export const performanceBudgets = {
  // Widget render times
  widgetRender: {
    fast: 50,      // Simple widgets
    normal: 200,   // Complex widgets
    slow: 500,     // Very complex widgets
    critical: 1000 // Maximum acceptable
  },
  
  // Memory usage (bytes)
  memory: {
    light: 1024 * 1024,      // 1MB
    normal: 5 * 1024 * 1024, // 5MB
    heavy: 10 * 1024 * 1024, // 10MB
  },
  
  // DOM complexity
  domNodes: {
    simple: 100,
    complex: 500,
    veryComplex: 1000,
  }
};

/**
 * Assert performance metrics meet budgets
 */
export function assertPerformanceBudget(
  metrics: PerformanceMetrics,
  budget: {
    renderTime?: number;
    memoryUsage?: number;
    domNodes?: number;
  }
) {
  if (budget.renderTime !== undefined) {
    expect(metrics.renderTime).toBeLessThanOrEqual(budget.renderTime);
  }
  
  if (budget.memoryUsage !== undefined) {
    expect(metrics.memoryUsage).toBeLessThanOrEqual(budget.memoryUsage);
  }
  
  if (budget.domNodes !== undefined) {
    expect(metrics.domNodes).toBeLessThanOrEqual(budget.domNodes);
  }
}

/**
 * Mock financial data for testing
 */
export const mockFinancialData = {
  quote: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 150.25,
    change: 2.15,
    changePercent: 1.45,
    volume: 50000000,
    marketCap: 2500000000000,
    timestamp: new Date('2024-01-15T16:00:00Z'),
  },
  
  prices: Array.from({ length: 100 }, (_, i) => ({
    date: new Date(Date.now() - (99 - i) * 24 * 60 * 60 * 1000),
    open: 150 + Math.random() * 10 - 5,
    high: 155 + Math.random() * 5,
    low: 145 + Math.random() * 5,
    close: 150 + Math.random() * 10 - 5,
    volume: 40000000 + Math.random() * 20000000,
  })),
  
  dcfAnalysis: {
    symbol: 'AAPL',
    fcfProjections: [12000, 13500, 15200, 17100, 19200],
    terminalValue: 320000,
    enterpriseValue: 2800000,
    sharePrice: 175.50,
    wacc: 0.095,
    growthRate: 0.03,
  },
  
  portfolio: {
    positions: [
      { symbol: 'AAPL', shares: 100, avgPrice: 145.00 },
      { symbol: 'MSFT', shares: 50, avgPrice: 320.00 },
      { symbol: 'GOOGL', shares: 25, avgPrice: 2400.00 },
    ],
    totalValue: 116500,
    dayChange: 1250,
    dayChangePercent: 1.08,
  }
};

/**
 * Mock data provider for testing
 */
export const createMockDataProvider = () => ({
  id: 'test-provider',
  name: 'Test Provider',
  
  async getQuote(symbol: string) {
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate network delay
    return { ...mockFinancialData.quote, symbol };
  },
  
  async getHistoricalPrices(symbol: string, range: string) {
    await new Promise(resolve => setTimeout(resolve, 50));
    return mockFinancialData.prices;
  },
  
  async getPrices(symbol: string, range: string) {
    return this.getHistoricalPrices(symbol, range);
  },
  
  async getKpis(symbol: string) {
    return this.getQuote(symbol);
  },
  
  async getVolSurface(symbol: string) {
    return {
      symbol,
      underlyingPrice: 150,
      points: [],
      timestamp: new Date(),
    };
  },
  
  isAvailable: () => true,
  initialize: () => Promise.resolve(),
});

/**
 * Accessibility testing helpers
 */
export async function testAccessibility(element: HTMLElement) {
  // Check for basic accessibility attributes
  const issues: string[] = [];
  
  // Check for images without alt text
  const images = element.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.getAttribute('alt') && !img.getAttribute('aria-label')) {
      issues.push(`Image ${index + 1} missing alt text or aria-label`);
    }
  });
  
  // Check for buttons without accessible names
  const buttons = element.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const hasAccessibleName = 
      button.textContent?.trim() ||
      button.getAttribute('aria-label') ||
      button.getAttribute('aria-labelledby') ||
      button.querySelector('[aria-label]');
    
    if (!hasAccessibleName) {
      issues.push(`Button ${index + 1} missing accessible name`);
    }
  });
  
  // Check for form inputs without labels
  const inputs = element.querySelectorAll('input, select, textarea');
  inputs.forEach((input, index) => {
    const hasLabel = 
      input.getAttribute('aria-label') ||
      input.getAttribute('aria-labelledby') ||
      document.querySelector(`label[for="${input.id}"]`);
    
    if (!hasLabel) {
      issues.push(`Form input ${index + 1} missing label`);
    }
  });
  
  // Check for headings hierarchy
  const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let lastLevel = 0;
  
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));
    if (index === 0 && level !== 1) {
      issues.push('First heading should be h1');
    }
    if (level > lastLevel + 1) {
      issues.push(`Heading level skip: h${lastLevel} to h${level}`);
    }
    lastLevel = level;
  });
  
  return {
    isAccessible: issues.length === 0,
    issues,
    score: Math.max(0, 100 - (issues.length * 10)), // Simple scoring
  };
}

/**
 * Visual regression testing setup
 */
export function setupVisualTesting() {
  // Mock canvas context for chart testing
  // Type-safe override of getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: any): any {
    if (contextId === '2d') {
      return {
        canvas: this as HTMLCanvasElement,
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Array(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        getContextAttributes: vi.fn(),
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  } as any;
  
  // Mock ResizeObserver
  global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock IntersectionObserver to satisfy TS constructor type
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '0px';
    readonly thresholds: ReadonlyArray<number> = [0];
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe: (target: Element) => void = vi.fn();
    unobserve: (target: Element) => void = vi.fn();
    disconnect: () => void = vi.fn();
    takeRecords(): IntersectionObserverEntry[] { return []; }
  }
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

/**
 * Error boundary testing
 */
export function createErrorBoundaryTest(component: ReactElement) {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  return {
    component,
    expectError: () => {
      expect(consoleError).toHaveBeenCalled();
    },
    cleanup: () => {
      consoleError.mockRestore();
    },
  };
}

/**
 * Financial calculation testing utilities
 */
export const financialTestUtils = {
  /**
   * Assert financial calculation is within tolerance
   */
  assertFinancialCalculation(
    actual: number,
    expected: number,
    tolerance: number = 0.01 // 1% tolerance by default
  ) {
    const diff = Math.abs(actual - expected);
    const relativeDiff = diff / Math.abs(expected);
    
    expect(relativeDiff).toBeLessThanOrEqual(tolerance);
  },
  
  /**
   * Generate test data for time series analysis
   */
  generatePriceTimeSeries(
    startPrice: number,
    days: number,
    volatility: number = 0.02
  ) {
    const prices = [startPrice];
    
    for (let i = 1; i < days; i++) {
      const randomShock = (Math.random() - 0.5) * 2 * volatility;
      const newPrice = prices[i - 1] * (1 + randomShock);
      prices.push(Math.max(0.01, newPrice)); // Ensure positive prices
    }
    
    return prices.map((price, index) => ({
      date: new Date(Date.now() - (days - index) * 24 * 60 * 60 * 1000),
      close: price,
      open: price * (1 + (Math.random() - 0.5) * 0.005),
      high: price * (1 + Math.random() * 0.01),
      low: price * (1 - Math.random() * 0.01),
      volume: Math.floor(Math.random() * 10000000),
    }));
  },
  
  /**
   * Validate DCF calculation components
   */
  validateDCFCalculation(analysis: any) {
    expect(analysis.fcfProjections).toBeInstanceOf(Array);
    expect(analysis.fcfProjections.length).toBeGreaterThan(0);
    expect(analysis.terminalValue).toBeGreaterThan(0);
    expect(analysis.enterpriseValue).toBeGreaterThan(0);
    expect(analysis.wacc).toBeGreaterThan(0);
    expect(analysis.wacc).toBeLessThan(1);
    expect(analysis.growthRate).toBeGreaterThanOrEqual(0);
    expect(analysis.growthRate).toBeLessThan(1);
  },
};

/**
 * Performance profiling utilities
 */
export class PerformanceProfiler {
  private measurements: Array<{ name: string; duration: number; timestamp: number }> = [];
  
  mark(name: string) {
    const timestamp = performance.now();
    this.measurements.push({ name, duration: 0, timestamp });
  }
  
  measure(name: string, startMark: string) {
    const startTime = this.measurements.find(m => m.name === startMark)?.timestamp;
    if (!startTime) {
      throw new Error(`Start mark "${startMark}" not found`);
    }
    
    const duration = performance.now() - startTime;
    this.measurements.push({ name, duration, timestamp: performance.now() });
    
    return duration;
  }
  
  getReport() {
    return {
      totalMeasurements: this.measurements.length,
      measurements: this.measurements.filter(m => m.duration > 0),
      totalTime: this.measurements.reduce((sum, m) => sum + m.duration, 0),
    };
  }
  
  assertBudget(measurementName: string, budget: number) {
    const measurement = this.measurements.find(m => m.name === measurementName);
    if (!measurement) {
      throw new Error(`Measurement "${measurementName}" not found`);
    }
    
    expect(measurement.duration).toBeLessThanOrEqual(budget);
  }
  
  clear() {
    this.measurements = [];
  }
}

export default {
  renderWithMetrics,
  getTestEnvironment,
  performanceBudgets,
  assertPerformanceBudget,
  mockFinancialData,
  createMockDataProvider,
  testAccessibility,
  setupVisualTesting,
  createErrorBoundaryTest,
  financialTestUtils,
  PerformanceProfiler,
};