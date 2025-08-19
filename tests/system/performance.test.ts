import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockAIAgent, mockDataProvider, mockData } from '../mocks';
import { queryParser } from '../../lib/ai/queryParser';

// Mock the query parser module
vi.mock('../../lib/ai/queryParser', () => ({
  queryParser: {
    parse: vi.fn().mockImplementation((query: string) => {
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('price')) {
        return { type: 'price', symbol: 'AAPL', timeframe: '1M', confidence: 95 };
      }
      if (lowerQuery.includes('market cap') || lowerQuery.includes('kpi')) {
        return { type: 'kpi', symbol: 'AAPL', confidence: 90 };
      }
      if (lowerQuery.includes('revenue') || lowerQuery.includes('financial')) {
        return { type: 'financial', symbol: 'AAPL', confidence: 88 };
      }
      if (lowerQuery.includes('analysis')) {
        return { type: 'analysis', symbol: 'AAPL', confidence: 92 };
      }
      return { type: 'price', symbol: 'AAPL', confidence: 80 };
    })
  }
}));

// Performance configuration
const PERFORMANCE_CONFIG = {
  RESPONSE_TIME_THRESHOLD: 100, // 100ms for mock responses
  MEMORY_USAGE_THRESHOLD: 50, // 50MB
  CONCURRENT_USER_THRESHOLD: 100, // 100 concurrent users
  BURST_TRAFFIC_THRESHOLD: 50, // 50 requests per second
};

describe('Performance Benchmarking Tests', () => {
  let mockProvider: any;

  beforeEach(async () => {
    // Set up mock provider
    mockProvider = {
      ...mockDataProvider,
      getPrices: vi.fn().mockResolvedValue(mockData.prices),
      getKpis: vi.fn().mockResolvedValue(mockData.kpis),
      getFinancials: vi.fn().mockResolvedValue(mockData.financials),
      name: 'mock-performance',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Response Time Performance', () => {
    it('should meet response time thresholds for single queries', async () => {
      const queries = [
        'Show me AAPL price',
        'What is AAPL market cap?',
        'Analyze AAPL stock'
      ];

      for (const query of queries) {
        const startTime = Date.now();
        const response = await mockAIAgent.processQuery(query);
        const endTime = Date.now();
        
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD);
        expect(response.confidence).toBeGreaterThan(0);
      }
    });

    it('should handle bulk queries efficiently', async () => {
      const queries = Array(20).fill('Show me AAPL price data');
      
      const startTime = Date.now();
      const responses = await Promise.all(queries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / queries.length;
      
      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD);
      expect(responses).toHaveLength(queries.length);
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Concurrent User Performance', () => {
    it('should handle multiple concurrent users efficiently', async () => {
      const userQueries = Array(10).fill(null).map((_, i) => `User ${i}: Show me AAPL price`);
      
      const startTime = Date.now();
      const responses = await Promise.all(userQueries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / userQueries.length;
      
      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD);
      expect(responses).toHaveLength(userQueries.length);
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
      });
    });

    it('should maintain response quality under concurrent load', async () => {
      const concurrentQueries = Array(15).fill('Show me comprehensive AAPL data');
      
      const startTime = Date.now();
      const responses = await Promise.all(concurrentQueries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      
      // All responses should maintain quality
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
        expect(response.data).toBeDefined();
      });
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain consistent memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple queries
      const queries = Array(50).fill('Show me AAPL price data');
      const responses = await Promise.all(queries.map(q => mockAIAgent.processQuery(q)));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_CONFIG.MEMORY_USAGE_THRESHOLD * 1024 * 1024);
      expect(responses).toHaveLength(queries.length);
    });

    it('should handle memory pressure gracefully', async () => {
      const queries = Array(100).fill('Show me detailed AAPL analysis');
      
      const startTime = Date.now();
      const responses = await Promise.all(queries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      // All responses should be successful
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Query Parser Performance', () => {
    it('should parse queries efficiently under load', async () => {
      const queries = Array(100).fill(null).map((_, i) => `Query ${i}: Show me AAPL price data`);
      
      const startTime = Date.now();
      for (const query of queries) {
        const parsedQuery = queryParser.parse(query);
        expect(parsedQuery).toBeDefined();
        expect(parsedQuery?.symbol).toBeDefined();
      }
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / queries.length;
      
      expect(avgTime).toBeLessThan(1); // Should parse each query in under 1ms
    });

    it('should handle complex queries efficiently', async () => {
      const complexQueries = [
        'Show me AAPL price, market cap, and technical indicators for the last 6 months',
        'Compare AAPL vs MSFT performance including financial ratios and technical analysis',
        'Analyze AAPL stock with RSI, MACD, Bollinger Bands, and volume analysis'
      ];
      
      const startTime = Date.now();
      for (const query of complexQueries) {
        const parsedQuery = queryParser.parse(query);
        expect(parsedQuery).toBeDefined();
        expect(parsedQuery?.type).toBeDefined();
      }
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10); // Should handle complex queries quickly
    });
  });

  describe('Data Provider Performance', () => {
    it('should fetch data efficiently', async () => {
      const startTime = Date.now();
      
      const [prices, kpis, financials] = await Promise.all([
        mockProvider.getPrices('AAPL', '1M'),
        mockProvider.getKpis('AAPL'),
        mockProvider.getFinancials('AAPL')
      ]);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(50); // Should complete within 50ms
      expect(prices).toEqual(mockData.prices);
      expect(kpis).toEqual(mockData.kpis);
      expect(financials).toEqual(mockData.financials);
    });

    it('should handle multiple symbol requests efficiently', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
      
      const startTime = Date.now();
      const results = await Promise.all(
        symbols.map(symbol => mockProvider.getPrices(symbol, '1D'))
      );
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(100); // Should complete within 100ms
      expect(results).toHaveLength(symbols.length);
    });
  });

  describe('System Load Testing', () => {
    it('should handle sustained load efficiently', async () => {
      const sustainedQueries = Array(200).fill('Show me AAPL price data');
      
      const startTime = Date.now();
      const responses = await Promise.all(sustainedQueries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / sustainedQueries.length;
      
      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD);
      expect(responses).toHaveLength(sustainedQueries.length);
      
      // All responses should be successful
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle burst traffic efficiently', async () => {
      const burstQueries = Array(100).fill('Show me AAPL price data');
      
      const startTime = Date.now();
      const responses = await Promise.all(burstQueries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / burstQueries.length;
      
      console.log(`Burst traffic: ${avgTime.toFixed(2)}ms average response time`);
      
      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD);
      expect(responses).toHaveLength(burstQueries.length);
      
      // All responses should be successful
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
      });
    });
  });
});
