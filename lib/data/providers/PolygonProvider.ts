/**
 * Polygon.io Data Provider
 * Provides real-time and historical market data including stocks, forex, and crypto
 * Excellent for high-frequency data and comprehensive market coverage
 */

import type { DataProvider, PricePoint, KpiData, PriceRange } from '../providers';

interface PolygonTicker {
  ticker: string;
  value: number;
  change: number;
  change_percent: number;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  volume?: number;
  high_52_week?: number;
  low_52_week?: number;
}

interface PolygonAggregateBar {
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  t: number;  // timestamp
  n: number;  // number of transactions
}

interface PolygonTickerDetails {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
  cik: string;
  composite_figi: string;
  share_class_figi: string;
  market_cap: number;
  phone_number: string;
  address: any;
  description: string;
  sic_code: string;
  sic_description: string;
  ticker_root: string;
  homepage_url: string;
  total_employees: number;
  list_date: string;
  branding: any;
  share_class_shares_outstanding: number;
  weighted_shares_outstanding: number;
}

export class PolygonProvider implements DataProvider {
  readonly id = 'polygon-io';
  readonly name = 'Polygon.io';
  readonly description = 'Real-time and historical market data for stocks, forex, and crypto';
  readonly supportedSymbols = ['US-STOCKS', 'ETF', 'CRYPTO', 'FOREX', 'OPTIONS'];
  
  private baseUrl = 'https://api.polygon.io';
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.POLYGON_API_KEY || null;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      console.warn('Polygon.io API key not provided. Some features may be limited.');
    }
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Polygon.io API key is required');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('apikey', this.apiKey);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Polygon.io API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status === 'ERROR') {
      throw new Error(`Polygon.io API error: ${data.error || 'Unknown error'}`);
    }

    return data;
  }

  async getQuote(symbol: string): Promise<KpiData> {
    try {
      // Get previous close for basic quote
      const prevCloseResponse = await this.request<{
        results: Array<{
          T: string;
          c: number;
          h: number;
          l: number;
          o: number;
          v: number;
          t: number;
        }>;
      }>(`/v2/aggs/ticker/${symbol}/prev`);

      if (!prevCloseResponse.results || prevCloseResponse.results.length === 0) {
        throw new Error(`No data available for ${symbol}`);
      }

      const prevClose = prevCloseResponse.results[0];

      // Get ticker details for additional info
      let tickerDetails: PolygonTickerDetails | null = null;
      try {
        const detailsResponse = await this.request<{
          results: PolygonTickerDetails;
        }>(`/v3/reference/tickers/${symbol}`);
        tickerDetails = detailsResponse.results;
      } catch (error) {
        console.warn(`Could not fetch ticker details for ${symbol}:`, error);
      }

      // Calculate basic metrics (simplified since we don't have real-time quote)
      const price = prevClose.c;
      const change = price - prevClose.o; // Using open as comparison
      const changePercent = (change / prevClose.o) * 100;

      return {
        symbol: symbol,
        name: tickerDetails?.name || symbol,
        price: price,
        change: change,
        changePercent: changePercent,
        marketCap: tickerDetails?.market_cap ?? 0,
        volume: prevClose.v,
        fiftyTwoWeekHigh: prevClose.h,
        fiftyTwoWeekLow: prevClose.l,
        timestamp: new Date(prevClose.t),
      } as KpiData;
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw error;
    }
  }

  // Implement required DataProvider methods by delegating
  async getPrices(symbol: string, range: PriceRange = '1Y'): Promise<PricePoint[]> {
    return this.getHistoricalPrices(symbol, range);
  }

  async getKpis(symbol: string): Promise<KpiData> {
    return this.getQuote(symbol);
  }

  async getVolSurface(_symbol: string) {
    return { symbol: _symbol, underlyingPrice: 0, points: [], timestamp: new Date() } as any;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async getHistoricalPrices(symbol: string, range: PriceRange = '1Y'): Promise<PricePoint[]> {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (range) {
        case '1D':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '5D':
          startDate.setDate(endDate.getDate() - 5);
          break;
        case '1M':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6M':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1Y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case '2Y':
          startDate.setFullYear(endDate.getFullYear() - 2);
          break;
        case '5Y':
          startDate.setFullYear(endDate.getFullYear() - 5);
          break;
      }

      const from = startDate.toISOString().split('T')[0];
      const to = endDate.toISOString().split('T')[0];

      // Determine multiplier and timespan based on range
      let multiplier = 1;
      let timespan = 'day';
      
      if (range === '1D' || range === '5D') {
        multiplier = 5;
        timespan = 'minute';
      }

      const response = await this.request<{
        results: PolygonAggregateBar[];
      }>(`/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`, {
        adjusted: 'true',
        sort: 'asc',
        limit: '50000',
      });

      if (!response.results) {
        return [];
      }

      return response.results.map(bar => ({
        date: new Date(bar.t),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
      }));
    } catch (error) {
      console.error(`Failed to fetch historical prices for ${symbol}:`, error);
      throw error;
    }
  }

  async getTickerDetails(symbol: string): Promise<Record<string, any>> {
    try {
      const response = await this.request<{
        results: PolygonTickerDetails;
      }>(`/v3/reference/tickers/${symbol}`);

      const details = response.results;
      
      return {
        name: details.name,
        description: details.description,
        market: details.market,
        locale: details.locale,
        primaryExchange: details.primary_exchange,
        type: details.type,
        active: details.active,
        currency: details.currency_name,
        cik: details.cik,
        marketCap: details.market_cap,
        phoneNumber: details.phone_number,
        address: details.address,
        sicCode: details.sic_code,
        sicDescription: details.sic_description,
        homepageUrl: details.homepage_url,
        totalEmployees: details.total_employees,
        listDate: details.list_date,
        sharesOutstanding: details.share_class_shares_outstanding,
        weightedSharesOutstanding: details.weighted_shares_outstanding,
      };
    } catch (error) {
      console.error(`Failed to fetch ticker details for ${symbol}:`, error);
      throw error;
    }
  }

  async getMarketStatus(): Promise<{
    market: string;
    serverTime: string;
    exchanges: Record<string, string>;
  }> {
    try {
      const response = await this.request<{
        market: string;
        serverTime: string;
        exchanges: Record<string, string>;
      }>('/v1/marketstatus/now');

      return response;
    } catch (error) {
      console.error('Failed to fetch market status:', error);
      throw error;
    }
  }

  async getCryptoQuote(symbol: string): Promise<KpiData> {
    try {
      // Format crypto symbol (e.g., BTC -> X:BTCUSD)
      const cryptoSymbol = symbol.startsWith('X:') ? symbol : `X:${symbol}USD`;
      
      const response = await this.request<{
        results: Array<{
          T: string;
          c: number;
          h: number;
          l: number;
          o: number;
          v: number;
          t: number;
        }>;
      }>(`/v2/aggs/ticker/${cryptoSymbol}/prev`);

      if (!response.results || response.results.length === 0) {
        throw new Error(`No crypto data available for ${symbol}`);
      }

      const data = response.results[0];
      const price = data.c;
      const change = price - data.o;
      const changePercent = (change / data.o) * 100;

      return {
        symbol: symbol,
        name: symbol,
        price: price,
        change: change,
        changePercent: changePercent,
        volume: data.v,
        fiftyTwoWeekHigh: data.h,
        fiftyTwoWeekLow: data.l,
        timestamp: new Date(data.t),
      } as KpiData;
    } catch (error) {
      console.error(`Failed to fetch crypto quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getForexQuote(fromCurrency: string, toCurrency: string): Promise<KpiData> {
    try {
      const forexSymbol = `C:${fromCurrency}${toCurrency}`;
      
      const response = await this.request<{
        results: Array<{
          T: string;
          c: number;
          h: number;
          l: number;
          o: number;
          v: number;
          t: number;
        }>;
      }>(`/v2/aggs/ticker/${forexSymbol}/prev`);

      if (!response.results || response.results.length === 0) {
        throw new Error(`No forex data available for ${fromCurrency}/${toCurrency}`);
      }

      const data = response.results[0];
      const price = data.c;
      const change = price - data.o;
      const changePercent = (change / data.o) * 100;

      return {
        symbol: `${fromCurrency}/${toCurrency}`,
        name: `${fromCurrency}/${toCurrency}`,
        price: price,
        change: change,
        changePercent: changePercent,
        volume: data.v,
        timestamp: new Date(data.t),
      } as KpiData;
    } catch (error) {
      console.error(`Failed to fetch forex quote for ${fromCurrency}/${toCurrency}:`, error);
      throw error;
    }
  }

  // Check if symbol is supported
  isSymbolSupported(symbol: string): boolean {
    // Polygon supports various formats:
    // Stocks: AAPL, TSLA, etc.
    // Crypto: X:BTCUSD, X:ETHUSD, etc.
    // Forex: C:EURUSD, C:GBPUSD, etc.
    // Options: O:SPY241220C00650000, etc.
    
    return (
      /^[A-Z]{1,5}$/.test(symbol) ||           // Regular stocks
      /^X:[A-Z]{3,6}$/.test(symbol) ||         // Crypto
      /^C:[A-Z]{6}$/.test(symbol) ||           // Forex
      /^O:[A-Z0-9]+$/.test(symbol)             // Options
    );
  }

  // Get pricing info
  getPricingInfo(): { 
    tier: string; 
    creditsPerCall: number; 
    monthlyLimit: number; 
    costPerExtraCall: number;
  } {
    return {
      tier: 'Basic',
      creditsPerCall: 1,
      monthlyLimit: 1000, // Free tier limit
      costPerExtraCall: 0.004, // $0.004 per call
    };
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latency: number }> {
    const startTime = Date.now();
    
    try {
      await this.getMarketStatus();
      const latency = Date.now() - startTime;
      
      return {
        status: latency < 2000 ? 'healthy' : 'degraded',
        latency,
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
      };
    }
  }

  // Search for tickers
  async searchTickers(query: string, type?: string): Promise<Array<{
    ticker: string;
    name: string;
    market: string;
    locale: string;
    primary_exchange: string;
    type: string;
    active: boolean;
  }>> {
    try {
      const params: Record<string, string> = {
        search: query,
        active: 'true',
        limit: '20',
      };
      
      if (type) {
        params.type = type;
      }

      const response = await this.request<{
        results: Array<{
          ticker: string;
          name: string;
          market: string;
          locale: string;
          primary_exchange: string;
          type: string;
          active: boolean;
        }>;
      }>('/v3/reference/tickers', params);

      return response.results || [];
    } catch (error) {
      console.error(`Failed to search tickers for "${query}":`, error);
      return [];
    }
  }
}

// Factory function for easy instantiation
export function createPolygonProvider(apiKey?: string): PolygonProvider {
  return new PolygonProvider(apiKey);
}

// Default instance
export const polygonProvider = createPolygonProvider();