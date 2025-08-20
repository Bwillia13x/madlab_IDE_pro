import type { Provider, PricePoint, PriceRange, KpiData, FinancialData } from '../provider.types';

interface IBKRConfig {
  host: string;
  port: number;
  clientId: number;
  timeout?: number;
  autoConnect?: boolean;
}

interface IBKRComboLeg {
  conId: number;
  ratio: number;
  action: string;
  exchange: string;
  openClose: number;
  shortSaleSlot: number;
  designatedLocation: string;
  exemptCode: number;
}

interface IBKRDeltaNeutralContract {
  conId: number;
  delta: number;
  price: number;
}

interface IBKRContract {
  conId: number;
  symbol: string;
  secType: string;
  lastTradingDay: string;
  strike: number;
  right: string;
  multiplier: string;
  exchange: string;
  currency: string;
  localSymbol: string;
  primaryExch: string;
  tradingClass: string;
  secIdType: string;
  secId: string;
  comboLegsDescrip: string;
  comboLegs: IBKRComboLeg[];
  deltaNeutralContract: IBKRDeltaNeutralContract | null;
}

interface IBKRHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  wap: number;
  hasGaps: boolean;
}

interface IBKRMarketData {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
}

interface IBKRAccountData {
  accountId: string;
  netLiquidation: number;
  totalCashValue: number;
  settledCash: number;
  accruedCash: number;
  buyingPower: number;
  equityWithLoanValue: number;
  previousDayEquityWithLoanValue: number;
  grossPositionValue: number;
  regTMargin: number;
  initialMargin: number;
  maintenanceMargin: number;
  availableFunds: number;
  excessLiquidity: number;
  cushion: number;
  fullInitMarginReq: number;
  fullMaintMarginReq: number;
  currency: string;
}

interface IBKRPosition {
  symbol: string;
  conId: number;
  position: number;
  marketValue: number;
  marketPrice: number;
  averageCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
  accountName: string;
}

interface IBKROrder {
  orderId: number;
  symbol: string;
  action: string;
  orderType: string;
  totalQuantity: number;
  lmtPrice: number;
  auxPrice: number;
  tif: string;
  status: string;
  filledQuantity: number;
  remainingQuantity: number;
  avgFillPrice: number;
  lastFillPrice: number;
  whyHeld: string;
  mktCapPrice: number;
}

interface IBKRRequest {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  params?: Record<string, string | number>;
}

interface IBKRResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  requestId?: number;
}

interface IBKRHistoricalDataResponse {
  symbol: string;
  data: IBKRHistoricalData[];
  requestId: number;
}

interface IBKRMarketDataResponse {
  symbol: string;
  data: IBKRMarketData;
  requestId: number;
}

interface IBKRAccountDataResponse {
  accountId: string;
  data: IBKRAccountData;
  requestId: number;
}

interface IBKRPositionsResponse {
  positions: IBKRPosition[];
  requestId: number;
}

interface IBKROrdersResponse {
  orders: IBKROrder[];
  requestId: number;
}

interface IBKROrderRequest {
  symbol: string;
  action: 'BUY' | 'SELL';
  orderType: 'MKT' | 'LMT' | 'STP' | 'STP LMT';
  totalQuantity: number;
  lmtPrice?: number;
  auxPrice?: number;
  tif: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  account: string;
}

export class InteractiveBrokersRealAdapter implements Provider {
  name = 'Interactive Brokers (Real)';
  private config: IBKRConfig;
  private connected = false;
  private socket: WebSocket | null = null;
  private requestId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private subscriptions = new Map<number, { symbol: string; type: string }>();
  private marketData = new Map<string, IBKRMarketData>();
  private accountData: IBKRAccountData | null = null;
  private positions: IBKRPosition[] = [];
  private orders: IBKROrder[] = [];

  constructor(config: IBKRConfig) {
    this.config = {
      timeout: 30000,
      autoConnect: true,
      ...config
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to IBKR TWS/Gateway using WebSocket
   */
  async connect(): Promise<boolean> {
    try {
      // Create WebSocket connection to TWS
      const wsUrl = `ws://${this.config.host}:${this.config.port}/v1/api/ws`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('Connected to IBKR TWS');
        this.connected = true;
        this.authenticate();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.socket.onerror = (error) => {
        console.error('IBKR WebSocket error:', error);
        this.connected = false;
      };

      this.socket.onclose = () => {
        console.log('Disconnected from IBKR TWS');
        this.connected = false;
        this.reconnect();
      };

      return true;
    } catch (error) {
      console.error('Failed to connect to IBKR:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Authenticate with TWS
   */
  private async authenticate(): Promise<void> {
    try {
      const authRequest = {
        method: 'POST',
        path: '/auth',
        body: {
          clientId: this.config.clientId,
          timestamp: Date.now()
        }
      };

      await this.sendRequest(authRequest);
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  }

  /**
   * Send request to TWS
   */
  private async sendRequest(request: IBKRRequest): Promise<IBKRResponse> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to IBKR');
    }

    const requestId = this.requestId++;
    const fullRequest = { ...request, requestId };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      this.socket!.send(JSON.stringify(fullRequest));
    });
  }

  /**
   * Handle incoming messages from TWS
   */
  private handleMessage(message: IBKRResponse): void {
    if (message.requestId && this.pendingRequests.has(message.requestId)) {
      const { resolve, reject, timeout } = this.pendingRequests.get(message.requestId)!;
      clearTimeout(timeout);
      this.pendingRequests.delete(message.requestId);

      if (message.success) {
        resolve(message.data as Record<string, unknown>);
      } else {
        reject(new Error(message.error || 'Unknown error'));
      }
    } else {
      // Handle unsolicited messages
      this.handleUnsolicited(message);
    }
  }
  /**
   * Handle unsolicited messages (market data updates, account updates, etc.)
   */
  private handleUnsolicited(message: IBKRResponse): void {
    try {
      if (!message || !message.data) return;
      const data = message.data as Record<string, unknown> & { type?: string };
      switch (data.type) {
        case 'historical-data':
          this.handleHistoricalData(data as unknown as IBKRHistoricalDataResponse);
          break;
        case 'market-data':
          this.handleMarketData(data as unknown as IBKRMarketDataResponse);
          break;
        case 'account-data':
          this.handleAccountData(data as unknown as IBKRAccountDataResponse);
          break;
        case 'positions':
          this.handlePositions(data as unknown as IBKRPositionsResponse);
          break;
        case 'orders':
          this.handleOrders(data as unknown as IBKROrdersResponse);
          break;
        default:
          // ignore unknown unsolicited types
          break;
      }
    } catch {
      // ignore parsing errors
    }
  }

  /**
   * Handle historical data response
   */
  private handleHistoricalData(data: IBKRHistoricalDataResponse): void {
    // Process historical data
    console.log('Received historical data for', data.symbol);
  }

  /**
   * Handle real-time market data
   */
  private handleMarketData(data: IBKRMarketDataResponse): void {
    // Update market data cache
    this.marketData.set(data.symbol, data.data);
  }

  /**
   * Handle account data response
   */
  private handleAccountData(data: IBKRAccountDataResponse): void {
    // Update account data
    this.accountData = data.data;
  }

  /**
   * Handle positions response
   */
  private handlePositions(data: IBKRPositionsResponse): void {
    // Update positions
    this.positions = data.positions;
  }

  /**
   * Handle orders response
   */
  private handleOrders(data: IBKROrdersResponse): void {
    // Update orders
    this.orders = data.orders;
  }

  /**
   * Disconnect from TWS
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    
    // Clear pending requests
    this.pendingRequests.forEach((pending, _id) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Disconnected'));
    });
    this.pendingRequests.clear();
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    return this.connected;
  }

  /**
   * Get historical price data
   */
  async getPrices(symbol: string, range: PriceRange = '1M'): Promise<PricePoint[]> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const contract = await this.getContract(symbol);
      const duration = this.convertRangeToDuration(range);
      const barSize = this.getBarSize(range);

      const request = {
        method: 'GET',
        path: '/historical-data',
        params: {
          conId: contract.conId,
          duration,
          barSize,
          whatToShow: 'TRADES',
          useRTH: 1,
          formatDate: 1
        }
      };

      const response = await this.sendRequest(request);
      
      if (response && response.data) {
        return (response.data as unknown as IBKRHistoricalData[]).map((bar: IBKRHistoricalData) => ({
          date: new Date(bar.date),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume
        }));
      }

      return [];
    } catch (error) {
      console.error('Error getting prices from IBKR:', error);
      throw error;
    }
  }

  /**
   * Get KPI data for a symbol
   */
  async getKpis(symbol: string): Promise<KpiData> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const contract = await this.getContract(symbol);
      
      // Get real-time market data
      const request = {
        method: 'GET',
        path: '/market-data',
        params: {
          conId: contract.conId,
          fields: '31,84,86,88,165,221,232,236'
        }
      };

      const response = await this.sendRequest(request);
      
      if (response && response.data) {
        const data = response.data as Record<string, number>;
        return {
          symbol,
          name: symbol,
          price: Number(data.last || 0),
          change: Number((data.last || 0)) - Number(data.close || 0),
          changePercent: data.close ? ((Number(data.last) - Number(data.close)) / Number(data.close)) * 100 : 0,
          volume: Number(data.volume || 0),
          marketCap: Number(data.marketCap || 0),
          peRatio: (data as Record<string, number> & { peRatio?: number }).peRatio,
          eps: (data as Record<string, number> & { eps?: number }).eps,
          dividend: (data as Record<string, number> & { dividend?: number }).dividend,
          divYield: (data as Record<string, number> & { divYield?: number }).divYield,
          beta: (data as Record<string, number> & { beta?: number }).beta,
          fiftyTwoWeekHigh: (data as Record<string, number> & { fiftyTwoWeekHigh?: number }).fiftyTwoWeekHigh,
          fiftyTwoWeekLow: (data as Record<string, number> & { fiftyTwoWeekLow?: number }).fiftyTwoWeekLow,
          timestamp: new Date()
        };
      }

      throw new Error('Failed to get KPI data');
    } catch (error) {
      console.error('Error getting KPIs from IBKR:', error);
      throw error;
    }
  }

  /**
   * Get financial data for a symbol
   */
  async getFinancials(symbol: string): Promise<FinancialData> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const contract = await this.getContract(symbol);
      
      const request = {
        method: 'GET',
        path: '/fundamentals',
        params: {
          conId: contract.conId,
          reportType: 'ReportsFinSummary'
        }
      };

      const response = await this.sendRequest(request);
      
      if (response && response.data) {
        const data = response.data as Record<string, number>;
        return {
          symbol,
          revenue: Number(data.revenue || 0),
          netIncome: Number(data.netIncome || 0),
          totalAssets: Number(data.totalAssets),
          totalLiabilities: Number(data.totalLiabilities),
          cash: Number(data.cash),
          debt: Number(data.debt),
          equity: Number(data.equity),
          eps: (data as Record<string, number> & { eps?: number }).eps,
          peRatio: (data as Record<string, number> & { peRatio?: number }).peRatio,
          pbRatio: (data as Record<string, number> & { pbRatio?: number }).pbRatio,
          roe: (data as Record<string, number> & { roe?: number }).roe,
          roa: (data as Record<string, number> & { roa?: number }).roa,
          debtToEquity: (data as Record<string, number> & { debtToEquity?: number }).debtToEquity,
          currentRatio: (data as Record<string, number> & { currentRatio?: number }).currentRatio,
          quickRatio: (data as Record<string, number> & { quickRatio?: number }).quickRatio,
          grossMargin: (data as Record<string, number> & { grossMargin?: number }).grossMargin,
          operatingMargin: (data as Record<string, number> & { operatingMargin?: number }).operatingMargin,
          netMargin: (data as Record<string, number> & { netMargin?: number }).netMargin,
          cashFlow: Number(data.cashFlow || 0),
          fcf: Number(data.fcf || 0),
          timestamp: new Date()
        };
      }

      throw new Error('Failed to get financial data');
    } catch (error) {
      console.error('Error getting financials from IBKR:', error);
      throw error;
    }
  }

  /**
   * Get last update timestamp for a symbol
   */
  async getLastUpdate(symbol: string): Promise<Date | null> {
    try {
      if (!this.connected) {
        return null;
      }
      
      const marketData = this.marketData.get(symbol);
      return marketData?.timestamp ? new Date(marketData.timestamp) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get contract information for a symbol
   */
  private async getContract(symbol: string): Promise<IBKRContract> {
    const request = {
      method: 'GET',
      path: '/contract',
      params: { symbol }
    };

    const response = await this.sendRequest(request);
    
    if (response && response.data) {
      return response.data as unknown as IBKRContract;
    }

    throw new Error(`Contract not found for symbol: ${symbol}`);
  }

  /**
   * Subscribe to real-time market data
   */
  async subscribeMarketData(symbol: string): Promise<number> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const contract = await this.getContract(symbol);
      const tickerId = this.requestId++;
      
      const request = {
        method: 'POST',
        path: '/market-data',
        body: {
          tickerId,
          conId: contract.conId,
          genericTickList: '31,84,86,88,165,221,232,236'
        }
      };

      await this.sendRequest(request);
      
      this.subscriptions.set(tickerId, { symbol, type: 'marketData' });
      return tickerId;
    } catch (error) {
      console.error('Error subscribing to market data:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from market data
   */
  async unsubscribeMarketData(tickerId: number): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const request = {
        method: 'DELETE',
        path: '/market-data',
        params: { tickerId }
      };

      await this.sendRequest(request);
      this.subscriptions.delete(tickerId);
    } catch (error) {
      console.error('Error unsubscribing from market data:', error);
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<IBKRAccountData | null> {
    if (!this.connected) {
      return null;
    }

    try {
      const request = {
        method: 'GET',
        path: '/account'
      };

      const response = await this.sendRequest(request);
      return (response?.data as unknown as IBKRAccountData) || null;
    } catch {
      return null;
    }
  }

  /**
   * Get positions
   */
  async getPositions(): Promise<IBKRPosition[]> {
    if (!this.connected) {
      return [];
    }

    try {
      const request = {
        method: 'GET',
        path: '/positions'
      };

      const response = await this.sendRequest(request);
      return (response?.data as unknown as IBKRPosition[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Place an order
   */
  async placeOrder(order: IBKROrderRequest): Promise<number> {
    const response = await this.sendRequest({
      method: 'POST',
      path: '/order',
      body: order as unknown as Record<string, unknown>,
    });

    if (response.success && response.data) {
      return (response.data as { orderId: number }).orderId;
    } else {
      throw new Error('Failed to place order');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const request = {
        method: 'DELETE',
        path: '/order',
        params: { orderId }
      };

      await this.sendRequest(request);
      return true;
    } catch {
      console.error('Error canceling order with IBKR');
      return false;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: number): Promise<string> {
    if (!this.connected) {
      return 'Unknown';
    }

    try {
      const request = {
        method: 'GET',
        path: '/order-status',
        params: { orderId }
      };

      const response = await this.sendRequest(request);
      const status = (response?.data as Record<string, unknown> | undefined)?.['status'];
      return typeof status === 'string' ? status : 'Unknown';
    } catch {
      console.error('Error getting order status from IBKR');
      return 'Unknown';
    }
  }

  /**
   * Reconnect to TWS
   */
  private async reconnect(): Promise<void> {
    if (this.connected) return;

    console.log('Attempting to reconnect to IBKR TWS...');
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (_error) {
        console.error('Reconnection failed:', _error);
        this.reconnect();
      }
    }, 5000);
  }

  /**
   * Convert price range to IBKR duration format
   */
  private convertRangeToDuration(range: PriceRange): string {
    switch (range) {
      case '1D': return '1 D';
      case '5D': return '5 D';
      case '1M': return '1 M';
      case '3M': return '3 M';
      case '6M': return '6 M';
      case '1Y': return '1 Y';
      case '2Y': return '2 Y';
      case '5Y': return '5 Y';
      case 'MAX': return '10 Y';
      default: return '1 M';
    }
  }

  /**
   * Get bar size for historical data
   */
  private getBarSize(range: PriceRange): string {
    switch (range) {
      case '1D': return '1 min';
      case '5D': return '5 mins';
      case '1M': return '1 hour';
      case '3M': return '1 day';
      case '6M': return '1 day';
      case '1Y': return '1 day';
      case '2Y': return '1 day';
      case '5Y': return '1 day';
      case 'MAX': return '1 day';
      default: return '1 day';
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      // Test authentication by checking connection status
      const request = {
        method: 'GET',
        path: '/auth/status',
        params: {}
      };
      const response = await this.sendRequest(request);
      const status = (response.data as Record<string, unknown> | undefined)?.['authenticated'];
      return status === true;
    } catch {
      return false;
    }
  }
}
