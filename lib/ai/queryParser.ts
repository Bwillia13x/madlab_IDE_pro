import type { PriceRange } from '../data/provider.types';

export interface ParsedQuery {
  type: 'price' | 'kpi' | 'financial' | 'technical' | 'news' | 'analysis';
  symbol: string;
  timeframe?: PriceRange;
  metric?: string;
  comparison?: string;
  filters?: Record<string, any>;
  rawQuery: string;
}

export interface QueryPattern {
  pattern: RegExp;
  parser: (matches: RegExpMatchArray) => ParsedQuery;
  priority: number;
}

export class NaturalLanguageQueryParser {
  private patterns: QueryPattern[] = [];
  private lastParsedQuery: ParsedQuery | null = null;

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Clear existing patterns
    this.patterns = [];

    // Priority 1: Most specific patterns (exact matches)
    
    // Volume queries with timeframes - highest priority
    this.patterns.push({
      pattern: /(?:what was|get|fetch|show me) (?:the )?(?:trading )?volume (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?) (yesterday|today|last week|last month|last year)\??/i,
      parser: (matches) => ({
        type: 'price',
        symbol: matches[1].toUpperCase(),
        timeframe: this.parseRelativeTimeframe(matches[2]),
        metric: 'volume',
        rawQuery: matches[0],
      }),
      priority: 1,
    });

    // Volume queries without timeframes - also high priority
    this.patterns.push({
      pattern: /(?:show me|get|fetch) (?:the )?(?:trading )?volume (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'price',
        symbol: matches[1].toUpperCase(),
        metric: 'volume',
        rawQuery: matches[0],
      }),
      priority: 1,
    });

    // Price queries with specific timeframes - highest priority
    this.patterns.push({
      pattern: /(?:show me|get|fetch) (?:the )?(?:stock )?price (?:of|for) ([A-Z]{1,5}(?:\.[A-Z])?) (?:over|in|for|during) (?:the last )?(\d+)? ?(days?|weeks?|months?|years?)/i,
      parser: (matches) => ({
        type: 'price',
        symbol: matches[1].toUpperCase(),
        timeframe: matches[2] && matches[3] ? this.parseTimeframe(matches[2], matches[3]) : this.parseTimeframe('1', matches[2] || matches[3]),
        metric: 'price',
        rawQuery: matches[0],
      }),
      priority: 1,
    });

    // P/E ratio queries - highest priority (removed duplicate)
    this.patterns.push({
      pattern: /(?:get|fetch) (?:the )?(P\/E|PE|price-to-earnings)(?:\s+ratio)? (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'kpi',
        symbol: matches[2].toUpperCase(),
        metric: 'pe_ratio',
        rawQuery: matches[0],
      }),
      priority: 1,
    });

    // Performance comparison queries - highest priority
    this.patterns.push({
      pattern: /(?:compare|compare the) (?:performance|prices|returns) (?:of|between) ([A-Z]{1,5}(?:\.[A-Z])?) (?:vs|versus|and) ([A-Z]{1,5}(?:\.[A-Z])?) (?:over|in|for|during) (?:the last )?(\d+)? ?(days?|weeks?|months?|years?)/i,
      parser: (matches) => ({
        type: 'analysis',
        symbol: `${matches[1].toUpperCase()},${matches[2].toUpperCase()}`,
        comparison: 'performance',
        metric: 'comparison',
        timeframe: matches[3] && matches[4] ? this.parseTimeframe(matches[3], matches[4]) : this.parseTimeframe('1', matches[3] || matches[4]),
        rawQuery: matches[0],
      }),
      priority: 1,
    });

    // Financial data queries with specific periods - highest priority
    this.patterns.push({
      pattern: /(?:show me|get|fetch) (?:the )?(cash flow) (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?) (Q[1-4] \d{4})/i,
      parser: (matches) => ({
        type: 'financial',
        symbol: matches[2].toUpperCase(),
        metric: 'cash_flow',
        filters: { period: matches[3] },
        rawQuery: matches[0],
      }),
      priority: 1,
    });

    this.patterns.push({
      pattern: /(?:get|fetch) (?:the )?(free cash flow) (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?) (last quarter)/i,
      parser: (matches) => ({
        type: 'financial',
        symbol: matches[2].toUpperCase(),
        metric: 'free_cash_flow',
        filters: { period: matches[3] },
        rawQuery: matches[0],
      }),
      priority: 1,
    });

    // Net income queries with specific years - highest priority
    this.patterns.push({
      pattern: /(?:get|fetch) (?:the )?(net income) (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?) (?:in|for) (\d{4})/i,
      parser: (matches) => ({
        type: 'financial',
        symbol: matches[2].toUpperCase(),
        metric: this.normalizeMetric(matches[1]),
        filters: { period: matches[3] },
        rawQuery: matches[0],
      }),
      priority: 1,
    });

    // Priority 2: Specific patterns with clear intent

    // Technical analysis queries
    this.patterns.push({
      pattern: /(?:show me|get|fetch|what is|calculate) (?:the )?(\d+)-?(?:day|week|month|year)? (?:moving average|MA|SMA|EMA) (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'technical',
        symbol: matches[2].toUpperCase(),
        metric: 'moving_average',
        filters: { period: parseInt(matches[1]) },
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    this.patterns.push({
      pattern: /(?:show me|get|fetch|what is|calculate) (?:the )?(?:RSI|rsi|relative strength index) (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'technical',
        symbol: matches[1].toUpperCase(),
        metric: 'rsi',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    this.patterns.push({
      pattern: /(?:show me|get|fetch|what is|calculate) (?:the )?(?:MACD|macd) (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'technical',
        symbol: matches[1].toUpperCase(),
        metric: 'macd',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    this.patterns.push({
      pattern: /(?:show me|get|fetch|what is|calculate) (?:the )?(?:Bollinger Bands|BB|bollinger|bollinger bands) (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'technical',
        symbol: matches[1].toUpperCase(),
        metric: 'bollinger_bands',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    // Price queries with years
    this.patterns.push({
      pattern: /(?:what was|get|fetch) (?:the )?price (?:of|for) ([A-Z]{1,5}(?:\.[A-Z])?) (last year|this year)/i,
      parser: (matches) => ({
        type: 'price',
        symbol: matches[1].toUpperCase(),
        timeframe: this.parseRelativeTimeframe(matches[2]),
        metric: 'price',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    // KPI queries - specific metrics
    this.patterns.push({
      pattern: /(?:what is|show me|get|fetch) (?:the )?(market cap|market capitalization|earnings per share|EPS|dividend yield|beta) (?:of|for) ([A-Z]{1,5}(?:\.[A-Z])?)\??/i,
      parser: (matches) => ({
        type: 'kpi',
        symbol: matches[2].toUpperCase(),
        metric: this.normalizeMetric(matches[1]),
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    // Price queries - specific pattern for "show me the price of"
    this.patterns.push({
      pattern: /(?:show me|get|fetch) (?:the )?price (?:of|for) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'price',
        symbol: matches[1].toUpperCase(),
        metric: 'price',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    // KPI queries - current price
    this.patterns.push({
      pattern: /(?:what is|show me|get|fetch) (?:the )?(?:current )?(?:price|stock price|value) (?:of|for) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'kpi',
        symbol: matches[1].toUpperCase(),
        metric: 'current_price',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    this.patterns.push({
      pattern: /(?:how much is|what is the value of) (?:the )?([A-Z]{1,5}(?:\.[A-Z])?) (?:stock worth\?)?/i,
      parser: (matches) => ({
        type: 'kpi',
        symbol: matches[1].toUpperCase(),
        metric: 'current_price',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    // Financial data queries with specific periods
    this.patterns.push({
      pattern: /(?:show me|get|fetch) (?:the )?(revenue|net income) (?:for|of) ([A-Z]{1,5}(?:\.[A-Z])?) (?:in|for|during|last year|Q[1-4] \d{4}|\d{4})/i,
      parser: (matches) => {
        const period = matches[3];
        let extractedPeriod = 'last year';
        
        if (period && period !== 'last year') {
          if (period.includes('Q')) {
            extractedPeriod = period;
          } else if (period.match(/\d{4}/)) {
            extractedPeriod = period;
          }
        }
        
        return {
          type: 'financial',
          symbol: matches[2].toUpperCase(),
          metric: this.normalizeMetric(matches[1]),
          filters: { period: extractedPeriod },
          rawQuery: matches[0],
        };
      },
      priority: 2,
    });

    // Simple symbol queries with timeframes
    this.patterns.push({
      pattern: /(?:show me|get|fetch) ([A-Z]{1,5}(?:\.[A-Z])?) (?:in|over|for) (?:the last )?(\d+) (days?|weeks?|months?|years?)/i,
      parser: (matches) => ({
        type: 'price',
        symbol: matches[1].toUpperCase(),
        timeframe: this.parseTimeframe(matches[2], matches[3]),
        metric: 'price',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    // News and sentiment queries
    this.patterns.push({
      pattern: /(?:show me|get|fetch) (?:the )?(?:latest|recent) (?:news|headlines) (?:for|about) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'news',
        symbol: matches[1].toUpperCase(),
        metric: 'news',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    this.patterns.push({
      pattern: /(?:what are|get|fetch) (?:the )?(?:latest|recent) (?:news|headlines) (?:about|for) ([A-Z]{1,5}(?:\.[A-Z])?)\??/i,
      parser: (matches) => ({
        type: 'news',
        symbol: matches[1].toUpperCase(),
        metric: 'news',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    this.patterns.push({
      pattern: /(?:what is|show me|get|fetch) (?:the )?(?:sentiment|market sentiment) (?:for|about) ([A-Z]{1,5}(?:\.[A-Z])?)/i,
      parser: (matches) => ({
        type: 'news',
        symbol: matches[1].toUpperCase(),
        metric: 'sentiment',
        rawQuery: matches[0],
      }),
      priority: 2,
    });

    // Priority 3: Generic patterns (fallbacks)

    // Generic price queries
    this.patterns.push({
      pattern: /(?:what is|show me|get|fetch) (?:the )?([A-Z]{1,5}(?:\.[A-Z])?) (?:stock|price|prices|data|trading volume|volume) (?:for|in|over|during|yesterday|today|last week|last month|last year|in the last )?(\d+)? ?(days?|weeks?|months?|years?)/i,
      parser: (matches) => ({
        type: 'price',
        symbol: matches[1].toUpperCase(),
        timeframe: matches[2] && matches[3] ? this.parseTimeframe(matches[2], matches[3]) : undefined,
        metric: matches[0].toLowerCase().includes('volume') ? 'volume' : 'price',
        rawQuery: matches[0],
      }),
      priority: 3,
    });

    // Simple symbol queries
    this.patterns.push({
      pattern: /^(?:get|fetch) ([A-Z]{1,5}(?:\.[A-Z])?)$/i,
      parser: (matches) => ({
        type: 'kpi',
        symbol: matches[1].toUpperCase(),
        metric: 'overview',
        rawQuery: matches[0],
      }),
      priority: 3,
    });

    // Generic KPI queries - lowest priority
    this.patterns.push({
      pattern: /^(?:what is|show me|get|fetch) (?:the )?([A-Z]{1,5}(?:\.[A-Z])?)$/i,
      parser: (matches) => ({
        type: 'kpi',
        symbol: matches[1].toUpperCase(),
        metric: 'overview',
        rawQuery: matches[0],
      }),
      priority: 3,
    });

    // Sort patterns by priority (lower number = higher priority)
    this.patterns.sort((a, b) => a.priority - b.priority);
  }

  private parseTimeframe(amount: string, unit: string): PriceRange {
    if (!amount || !unit) return '1D';
    
    const num = parseInt(amount);
    const unitLower = unit.toLowerCase();
    
    if (unitLower.includes('day')) {
      if (num <= 1) return '1D';
      if (num <= 5) return '5D';
      if (num <= 30) return '1M';
      if (num <= 90) return '3M';
      if (num <= 180) return '6M';
      if (num <= 365) return '1Y';
      if (num <= 730) return '2Y';
      return '5Y';
    } else if (unitLower.includes('week')) {
      const days = num * 7;
      if (days <= 30) return '1M';
      if (days <= 90) return '3M';
      if (days <= 180) return '6M';
      if (days <= 365) return '1Y';
      return '2Y';
    } else if (unitLower.includes('month')) {
      if (num <= 1) return '1M';
      if (num <= 3) return '3M';
      if (num <= 6) return '6M';
      if (num <= 12) return '1Y';
      if (num <= 24) return '2Y';
      return '5Y';
    } else if (unitLower.includes('year')) {
      if (num <= 1) return '1Y';
      if (num <= 2) return '2Y';
      if (num <= 5) return '5Y';
      return 'MAX';
    }
    
    return '6M'; // Default
  }

  private parseRelativeTimeframe(relativeTime: string): PriceRange {
    const timeLower = relativeTime.toLowerCase();
    
    if (timeLower.includes('yesterday') || timeLower.includes('today')) return '1D';
    if (timeLower.includes('last week')) return '1M';
    if (timeLower.includes('last month')) return '1M';
    if (timeLower.includes('last year')) return '1Y';
    
    return '1D'; // Default
  }

  private normalizeMetric(metric: string): string {
    const metricLower = metric.toLowerCase();
    
    if (metricLower.includes('market cap') || metricLower.includes('market capitalization')) return 'market_cap';
    if (metricLower.includes('p/e') || metricLower.includes('pe ratio')) return 'pe_ratio';
    if (metricLower.includes('eps')) return 'eps';
    if (metricLower.includes('dividend yield')) return 'dividend_yield';
    if (metricLower.includes('beta')) return 'beta';
    if (metricLower.includes('revenue')) return 'revenue';
    if (metricLower.includes('net income')) return 'net_income';
    if (metricLower.includes('cash flow')) return 'cash_flow';
    if (metricLower.includes('free cash flow')) return 'free_cash_flow';
    
    return metricLower.replace(/\s+/g, '_');
  }

  private normalizeTechnicalMetric(metric: string): string {
    const metricLower = metric.toLowerCase();
    
    if (metricLower.includes('rsi') || metricLower.includes('relative strength index')) return 'rsi';
    if (metricLower.includes('macd') || metricLower.includes('moving average convergence divergence')) return 'macd';
    if (metricLower.includes('bollinger')) return 'bollinger_bands';
    
    return metricLower.replace(/\s+/g, '_');
  }

  parse(query: string): ParsedQuery | null {
    // Clean the query by trimming whitespace and normalizing
    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    
    // Sort patterns by priority (highest first)
    const sortedPatterns = [...this.patterns].sort((a, b) => a.priority - b.priority);
    
    for (const pattern of sortedPatterns) {
      const matches = cleanQuery.match(pattern.pattern);
      if (matches) {
        try {
          const result = pattern.parser(matches);
          // Store the last parsed query for state management
          this.lastParsedQuery = result;
          return result;
        } catch (error) {
          console.error('Error parsing query with pattern:', pattern.pattern, error);
          continue;
        }
      }
    }
    
    return null;
  }

  parseMultiple(queries: string[]): ParsedQuery[] {
    const results: ParsedQuery[] = [];
    
    for (const query of queries) {
      const parsed = this.parse(query.trim());
      if (parsed !== null) {
        results.push(parsed);
      }
    }
    
    return results;
  }

  // Helper method to generate API calls from parsed queries
  generateAPICall(parsedQuery: ParsedQuery): {
    endpoint: string;
    params: Record<string, any>;
    method: string;
  } {
    const baseParams = { symbol: parsedQuery.symbol };
    
    switch (parsedQuery.type) {
      case 'price':
        return {
          endpoint: '/api/prices',
          params: { ...baseParams, range: parsedQuery.timeframe || '6M' },
          method: 'GET',
        };
        
      case 'kpi':
        return {
          endpoint: '/api/kpis',
          params: baseParams,
          method: 'GET',
        };
        
      case 'financial':
        return {
          endpoint: '/api/financials',
          params: { ...baseParams, ...parsedQuery.filters },
          method: 'GET',
        };
        
      case 'technical':
        return {
          endpoint: '/api/technical',
          params: { ...baseParams, indicator: parsedQuery.metric, ...parsedQuery.filters },
          method: 'GET',
        };
        
      case 'news':
        return {
          endpoint: '/api/news',
          params: baseParams,
          method: 'GET',
        };
        
      case 'analysis':
        return {
          endpoint: '/api/analysis',
          params: { ...baseParams, type: parsedQuery.comparison, range: parsedQuery.timeframe },
          method: 'GET',
        };
        
      default:
        return {
          endpoint: '/api/overview',
          params: baseParams,
          method: 'GET',
        };
    }
  }

  // Method to suggest similar queries
  suggestSimilar(query: string): string[] {
    const suggestions = [
      'What is the current price of AAPL?',
      'Show me the stock price of TSLA over the last month',
      'What was the trading volume for MSFT yesterday?',
      'Get the volume data for GOOGL over the last week',
      'Show me the 50-day moving average for AMZN',
      'Calculate the 200-day moving average for NVDA',
      'Compare the performance of AAPL vs MSFT over the last year',
      'Compare the returns of TSLA and NVDA in the last 6 months',
      'What are the latest news about AAPL?',
      'Get recent headlines for TSLA'
    ];

    // Filter out suggestions that are too similar to the original query
    const filtered = suggestions.filter(suggestion => 
      !suggestion.toLowerCase().includes(query.toLowerCase().split(' ')[0])
    );

    // Return different suggestions based on query type
    if (query.toLowerCase().includes('price')) {
      return [
        'What is the current price of AAPL?',
        'Show me the stock price of TSLA over the last month'
      ];
    }
    
    if (query.toLowerCase().includes('volume')) {
      return [
        'What was the trading volume for MSFT yesterday?',
        'Get the volume data for GOOGL over the last week'
      ];
    }
    
    if (query.toLowerCase().includes('moving average')) {
      return [
        'Show me the 50-day moving average for AMZN',
        'Calculate the 200-day moving average for NVDA'
      ];
    }
    
    if (query.toLowerCase().includes('compare')) {
      return [
        'Compare the performance of AAPL vs MSFT over the last year',
        'Compare the returns of TSLA and NVDA in the last 6 months'
      ];
    }
    
    if (query.toLowerCase().includes('news')) {
      return [
        'What are the latest news about AAPL?',
        'Get recent headlines for TSLA'
      ];
    }

    // Generic suggestions
    return [
      'What is the current price of AAPL?',
      'Show me the 50-day moving average for TSLA',
      'Compare the performance of MSFT vs GOOGL over the last year',
      'What are the latest news about NVDA?'
    ];
  }

  // Getter for last parsed query (for state management)
  getLastParsedQuery(): ParsedQuery | null {
    return this.lastParsedQuery;
  }
}

// Export singleton instance
export const queryParser = new NaturalLanguageQueryParser();
