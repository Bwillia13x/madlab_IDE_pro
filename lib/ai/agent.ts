import { queryParser, type ParsedQuery } from './queryParser';
import { getProvider } from '../data/providers';
import type { PricePoint, KpiData, FinancialData } from '../data/provider.types';
import { actionRouter, type ActionRequest, type ActionResponse } from './actionRouter';

export interface AIAgentConfig {
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  query: ParsedQuery;
  response: string;
  data?: FetchedData;
  suggestions?: string[];
  confidence: number;
  timestamp: Date;
}

export interface MarketInsight {
  type: 'trend' | 'reversal' | 'volatility' | 'volume' | 'sentiment';
  symbol: string;
  description: string;
  confidence: number;
  indicators: string[];
  recommendation?: string;
  timestamp: Date;
}

type FetchedData =
  | PricePoint[]
  | { type: 'comparison'; data: PricePoint[][]; symbols: string[] }
  | KpiData
  | FinancialData
  | { type: 'news'; message: string }
  | { type: 'analysis'; data: PricePoint[][]; symbols: string[] }
  | { prices: PricePoint[]; kpis: KpiData }
  | { error: string }
  | Record<string, unknown>
  | null;

export class AIAgent {
  private config: AIAgentConfig;
  private context: string[] = [];
  private maxContextLength = 10;
  private insights: MarketInsight[] = [];

  constructor(config: AIAgentConfig) {
    this.config = {
      model: 'gpt-4',
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.3,
    };
  }

  async processQuery(query: string, actionContext?: ActionRequest['context']): Promise<AIResponse> {
    try {
      // First, try to parse and execute as an action
      const actionResponse = await actionRouter.parseAndExecute(query, actionContext);
      
      if (actionResponse.success) {
        // If action was successful, return the action result
        return {
          query: {
            type: 'analysis',
            symbol: '',
            rawQuery: query,
          },
          response: actionResponse.message,
          data: actionResponse.data as FetchedData | undefined,
          confidence: 95, // High confidence for successful actions
          timestamp: new Date(),
          suggestions: this.generateActionSuggestions(),
        };
      }

      // If no action was executed, proceed with normal query processing
      const parsedQuery = queryParser.parse(query);
      
      if (!parsedQuery) {
        return {
          query: {
            type: 'kpi',
            symbol: '',
            rawQuery: query,
          },
          response: "I couldn't understand your query. Please try rephrasing it or ask for help with examples.",
          confidence: 0,
          timestamp: new Date(),
          suggestions: queryParser.suggestSimilar(query),
        };
      }

      // Fetch relevant data based on the parsed query
      const data = await this.fetchData(parsedQuery);
      
      // Generate AI response using LLM
      const response = await this.generateResponse(parsedQuery, data, query);
      
      // Add to context
      this.addToContext(query, response);
      
      // Generate insights if applicable
      if (data && this.shouldGenerateInsights(parsedQuery)) {
        const insight = await this.generateInsight(parsedQuery, data);
        if (insight) {
          this.insights.push(insight);
        }
      }

      return {
        query: parsedQuery,
        response,
        data,
        confidence: this.calculateConfidence(parsedQuery, data),
        timestamp: new Date(),
        suggestions: this.generateSuggestions(parsedQuery),
      };
    } catch (error) {
      console.error('Error processing query:', error);
      return {
        query: {
          type: 'kpi',
          symbol: '',
          rawQuery: query,
        },
        response: "I encountered an error while processing your request. Please try again or contact support if the issue persists.",
        confidence: 0,
        timestamp: new Date(),
        suggestions: queryParser.suggestSimilar(query),
      };
    }
  }

  private async fetchData(parsedQuery: ParsedQuery): Promise<FetchedData> {
    const provider = getProvider();
    
    try {
      switch (parsedQuery.type) {
        case 'price':
          if (parsedQuery.symbol.includes(',')) {
            // Multiple symbols for comparison
            const symbols = parsedQuery.symbol.split(',');
            const results = await Promise.all(
              symbols.map(symbol => provider.getPrices(symbol.trim(), parsedQuery.timeframe))
            );
            return { type: 'comparison', data: results, symbols };
          } else {
            return await provider.getPrices(parsedQuery.symbol, parsedQuery.timeframe);
          }
          
        case 'kpi':
          return await provider.getKpis(parsedQuery.symbol);
          
        case 'financial':
          return await provider.getFinancials(parsedQuery.symbol);
          
        case 'technical':
          // For technical indicators, we'll need to implement these
          return await this.calculateTechnicalIndicator(parsedQuery);
          
        case 'news':
          // News data would come from a separate service
          return { type: 'news', message: 'News data not yet implemented' };
          
        case 'analysis':
          // For analysis, fetch data for all symbols
          const symbols = parsedQuery.symbol.split(',');
          const results = await Promise.all(
            symbols.map(symbol => provider.getPrices(symbol.trim(), parsedQuery.timeframe))
          );
          return { type: 'analysis', data: results, symbols };
          
        default:
          // Return overview data
          const [prices, kpis] = await Promise.all([
            provider.getPrices(parsedQuery.symbol, '1M'),
            provider.getKpis(parsedQuery.symbol),
          ]);
          return { prices, kpis };
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch data: ${errorMessage}`);
    }
  }

  private async calculateTechnicalIndicator(parsedQuery: ParsedQuery): Promise<Record<string, unknown>> {
    const provider = getProvider();
    const prices = await provider.getPrices(parsedQuery.symbol, '6M');
    
    switch (parsedQuery.metric) {
      case 'moving_average':
        const period = parsedQuery.filters?.period as number || 20;
        return this.calculateMovingAverage(prices, period) as Record<string, unknown>;
        
      case 'rsi':
        return this.calculateRSI(prices) as Record<string, unknown>;
        
      case 'macd':
        return this.calculateMACD(prices) as Record<string, unknown>;
        
      case 'bollinger_bands':
        return this.calculateBollingerBands(prices) as Record<string, unknown>;
        
      default:
        return { message: `Technical indicator ${parsedQuery.metric} not implemented` };
    }
  }

  private calculateMovingAverage(prices: PricePoint[], period: number): unknown {
    if (prices.length < period) {
      return { error: 'Insufficient data for moving average calculation' };
    }
    
    const recentPrices = prices.slice(0, period);
    const sum = recentPrices.reduce((acc, price) => acc + price.close, 0);
    const average = sum / period;
    
    return {
      type: 'moving_average',
      period,
      value: average,
      current_price: prices[0]?.close,
      above_average: prices[0]?.close > average,
    };
  }

  private calculateRSI(prices: PricePoint[], period: number = 14): unknown {
    if (prices.length < period + 1) {
      return { error: 'Insufficient data for RSI calculation' };
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i - 1].close - prices[i].close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return {
      type: 'rsi',
      value: rsi,
      interpretation: rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral',
    };
  }

  private calculateMACD(prices: PricePoint[]): unknown {
    if (prices.length < 26) {
      return { error: 'Insufficient data for MACD calculation' };
    }
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA(prices.slice(0, 9), 9); // Simplified
    
    return {
      type: 'macd',
      macd_line: macdLine,
      signal_line: signalLine,
      histogram: macdLine - signalLine,
      bullish: macdLine > signalLine,
    };
  }

  private calculateBollingerBands(prices: PricePoint[], period: number = 20): unknown {
    if (prices.length < period) {
      return { error: 'Insufficient data for Bollinger Bands calculation' };
    }
    
    const recentPrices = prices.slice(0, period);
    const sma = recentPrices.reduce((acc, price) => acc + price.close, 0) / period;
    
    const variance = recentPrices.reduce((acc, price) => {
      return acc + Math.pow(price.close - sma, 2);
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);
    
    return {
      type: 'bollinger_bands',
      upper_band: sma + (2 * standardDeviation),
      middle_band: sma,
      lower_band: sma - (2 * standardDeviation),
      current_price: prices[0]?.close,
      bandwidth: (2 * standardDeviation) / sma,
    };
  }

  private calculateEMA(prices: PricePoint[], period: number): number {
    const multiplier = 2 / (period + 1);
    let ema = prices[0].close;
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i].close * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private async generateResponse(parsedQuery: ParsedQuery, data: FetchedData, originalQuery: string): Promise<string> {
    const prompt = this.buildPrompt(parsedQuery, data, originalQuery);
    
    try {
      const response = await this.callLLM(prompt);
      return response;
    } catch (error) {
      console.error('Error calling LLM:', error);
      return this.generateFallbackResponse(parsedQuery, data);
    }
  }

  private buildPrompt(parsedQuery: ParsedQuery, data: FetchedData, originalQuery: string): string {
    const context = this.context.slice(-3).join('\n');
    
    const prompt = `You are a financial analysis AI assistant. Analyze the following query and data to provide a helpful, accurate response.

User Query: "${originalQuery}"
Query Type: ${parsedQuery.type}
Symbol: ${parsedQuery.symbol}
Timeframe: ${parsedQuery.timeframe || 'N/A'}

${context ? `Recent Context:\n${context}\n` : ''}

Data: ${JSON.stringify(data, null, 2)}

Please provide a clear, concise response that:
1. Directly answers the user's question
2. Includes relevant data points and insights
3. Uses professional but accessible language
4. Suggests follow-up questions if appropriate

Response:`;

    return prompt;
  }

  private async callLLM(prompt: string): Promise<string> {
    // This is a placeholder for the actual LLM API call
    // In a real implementation, you would call OpenAI, Anthropic, or another LLM service
    
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || 'No response from AI model';
  }

  private generateFallbackResponse(parsedQuery: ParsedQuery, data: FetchedData): string {
    switch (parsedQuery.type) {
      case 'price':
        if (Array.isArray(data)) {
          const latest = data[0];
          return `The latest price for ${parsedQuery.symbol} is ${latest.close.toFixed(2)} as of ${latest.date.toLocaleDateString()}.`;
        }
        break;
        
      case 'kpi':
        if (data && 'price' in data) {
          return `The current price of ${parsedQuery.symbol} is ${(data as KpiData).price.toFixed(2)} with a ${(data as KpiData).changePercent > 0 ? 'gain' : 'loss'} of ${Math.abs((data as KpiData).changePercent).toFixed(2)}%.`;
        }
        break;
        
      case 'technical':
        if (data && 'value' in data) {
          return `The ${parsedQuery.metric} for ${parsedQuery.symbol} is ${(data as { value: number }).value.toFixed(2)}.`;
        }
        break;
    }
    
    return `I have the data for ${parsedQuery.symbol}, but I'm having trouble generating a detailed analysis. Please try asking a more specific question.`;
  }

  private shouldGenerateInsights(parsedQuery: ParsedQuery): boolean {
    return ['price', 'technical', 'analysis'].includes(parsedQuery.type);
  }

  private async generateInsight(parsedQuery: ParsedQuery, data: FetchedData): Promise<MarketInsight | null> {
    try {
      // Enhanced insight generation with multiple analysis types
      const insights = await Promise.all([
        this.detectUnusualVolume(parsedQuery.symbol, data),
        this.identifyTrendReversals(parsedQuery.symbol, data),
        this.analyzeVolatilitySpikes(parsedQuery.symbol, data),
        this.detectMarketAnomalies(parsedQuery.symbol, data),
      ]);

      // Find the most significant insight
      const bestInsight = insights
        .filter(insight => insight !== null)
        .sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0))[0];

      if (bestInsight) {
        return bestInsight;
      }

      // Fallback to basic insight generation
      const prompt = `Based on the following data for ${parsedQuery.symbol}, provide a market insight:

Data: ${JSON.stringify(data, null, 2)}

Identify if there are any:
- Trend changes or reversals
- Unusual volume patterns
- Volatility spikes
- Technical indicator signals
- Market sentiment shifts

Provide a brief insight with confidence level (0-100).`;

      const response = await this.callLLM(prompt);
      
      const insight: MarketInsight = {
        type: 'trend',
        symbol: parsedQuery.symbol,
        description: response,
        confidence: 75,
        indicators: [],
        timestamp: new Date(),
      };
      
      return insight;
    } catch (error) {
      console.error('Error generating insight:', error);
      return null;
    }
  }

  // Advanced insight detection methods
  private async detectUnusualVolume(symbol: string, data: FetchedData): Promise<MarketInsight | null> {
    try {
      if (!Array.isArray(data) || data.length < 20) return null;

      const volumes = data.map(point => point.volume || 0);
      const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
      const latestVolume = volumes[0];
      const volumeRatio = latestVolume / avgVolume;

      if (volumeRatio > 2.5) {
        return {
          type: 'volume',
          symbol,
          description: `Unusual volume spike detected: ${latestVolume.toLocaleString()} vs average ${avgVolume.toLocaleString()} (${volumeRatio.toFixed(1)}x)`,
          confidence: Math.min(95, volumeRatio * 20),
          indicators: ['Volume Spike', 'Unusual Activity'],
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting unusual volume:', error);
      return null;
    }
  }

  private async identifyTrendReversals(symbol: string, data: FetchedData): Promise<MarketInsight | null> {
    try {
      if (!Array.isArray(data) || data.length < 50) return null;

      const prices = data.map(point => point.close || 0);

      // Simple trend reversal detection using price action and volume
      const shortTerm = prices.slice(0, 5);
      const mediumTerm = prices.slice(0, 20);

      const shortTrend = this.calculateTrend(shortTerm);
      const mediumTrend = this.calculateTrend(mediumTerm);

      // Detect potential reversal when trends diverge
      if (shortTrend !== mediumTrend && Math.abs(shortTrend - mediumTrend) > 0.1) {
        const reversalType = shortTrend > mediumTrend ? 'bullish' : 'bearish';
        const confidence = Math.min(90, Math.abs(shortTrend - mediumTrend) * 100);

        return {
          type: 'trend',
          symbol,
          description: `Potential ${reversalType} trend reversal detected. Short-term trend: ${shortTrend > 0 ? 'up' : 'down'}, Medium-term: ${mediumTrend > 0 ? 'up' : 'down'}`,
          confidence,
          indicators: ['Trend Divergence', 'Price Action'],
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error identifying trend reversals:', error);
      return null;
    }
  }

  private async analyzeVolatilitySpikes(symbol: string, data: FetchedData): Promise<MarketInsight | null> {
    try {
      if (!Array.isArray(data) || data.length < 20) return null;

      const prices = data.map(point => point.close || 0);
      const returns = [];

      for (let i = 1; i < prices.length; i++) {
        returns.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
      }

      const avgVolatility = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const recentVolatility = returns.slice(0, 5).reduce((sum, ret) => sum + ret, 0) / 5;
      const volatilityRatio = recentVolatility / avgVolatility;

      if (volatilityRatio > 2.0) {
        return {
          type: 'volatility',
          symbol,
          description: `Volatility spike detected: Recent volatility ${(recentVolatility * 100).toFixed(2)}% vs average ${(avgVolatility * 100).toFixed(2)}% (${volatilityRatio.toFixed(1)}x)`,
          confidence: Math.min(95, volatilityRatio * 25),
          indicators: ['Volatility Spike', 'Market Stress'],
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error analyzing volatility spikes:', error);
      return null;
    }
  }

  private async detectMarketAnomalies(symbol: string, data: FetchedData): Promise<MarketInsight | null> {
    try {
      if (!Array.isArray(data) || data.length < 30) return null;

      const prices = data.map(point => point.close || 0);
      const volumes = data.map(point => point.volume || 0);

      // Detect price gaps (overnight moves)
      const gaps = [];
      for (let i = 1; i < prices.length; i++) {
        const gap = Math.abs(prices[i] - prices[i - 1]) / prices[i - 1];
        if (gap > 0.05) { // 5% gap
          gaps.push({ index: i, gap });
        }
      }

      if (gaps.length > 0) {
        const largestGap = gaps.reduce((max, gap) => gap.gap > max.gap ? gap : max);
        return {
          type: 'volatility',
          symbol,
          description: `Significant price gap detected: ${(largestGap.gap * 100).toFixed(1)}% move, indicating potential news or market event`,
          confidence: Math.min(90, largestGap.gap * 200),
          indicators: ['Price Gap', 'Market Event'],
          timestamp: new Date(),
        };
      }

      // Detect volume anomalies
      const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
      const recentVolume = volumes.slice(0, 3).reduce((sum, vol) => sum + vol, 0) / 3;
      
      if (recentVolume > avgVolume * 3) {
        return {
          type: 'volume',
          symbol,
          description: `Sustained high volume detected: Recent average ${recentVolume.toLocaleString()} vs historical ${avgVolume.toLocaleString()}`,
          confidence: 85,
          indicators: ['Volume Surge', 'Sustained Activity'],
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting market anomalies:', error);
      return null;
    }
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const x = Array.from({ length: prices.length }, (_, i) => i);
    const y = prices;
    
    const n = prices.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private addToContext(query: string, response: string): void {
    this.context.push(`Q: ${query}\nA: ${response}`);
    
    if (this.context.length > this.maxContextLength) {
      this.context.shift();
    }
  }

  private calculateConfidence(parsedQuery: ParsedQuery, data: FetchedData): number {
    let confidence = 80; // Base confidence
    
    // Reduce confidence for complex queries
    if (parsedQuery.type === 'analysis') confidence -= 10;
    if (parsedQuery.type === 'technical') confidence -= 5;
    
    // Reduce confidence if data is missing or incomplete
    if (!data || (Array.isArray(data) && data.length === 0)) confidence -= 20;
    
    // Increase confidence for simple, well-supported queries
    if (parsedQuery.type === 'kpi' && data && 'price' in data) confidence += 10;
    
    return Math.max(0, Math.min(100, confidence));
  }

  private generateSuggestions(parsedQuery: ParsedQuery): string[] {
    const suggestions: string[] = [];
    
    if (parsedQuery.type === 'price') {
      suggestions.push(`Show me the ${parsedQuery.symbol} chart over the last year`);
      suggestions.push(`What's the trading volume for ${parsedQuery.symbol}?`);
    }
    
    if (parsedQuery.type === 'kpi') {
      suggestions.push(`Show me the price history for ${parsedQuery.symbol}`);
      suggestions.push(`Compare ${parsedQuery.symbol} with its competitors`);
    }
    
    if (parsedQuery.type === 'technical') {
      suggestions.push(`Show me the price chart for ${parsedQuery.symbol}`);
      suggestions.push(`What other technical indicators are available for ${parsedQuery.symbol}?`);
    }
    
    return suggestions.slice(0, 2);
  }

  private generateActionSuggestions(): string[] {
    return [
      "Try 'add a candlestick-chart widget' to add a new chart",
      "Say 'switch to portfolio preset' to change the layout",
      "Use 'set global symbol AAPL' to analyze Apple stock",
      "Ask 'create new charting sheet' for a fresh workspace",
      "Say 'explain candlestick-chart' to learn about widgets"
    ];
  }

  // Public methods for managing insights and context
  getInsights(): MarketInsight[] {
    return [...this.insights];
  }

  clearInsights(): void {
    this.insights = [];
  }

  getContext(): string[] {
    return [...this.context];
  }

  clearContext(): void {
    this.context = [];
  }

  // Method to update configuration
  updateConfig(newConfig: Partial<AIAgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const aiAgent = new AIAgent({
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
});
