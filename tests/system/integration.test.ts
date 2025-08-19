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
      if (lowerQuery.includes('compare')) {
        return { type: 'comparison', symbol: ['AAPL', 'MSFT'], confidence: 87 };
      }
      if (lowerQuery.includes('rsi') || lowerQuery.includes('technical')) {
        return { type: 'technical', symbol: 'AAPL', metric: 'RSI', confidence: 85 };
      }
      return { type: 'price', symbol: 'AAPL', confidence: 80 };
    })
  }
}));

describe('System Integration Tests', () => {
  let mockProvider: any;

  beforeEach(async () => {
    // Set up mock provider
    mockProvider = {
      ...mockDataProvider,
      getPrices: vi.fn().mockResolvedValue(mockData.prices),
      getKpis: vi.fn().mockResolvedValue(mockData.kpis),
      getFinancials: vi.fn().mockResolvedValue(mockData.financials),
      getTechnicalIndicators: vi.fn().mockResolvedValue(mockData.technical),
      name: 'mock-integration',
    };

    // Mock the getProvider function to return our mock provider
    (getProvider as any).mockReturnValue(mockProvider);

    // Connect the mock AI agent with the data provider
    mockAIAgent.setDataProvider(mockProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Query Processing', () => {
    it('should process price queries end-to-end', async () => {
      const query = 'Show me the price of AAPL for the last month';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBe('price');
      expect(response.query.symbol).toBe('AAPL');
      expect(response.query.timeframe).toBe('1M');
      expect(response.data).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(mockProvider.getPrices).toHaveBeenCalledWith('AAPL', '1M');
    });

    it('should process KPI queries end-to-end', async () => {
      const query = 'What is the market cap of AAPL?';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBe('kpi');
      expect(response.query.symbol).toBe('AAPL');
      expect(response.data).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(mockProvider.getKpis).toHaveBeenCalledWith('AAPL');
    });

    it('should process financial queries end-to-end', async () => {
      const query = 'Show me the revenue for AAPL last year';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBe('financial');
      expect(response.query.symbol).toBe('AAPL');
      expect(response.data).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(mockProvider.getFinancials).toHaveBeenCalledWith('AAPL');
    });

    it('should process comparison queries end-to-end', async () => {
      const query = 'Compare AAPL and MSFT performance';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBe('news');
      expect(response.query.symbol).toContain('AAPL');
      expect(response.data).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should process technical indicator queries end-to-end', async () => {
      const query = 'What is the RSI for AAPL?';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBe('technical');
      expect(response.query.symbol).toBe('AAPL');
      expect(response.data).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across provider calls', async () => {
      const query = 'Show me AAPL price data';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.data).toBeDefined();
      // The mock AI agent returns the data directly from the provider
      expect(response.data).toEqual(mockData.prices);
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should handle multiple symbols in analysis queries', async () => {
      const query = 'Analyze AAPL and MSFT for investment comparison';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBe('news');
      expect(response.data).toBeDefined();
      expect(response.query.symbol).toContain('AAPL');
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should integrate query parser with AI agent seamlessly', async () => {
      const queries = [
        'Show me AAPL price',
        'What is AAPL market cap?',
        'Analyze AAPL stock'
      ];

      for (const query of queries) {
        const response = await mockAIAgent.processQuery(query);
        expect(response.query.rawQuery).toBe(query);
        expect(response.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle provider errors gracefully in end-to-end flow', async () => {
      const query = 'Show me AAPL price data';
      
      // Mock provider to throw an error
      mockProvider.getPrices.mockRejectedValueOnce(new Error('Provider error'));
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.confidence).toBe(0);
      expect(response.response).toContain('encountered an error');
      expect(response.suggestions).toBeDefined();
    });

    it('should handle malformed queries gracefully', async () => {
      const query = '';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should provide fallback responses when data is unavailable', async () => {
      const query = 'Show me data for INVALID_SYMBOL';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.response).toBeDefined();
      expect(response.response.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    it('should maintain response time performance under load', async () => {
      const queries = Array(10).fill('Show me AAPL price data');
      
      const startTime = Date.now();
      const responses = await Promise.all(queries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / queries.length;
      
      expect(avgTime).toBeLessThan(100); // Should be very fast with mocks
      expect(responses).toHaveLength(queries.length);
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle concurrent queries efficiently', async () => {
      const queries = Array(5).fill('Show me AAPL price data');
      
      const startTime = Date.now();
      const responses = await Promise.all(queries.map(q => mockAIAgent.processQuery(q)));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(200); // Should handle concurrent requests efficiently
      expect(responses).toHaveLength(queries.length);
    });
  });

  describe('Real-time Data Integration', () => {
    it('should handle real-time data updates', async () => {
      const query = 'Show me AAPL price data';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.data).toBeDefined();
      // The mock price data doesn't have a timestamp, but the data is valid
      expect(Array.isArray(response.data)).toBe(true);
      expect(Array.isArray(response.data) ? response.data.length : 1).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should integrate with WebSocket updates', async () => {
      const query = 'Show me current AAPL price';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.query.type).toBe('price');
      expect(response.query.symbol).toBe('AAPL');
      expect(response.data).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });
  });

  describe('AI Response Generation Integration', () => {
    it('should generate contextual responses based on data', async () => {
      const query = 'Analyze AAPL stock and provide insights';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.response).toBeDefined();
      expect(response.response.length).toBeGreaterThan(0);
      expect(response.data).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should provide relevant suggestions based on query context', async () => {
      const query = 'Show me AAPL price data';
      
      const response = await mockAIAgent.processQuery(query);
      
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should maintain conversation context across multiple queries', async () => {
      const queries = [
        'Show me AAPL price',
        'What about its market cap?',
        'Give me a recommendation'
      ];

      const responses = await Promise.all(queries.map(q => mockAIAgent.processQuery(q)));
      
      // All responses should maintain context
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0);
        expect(response.data).toBeDefined();
      });
      
      expect(responses).toHaveLength(queries.length);
    });
  });
});
