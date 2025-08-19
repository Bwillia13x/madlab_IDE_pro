import { describe, it, expect, beforeEach } from 'vitest';
import { queryParser, NaturalLanguageQueryParser } from '../../lib/ai/queryParser';
import type { ParsedQuery } from '../../lib/ai/queryParser';

describe('NaturalLanguageQueryParser', () => {
  let parser: NaturalLanguageQueryParser;

  beforeEach(() => {
    parser = new NaturalLanguageQueryParser();
  });

  describe('Price Data Queries', () => {
    it('should parse volume queries', () => {
      const query = 'What was the trading volume for AAPL yesterday?';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'price',
        symbol: 'AAPL',
        timeframe: '1D',
        metric: 'volume',
        rawQuery: query,
      });
    });

    it('should parse price queries with timeframes', () => {
      const query = 'Show me the stock price of TSLA over the last month';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'price',
        symbol: 'TSLA',
        timeframe: '1M',
        metric: 'price',
        rawQuery: query,
      });
    });

    it('should parse queries with specific time periods', () => {
      const query = 'Get the price of MSFT in the last 5 days';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'price',
        symbol: 'MSFT',
        timeframe: '5D',
        metric: 'price',
        rawQuery: query,
      });
    });

    it('should parse queries with years', () => {
      const query = 'What was the price of GOOGL last year';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'price',
        symbol: 'GOOGL',
        timeframe: '1Y',
        metric: 'price',
        rawQuery: query,
      });
    });
  });

  describe('Technical Analysis Queries', () => {
    it('should parse moving average queries', () => {
      const query = 'Show me the 50-day moving average for AMZN';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'technical',
        symbol: 'AMZN',
        metric: 'moving_average',
        filters: { period: 50 },
        rawQuery: query,
      });
    });

    it('should parse RSI queries', () => {
      const query = 'Calculate the RSI for NVDA';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'technical',
        symbol: 'NVDA',
        metric: 'rsi',
        rawQuery: query,
      });
    });

    it('should parse MACD queries', () => {
      const query = 'Get the MACD for AAPL';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'technical',
        symbol: 'AAPL',
        metric: 'macd',
        rawQuery: query,
      });
    });

    it('should parse Bollinger Bands queries', () => {
      const query = 'Calculate the Bollinger bands for TSLA';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'technical',
        symbol: 'TSLA',
        metric: 'bollinger_bands',
        rawQuery: query,
      });
    });
  });

  describe('KPI Queries', () => {
    it('should parse market cap queries', () => {
      const query = 'What is the market cap of AAPL?';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'kpi',
        symbol: 'AAPL',
        metric: 'market_cap',
        rawQuery: query,
      });
    });

    it('should parse P/E ratio queries', () => {
      const query = 'Get the P/E ratio for MSFT';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'kpi',
        symbol: 'MSFT',
        metric: 'pe_ratio',
        rawQuery: query,
      });
    });

    it('should parse EPS queries', () => {
      const query = 'What is the EPS of GOOGL?';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'kpi',
        symbol: 'GOOGL',
        metric: 'eps',
        rawQuery: query,
      });
    });

    it('should parse dividend yield queries', () => {
      const query = 'Get the dividend yield for JNJ';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'kpi',
        symbol: 'JNJ',
        metric: 'dividend_yield',
        rawQuery: query,
      });
    });

    it('should parse beta queries', () => {
      const query = 'What is the beta of TSLA?';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'kpi',
        symbol: 'TSLA',
        metric: 'beta',
        rawQuery: query,
      });
    });

    it('should parse current price queries', () => {
      const query = 'How much is the AAPL stock worth?';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'kpi',
        symbol: 'AAPL',
        metric: 'current_price',
        rawQuery: query,
      });
    });
  });

  describe('Financial Data Queries', () => {
    it('should parse revenue queries', () => {
      const query = 'Show me the revenue for AAPL last year';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'financial',
        symbol: 'AAPL',
        metric: 'revenue',
        filters: { period: 'last year' },
        rawQuery: query,
      });
    });

    it('should parse net income queries', () => {
      const query = 'Get the net income for MSFT in 2023';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'financial',
        symbol: 'MSFT',
        metric: 'net_income',
        filters: { period: '2023' },
        rawQuery: query,
      });
    });

    it('should parse cash flow queries', () => {
      const query = 'Show me the cash flow for GOOGL Q3 2023';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'financial',
        symbol: 'GOOGL',
        metric: 'cash_flow',
        filters: { period: 'Q3 2023' },
        rawQuery: query,
      });
    });

    it('should parse free cash flow queries', () => {
      const query = 'Get the free cash flow for NVDA last quarter';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'financial',
        symbol: 'NVDA',
        metric: 'free_cash_flow',
        filters: { period: 'last quarter' },
        rawQuery: query,
      });
    });
  });

  describe('Comparison Queries', () => {
    it('should parse performance comparison queries', () => {
      const query = 'Compare the performance of AAPL vs MSFT over the last year';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'analysis',
        symbol: 'AAPL,MSFT',
        timeframe: '1Y',
        metric: 'comparison',
        comparison: 'performance',
        rawQuery: query,
      });
    });

    it('should parse price comparison queries', () => {
      const query = 'Compare the prices of TSLA and NVDA in the last 6 months';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'analysis',
        symbol: 'TSLA,NVDA',
        timeframe: '6M',
        metric: 'comparison',
        comparison: 'performance',
        rawQuery: query,
      });
    });

    it('should parse returns comparison queries', () => {
      const query = 'Compare the returns of GOOGL vs AMZN over the last 2 years';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'analysis',
        symbol: 'GOOGL,AMZN',
        timeframe: '2Y',
        metric: 'comparison',
        comparison: 'performance',
        rawQuery: query,
      });
    });
  });

  describe('News and Sentiment Queries', () => {
    it('should parse news queries', () => {
      const query = 'What are the latest news about AAPL?';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'news',
        symbol: 'AAPL',
        metric: 'news',
        rawQuery: query,
      });
    });

    it('should parse headlines queries', () => {
      const query = 'Get recent headlines for TSLA';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'news',
        symbol: 'TSLA',
        metric: 'news',
        rawQuery: query,
      });
    });
  });

  describe('Simple Symbol Queries', () => {
    it('should parse generic symbol queries', () => {
      const query = 'Show me AAPL';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'kpi',
        symbol: 'AAPL',
        metric: 'overview',
        rawQuery: query,
      });
    });

    it('should parse fetch symbol queries', () => {
      const query = 'Fetch MSFT';
      const result = parser.parse(query);
      
      expect(result).toEqual({
        type: 'kpi',
        symbol: 'MSFT',
        metric: 'overview',
        rawQuery: query,
      });
    });
  });

  describe('Timeframe Parsing', () => {
    it('should parse day timeframes correctly', () => {
      const query = 'Show me AAPL in the last 3 days';
      const result = parser.parse(query);
      expect(result?.timeframe).toBe('5D');
    });

    it('should parse week timeframes correctly', () => {
      const query = 'Show me TSLA in the last 2 weeks';
      const result = parser.parse(query);
      expect(result?.timeframe).toBe('1M');
    });

    it('should parse month timeframes correctly', () => {
      const query = 'Show me MSFT in the last 4 months';
      const result = parser.parse(query);
      expect(result?.timeframe).toBe('6M');
    });

    it('should parse year timeframes correctly', () => {
      const query = 'Show me GOOGL in the last 3 years';
      const result = parser.parse(query);
      expect(result?.timeframe).toBe('5Y');
    });
  });

  describe('Query Priority', () => {
    it('should prioritize specific queries over generic ones', () => {
      const specificQuery = 'What is the 50-day moving average for AAPL?';
      const genericQuery = 'Show me AAPL';
      
      const specificResult = parser.parse(specificQuery);
      const genericResult = parser.parse(genericQuery);
      
      expect(specificResult?.type).toBe('technical');
      expect(genericResult?.type).toBe('kpi');
    });

    it('should handle overlapping patterns correctly', () => {
      const query = 'Show me the volume for AAPL yesterday';
      const result = parser.parse(query);
      
      expect(result?.type).toBe('price');
      expect(result?.metric).toBe('volume');
    });
  });

  describe('Multiple Query Parsing', () => {
    it('should parse multiple queries', () => {
      const queries = [
        'What is the price of AAPL?',
        'Show me the volume for TSLA',
        'Get the P/E ratio of MSFT',
      ];
      
      const results = parser.parseMultiple(queries);
      
      expect(results).toHaveLength(3);
      expect(results[0]?.type).toBe('kpi');
      expect(results[1]?.type).toBe('price');
      expect(results[2]?.type).toBe('kpi');
    });

    it('should filter out unparseable queries', () => {
      const queries = [
        'What is the price of AAPL?',
        'Random text that cannot be parsed',
        'Show me the volume for TSLA',
      ];
      
      const results = parser.parseMultiple(queries);
      
      expect(results).toHaveLength(2);
      expect(results[0]?.symbol).toBe('AAPL');
      expect(results[1]?.symbol).toBe('TSLA');
    });
  });

  describe('API Call Generation', () => {
    it('should generate price API calls', () => {
      const parsedQuery: ParsedQuery = {
        type: 'price',
        symbol: 'AAPL',
        timeframe: '1M',
        metric: 'price',
        rawQuery: 'Show me AAPL price over last month',
      };
      
      const apiCall = parser.generateAPICall(parsedQuery);
      
      expect(apiCall.endpoint).toBe('/api/prices');
      expect(apiCall.params.symbol).toBe('AAPL');
      expect(apiCall.params.range).toBe('1M');
      expect(apiCall.method).toBe('GET');
    });

    it('should generate KPI API calls', () => {
      const parsedQuery: ParsedQuery = {
        type: 'kpi',
        symbol: 'MSFT',
        metric: 'market_cap',
        rawQuery: 'What is MSFT market cap?',
      };
      
      const apiCall = parser.generateAPICall(parsedQuery);
      
      expect(apiCall.endpoint).toBe('/api/kpis');
      expect(apiCall.params.symbol).toBe('MSFT');
      expect(apiCall.method).toBe('GET');
    });

    it('should generate technical API calls', () => {
      const parsedQuery: ParsedQuery = {
        type: 'technical',
        symbol: 'TSLA',
        metric: 'moving_average',
        filters: { period: 50 },
        rawQuery: 'Show me 50-day MA for TSLA',
      };
      
      const apiCall = parser.generateAPICall(parsedQuery);
      
      expect(apiCall.endpoint).toBe('/api/technical');
      expect(apiCall.params.indicator).toBe('moving_average');
      expect(apiCall.params.period).toBe(50);
      expect(apiCall.method).toBe('GET');
    });

    it('should generate financial API calls', () => {
      const parsedQuery: ParsedQuery = {
        type: 'financial',
        symbol: 'GOOGL',
        metric: 'revenue',
        filters: { period: '2023' },
        rawQuery: 'Show me GOOGL revenue for 2023',
      };
      
      const apiCall = parser.generateAPICall(parsedQuery);
      
      expect(apiCall.endpoint).toBe('/api/financials');
      expect(apiCall.params.symbol).toBe('GOOGL');
      expect(apiCall.params.period).toBe('2023');
      expect(apiCall.method).toBe('GET');
    });

    it('should generate news API calls', () => {
      const parsedQuery: ParsedQuery = {
        type: 'news',
        symbol: 'NVDA',
        metric: 'news',
        rawQuery: 'Get news for NVDA',
      };
      
      const apiCall = parser.generateAPICall(parsedQuery);
      
      expect(apiCall.endpoint).toBe('/api/news');
      expect(apiCall.params.symbol).toBe('NVDA');
      expect(apiCall.method).toBe('GET');
    });

    it('should generate analysis API calls', () => {
      const parsedQuery: ParsedQuery = {
        type: 'analysis',
        symbol: 'AAPL,MSFT',
        timeframe: '1Y',
        metric: 'comparison',
        comparison: 'performance',
        rawQuery: 'Compare AAPL vs MSFT',
      };
      
      const apiCall = parser.generateAPICall(parsedQuery);
      
      expect(apiCall.endpoint).toBe('/api/analysis');
      expect(apiCall.params.symbol).toBe('AAPL,MSFT');
      expect(apiCall.params.type).toBe('performance');
      expect(apiCall.params.range).toBe('1Y');
      expect(apiCall.method).toBe('GET');
    });
  });

  describe('Query Suggestions', () => {
    it('should suggest price-related queries', () => {
      const query = 'What is the price of AAPL?';
      const suggestions = parser.suggestSimilar(query);
      
      expect(suggestions).toContain('What is the current price of AAPL?');
      expect(suggestions).toContain('Show me the stock price of TSLA over the last month');
    });

    it('should suggest volume-related queries', () => {
      const query = 'Show me volume for TSLA';
      const suggestions = parser.suggestSimilar(query);
      
      expect(suggestions).toContain('What was the trading volume for MSFT yesterday?');
      expect(suggestions).toContain('Get the volume data for GOOGL over the last week');
    });

    it('should suggest technical analysis queries', () => {
      const query = 'Calculate moving average for AAPL';
      const suggestions = parser.suggestSimilar(query);
      
      expect(suggestions).toContain('Show me the 50-day moving average for AMZN');
      expect(suggestions).toContain('Calculate the 200-day moving average for NVDA');
    });

    it('should suggest comparison queries', () => {
      const query = 'Compare stocks';
      const suggestions = parser.suggestSimilar(query);
      
      expect(suggestions).toContain('Compare the performance of AAPL vs MSFT over the last year');
      expect(suggestions).toContain('Compare the returns of TSLA and NVDA in the last 6 months');
    });

    it('should suggest news queries', () => {
      const query = 'Get news about AAPL';
      const suggestions = parser.suggestSimilar(query);
      
      expect(suggestions).toContain('What are the latest news about AAPL?');
      expect(suggestions).toContain('Get recent headlines for TSLA');
    });

    it('should provide generic suggestions for unknown queries', () => {
      const query = 'Random query that cannot be categorized';
      const suggestions = parser.suggestSimilar(query);
      
      expect(suggestions).toHaveLength(4);
      expect(suggestions).toContain('What is the current price of AAPL?');
      expect(suggestions).toContain('Show me the 50-day moving average for TSLA');
      expect(suggestions).toContain('Compare the performance of MSFT vs GOOGL over the last year');
      expect(suggestions).toContain('What are the latest news about NVDA?');
    });
  });

  describe('Edge Cases', () => {
    it('should handle queries with extra whitespace', () => {
      const query = '  What  is  the  price  of  AAPL  ?  ';
      const result = parser.parse(query);
      
      expect(result?.symbol).toBe('AAPL');
      expect(result?.type).toBe('kpi');
    });

    it('should handle case-insensitive queries', () => {
      const query = 'WHAT IS THE PRICE OF aapl?';
      const result = parser.parse(query);
      
      expect(result?.symbol).toBe('AAPL');
      expect(result?.type).toBe('kpi');
    });

    it('should handle queries with punctuation', () => {
      const query = 'Show me the price of AAPL!!!';
      const result = parser.parse(query);
      
      expect(result?.symbol).toBe('AAPL');
      expect(result?.type).toBe('price');
    });

    it('should handle queries with numbers in symbols', () => {
      const query = 'What is the price of BRK.B?';
      const result = parser.parse(query);
      
      expect(result?.symbol).toBe('BRK.B');
      expect(result?.type).toBe('kpi');
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(queryParser).toBeInstanceOf(NaturalLanguageQueryParser);
    });

    it('should maintain state across calls', () => {
      const query1 = 'What is the price of AAPL?';
      const query2 = 'Show me the volume for TSLA';
      
      const result1 = queryParser.parse(query1);
      const result2 = queryParser.parse(query2);
      
      expect(result1?.symbol).toBe('AAPL');
      expect(result2?.symbol).toBe('TSLA');
    });
  });
});
