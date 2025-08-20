import type { Provider, PricePoint, PriceRange, KpiData, FinancialData } from '../provider.types';

interface IBKRConfig {
  host: string;
  port: number;
  clientId: number;
  timeout?: number;
}

interface IBKRAccount {
  accountId: string;
  accountType: string;
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
  fullAvailableFunds: number;
  fullExcessLiquidity: number;
  currency: string;
  realTimePnL: number;
  unrealizedPnL: number;
}

interface IBKRPosition {
  symbol: string;
  contractId: number;
  position: number;
  marketPrice: number;
  marketValue: number;
  averageCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
  accountName: string;
}

interface IBKROrder {
  orderId: number;
  contractId: number;
  symbol: string;
  secType: string;
  exchange: string;
  action: string;
  totalQuantity: number;
  orderType: string;
  lmtPrice?: number;
  auxPrice?: number;
  tif: string;
  ocaGroup: string;
  account: string;
  openClose: string;
  origin: number;
  orderRef: string;
  clientId: number;
  permId: number;
  outsideRth: boolean;
  hidden: boolean;
  discretionaryAmt: number;
  eTradeOnly: boolean;
  firmQuoteOnly: boolean;
  nbboPriceCap: number;
  usePriceManagement: boolean;
  isPtpOrder: boolean;
}

export class InteractiveBrokersAdapter implements Provider {
  name = 'Interactive Brokers';
  private config: IBKRConfig;
  private connected = false;
  private socket: WebSocket | null = null;
  private requestId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();

  constructor(config: IBKRConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  /**
   * Connect to IBKR TWS/Gateway
   */
  async connect(): Promise<boolean> {
    try {
      // Note: This is a simplified implementation
      // Real IBKR integration would use their official API or TWS API
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to IBKR:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Disconnect from IBKR
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
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
      throw new Error('Not connected to IBKR');
    }

    try {
      // Mock implementation - in real scenario, this would call IBKR API
      const mockData: PricePoint[] = [];
      const now = new Date();
      const days = this.getDaysFromRange(range);
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        mockData.push({
          date,
          open: 100 + Math.random() * 10,
          high: 105 + Math.random() * 10,
          low: 95 + Math.random() * 10,
          close: 100 + Math.random() * 10,
          volume: Math.floor(Math.random() * 1000000)
        });
      }

      return mockData;
    } catch (error) {
      console.error('Error getting prices from IBKR:', error);
      throw error;
    }
  }

  /**
   * Get KPI data for a symbol
   */
  async getKpis(symbol: string): Promise<KpiData> {
    try {
      if (!this.connected) {
        throw new Error('Not connected to IBKR');
      }

      // Mock implementation
      return {
        symbol,
        name: symbol,
        price: 100 + Math.random() * 10,
        change: (Math.random() - 0.5) * 5,
        changePercent: (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 1000000),
        marketCap: Math.floor(Math.random() * 1000000000),
        peRatio: 15 + Math.random() * 10,
        eps: 2 + Math.random() * 3,
        dividend: Math.random() * 2,
        divYield: Math.random() * 5,
        beta: 0.8 + Math.random() * 0.4,
        fiftyTwoWeekHigh: 120 + Math.random() * 20,
        fiftyTwoWeekLow: 80 + Math.random() * 20,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting KPIs from IBKR:', error);
      throw error;
    }
  }

  /**
   * Get financial data for a symbol
   */
  async getFinancials(symbol: string): Promise<FinancialData> {
    try {
      if (!this.connected) {
        throw new Error('Not connected to IBKR');
      }

      // Mock implementation
      return {
        symbol,
        revenue: Math.floor(Math.random() * 1000000000),
        netIncome: Math.floor(Math.random() * 100000000),
        totalAssets: Math.floor(Math.random() * 2000000000),
        totalLiabilities: Math.floor(Math.random() * 1000000000),
        cash: Math.floor(Math.random() * 500000000),
        debt: Math.floor(Math.random() * 800000000),
        equity: Math.floor(Math.random() * 1200000000),
        eps: 2 + Math.random() * 3,
        peRatio: 15 + Math.random() * 10,
        pbRatio: 1 + Math.random() * 2,
        roe: 10 + Math.random() * 15,
        roa: 5 + Math.random() * 10,
        debtToEquity: 0.3 + Math.random() * 0.7,
        currentRatio: 1.5 + Math.random() * 1.5,
        quickRatio: 1 + Math.random() * 1,
        grossMargin: 20 + Math.random() * 30,
        operatingMargin: 10 + Math.random() * 20,
        netMargin: 5 + Math.random() * 15,
        cashFlow: Math.floor(Math.random() * 200000000),
        fcf: Math.floor(Math.random() * 150000000),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting financials from IBKR:', error);
      throw error;
    }
  }

  /**
   * Get last update timestamp for a symbol
   */
  async getLastUpdate(_symbol: string): Promise<Date | null> {
    try {
      if (!this.connected) {
        return null;
      }
      return new Date();
    } catch {
      return null;
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<IBKRAccount | null> {
    try {
      if (!this.connected) {
        return null;
      }

      // Mock implementation
      return {
        accountId: 'DU1234567',
        accountType: 'Individual',
        netLiquidation: 100000,
        totalCashValue: 50000,
        settledCash: 48000,
        accruedCash: 2000,
        buyingPower: 200000,
        equityWithLoanValue: 100000,
        previousDayEquityWithLoanValue: 98000,
        grossPositionValue: 50000,
        regTMargin: 25000,
        initialMargin: 25000,
        maintenanceMargin: 20000,
        availableFunds: 75000,
        excessLiquidity: 75000,
        cushion: 50000,
        fullInitMarginReq: 25000,
        fullMaintMarginReq: 20000,
        fullAvailableFunds: 75000,
        fullExcessLiquidity: 75000,
        currency: 'USD',
        realTimePnL: 2000,
        unrealizedPnL: 2000
      };
    } catch {
      console.error('Error getting account from IBKR');
      return null;
    }
  }

  /**
   * Get positions
   */
  async getPositions(): Promise<IBKRPosition[]> {
    try {
      if (!this.connected) {
        return [];
      }

      // Mock implementation
      return [
        {
          symbol: 'AAPL',
          contractId: 76792991,
          position: 100,
          marketPrice: 150.50,
          marketValue: 15050,
          averageCost: 145.00,
          unrealizedPnL: 550,
          realizedPnL: 0,
          accountName: 'DU1234567'
        }
      ];
    } catch {
      console.error('Error getting positions from IBKR');
      return [];
    }
  }

  /**
   * Place an order
   */
  async placeOrder(_order: Partial<IBKROrder>): Promise<number> {
    try {
      if (!this.connected) {
        throw new Error('Not connected to IBKR');
      }

      // Mock implementation - return a mock order ID
      return Math.floor(Math.random() * 1000000);
    } catch {
      console.error('Error placing order with IBKR');
      throw new Error('Failed to place order');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(_orderId: number): Promise<boolean> {
    try {
      if (!this.connected) {
        return false;
      }

      // Mock implementation
      return true;
    } catch {
      console.error('Error canceling order with IBKR');
      return false;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(_orderId: number): Promise<string> {
    try {
      if (!this.connected) {
        return 'Unknown';
      }

      // Mock implementation
      return 'Filled';
    } catch {
      console.error('Error getting order status from IBKR');
      return 'Unknown';
    }
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
   * Get number of days from range
   */
  private getDaysFromRange(range: PriceRange): number {
    switch (range) {
      case '1D': return 1;
      case '5D': return 5;
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
      case '1Y': return 365;
      case '2Y': return 730;
      case '5Y': return 1825;
      case 'MAX': return 3650;
      default: return 30;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      // For mock IB adapter, always return true
      return true;
    } catch {
      return false;
    }
  }
}
