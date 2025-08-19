import { vi } from 'vitest'
import type { ParsedQuery } from '../../lib/ai/queryParser'
import type { MarketInsight } from '../../lib/ai/agent'
import type { PriceRange } from '../../lib/data/provider.types'

// Mock responses for different query types
const mockResponses = {
  price: {
    response: "The current price of AAPL is $150.00. The stock has shown a positive trend over the past month with increasing volume.",
    confidence: 95,
    data: {
      symbol: 'AAPL',
      price: 150.00,
      change: 2.50,
      changePercent: 1.67,
      volume: 50000000,
      timestamp: new Date().toISOString()
    }
  },
  kpi: {
    response: "AAPL has a market cap of $3 trillion, P/E ratio of 25.5, and dividend yield of 0.5%. The stock shows strong fundamentals.",
    confidence: 90,
    data: {
      symbol: 'AAPL',
      marketCap: 3000000000000,
      peRatio: 25.5,
      dividendYield: 0.5,
      beta: 1.2
    }
  },
  financial: {
    response: "AAPL's revenue for the last fiscal year was $394.3 billion with net income of $97 billion. The company has strong cash flow of $122.2 billion.",
    confidence: 88,
    data: {
      symbol: 'AAPL',
      revenue: 394328000000,
      netIncome: 96995000000,
      totalAssets: 352755000000,
      totalLiabilities: 287912000000,
      cashFlow: 122151000000
    }
  },
  technical: {
    response: "The RSI for AAPL is currently at 65, indicating moderate bullish momentum. The MACD shows a positive crossover suggesting upward trend continuation.",
    confidence: 85,
    data: {
      symbol: 'AAPL',
      rsi: 65,
      macd: 0.5,
      macdSignal: 0.3,
      macdHistogram: 0.2
    }
  },
  analysis: {
    response: "AAPL shows strong technical and fundamental indicators. The stock is in an uptrend with support at $145 and resistance at $155. Consider buying on pullbacks.",
    confidence: 92,
    data: {
      symbol: 'AAPL',
      trend: 'uptrend',
      support: 145,
      resistance: 155,
      recommendation: 'buy',
      risk: 'medium'
    }
  },
  comparison: {
    response: "Comparing AAPL and MSFT, both stocks show strong fundamentals. AAPL has higher market cap while MSFT shows better growth metrics.",
    confidence: 87,
    data: {
      symbols: ['AAPL', 'MSFT'],
      comparison: {
        marketCap: { AAPL: 3000000000000, MSFT: 2800000000000 },
        peRatio: { AAPL: 25.5, MSFT: 30.2 },
        growth: { AAPL: 15, MSFT: 22 }
      }
    }
  }
}

// Mock market insights
const mockInsights: MarketInsight[] = [
  {
    type: 'trend',
    symbol: 'AAPL',
    description: 'Strong uptrend with increasing volume and positive momentum indicators',
    confidence: 85,
    indicators: ['RSI', 'MACD', 'Volume'],
    timestamp: new Date()
  },
  {
    type: 'volatility',
    symbol: 'AAPL',
    description: 'Moderate volatility with potential for breakout above resistance',
    confidence: 78,
    indicators: ['Bollinger Bands', 'ATR'],
    timestamp: new Date()
  }
]

// Create a mock AI agent class that integrates with data providers
export class MockAIAgent {
  private context: string[] = []
  private maxContextLength = 10
  private dataProvider: any = null

  // Method to set the data provider for integration testing
  setDataProvider(provider: any) {
    this.dataProvider = provider
  }

  async processQuery(query: string) {
    // Parse the query to determine type
    const queryType = this.determineQueryType(query)
    const mockResponse = mockResponses[queryType] || mockResponses.price
    
    // Generate a parsed query object
    const parsedQuery: ParsedQuery = {
      type: queryType === 'comparison' ? 'news' : queryType,
      symbol: this.extractSymbol(query),
      timeframe: this.extractTimeframe(query),
      metric: this.extractMetric(query),
      rawQuery: query,
    };

    // For technical queries, ensure we have the right symbol
    if (queryType === 'technical') {
      // Look for stock symbols in the query more carefully
      // First try to find uppercase stock symbols
      const symbolMatch = query.match(/\b[A-Z]{1,5}\b/)
      if (symbolMatch) {
        parsedQuery.symbol = symbolMatch[0]
      } else {
        // Fallback to common stocks mentioned in the query
        const lowerQuery = query.toLowerCase()
        if (lowerQuery.includes('aapl') || lowerQuery.includes('apple')) {
          parsedQuery.symbol = 'AAPL'
        } else if (lowerQuery.includes('msft') || lowerQuery.includes('microsoft')) {
          parsedQuery.symbol = 'MSFT'
        } else if (lowerQuery.includes('googl') || lowerQuery.includes('google')) {
          parsedQuery.symbol = 'GOOGL'
        } else {
          parsedQuery.symbol = 'AAPL' // default
        }
      }
      
      // Double-check that we didn't pick up a technical indicator as the symbol
      if (parsedQuery.symbol === 'RSI' || parsedQuery.symbol === 'MACD' || parsedQuery.symbol === 'BB') {
        // If we picked up a technical indicator, look for actual stock symbols
        const lowerQuery = query.toLowerCase()
        if (lowerQuery.includes('aapl') || lowerQuery.includes('apple')) {
          parsedQuery.symbol = 'AAPL'
        } else if (lowerQuery.includes('msft') || lowerQuery.includes('microsoft')) {
          parsedQuery.symbol = 'MSFT'
        } else if (lowerQuery.includes('googl') || lowerQuery.includes('google')) {
          parsedQuery.symbol = 'GOOGL'
        } else {
          parsedQuery.symbol = 'AAPL' // default
        }
      }
    }

    // If we have a data provider, try to fetch real data
    let responseData = mockResponse.data
    let finalConfidence = mockResponse.confidence

    if (this.dataProvider) {
      try {
        // Attempt to fetch data from provider based on query type
        switch (queryType) {
          case 'price':
            if (this.dataProvider.getPrices) {
              const timeframe = this.extractTimeframe(query)
              responseData = await this.dataProvider.getPrices(parsedQuery.symbol, timeframe)
            }
            break
          case 'kpi':
            if (this.dataProvider.getKpis) {
              responseData = await this.dataProvider.getKpis(parsedQuery.symbol)
            }
            break
          case 'financial':
            if (this.dataProvider.getFinancials) {
              responseData = await this.dataProvider.getFinancials(parsedQuery.symbol)
            }
            break
          case 'technical':
            if (this.dataProvider.getTechnicalIndicators) {
              responseData = await this.dataProvider.getTechnicalIndicators(parsedQuery.symbol)
            }
            break
        }
      } catch (error) {
        // If provider fails, use fallback data and set confidence to 0
        responseData = mockResponse.data
        finalConfidence = 0
        mockResponse.response = `I encountered an error while fetching data for ${parsedQuery.symbol}. ${mockResponse.response}`
      }
    }

    // Add to context
    this.addToContext(query, mockResponse.response)

    return {
      query: parsedQuery,
      response: mockResponse.response,
      data: responseData,
      confidence: finalConfidence,
      suggestions: this.generateSuggestions(queryType),
      insights: this.shouldGenerateInsights(parsedQuery) ? mockInsights : null,
      timestamp: new Date()
    }
  }

  private determineQueryType(query: string): 'price' | 'kpi' | 'financial' | 'technical' | 'analysis' | 'comparison' {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('and')) {
      return 'comparison'
    }
    if (lowerQuery.includes('price') || lowerQuery.includes('stock price')) {
      return 'price'
    }
    if (lowerQuery.includes('market cap') || lowerQuery.includes('pe ratio') || lowerQuery.includes('kpi')) {
      return 'kpi'
    }
    if (lowerQuery.includes('revenue') || lowerQuery.includes('financial') || lowerQuery.includes('earnings')) {
      return 'financial'
    }
    if (lowerQuery.includes('rsi') || lowerQuery.includes('macd') || lowerQuery.includes('technical')) {
      return 'technical'
    }
    if (lowerQuery.includes('analysis') || lowerQuery.includes('trend') || lowerQuery.includes('recommendation')) {
      return 'analysis'
    }
    
    return 'price' // default
  }

  private extractSymbol(query: string): string {
    // Look for stock symbols (uppercase letters, 1-5 characters)
    const symbolMatch = query.match(/\b[A-Z]{1,5}\b/)
    if (symbolMatch) {
      return symbolMatch[0]
    }
    
    // If no symbol found, look for common stock names
    const lowerQuery = query.toLowerCase()
    if (lowerQuery.includes('aapl') || lowerQuery.includes('apple')) return 'AAPL'
    if (lowerQuery.includes('msft') || lowerQuery.includes('microsoft')) return 'MSFT'
    if (lowerQuery.includes('googl') || lowerQuery.includes('google')) return 'GOOGL'
    if (lowerQuery.includes('tsla') || lowerQuery.includes('tesla')) return 'TSLA'
    if (lowerQuery.includes('amzn') || lowerQuery.includes('amazon')) return 'AMZN'
    if (lowerQuery.includes('meta') || lowerQuery.includes('facebook')) return 'META'
    if (lowerQuery.includes('nvda') || lowerQuery.includes('nvidia')) return 'NVDA'
    
    return 'AAPL' // default
  }

  private extractTimeframe(query: string): PriceRange | undefined {
    if (query.includes('month') || query.includes('1M')) return '1M'
    if (query.includes('week') || query.includes('1W')) return '5D' // Map 1W to 5D
    if (query.includes('day') || query.includes('1D')) return '1D'
    if (query.includes('year') || query.includes('1Y')) return '1Y'
    if (query.includes('3M')) return '3M'
    if (query.includes('6M')) return '6M'
    if (query.includes('2Y')) return '2Y'
    if (query.includes('5Y')) return '5Y'
    if (query.includes('MAX')) return 'MAX'
    return undefined
  }

  private extractMetric(query: string): string {
    if (query.includes('rsi')) return 'RSI'
    if (query.includes('macd')) return 'MACD'
    if (query.includes('volume')) return 'Volume'
    if (query.includes('bollinger')) return 'Bollinger Bands'
    return 'RSI'
  }

  private shouldGenerateInsights(parsedQuery: ParsedQuery): boolean {
    return ['price', 'technical', 'analysis'].includes(parsedQuery.type)
  }

  private generateSuggestions(queryType: string): string[] {
    const suggestions: Record<string, string[]> = {
      price: [
        'Try asking about specific timeframes (1D, 1W, 1M, 1Y)',
        'Ask for price comparisons between different stocks',
        'Request volume analysis with price data'
      ],
      kpi: [
        'Compare KPIs across different companies',
        'Ask for historical KPI trends',
        'Request sector-specific KPI analysis'
      ],
      financial: [
        'Ask for quarterly vs annual comparisons',
        'Request cash flow analysis',
        'Compare financial ratios across peers'
      ],
      technical: [
        'Ask for multiple technical indicators',
        'Request trend analysis with support/resistance',
        'Ask for volume confirmation of technical signals'
      ],
      analysis: [
        'Request risk assessment',
        'Ask for entry/exit points',
        'Request sector comparison analysis'
      ],
      comparison: [
        'Ask for specific metrics comparison',
        'Request performance analysis over time',
        'Ask for sector comparison'
      ]
    }
    
    return suggestions[queryType] || suggestions.price
  }

  private addToContext(query: string, response: string): void {
    this.context.push(`Q: ${query}\nA: ${response}`)
    
    if (this.context.length > this.maxContextLength) {
      this.context.shift()
    }
  }

  // Mock method to simulate LLM call
  private async callLLM(prompt: string): Promise<string> {
    // Return a mock response instead of making real API calls
    return "This is a mock LLM response for testing purposes. The AI agent is properly mocked."
  }
}

// Export the mock class for use in tests
export const mockAIAgent = new MockAIAgent()

// Mock the AI agent module
export const mockAIAgentModule = {
  AIAgent: MockAIAgent,
  mockAIAgent
}
