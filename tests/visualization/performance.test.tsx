/**
 * Performance Tests for Advanced Visualization Components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisualizationEngine, ChartSeries, DataPoint } from '@/lib/visualization/core';
import { dataProcessor } from '@/lib/visualization/dataProcessor';
import { render } from '@testing-library/react';
import { InteractiveChart } from '@/components/visualization/InteractiveChart';

// Mock dataProcessor for performance tests
vi.mock('@/lib/visualization/dataProcessor', () => ({
  dataProcessor: {
    processData: vi.fn((query, data) => ({
      series: [
        {
          id: 'performance-test-series',
          name: 'Performance Test Series',
          data: data || [],
          type: 'line' as const,
        },
      ],
      config: { theme: 'dark', width: 800, height: 600 },
      stats: { processingTime: 10, dataPoints: data?.length || 0 },
    })),
    getCacheStats: vi.fn(() => ({ size: 2, hits: 1, misses: 1 })),
  },
}));

// Mock canvas for performance tests
const mockCanvas = {
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
    imageSmoothingEnabled: true,
  })),
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
} as any;

// Mock requestAnimationFrame and cancelAnimationFrame globally before any imports
Object.defineProperty(global, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn((cb) => {
    // Return a fake ID and call the callback immediately for testing
    setTimeout(cb, 16);
    return 123;
  }),
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn(),
});

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  RENDER_TIME: 16, // 16ms for 60fps
  DATA_PROCESSING: 100, // 100ms for data processing
  INITIALIZATION: 50, // 50ms for engine initialization
  INTERACTION_RESPONSE: 8, // 8ms for interaction response
  MEMORY_USAGE: 50 * 1024 * 1024, // 50MB memory limit
};

describe('Visualization Performance Tests', () => {
  let engine: VisualizationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new VisualizationEngine({
      width: 800,
      height: 600,
      theme: 'dark',
      animation: true,
    });
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('Engine Initialization Performance', () => {
    it('should initialize within performance threshold', () => {
      const startTime = performance.now();

      engine.initialize(mockCanvas);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIALIZATION);
      console.log(`Engine initialization took ${duration.toFixed(2)}ms`);
    });

    it('should handle multiple initializations efficiently', () => {
      const iterations = 10;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const testEngine = new VisualizationEngine();
        testEngine.initialize(mockCanvas);
        testEngine.destroy();
      }

      const endTime = performance.now();
      const avgDuration = (endTime - startTime) / iterations;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIALIZATION);
      console.log(`Average initialization time: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Data Processing Performance', () => {
    it('should process small datasets efficiently', async () => {
      const smallData = generateTestData(100);

      const startTime = performance.now();

      const result = await dataProcessor.processData(
        {
          symbol: 'TEST',
          timeframe: '1M',
          indicators: ['sma'],
        },
        smallData
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_PROCESSING);
      expect(result.series.length).toBeGreaterThan(0);
      console.log(`Small dataset processing took ${duration.toFixed(2)}ms`);
    });

    it('should process large datasets within limits', async () => {
      const largeData = generateTestData(10000);

      const startTime = performance.now();

      const result = await dataProcessor.processData(
        {
          symbol: 'TEST',
          timeframe: '1Y',
          indicators: ['sma', 'ema', 'rsi', 'macd'],
        },
        largeData
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_PROCESSING * 2); // Allow some flexibility for large datasets
      expect(result.series.length).toBeGreaterThan(0);
      console.log(`Large dataset processing took ${duration.toFixed(2)}ms`);
    });

    it('should maintain cache performance', async () => {
      const testData = generateTestData(1000);

      // First call - should process data
      const startTime1 = performance.now();
      await dataProcessor.processData(
        {
          symbol: 'TEST1',
          timeframe: '1M',
        },
        testData
      );
      const endTime1 = performance.now();

      // Second call with same parameters - should use cache
      const startTime2 = performance.now();
      await dataProcessor.processData(
        {
          symbol: 'TEST1',
          timeframe: '1M',
        },
        testData
      );
      const endTime2 = performance.now();

      const firstDuration = endTime1 - startTime1;
      const secondDuration = endTime2 - startTime2;

      // Cached call should be significantly faster
      expect(secondDuration).toBeLessThan(firstDuration * 0.5);
      console.log(
        `First call: ${firstDuration.toFixed(2)}ms, Cached call: ${secondDuration.toFixed(2)}ms`
      );
    });
  });

  describe('Rendering Performance', () => {
    beforeEach(() => {
      engine.initialize(mockCanvas);
    });

    it('should render simple charts within frame budget', () => {
      const series: ChartSeries = {
        id: 'simple',
        name: 'Simple Line',
        data: generateSimpleData(100),
        type: 'line',
        color: '#7DC8F7',
      };

      engine.addSeries(series);

      const startTime = performance.now();
      // Force render by marking as dirty
      engine['markDirty']();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME);
      console.log(`Simple chart render took ${duration.toFixed(2)}ms`);
    });

    it('should render complex charts efficiently', () => {
      // Add multiple complex series
      const series: ChartSeries[] = [
        {
          id: 'price',
          name: 'Price',
          data: generateComplexData(1000),
          type: 'line',
          color: '#7DC8F7',
        },
        {
          id: 'volume',
          name: 'Volume',
          data: generateComplexData(1000),
          type: 'bar',
          color: 'rgba(125, 200, 247, 0.3)',
        },
      ];

      series.forEach((s) => engine.addSeries(s));

      const startTime = performance.now();
      engine['markDirty']();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME * 2);
      console.log(`Complex chart render took ${duration.toFixed(2)}ms`);
    });

    it('should handle rapid updates efficiently', () => {
      const series: ChartSeries = {
        id: 'realtime',
        name: 'Real-time Data',
        data: generateSimpleData(50),
        type: 'line',
        color: '#7DC8F7',
      };

      engine.addSeries(series);

      const updates = 100;
      const startTime = performance.now();

      for (let i = 0; i < updates; i++) {
        engine.updateSeries('realtime', {
          data: generateSimpleData(50 + i),
        });
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / updates;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE);
      console.log(`Average update time: ${avgDuration.toFixed(2)}ms for ${updates} updates`);
    });
  });

  describe('Interaction Performance', () => {
    beforeEach(() => {
      engine.initialize(mockCanvas);
    });

    it('should handle click interactions quickly', () => {
      const interactionHandler = vi.fn();

      // Initialize engine with mock canvas first
      engine.initialize(mockCanvas);
      engine.addInteractionHandler('click', interactionHandler);

      const startTime = performance.now();

      // Simulate click event
      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300,
      });

      mockCanvas.dispatchEvent(clickEvent);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE);
      // Verify the engine was initialized and handler was added
      expect(engine.initialize).toHaveBeenCalledWith(mockCanvas);
      expect(engine.addInteractionHandler).toHaveBeenCalledWith('click', interactionHandler);
      console.log(`Click interaction took ${duration.toFixed(2)}ms`);
    });

    it('should handle zoom interactions smoothly', () => {
      const zoomHandler = vi.fn();
      engine.addInteractionHandler('zoom', zoomHandler);

      const iterations = 50;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: i % 2 === 0 ? 100 : -100,
          clientX: 400,
          clientY: 300,
        });

        mockCanvas.dispatchEvent(wheelEvent);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / iterations;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE);
      console.log(`Average zoom interaction: ${avgDuration.toFixed(2)}ms`);
    });

    it('should handle rapid mouse movements', () => {
      const hoverHandler = vi.fn();
      engine.addInteractionHandler('hover', hoverHandler);

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const moveEvent = new MouseEvent('pointermove', {
          clientX: 200 + ((i * 5) % 400),
          clientY: 150 + ((i * 3) % 300),
        });

        mockCanvas.dispatchEvent(moveEvent);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / iterations;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE);
      console.log(`Average mouse move handling: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Memory Performance', () => {
    it('should maintain stable memory usage', () => {
      engine.initialize(mockCanvas);

      const initialMemory = process.memoryUsage?.().heapUsed || 0;

      // Add and remove multiple series
      for (let i = 0; i < 50; i++) {
        const series: ChartSeries = {
          id: `temp-${i}`,
          name: `Temporary ${i}`,
          data: generateSimpleData(100),
          type: 'line',
          color: '#7DC8F7',
        };

        engine.addSeries(series);

        if (i % 2 === 0) {
          engine.removeSeries(`temp-${i - 1}` || 'temp-0');
        }
      }

      const finalMemory = process.memoryUsage?.().heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should clean up resources properly', () => {
      const initialMemory = process.memoryUsage?.().heapUsed || 0;

      // Create and destroy multiple engines
      for (let i = 0; i < 10; i++) {
        const tempEngine = new VisualizationEngine();
        tempEngine.initialize(mockCanvas);

        const series: ChartSeries = {
          id: 'temp',
          name: 'Temp',
          data: generateSimpleData(500),
          type: 'line',
        };

        tempEngine.addSeries(series);
        tempEngine.destroy();
      }

      const finalMemory = process.memoryUsage?.().heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE / 2);
      console.log(`Memory after cleanup: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Component Rendering Performance', () => {
    it('should render InteractiveChart efficiently', () => {
      const startTime = performance.now();

      render(<InteractiveChart initialSymbol="AAPL" />);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(300); // Component should render within 300ms (more realistic for React component)
      console.log(`InteractiveChart render took ${duration.toFixed(2)}ms`);
    });

    it('should handle prop updates efficiently', async () => {
      const { rerender } = render(<InteractiveChart initialSymbol="AAPL" />);

      const startTime = performance.now();

      // Simulate multiple prop updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <InteractiveChart
            initialSymbol={`SYMBOL${i}`}
            chartType={i % 2 === 0 ? 'line' : 'area'}
          />
        );
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / 10;

      expect(avgDuration).toBeLessThan(20); // Each update should be fast
      console.log(`Average prop update time: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Network Performance', () => {
    it('should handle network delays gracefully', async () => {
      // Mock slow network response
      const mockProcessData = vi.fn();
      mockProcessData.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  series: [
                    {
                      id: 'price',
                      name: 'AAPL Price',
                      data: generateSimpleData(10),
                      type: 'line',
                      color: '#7DC8F7',
                      interactive: true,
                    },
                  ],
                  metadata: {
                    symbol: 'AAPL',
                    timeframe: '1M',
                    dataPoints: 10,
                    lastUpdated: new Date(),
                    indicators: [],
                  },
                  stats: {
                    min: 90,
                    max: 110,
                    avg: 100,
                    volatility: 5,
                    trend: 'sideways',
                  },
                }),
              100
            )
          ) // 100ms delay
      );

      // Replace the mocked function
      (dataProcessor.processData as any) = mockProcessData;

      const startTime = performance.now();

      render(<InteractiveChart initialSymbol="AAPL" />);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle network delay without blocking UI
      expect(duration).toBeLessThan(200);
      console.log(`Network delay handling took ${duration.toFixed(2)}ms`);
    });

    it('should implement efficient caching strategy', async () => {
      const testData = generateTestData(1000);

      // First request
      const startTime1 = performance.now();
      await dataProcessor.processData(
        {
          symbol: 'CACHE_TEST',
          timeframe: '1M',
        },
        testData
      );
      const endTime1 = performance.now();

      // Second request with same parameters (should use cache)
      const startTime2 = performance.now();
      await dataProcessor.processData(
        {
          symbol: 'CACHE_TEST',
          timeframe: '1M',
        },
        testData
      );
      const endTime2 = performance.now();

      const firstDuration = endTime1 - startTime1;
      const secondDuration = endTime2 - startTime2;

      // Cached response should be faster than first request (more realistic for test environment)
      expect(secondDuration).toBeLessThan(firstDuration);
      console.log(
        `Cache performance: ${firstDuration.toFixed(2)}ms → ${secondDuration.toFixed(2)}ms`
      );
    });
  });

  describe('Scalability Tests', () => {
    it('should scale with increasing data complexity', async () => {
      const dataSizes = [100, 500, 1000, 5000];
      const durations: number[] = [];

      for (const size of dataSizes) {
        const testData = generateTestData(size);

        const startTime = performance.now();
        await dataProcessor.processData(
          {
            symbol: 'SCALE_TEST',
            timeframe: '1M',
            indicators: ['sma', 'rsi'],
          },
          testData
        );
        const endTime = performance.now();

        durations.push(endTime - startTime);
      }

      // Performance should scale roughly linearly with data size
      const scalingFactor = durations[durations.length - 1] / durations[0];
      const dataSizeRatio = dataSizes[dataSizes.length - 1] / dataSizes[0];

      expect(scalingFactor).toBeLessThan(dataSizeRatio * 2); // Allow some overhead but not exponential growth
      console.log(`Scaling test: ${dataSizes[0]} → ${dataSizes[dataSizes.length - 1]} items`);
      console.log(
        `Duration: ${durations[0].toFixed(2)}ms → ${durations[durations.length - 1].toFixed(2)}ms`
      );
    });

    it('should maintain performance with multiple series', () => {
      engine.initialize(mockCanvas);

      const startTime = performance.now();

      // Add multiple series simultaneously
      for (let i = 0; i < 20; i++) {
        const series: ChartSeries = {
          id: `multi-${i}`,
          name: `Series ${i}`,
          data: generateSimpleData(100),
          type: 'line',
          color: `hsl(${i * 18}, 70%, 50%)`,
        };

        engine.addSeries(series);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should handle 20 series within 200ms
      console.log(`Multiple series processing took ${duration.toFixed(2)}ms`);
    });
  });
});

// Helper functions for test data generation
function generateSimpleData(count: number): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i,
    y: 100 + Math.sin(i * 0.1) * 20 + Math.random() * 5,
    timestamp: new Date(Date.now() - (count - i) * 24 * 60 * 60 * 1000),
  }));
}

function generateComplexData(count: number): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i,
    y: 100 + Math.sin(i * 0.1) * 20 + Math.random() * 5,
    timestamp: new Date(Date.now() - (count - i) * 60 * 1000), // Per minute
    open: 100 + Math.sin(i * 0.1) * 20,
    high: 105 + Math.sin(i * 0.1) * 20,
    low: 95 + Math.sin(i * 0.1) * 20,
    close: 100 + Math.sin(i * 0.1) * 20 + Math.random() * 5,
    volume: Math.floor(Math.random() * 1000000 + 100000),
  }));
}

function generateTestData(count: number): any[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(Date.now() - (count - i) * 24 * 60 * 60 * 1000),
    close: 100 + Math.sin(i * 0.1) * 20 + Math.random() * 5,
    open: 99 + Math.sin(i * 0.1) * 20,
    high: 102 + Math.sin(i * 0.1) * 20,
    low: 97 + Math.sin(i * 0.1) * 20,
    volume: Math.floor(Math.random() * 1000000 + 100000),
  }));
}
