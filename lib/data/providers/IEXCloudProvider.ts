/**
 * IEX Cloud Data Provider
 * Cost-effective alternative to Alpha Vantage for market data
 * Provides real-time quotes, historical data, and financial metrics
 */

import type { DataProvider, PricePoint, KpiData, PriceRange } from '../providers';

interface IEXQuote {
  symbol: string;
  latestPrice: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number;
  volume: number;
  avgTotalVolume: number;
  week52High: number;
  week52Low: number;
  ytdChange: number;
}

interface IEXHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IEXStats {
  companyName: string;
  marketcap: number;
  employees: number;
  ttmEPS: number;
  ttmDividendRate: number;
  dividendYield: number;
  beta: number;
  week52change: number;
  week52high: number;
  week52low: number;
  day200MovingAvg: number;
  day50MovingAvg: number;
  maxChangePercent: number;
  year5ChangePercent: number;
  year2ChangePercent: number;
  year1ChangePercent: number;
  ytdChangePercent: number;
  month6ChangePercent: number;
  month3ChangePercent: number;
  month1ChangePercent: number;
  day30ChangePercent: number;
  day5ChangePercent: number;
}

export class IEXCloudProvider implements DataProvider {
  readonly id = 'iex-cloud';
  readonly name = 'IEX Cloud';
  readonly description = 'Real-time and historical market data from IEX Cloud';
  readonly supportedSymbols = ['US-STOCKS', 'ETF', 'CRYPTO'];
  
  private baseUrl = 'https://cloud.iexapis.com/v1';
  private token: string | null = null;
  private isTestMode = false;

  constructor(token?: string, testMode = false) {
    this.token = token || process.env.IEX_CLOUD_TOKEN || null;
    this.isTestMode = testMode;
    
    // Use sandbox URL for testing
    if (testMode) {
      this.baseUrl = 'https://sandbox.iexapis.com/v1';
    }
  }

  async initialize(): Promise<void> {
    if (!this.token) {
      console.warn('IEX Cloud token not provided. Some features may be limited.');
    }
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.token) {
      throw new Error('IEX Cloud API token is required');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('token', this.token);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`IEX Cloud API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getQuote(symbol: string): Promise<KpiData> {
    try {
      const quote = await this.request<IEXQuote>(`/stock/${symbol}/quote`);
      
      return {
        symbol: quote.symbol,
        name: quote.symbol,
        price: quote.latestPrice,
        change: quote.change,
        changePercent: quote.changePercent * 100, // IEX returns as decimal
        marketCap: quote.marketCap,
        volume: quote.volume,
        peRatio: quote.peRatio,
        fiftyTwoWeekHigh: quote.week52High,
        fiftyTwoWeekLow: quote.week52Low,
        timestamp: new Date(),
      } as KpiData;
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw error;
    }
  }

  // Implement required DataProvider methods by delegating to specific endpoints
  async getPrices(symbol: string, range: PriceRange = '1Y'): Promise<PricePoint[]> {
    return this.getHistoricalPrices(symbol, range);
  }

  async getKpis(symbol: string): Promise<KpiData> {
    return this.getQuote(symbol);
  }

  async getVolSurface(_symbol: string) {
    // Not supported by IEX; provide a safe fallback shape
    return { symbol: _symbol, underlyingPrice: 0, points: [], timestamp: new Date() } as any;
  }

  isAvailable(): boolean {
    return !!this.token;
  }

  async getHistoricalPrices(symbol: string, range: PriceRange = '1Y'): Promise<PricePoint[]> {
    try {
      // Map our range format to IEX format
      const rangeMap: Record<PriceRange, string> = {
        '1D': '1d',
        '5D': '5d',
        '1M': '1m',
        '3M': '3m',
        '6M': '6m',
        '1Y': '1y',
        '2Y': '2y',
        '5Y': '5y',
        'MAX': '5y',
      };

      const iexRange = rangeMap[range] || '1y';
      const data = await this.request<IEXHistoricalPrice[]>(`/stock/${symbol}/chart/${iexRange}`);
      
      return data.map(point => ({
        date: new Date(point.date),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      }));
    } catch (error) {
      console.error(`Failed to fetch historical prices for ${symbol}:`, error);
      throw error;
    }
  }

  async getCompanyStats(symbol: string): Promise<Record<string, any>> {
    try {
      const stats = await this.request<IEXStats>(`/stock/${symbol}/stats`);
      
      return {
        companyName: stats.companyName,
        marketCap: stats.marketcap,
        employees: stats.employees,
        eps: stats.ttmEPS,
        dividendRate: stats.ttmDividendRate,
        dividendYield: stats.dividendYield,
        beta: stats.beta,
        week52High: stats.week52high,
        week52Low: stats.week52low,
        day200MA: stats.day200MovingAvg,
        day50MA: stats.day50MovingAvg,
        year5Change: stats.year5ChangePercent,
        year2Change: stats.year2ChangePercent,
        year1Change: stats.year1ChangePercent,
        ytdChange: stats.ytdChangePercent,
        month6Change: stats.month6ChangePercent,
        month3Change: stats.month3ChangePercent,
        month1Change: stats.month1ChangePercent,
      };
    } catch (error) {
      console.error(`Failed to fetch company stats for ${symbol}:`, error);
      throw error;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Record<string, KpiData>> {
    try {
      const symbolsParam = symbols.join(',');
      const data = await this.request<Record<string, { quote: IEXQuote }>>(`/stock/market/batch`, {
        symbols: symbolsParam,
        types: 'quote',
      });

      const result: Record<string, KpiData> = {};
      
      Object.entries(data).forEach(([symbol, { quote }]) => {
        result[symbol] = {
          symbol: quote.symbol,
          name: quote.symbol,
          price: quote.latestPrice,
          change: quote.change,
          changePercent: quote.changePercent * 100,
          marketCap: quote.marketCap,
          volume: quote.volume,
          peRatio: quote.peRatio,
          fiftyTwoWeekHigh: quote.week52High,
          fiftyTwoWeekLow: quote.week52Low,
          timestamp: new Date(),
        } as KpiData;
      });

      return result;
    } catch (error) {
      console.error('Failed to fetch batch quotes:', error);
      throw error;
    }
  }

  async getIntradayPrices(symbol: string): Promise<PricePoint[]> {
    try {
      const data = await this.request<IEXHistoricalPrice[]>(`/stock/${symbol}/intraday-prices`);
      
      return data
        .filter(point => point.close !== null) // Filter out null values
        .map(point => ({
          date: new Date(point.date),
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume,
        }));
    } catch (error) {
      console.error(`Failed to fetch intraday prices for ${symbol}:`, error);
      throw error;
    }
  }

  // Get earnings data
  async getEarnings(symbol: string, last = 4): Promise<any[]> {
    try {
      const data = await this.request<any[]>(`/stock/${symbol}/earnings/${last}`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch earnings for ${symbol}:`, error);
      throw error;
    }
  }

  // Get financial statements (latest snapshot for compatibility with base type)
  async getFinancials(symbol: string): Promise<Record<string, unknown>> {
    try {
      const data = await this.request<Record<string, unknown>>(`/stock/${symbol}/financials`);
      return data || {};
    } catch (error) {
      console.error(`Failed to fetch financials for ${symbol}:`, error);
      throw error;
    }
  }

  // Get news
  async getNews(symbol: string, last = 10): Promise<any[]> {
    try {
      const data = await this.request<any[]>(`/stock/${symbol}/news/last/${last}`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch news for ${symbol}:`, error);
      throw error;
    }
  }

  // Check if symbol is supported
  isSymbolSupported(symbol: string): boolean {
    // IEX Cloud primarily supports US equities and some international
    // This is a basic check - in practice, you'd validate against their symbol list
    return /^[A-Z]{1,5}$/.test(symbol);
  }

  // Get pricing info
  getPricingInfo(): { 
    tier: string; 
    creditsPerCall: number; 
    monthlyLimit: number; 
    costPerExtraCall: number;
  } {
    return {
      tier: this.isTestMode ? 'Sandbox' : 'Production',
      creditsPerCall: 1,
      monthlyLimit: 500000, // Default free tier
      costPerExtraCall: 0.0001, // $0.0001 per credit
    };
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latency: number }> {
    const startTime = Date.now();
    
    try {
      await this.request('/account/usage');
      const latency = Date.now() - startTime;
      
      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
      };
    }
  }

  // Get account usage
  async getUsage(): Promise<{ creditsUsed: number; creditsRemaining: number }> {
    try {
      const usage = await this.request<any>('/account/usage');
      return {
        creditsUsed: usage.monthlyUsage || 0,
        creditsRemaining: usage.monthlyPayAsYouGo || 0,
      };
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      return { creditsUsed: 0, creditsRemaining: 0 };
    }
  }
}

// Factory function for easy instantiation
export function createIEXCloudProvider(token?: string, testMode = false): IEXCloudProvider {
  return new IEXCloudProvider(token, testMode);
}

// Default instance
export const iexCloudProvider = createIEXCloudProvider();