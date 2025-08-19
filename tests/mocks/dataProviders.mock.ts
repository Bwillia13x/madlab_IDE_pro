import { vi } from 'vitest'

// Mock data for different query types
export const createMockPriceData = (count: number = 3) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(2024, 0, i + 1);
    data.push({
      date: date, // Return Date object instead of string
      open: 100 + i * 2,
      high: 105 + i * 2,
      low: 98 + i * 2,
      close: 103 + i * 2,
      volume: 1000000 + i * 100000
    });
  }
  return data;
}

export const mockPriceData = createMockPriceData(3)

export const createMockKpiData = (symbol: string) => ({
  symbol: symbol.toUpperCase(),
  marketCap: 3000000000000,
  peRatio: 25.5,
  dividendYield: 0.5,
  beta: 1.2,
  volume: 50000000,
  price: symbol === 'AAPL' ? 150.00 : 2500.00, // Different prices for different symbols
  change: 2.50,
  changePercent: 1.67,
  timestamp: new Date()
})

export const mockKpiData = createMockKpiData('AAPL')

export const createMockFinancialData = (symbol: string) => ({
  symbol: symbol.toUpperCase(),
  revenue: 394328000000,
  netIncome: 96995000000,
  totalAssets: 352755000000,
  totalLiabilities: 287912000000,
  cashFlow: 122151000000,
  fcf: 100000000000,
  timestamp: new Date()
})

export const mockFinancialData = createMockFinancialData('AAPL')

export const mockTechnicalData = {
  symbol: 'AAPL',
  rsi: 65,
  macd: 0.5,
  macdSignal: 0.3,
  macdHistogram: 0.2,
  bollingerUpper: 155,
  bollingerLower: 145,
  bollingerMiddle: 150,
  timestamp: new Date().toISOString()
}

export const mockAnalysisData = {
  symbol: 'AAPL',
  trend: 'uptrend',
  support: 145,
  resistance: 155,
  recommendation: 'buy',
  risk: 'medium',
  confidence: 85,
  timestamp: new Date().toISOString()
}

// Create a comprehensive mock data provider
export const mockDataProvider = {
  name: 'mock',
  
  // Price data methods
  getPrices: vi.fn().mockImplementation((symbol: string, timeframe: string) => {
    const countMap: Record<string, number> = {
      '1D': 24, '5D': 120, '1M': 22, '3M': 66, '6M': 132, '1Y': 252, '2Y': 504, '5Y': 1260, 'MAX': 2520
    };
    const count = countMap[timeframe] || 66;
    return Promise.resolve(createMockPriceData(count));
  }),
  getPrice: vi.fn().mockResolvedValue(mockPriceData[0]),
  getPriceHistory: vi.fn().mockResolvedValue(mockPriceData),
  
  // KPI data methods
  getKpis: vi.fn().mockImplementation((symbol: string) => Promise.resolve(createMockKpiData(symbol))),
  getKpi: vi.fn().mockImplementation((symbol: string) => Promise.resolve(createMockKpiData(symbol))),
  
  // Financial data methods
  getFinancials: vi.fn().mockImplementation((symbol: string) => Promise.resolve(createMockFinancialData(symbol))),
  getFinancial: vi.fn().mockImplementation((symbol: string) => Promise.resolve(createMockFinancialData(symbol))),
  getIncomeStatement: vi.fn().mockResolvedValue(mockFinancialData),
  getBalanceSheet: vi.fn().mockResolvedValue(mockFinancialData),
  getCashFlow: vi.fn().mockResolvedValue(mockFinancialData),
  
  // Technical data methods
  getTechnicalIndicators: vi.fn().mockResolvedValue(mockTechnicalData),
  getRSI: vi.fn().mockResolvedValue(mockTechnicalData.rsi),
  getMACD: vi.fn().mockResolvedValue({
    macd: mockTechnicalData.macd,
    signal: mockTechnicalData.macdSignal,
    histogram: mockTechnicalData.macdHistogram
  }),
  
  // Analysis methods
  getAnalysis: vi.fn().mockResolvedValue(mockAnalysisData),
  getRecommendations: vi.fn().mockResolvedValue([mockAnalysisData]),
  
  // Real-time data methods
  getRealTimeData: vi.fn().mockResolvedValue({
    ...mockPriceData[0],
    timestamp: new Date().toISOString()
  }),
  
  // Provider utility methods
  isAvailable: vi.fn().mockResolvedValue(true),
  getLastUpdate: vi.fn().mockResolvedValue(new Date()),
  
  // Search and discovery methods
  searchSymbols: vi.fn().mockResolvedValue(['AAPL', 'MSFT', 'GOOGL']),
  getSymbolInfo: vi.fn().mockResolvedValue({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    sector: 'Technology'
  }),
  
  // Error simulation methods
  simulateError: vi.fn().mockRejectedValue(new Error('Mock provider error')),
  
  // Reset all mocks
  resetMocks: () => {
    vi.clearAllMocks()
  }
}

// Create specialized mock providers for different test scenarios
export const createMockProvider = (overrides: Partial<typeof mockDataProvider> = {}) => {
  return {
    ...mockDataProvider,
    ...overrides
  }
}

// Mock provider that always returns errors
export const mockErrorProvider = createMockProvider({
  name: 'mock-error',
  getPrices: vi.fn().mockRejectedValue(new Error('Failed to fetch prices')),
  getKpis: vi.fn().mockRejectedValue(new Error('Failed to fetch KPIs')),
  getFinancials: vi.fn().mockRejectedValue(new Error('Failed to fetch financials')),
})

// Mock provider that returns delayed responses
export const mockSlowProvider = createMockProvider({
  name: 'mock-slow',
  getPrices: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(mockPriceData), 100))
  ),
  getKpis: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(mockKpiData), 150))
  ),
})

// Mock provider that returns different data for different symbols
export const mockMultiSymbolProvider = createMockProvider({
  name: 'mock-multi-symbol',
  getPrices: vi.fn().mockImplementation((symbol: string) => {
    const symbolData: Record<string, typeof mockPriceData> = {
      AAPL: mockPriceData,
      MSFT: mockPriceData.map(p => ({ ...p, close: p.close + 10 })),
      GOOGL: mockPriceData.map(p => ({ ...p, close: p.close + 20 }))
    }
    return Promise.resolve(symbolData[symbol] || mockPriceData)
  }),
  getKpis: vi.fn().mockImplementation((symbol: string) => {
    const symbolData: Record<string, typeof mockKpiData> = {
      AAPL: mockKpiData,
      MSFT: { ...mockKpiData, symbol: 'MSFT', price: 160.00 },
      GOOGL: { ...mockKpiData, symbol: 'GOOGL', price: 170.00 }
    }
    return Promise.resolve(symbolData[symbol] || mockKpiData)
  }),
})

// Export all mock data for use in tests
export const mockData = {
  prices: mockPriceData,
  kpis: mockKpiData,
  financials: mockFinancialData,
  technical: mockTechnicalData,
  analysis: mockAnalysisData
}
