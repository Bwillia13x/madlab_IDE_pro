import type { Provider, PricePoint, PriceRange, KpiData, FinancialData } from '../provider.types';

interface AlpacaConfig {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
  paperTrading?: boolean;
}

interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  crypto_status: string;
  currency: string;
  buying_power: number;
  regt_buying_power: number;
  daytrading_buying_power: number;
  non_marginable_buying_power: number;
  cash: number;
  accrued_fees: number;
  pending_transfer_out: number;
  pending_transfer_in: number;
  portfolio_value: number;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: number;
  last_equity: number;
  long_market_value: number;
  short_market_value: number;
  initial_margin: number;
  maintenance_margin: number;
  last_maintenance_margin: number;
  sma: number;
  daytrade_count: number;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: number;
  side: string;
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  unrealized_intraday_pl: number;
  unrealized_intraday_plpc: number;
  current_price: number;
  lastday_price: number;
  change_today: number;
}

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string;
  expired_at: string;
  canceled_at: string;
  failed_at: string;
  replaced_at: string;
  replaced_by: string;
  replaces: string;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional: number;
  qty: number;
  filled_qty: number;
  filled_avg_price: number;
  order_class: string;
  order_type: string;
  side: string;
  time_in_force: string;
  limit_price: number;
  stop_price: number;
  status: string;
  extended_hours: boolean;
  legs: any[];
  trail_percent: number;
  trail_price: number;
  hwm: number;
}

interface AlpacaBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n: number;
  vw: number;
}

export class AlpacaAdapter implements Provider {
  name = 'alpaca';
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private paperTrading: boolean;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AlpacaConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl || 'https://api.alpaca.markets';
    this.paperTrading = config.paperTrading ?? true;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    });

    // Add authentication headers
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    } else {
      // Use API key authentication for data endpoints
      headers.set('APCA-API-KEY-ID', this.apiKey);
      headers.set('APCA-API-SECRET-KEY', this.secretKey);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Alpaca API request failed:', error);
      throw error;
    }
  }

  // OAuth2 authentication methods
  async authenticate(): Promise<void> {
    // For now, we'll use API key authentication
    // OAuth2 implementation would require a separate OAuth flow
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async isAuthenticated(): Promise<boolean> {
    return !!this.apiKey && !!this.secretKey;
  }

  // Account and portfolio methods
  async getAccount(): Promise<AlpacaAccount> {
    const endpoint = this.paperTrading ? '/v2/accounts' : '/v2/accounts';
    return this.makeRequest(endpoint);
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    const endpoint = this.paperTrading ? '/v2/positions' : '/v2/positions';
    return this.makeRequest(endpoint);
  }

  async getPortfolioHistory(start: string, end: string, timeframe: string = '1D'): Promise<any> {
    const endpoint = this.paperTrading ? '/v2/account/portfolio/history' : '/v2/account/portfolio/history';
    const params = new URLSearchParams({
      start,
      end,
      timeframe,
    });
    
    return this.makeRequest(`${endpoint}?${params.toString()}`);
  }

  // Order management methods
  async createOrder(order: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
    trail_percent?: number;
    trail_price?: number;
    extended_hours?: boolean;
  }): Promise<AlpacaOrder> {
    const endpoint = this.paperTrading ? '/v2/orders' : '/v2/orders';
    
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getOrders(status?: string, limit?: number, after?: string, until?: string): Promise<AlpacaOrder[]> {
    const endpoint = this.paperTrading ? '/v2/orders' : '/v2/orders';
    const params = new URLSearchParams();
    
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    if (after) params.append('after', after);
    if (until) params.append('until', until);
    
    const queryString = params.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.makeRequest(url);
  }

  async getOrder(orderId: string): Promise<AlpacaOrder> {
    const endpoint = this.paperTrading ? `/v2/orders/${orderId}` : `/v2/orders/${orderId}`;
    return this.makeRequest(endpoint);
  }

  async cancelOrder(orderId: string): Promise<void> {
    const endpoint = this.paperTrading ? `/v2/orders/${orderId}` : `/v2/orders/${orderId}`;
    await this.makeRequest(endpoint, { method: 'DELETE' });
  }

  async replaceOrder(orderId: string, order: Partial<AlpacaOrder>): Promise<AlpacaOrder> {
    const endpoint = this.paperTrading ? `/v2/orders/${orderId}` : `/v2/orders/${orderId}`;
    
    return this.makeRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(order),
    });
  }

  // Advanced order types
  async createBracketOrder(order: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
    limit_price?: number;
    take_profit: number;
    stop_loss: number;
    extended_hours?: boolean;
  }): Promise<AlpacaOrder[]> {
    const endpoint = this.paperTrading ? '/v2/orders' : '/v2/orders';
    
    // Create main order
    const mainOrder = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        symbol: order.symbol.toUpperCase(),
        qty: order.qty,
        side: order.side,
        type: order.type,
        time_in_force: order.time_in_force,
        limit_price: order.limit_price,
        extended_hours: order.extended_hours,
      }),
    });

    // Create take profit order
    const takeProfitOrder = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        symbol: order.symbol.toUpperCase(),
        qty: order.qty,
        side: order.side === 'buy' ? 'sell' : 'buy',
        type: 'limit',
        time_in_force: 'gtc',
        limit_price: order.take_profit,
        extended_hours: order.extended_hours,
      }),
    });

    // Create stop loss order
    const stopLossOrder = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        symbol: order.symbol.toUpperCase(),
        qty: order.qty,
        side: order.side === 'buy' ? 'sell' : 'buy',
        type: 'stop',
        time_in_force: 'gtc',
        stop_price: order.stop_loss,
        extended_hours: order.extended_hours,
      }),
    });

    return [mainOrder, takeProfitOrder, stopLossOrder];
  }

  async createTrailingStopOrder(order: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    trail_percent: number;
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
    extended_hours?: boolean;
  }): Promise<AlpacaOrder> {
    const endpoint = this.paperTrading ? '/v2/orders' : '/v2/orders';
    
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        symbol: order.symbol.toUpperCase(),
        qty: order.qty,
        side: order.side,
        type: 'trailing_stop',
        time_in_force: order.time_in_force,
        trail_percent: order.trail_percent,
        extended_hours: order.extended_hours,
      }),
    });
  }

  // Enhanced portfolio management
  async getPortfolioAnalytics(): Promise<{
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    dailyPnL: number;
    dailyPnLPercent: number;
    sectorAllocation: Record<string, number>;
    topHoldings: Array<{ symbol: string; value: number; weight: number }>;
    riskMetrics: {
      beta: number;
      sharpeRatio: number;
      maxDrawdown: number;
      volatility: number;
    };
  }> {
    const [account, positions] = await Promise.all([
      this.getAccount(),
      this.getPositions(),
    ]);

    const totalValue = account.portfolio_value;
    const totalPnL = account.portfolio_value - account.last_equity;
    const totalPnLPercent = (totalPnL / account.last_equity) * 100;

    // Calculate sector allocation and top holdings
    const sectorAllocation: Record<string, number> = {};
    const holdings = positions.map(pos => ({
      symbol: pos.symbol,
      value: pos.market_value,
      weight: (pos.market_value / totalValue) * 100,
    }));

    const topHoldings = holdings
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Calculate risk metrics (simplified)
    const riskMetrics = {
      beta: 1.0, // Placeholder - would need historical data
      sharpeRatio: 0.0, // Placeholder
      maxDrawdown: 0.0, // Placeholder
      volatility: 0.0, // Placeholder
    };

    return {
      totalValue,
      totalPnL,
      totalPnLPercent,
      dailyPnL: totalPnL, // Simplified - would need daily tracking
      dailyPnLPercent: totalPnLPercent,
      sectorAllocation,
      topHoldings,
      riskMetrics,
    };
  }

  async getRiskMetrics(): Promise<{
    var95: number;
    var99: number;
    expectedShortfall: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
  }> {
    // Get portfolio history for risk calculations
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const history = await this.getPortfolioHistory(startDate, endDate, '1D');
    
    if (!history.equity || !Array.isArray(history.equity)) {
      throw new Error('No portfolio history available for risk calculation');
    }

    const equityValues = history.equity.map((point: any) => parseFloat(point.v));
    const returns = [];
    
    for (let i = 1; i < equityValues.length; i++) {
      returns.push((equityValues[i] - equityValues[i - 1]) / equityValues[i - 1]);
    }

    // Calculate VaR (Value at Risk)
    const sortedReturns = returns.sort((a, b) => a - b);
    const var95 = sortedReturns[Math.floor(returns.length * 0.05)];
    const var99 = sortedReturns[Math.floor(returns.length * 0.01)];

    // Calculate Expected Shortfall (Conditional VaR)
    const tailReturns = returns.filter(r => r <= var95);
    const expectedShortfall = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;

    // Calculate Max Drawdown
    let maxDrawdown = 0;
    let peak = equityValues[0];
    
    for (const value of equityValues) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate Sharpe Ratio (simplified - assuming 0% risk-free rate)
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length);
    const sharpeRatio = meanReturn / stdDev;

    // Calculate Sortino Ratio (downside deviation only)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length);
    const sortinoRatio = meanReturn / downsideDeviation;

    return {
      var95,
      var99,
      expectedShortfall,
      maxDrawdown,
      sharpeRatio,
      sortinoRatio,
    };
  }

  // Market data methods (implementing Provider interface)
  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    const now = new Date();
    const rangeLimits: Record<PriceRange, { days: number; timeframe: string }> = {
      '1D': { days: 1, timeframe: '1Min' },
      '5D': { days: 5, timeframe: '5Min' },
      '1M': { days: 30, timeframe: '1Hour' },
      '3M': { days: 90, timeframe: '1Hour' },
      '6M': { days: 180, timeframe: '1Day' },
      '1Y': { days: 365, timeframe: '1Day' },
      '2Y': { days: 730, timeframe: '1Day' },
      '5Y': { days: 1825, timeframe: '1Day' },
      'MAX': { days: 3650, timeframe: '1Day' },
    };

    const { days, timeframe } = rangeLimits[range];
    const start = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const endpoint = this.paperTrading ? '/v2/stocks' : '/v2/stocks';
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      start: start.toISOString(),
      end: now.toISOString(),
      timeframe,
      adjustment: 'all',
    });

    const data = await this.makeRequest(`${endpoint}/${symbol.toUpperCase()}/bars?${params.toString()}`);
    
    if (!data.bars || !Array.isArray(data.bars) || data.bars.length === 0) {
      throw new Error('No price data received');
    }

    return data.bars.map((bar: AlpacaBar) => ({
      date: new Date(bar.t),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
  }

  async getKpis(symbol: string): Promise<KpiData> {
    // Get latest quote data
    const quoteData = await this.makeRequest('/v2/stocks/' + symbol.toUpperCase() + '/quotes/latest');
    
    if (!quoteData.quotes || !Array.isArray(quoteData.quotes) || quoteData.quotes.length === 0) {
      throw new Error('No quote data received');
    }

    const quote = quoteData.quotes[0];
    const price = quote.ask_price || quote.bid_price || 0;
    const previousClose = quote.prev_close || price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      volume: quote.ask_size || quote.bid_size || 0,
      marketCap: 0,
      peRatio: undefined,
      eps: undefined,
      dividend: undefined,
      divYield: undefined,
      beta: undefined,
      fiftyTwoWeekHigh: undefined,
      fiftyTwoWeekLow: undefined,
      timestamp: new Date(),
    };
  }

  async getFinancials(symbol: string): Promise<FinancialData> {
    // Alpaca doesn't provide financial statements directly
    // This would need to be supplemented with another data source
    throw new Error('Financial data not available through Alpaca API');
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiKey && this.secretKey && this.apiKey !== 'demo' && this.secretKey !== 'demo');
  }

  async getLastUpdate(symbol: string): Promise<Date | null> {
    try {
      const kpis = await this.getKpis(symbol);
      return kpis.timestamp;
    } catch {
      return null;
    }
  }

  // Additional Alpaca-specific methods
  async getLatestTrade(symbol: string): Promise<any> {
    const endpoint = this.paperTrading ? '/v2/stocks' : '/v2/stocks';
    return this.makeRequest(`${endpoint}/${symbol.toUpperCase()}/trades/latest`);
  }

  async getLatestQuote(symbol: string): Promise<any> {
    const endpoint = this.paperTrading ? '/v2/stocks' : '/v2/stocks';
    return this.makeRequest(`${endpoint}/${symbol.toUpperCase()}/quotes/latest`);
  }

  async getMultiBars(symbols: string[], timeframe: string = '1Day', start: string, end: string): Promise<any> {
    const endpoint = this.paperTrading ? '/v2/stocks' : '/v2/stocks';
    const params = new URLSearchParams({
      symbols: symbols.join(','),
      timeframe,
      start,
      end,
      adjustment: 'all',
    });

    return this.makeRequest(`${endpoint}/bars?${params.toString()}`);
  }

  // Watchlist methods
  async getWatchlists(): Promise<any[]> {
    const endpoint = this.paperTrading ? '/v2/watchlists' : '/v2/watchlists';
    return this.makeRequest(endpoint);
  }

  async createWatchlist(name: string, symbols: string[]): Promise<any> {
    const endpoint = this.paperTrading ? '/v2/watchlists' : '/v2/watchlists';
    
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ name, symbols }),
    });
  }

  async updateWatchlist(watchlistId: string, symbols: string[]): Promise<any> {
    const endpoint = this.paperTrading ? `/v2/watchlists/${watchlistId}` : `/v2/watchlists/${watchlistId}`;
    
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ symbols }),
    });
  }

  async deleteWatchlist(watchlistId: string): Promise<void> {
    const endpoint = this.paperTrading ? `/v2/watchlists/${watchlistId}` : `/v2/watchlists/${watchlistId}`;
    await this.makeRequest(endpoint, { method: 'DELETE' });
  }

  // Calendar methods
  async getMarketCalendar(start: string, end: string): Promise<any[]> {
    const endpoint = this.paperTrading ? '/v2/calendar' : '/v2/calendar';
    const params = new URLSearchParams({ start, end });
    
    return this.makeRequest(`${endpoint}?${params.toString()}`);
  }

  async getClock(): Promise<any> {
    const endpoint = this.paperTrading ? '/v2/clock' : '/v2/clock';
    return this.makeRequest(endpoint);
  }
}

// Factory function to create adapter
export function createAlpacaAdapter(apiKey: string, secretKey: string, paperTrading: boolean = true): Provider {
  return new AlpacaAdapter({ apiKey, secretKey, paperTrading });
}