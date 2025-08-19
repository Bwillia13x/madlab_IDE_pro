import { vi } from 'vitest'
import type { ParsedQuery } from '../../lib/ai/queryParser'
import type { PriceRange } from '../../lib/data/provider.types'

// Mock parsed query responses for different query types
export const mockParsedQueries = {
  price: {
    type: 'price' as const,
    symbol: 'AAPL',
    timeframe: '1M' as PriceRange,
    metric: undefined,
    rawQuery: 'Show me the price of AAPL for the last month',
    confidence: 95
  },
  kpi: {
    type: 'kpi' as const,
    symbol: 'AAPL',
    timeframe: undefined,
    metric: undefined,
    rawQuery: 'What is the market cap of AAPL?',
    confidence: 90
  },
  financial: {
    type: 'financial' as const,
    symbol: 'AAPL',
    timeframe: '1Y' as PriceRange,
    metric: undefined,
    rawQuery: 'Show me the revenue for AAPL last year',
    confidence: 88
  },
  technical: {
    type: 'technical' as const,
    symbol: 'AAPL',
    timeframe: '1D' as PriceRange,
    metric: 'RSI',
    rawQuery: 'What is the RSI for AAPL?',
    confidence: 85
  },
  analysis: {
    type: 'analysis' as const,
    symbol: 'AAPL',
    timeframe: '1M' as PriceRange,
    metric: undefined,
    rawQuery: 'Analyze AAPL stock and give me a recommendation',
    confidence: 92
  },
  comparison: {
    type: 'news' as const, // Changed from 'comparison' to 'news' to match interface
    symbol: 'AAPL,MSFT', // Changed from array to string to match interface
    timeframe: '1M' as PriceRange,
    metric: undefined,
    rawQuery: 'Compare AAPL and MSFT performance',
    confidence: 87
  }
}

// Create a mock query parser
export const mockQueryParser = {
  parse: vi.fn().mockImplementation((query: string): ParsedQuery => {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('price') || lowerQuery.includes('stock price')) {
      return mockParsedQueries.price
    }
    if (lowerQuery.includes('market cap') || lowerQuery.includes('pe ratio') || lowerQuery.includes('kpi')) {
      return mockParsedQueries.kpi
    }
    if (lowerQuery.includes('revenue') || lowerQuery.includes('financial') || lowerQuery.includes('earnings')) {
      return mockParsedQueries.financial
    }
    if (lowerQuery.includes('rsi') || lowerQuery.includes('macd') || lowerQuery.includes('technical')) {
      return mockParsedQueries.technical
    }
    if (lowerQuery.includes('analysis') || lowerQuery.includes('trend') || lowerQuery.includes('recommendation')) {
      return mockParsedQueries.analysis
    }
    if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('and')) {
      return mockParsedQueries.comparison
    }
    
    // Default to price query
    return {
      ...mockParsedQueries.price,
      rawQuery: query,
      symbol: 'AAPL'
    }
  }),
  
  // Mock confidence calculation
  calculateConfidence: vi.fn().mockImplementation((query: string): number => {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('price')) return 95
    if (lowerQuery.includes('kpi')) return 90
    if (lowerQuery.includes('financial')) return 88
    if (lowerQuery.includes('technical')) return 85
    if (lowerQuery.includes('analysis')) return 92
    if (lowerQuery.includes('compare')) return 87
    
    return 80
  }),
  
  // Mock query validation
  validateQuery: vi.fn().mockImplementation((query: string): boolean => {
    return query.length > 0 && query.includes('AAPL')
  }),
  
  // Mock query classification
  classifyQuery: vi.fn().mockImplementation((query: string): string => {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('price')) return 'price'
    if (lowerQuery.includes('kpi')) return 'kpi'
    if (lowerQuery.includes('financial')) return 'financial'
    if (lowerQuery.includes('technical')) return 'technical'
    if (lowerQuery.includes('analysis')) return 'analysis'
    if (lowerQuery.includes('compare')) return 'comparison'
    
    return 'price'
  }),
  
  // Mock symbol extraction
  extractSymbol: vi.fn().mockImplementation((query: string): string => {
    const symbolMatch = query.match(/\b[A-Z]{1,5}\b/)
    return symbolMatch ? symbolMatch[0] : 'AAPL'
  }),
  
  // Mock timeframe extraction
  extractTimeframe: vi.fn().mockImplementation((query: string): string => {
    if (query.includes('month') || query.includes('1M')) return '1M'
    if (query.includes('week') || query.includes('1W')) return '1W'
    if (query.includes('day') || query.includes('1D')) return '1D'
    if (query.includes('year') || query.includes('1Y')) return '1Y'
    return '1D'
  }),
  
  // Mock metric extraction
  extractMetric: vi.fn().mockImplementation((query: string): string => {
    if (query.includes('rsi')) return 'RSI'
    if (query.includes('macd')) return 'MACD'
    if (query.includes('volume')) return 'Volume'
    if (query.includes('bollinger')) return 'Bollinger Bands'
    return 'RSI'
  }),
  
  // Reset all mocks
  resetMocks: () => {
    vi.clearAllMocks()
  }
}

// Export the mock query parser for use in tests
export default mockQueryParser
