import type { Provider, PricePoint, PriceRange, KpiData, FinancialData } from '../provider.types';

interface IBKRConfig {
  host: string;
  port: number;
  clientId: number;
  timeout?: number;
  autoConnect?: boolean;
}

interface IBKRContract {
  conId: number;
  symbol: string;
  secType: string;
  lastTradeDateOrContractMonth: string;
  strike: number;
  right: string;
  multiplier: string;
  exchange: string;
  currency: string;
  localSymbol: string;
  primaryExch: string;
  tradingClass: string;
  includeExpired: boolean;
  secIdType: string;
  secId: string;
  comboLegsDescrip: string;
  comboLegs: any[];
  deltaNeutralContract: any;
}

interface IBKRTickData {
  tickerId: number;
  field: number;
  price: number;
  size: number;
  timestamp: number;
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

export class InteractiveBrokersRealAdapter implements Provider {
  name = 'Interactive Brokers (Real)';
  private config: IBKRConfig;
  private connected = false;
  private socket: WebSocket | null = null;
  private requestId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private subscriptions = new Map<number, { symbol: string; type: string }>();
  private marketData = new Map<string, any>();
  private accountData: any = null;
  private positions: any[] = [];
  private orders: any[] = [];

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
  private async sendRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          id,
          ...request
        }));
      } else {
        clearTimeout(timeout);
        reject(new Error('WebSocket not connected'));
      }
    });
  }

  /**
   * Handle incoming messages from TWS
   */
  private handleMessage(message: any): void {
    const { id, type, data, error } = message;

    if (error) {
      const pending = this.pendingRequests.get(id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(id);
        pending.reject(new Error(error));
      }
      return;
    }

    switch (type) {
      case 'historicalData':
        this.handleHistoricalData(data);
        break;
      case 'marketData':
        this.handleMarketData(data);
        break;
      case 'accountData':
        this.handleAccountData(data);
        break;
      case 'positions':
        this.handlePositions(data);
        break;
      case 'orders':
        this.handleOrders(data);
        break;
      default:
        // Handle response to pending request
        const pending = this.pendingRequests.get(id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(id);
          pending.resolve(data);
        }
    }
  }

  /**
   * Handle historical data response
   */
  private handleHistoricalData(data: any): void {
    // Store historical data for later retrieval
    this.marketData.set(data.symbol, data);
  }

  /**
   * Handle real-time market data
   */
  private handleMarketData(data: any): void {
    // Update real-time market data
    this.marketData.set(data.symbol, {
      ...this.marketData.get(data.symbol),
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Handle account data response
   */
  private handleAccountData(data: any): void {
    this.accountData = data;
  }

  /**
   * Handle positions response
   */
  private handlePositions(data: any): void {
    this.positions = data;
  }

  /**
   * Handle orders response
   */
  private handleOrders(data: any): void {
    this.orders = data;
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
    this.pendingRequests.forEach((pending, id) => {
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
        return response.data.map((bar: IBKRHistoricalData) => ({
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
        const data = response.data;
        return {
          symbol,
          name: symbol,
          price: data.last || 0,
          change: (data.last || 0) - (data.close || 0),
          changePercent: data.close ? ((data.last - data.close) / data.close) * 100 : 0,
          volume: data.volume || 0,
          marketCap: data.marketCap || 0,
          peRatio: data.peRatio,
          eps: data.eps,
          dividend: data.dividend,
          divYield: data.divYield,
          beta: data.beta,
          fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: data.fiftyTwoWeekLow,
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
        const data = response.data;
        return {
          symbol,
          revenue: data.revenue || 0,
          netIncome: data.netIncome || 0,
          totalAssets: data.totalAssets,
          totalLiabilities: data.totalLiabilities,
          cash: data.cash,
          debt: data.debt,
          equity: data.equity,
          eps: data.eps,
          peRatio: data.peRatio,
          pbRatio: data.pbRatio,
          roe: data.roe,
          roa: data.roa,
          debtToEquity: data.debtToEquity,
          currentRatio: data.currentRatio,
          quickRatio: data.quickRatio,
          grossMargin: data.grossMargin,
          operatingMargin: data.operatingMargin,
          netMargin: data.netMargin,
          cashFlow: data.cashFlow || 0,
          fcf: data.fcf || 0,
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
    } catch (error) {
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
      return response.data;
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
  async getAccount(): Promise<any> {
    if (!this.connected) {
      return null;
    }

    try {
      const request = {
        method: 'GET',
        path: '/account'
      };

      const response = await this.sendRequest(request);
      return response?.data || null;
    } catch (error) {
      console.error('Error getting account from IBKR:', error);
      return null;
    }
  }

  /**
   * Get positions
   */
  async getPositions(): Promise<any[]> {
    if (!this.connected) {
      return [];
    }

    try {
      const request = {
        method: 'GET',
        path: '/positions'
      };

      const response = await this.sendRequest(request);
      return response?.data || [];
    } catch (error) {
      console.error('Error getting positions from IBKR:', error);
      return [];
    }
  }

  /**
   * Place an order
   */
  async placeOrder(order: any): Promise<number> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const request = {
        method: 'POST',
        path: '/order',
        body: order
      };

      const response = await this.sendRequest(request);
      return response?.data?.orderId || 0;
    } catch (error) {
      console.error('Error placing order with IBKR:', error);
      throw error;
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
    } catch (error) {
      console.error('Error canceling order with IBKR:', error);
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
      return response?.data?.status || 'Unknown';
    } catch (error) {
      console.error('Error getting order status from IBKR:', error);
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
      } catch (error) {
        console.error('Reconnection failed:', error);
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
      return response?.authenticated === true;
    } catch (error) {
      return false;
    }
  }
}
