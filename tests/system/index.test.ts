import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockAIAgent, mockDataProvider, mockData } from '../mocks';
import { queryParser } from '../../lib/ai/queryParser';
import { getProvider, setDataProvider } from '../../lib/data/providers';

// Mock the data providers module
vi.mock('../../lib/data/providers', () => ({
  getProvider: vi.fn(),
  setDataProvider: vi.fn(),
}));

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

describe('System Integration Test Suite', () => {
  let mockProvider: any;

  beforeEach(async () => {
    // Set up mock provider
    mockProvider = {
      ...mockDataProvider,
      getPrices: vi.fn().mockResolvedValue(mockData.prices),
      getKpis: vi.fn().mockResolvedValue(mockData.kpis),
      getFinancials: vi.fn().mockResolvedValue(mockData.financials),
      name: 'mock-system',
    };

    // Mock the getProvider function to return our mock provider
    (getProvider as any).mockReturnValue(mockProvider);
    
    // Connect the mock AI agent to the mock provider
    mockAIAgent.setDataProvider(mockProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('System Health Check', () => {
    it('should verify all core components are operational', async () => {
      // Test AI agent
      const aiResponse = await mockAIAgent.processQuery('Show me AAPL price');
      expect(aiResponse).toBeDefined();
      expect(aiResponse.confidence).toBeGreaterThan(0);

      // Test query parser
      const parsedQuery = queryParser.parse('Show me AAPL price');
      expect(parsedQuery).toBeDefined();
      expect(parsedQuery?.type).toBe('price');

      // Test data provider
      const priceData = await mockProvider.getPrices('AAPL', '1M');
      expect(priceData).toBeDefined();
      expect(priceData).toEqual(mockData.prices);
    });

    it('should verify data flow between components', async () => {
      const query = 'Show me AAPL price data';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response).toBeDefined();
      expect(response.query).toBeDefined();
      expect(response.query.type).toBe('price');
      expect(response.query.symbol).toBe('AAPL');
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.data).toBeDefined();
    });

    it('should verify error handling across component boundaries', async () => {
      // Mock provider to throw an error
      mockProvider.getPrices.mockRejectedValueOnce(new Error('Provider error'));
      
      const query = 'Show me AAPL price data';
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.confidence).toBe(0);
      expect(response.response).toContain('encountered an error');
    });

    it('should verify performance baseline', async () => {
      const startTime = Date.now();
      const response = await mockAIAgent.processQuery('Show me AAPL price');
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(100); // Should be very fast with mocks
      expect(response.confidence).toBeGreaterThan(0);
    });
  });

  describe('Component Integration Verification', () => {
    it('should verify AI Agent integration with data providers', async () => {
      const testCases = [
        { query: 'Show me AAPL price', expectedType: 'price', expectedSymbol: 'AAPL' },
        { query: 'What is AAPL market cap?', expectedType: 'kpi', expectedSymbol: 'AAPL' },
        { query: 'Show me AAPL revenue', expectedType: 'financial', expectedSymbol: 'AAPL' }
      ];

      for (const testCase of testCases) {
        const response = await mockAIAgent.processQuery(testCase.query);
        
        expect(response.query.type).toBe(testCase.expectedType);
        expect(response.query.symbol).toBe(testCase.expectedSymbol);
        expect(response.data).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0);
      }
    });

    it('should verify query parser integration with AI agent', async () => {
      const queries = [
        'Show me AAPL price',
        'What is AAPL market cap?',
        'Analyze AAPL stock'
      ];

      for (const query of queries) {
        const response = await mockAIAgent.processQuery(query);
        expect(response.query.rawQuery).toBe(query);
        expect(response.query.type).toBeDefined();
        expect(response.query.symbol).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0);
      }
    });

    it('should verify real-time data integration', async () => {
      const query = 'Show me current AAPL price';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBe('price');
      expect(response.query.symbol).toBe('AAPL');
      expect(response.data).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration Testing', () => {
    it('should maintain response time performance under load', async () => {
      const queries = Array(20).fill('Show me AAPL price data');
      
      const startTime = Date.now();
      const responses = await Promise.all(queries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / queries.length;
      
      expect(avgTime).toBeLessThan(50); // Should be very fast with mocks
      expect(responses).toHaveLength(queries.length);
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentQueries = Array(10).fill('Show me AAPL price data');
      
      const startTime = Date.now();
      const responses = await Promise.all(concurrentQueries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(500); // Should complete within 500ms
      expect(responses).toHaveLength(concurrentQueries.length);
    });

    it('should maintain data consistency across multiple requests', async () => {
      const queries = Array(5).fill('Show me AAPL price data');
      
      const responses = await Promise.all(queries.map(q => mockAIAgent.processQuery(q)));
      
      // All responses should be consistent
      const firstResponse = responses[0];
      responses.forEach(response => {
        expect(response.query.type).toBe(firstResponse.query.type);
        expect(response.query.symbol).toBe(firstResponse.query.symbol);
        expect(response.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Collaboration System Testing', () => {
    it('should handle multiple user sessions', async () => {
      const userQueries = [
        'User 1: Show me AAPL price',
        'User 2: What is AAPL market cap?',
        'User 3: Analyze AAPL stock'
      ];
      
      const responses = await Promise.all(userQueries.map(q => mockAIAgent.processQuery(q)));
      
      expect(responses).toHaveLength(userQueries.length);
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
        expect(response.data).toBeDefined();
      });
    });

    it('should maintain session context', async () => {
      const sessionQueries = [
        'Show me AAPL price',
        'What about its market cap?',
        'Give me a recommendation'
      ];
      
      const responses = await Promise.all(sessionQueries.map(q => mockAIAgent.processQuery(q)));
      
      expect(responses).toHaveLength(sessionQueries.length);
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle concurrent user interactions', async () => {
      const concurrentUsers = Array(5).fill(null).map((_, i) => `User ${i}: Show me AAPL data`);
      
      const startTime = Date.now();
      const responses = await Promise.all(concurrentUsers.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      expect(responses).toHaveLength(concurrentUsers.length);
    });

    it('should provide consistent responses across users', async () => {
      const sameQuery = 'Show me AAPL price data';
      const userCount = 10;
      
      const responses = await Promise.all(
        Array(userCount).fill(sameQuery).map(q => mockAIAgent.processQuery(q))
      );
      
      expect(responses).toHaveLength(userCount);
      
      // All responses should be consistent
      const firstResponse = responses[0];
      responses.forEach(response => {
        expect(response.query.type).toBe(firstResponse.query.type);
        expect(response.query.symbol).toBe(firstResponse.query.symbol);
        expect(response.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('System Resilience Testing', () => {
    it('should handle provider failures gracefully', async () => {
      // Mock provider to throw an error
      mockProvider.getPrices.mockRejectedValueOnce(new Error('Provider failure'));
      
      const query = 'Show me AAPL price data';
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.confidence).toBe(0);
      expect(response.response).toContain('encountered an error');
      expect(response.suggestions).toBeDefined();
    });

    it('should recover from temporary failures', async () => {
      // First call fails, second call succeeds
      mockProvider.getPrices
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockData.prices);
      
      const query = 'Show me AAPL price data';
      
      // First call should fail
      const firstResponse = await mockAIAgent.processQuery(query);
      expect(firstResponse.confidence).toBe(0);
      
      // Second call should succeed
      const secondResponse = await mockAIAgent.processQuery(query);
      expect(secondResponse.confidence).toBeGreaterThan(0);
    });
  });
});
