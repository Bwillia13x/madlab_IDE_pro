import type { Provider, PricePoint, PriceRange, KpiData, FinancialData } from '../provider.types';

interface PolygonConfig {
  apiKey: string;
  baseUrl?: string;
  wsUrl?: string;
}

interface PolygonQuote {
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp?: number;
}

interface PolygonTrade {
  [key: string]: unknown;
}

interface PolygonAggregate {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface WebSocketData {
  ev: string;
  [key: string]: unknown;
}

interface PolygonSnapshotQuote {
  lastTrade?: { p?: number; s?: number; t?: number };
  lastQuote?: { ap?: number; bp?: number; t?: number };
  prevClose?: { p?: number };
}

interface PolygonFinancialsItem {
  ticker?: string;
  revenue?: number;
  net_income_loss?: number;
  assets?: number;
  liabilities?: number;
  cash_and_cash_equivalents?: number;
  debt?: number;
  equity?: number;
  earnings_per_share?: number;
  price_earnings_ratio?: number;
  price_book_ratio?: number;
  return_on_equity?: number;
  return_on_assets?: number;
  debt_to_equity_ratio?: number;
  current_ratio?: number;
  quick_ratio?: number;
  gross_margin?: number;
  operating_margin?: number;
  net_margin?: number;
  operating_cash_flow?: number;
  free_cash_flow?: number;
}

interface PolygonCompanyOverview {
  name?: string;
  market_cap?: number;
  pe_ratio?: number;
  eps?: number;
  dividend_yield?: number;
  beta?: number;
  high_52_weeks?: number;
  low_52_weeks?: number;
}

interface PolygonData {
  results?: PolygonAggregate[] | PolygonSnapshotQuote | PolygonFinancialsItem[] | PolygonCompanyOverview | Record<string, unknown>;
  [key: string]: unknown;
}


export class PolygonAdapter implements Provider {
  name = 'polygon';
  private apiKey: string;
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribedSymbols = new Set<string>();
  private eventHandlers = new Map<string, (data: PolygonData) => void>();
  private lastRequestTime: number | null = null;
  private rateLimitDelay = 1000; // 1 second rate limit

  constructor(config: PolygonConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.polygon.io';
    this.wsUrl = config.wsUrl || 'wss://delayed.polygon.io';
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<PolygonData> {
    const url = new URL(this.baseUrl + endpoint);
    
    // Add API key
    url.searchParams.set('apiKey', this.apiKey);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    // Check rate limiting
    if (this.lastRequestTime && Date.now() - this.lastRequestTime < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - (Date.now() - this.lastRequestTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      const response = await fetch(url.toString());
      
      // Check for API errors first
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = response.statusText || 'Unknown error';
        }
        
        if (errorText.includes('Invalid API key')) {
          throw new Error('Invalid API key');
        }
        if (errorText.includes('Rate limit exceeded')) {
          throw new Error(`Rate limit exceeded: ${errorText}`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check for API error messages in the response body
      if (data.error || data['Error Message'] || data.Note) {
        const errorMsg = data.error || data['Error Message'] || data.Note;
        if (errorMsg.includes('Invalid API key')) {
          throw new Error('Invalid API key');
        }
        if (errorMsg.includes('Rate limit exceeded')) {
          throw new Error(`Rate limit exceeded: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      this.lastRequestTime = Date.now();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Request failed');
    }
  }

  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    const { from, to, timespan } = this.getDateRange(range);
    
    const params: Record<string, string> = {
      symbol: symbol.toUpperCase(),
      from,
      to,
      timespan,
      adjusted: 'true',
      sort: 'desc',
      limit: '50000'
    };

    const data = await this.makeRequest('/v2/aggs/ticker/' + symbol.toUpperCase() + '/range/1/' + timespan + '/' + from + '/' + to, params);
    
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('No time series data received');
    }

    const results = data.results as PolygonAggregate[];
    return results.map((agg: PolygonAggregate) => ({
      date: new Date(agg.t),
      open: Number(agg.o) || 0,
      high: Number(agg.h) || 0,
      low: Number(agg.l) || 0,
      close: Number(agg.c) || 0,
      volume: Number(agg.v) || NaN,
    }));
  }

  async getKpis(symbol: string): Promise<KpiData> {
    // Get latest quote
    const quoteData = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers/' + symbol.toUpperCase() + '/quote');
    
    if (!quoteData.results || !(quoteData.results as PolygonSnapshotQuote).lastTrade) {
      throw new Error('No quote data received');
    }

    const quote = quoteData.results as PolygonSnapshotQuote;
    const lastTrade = quote.lastTrade;
    const lastQuote = quote.lastQuote;
    
    // Use last trade price if available, otherwise use last quote
    const price = lastTrade?.p || lastQuote?.ap || lastQuote?.bp || 0;
    const previousClose = quote.prevClose?.p || price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    // Get additional company info
    const companyInfo = await this.getCompanyOverview(symbol);

    return {
      symbol: symbol.toUpperCase(),
      name: companyInfo?.name || symbol.toUpperCase(),
      price,
      change,
      changePercent,
      volume: lastTrade?.s || 0,
      marketCap: companyInfo?.marketCap || 0,
      peRatio: companyInfo?.peRatio,
      eps: companyInfo?.eps,
      dividend: companyInfo?.dividend,
      divYield: companyInfo?.divYield,
      beta: companyInfo?.beta,
      fiftyTwoWeekHigh: companyInfo?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: companyInfo?.fiftyTwoWeekLow,
      timestamp: new Date(),
    };
  }

  async getFinancials(symbol: string): Promise<FinancialData> {
    // Get financial data
    const financialData = await this.makeRequest('/v2/reference/financials/' + symbol.toUpperCase());
    
    if (!financialData.results || !Array.isArray(financialData.results) || financialData.results.length === 0) {
      throw new Error('No financial data received');
    }

    // Get the most recent financial data
    const latest = (financialData.results as PolygonFinancialsItem[])[0];
    
    return {
      symbol: latest.ticker || symbol.toUpperCase(),
      revenue: latest.revenue || 0,
      netIncome: latest.net_income_loss || 0,
      totalAssets: latest.assets || 0,
      totalLiabilities: latest.liabilities || 0,
      cash: latest.cash_and_cash_equivalents || 0,
      debt: latest.debt || 0,
      equity: latest.equity || 0,
      eps: latest.earnings_per_share || 0,
      peRatio: latest.price_earnings_ratio,
      pbRatio: latest.price_book_ratio,
      roe: latest.return_on_equity,
      roa: latest.return_on_assets,
      debtToEquity: latest.debt_to_equity_ratio,
      currentRatio: latest.current_ratio,
      quickRatio: latest.quick_ratio,
      grossMargin: latest.gross_margin,
      operatingMargin: latest.operating_margin,
      netMargin: latest.net_margin,
      cashFlow: latest.operating_cash_flow || 0,
      fcf: latest.free_cash_flow || 0,
      timestamp: new Date(),
    };
  }

  private async getCompanyOverview(symbol: string): Promise<{
    name?: string;
    marketCap?: number;
    peRatio?: number;
    eps?: number;
    dividend?: number;
    divYield?: number;
    beta?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  }> {
    try {
      const data = await this.makeRequest('/v3/reference/tickers/' + symbol.toUpperCase());
      
      if (!(data.results as PolygonCompanyOverview)) {
        return {};
      }

      const company = data.results as PolygonCompanyOverview;
      
      return {
        name: company.name,
        marketCap: company.market_cap,
        peRatio: company.pe_ratio,
        eps: company.eps,
        dividend: company.dividend_yield,
        divYield: company.dividend_yield,
        beta: company.beta,
        fiftyTwoWeekHigh: company.high_52_weeks,
        fiftyTwoWeekLow: company.low_52_weeks,
      };
    } catch (error) {
      console.warn(`Failed to get company overview for ${symbol}:`, error);
      return {};
    }
  }

  private getDateRange(range: PriceRange): { from: string; to: string; timespan: string } {
    const now = new Date();
    const rangeLimits: Record<PriceRange, { multiplier: number; timespan: string }> = {
      '1D': { multiplier: 1, timespan: 'day' },
      '5D': { multiplier: 5, timespan: 'day' },
      '1M': { multiplier: 1, timespan: 'month' },
      '3M': { multiplier: 3, timespan: 'month' },
      '6M': { multiplier: 6, timespan: 'month' },
      '1Y': { multiplier: 1, timespan: 'year' },
      '2Y': { multiplier: 2, timespan: 'year' },
      '5Y': { multiplier: 5, timespan: 'year' },
      'MAX': { multiplier: 10, timespan: 'year' },
    };

    const { multiplier, timespan } = rangeLimits[range];
    const from = new Date(now.getTime() - (multiplier * this.getTimespanInMs(timespan)));
    const to = now.toISOString().split('T')[0];

    return { from: from.toISOString().split('T')[0], to, timespan };
  }

  private getTimespanInMs(timespan: string): number {
    const multipliers: Record<string, number> = {
      'minute': 60 * 1000,
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000,
      'quarter': 90 * 24 * 60 * 60 * 1000,
      'year': 365 * 24 * 60 * 60 * 1000,
    };
    return multipliers[timespan] || 24 * 60 * 60 * 1000;
  }

  // WebSocket methods for real-time data
  connectWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket('wss://delayed.polygon.io/stocks');
    
    this.ws.addEventListener('open', () => {
      console.log('Polygon WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Resubscribe to previously subscribed symbols
      this.subscribedSymbols.forEach(symbol => {
        this.subscribeToSymbol(symbol);
      });
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.ws.addEventListener('close', () => {
      console.log('Polygon WebSocket disconnected');
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.ws.addEventListener('error', (error) => {
      console.error('Polygon WebSocket error:', error);
      this.isConnected = false;
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => this.connectWebSocket(), delay);
    }
  }

  private handleWebSocketMessage(data: WebSocketData): void {
    if (!data || !data.ev) return;

    switch (data.ev) {
      case 'T': // Trade
        const tradeHandler = this.eventHandlers.get('trade') as ((t: PolygonTrade) => void) | undefined;
        if (tradeHandler) tradeHandler(data as unknown as PolygonTrade);
        break;
      case 'Q': // Quote
        const quoteHandler = this.eventHandlers.get('quote') as ((q: PolygonQuote) => void) | undefined;
        if (quoteHandler) quoteHandler(data as unknown as PolygonQuote);
        break;
      case 'AM': // Aggregate
        const aggregateHandler = this.eventHandlers.get('aggregate') as ((a: PolygonAggregate) => void) | undefined;
        if (aggregateHandler) aggregateHandler(data as unknown as PolygonAggregate);
        break;
      default:
        console.log('Unknown WebSocket event:', data.ev);
    }
  }

  subscribeToSymbol(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      action: 'subscribe',
      params: `T.${symbol}`
    };

    this.ws.send(JSON.stringify(message));
    this.subscribedSymbols.add(symbol);
  }

  unsubscribeFromSymbol(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      action: 'unsubscribe',
      params: `T.${symbol}`
    };

    this.ws.send(JSON.stringify(message));
    this.subscribedSymbols.delete(symbol);
  }

  onTrade(handler: (trade: PolygonTrade) => void): void {
    this.eventHandlers.set('trade', handler as unknown as (data: PolygonData) => void);
  }

  onQuote(handler: (quote: PolygonQuote) => void): void {
    this.eventHandlers.set('quote', handler as unknown as (data: PolygonData) => void);
  }

  onAggregate(handler: (agg: PolygonAggregate) => void): void {
    this.eventHandlers.set('aggregate', handler as unknown as (data: PolygonData) => void);
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribedSymbols.clear();
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey !== 'demo';
  }

  async getLastUpdate(symbol: string): Promise<Date | null> {
    try {
      const data = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers/' + symbol.toUpperCase() + '/quote');
      
      if (!data.results || !(data.results as PolygonSnapshotQuote).lastTrade) {
        return null;
      }

      // Use the last trade timestamp if available, otherwise use current time
      const lastTrade = (data.results as PolygonSnapshotQuote).lastTrade;
      if (lastTrade?.t) {
        return new Date(lastTrade.t);
      }
      
      return new Date();
    } catch {
      return null;
    }
  }

  // Additional methods for high-frequency data
  async getMinuteData(symbol: string, multiplier: number = 1, timespan: string = 'minute', from: string, to: string): Promise<PricePoint[]> {
    const params: Record<string, string> = {
      symbol: symbol.toUpperCase(),
      from,
      to,
      timespan,
      adjusted: 'true',
      sort: 'desc',
      limit: '50000'
    };

    const data = await this.makeRequest('/v2/aggs/ticker/' + symbol.toUpperCase() + '/range/' + multiplier + '/' + timespan + '/' + from + '/' + to, params);
    
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('No minute data received');
    }

    const results = data.results as PolygonAggregate[];
    return results.map((agg: PolygonAggregate) => ({
      date: new Date(agg.t),
      open: Number(agg.o) || 0,
      high: Number(agg.h) || 0,
      low: Number(agg.l) || 0,
      close: Number(agg.c) || 0,
      volume: Number(agg.v) || NaN,
    }));
  }

  async getTrades(symbol: string, from: string, to: string): Promise<PolygonTrade[]> {
    const params = {
      symbol: symbol.toUpperCase(),
      from,
      to,
      limit: '50000',
      reverse: 'true',
    };

    const data = await this.makeRequest('/v2/ticks/stocks/trades/' + symbol.toUpperCase() + '/' + from + '/' + to, params);
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('No trade data received');
    }

    return data.results as PolygonTrade[];
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      // Test authentication by making a simple API call
      await this.makeRequest('/v3/reference/tickers', { limit: '1' });
      return true;
    } catch {
      return false;
    }
  }
}

// Factory function to create adapter
export function createPolygonAdapter(apiKey: string): Provider {
  return new PolygonAdapter({ apiKey });
}
