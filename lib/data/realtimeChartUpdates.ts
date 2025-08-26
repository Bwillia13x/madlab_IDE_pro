import { EventEmitter } from 'events';
import { getProvider, getBestProvider } from './providers';
import type { PricePoint, KpiData } from './provider.types';

export interface ChartUpdate {
  symbol: string;
  type: 'price' | 'volume' | 'indicator' | 'news' | 'alert';
  data: PricePoint | KpiData | number | string;
  timestamp: number;
  widgetId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface ChartSubscription {
  widgetId: string;
  symbol: string;
  updateTypes: string[];
  callback: (update: ChartUpdate) => void;
}

export class RealtimeChartUpdateService extends EventEmitter {
  private subscriptions: Map<string, ChartSubscription[]> = new Map();
  private updateQueue: ChartUpdate[] = [];
  private isProcessing = false;
  private updateInterval?: NodeJS.Timeout;
  private lastUpdate: Map<string, number> = new Map();
  private providerHealth: Map<string, boolean> = new Map();
  
  constructor() {
    super();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Auto-detect best provider for real-time updates
      const bestProvider = await getBestProvider(['realtime']);
      console.log(`📊 Chart update service initialized with ${bestProvider} provider`);
      
      // Start update processing
      this.startUpdateProcessing();
      
      // Monitor provider health
      this.monitorProviderHealth();
    } catch (error) {
      console.warn('Chart update service initialization failed:', error);
      this.startUpdateProcessing(); // Still start with mock data
    }
  }

  private startUpdateProcessing(): void {
    // Process updates every 100ms for smooth chart animations
    this.updateInterval = setInterval(() => {
      this.processUpdateQueue();
    }, 100);
  }

  private async monitorProviderHealth(): Promise<void> {
    setInterval(async () => {
      try {
        const provider = getProvider();
        const [available, authenticated] = await Promise.all([
          provider.isAvailable(),
          provider.isAuthenticated()
        ]);
        
        const isHealthy = available && authenticated;
        this.providerHealth.set(provider.name, isHealthy);
        
        if (!isHealthy && this.providerHealth.has(provider.name)) {
          console.warn(`⚠️ Provider ${provider.name} health degraded`);
          this.emit('provider-health-change', { provider: provider.name, healthy: false });
        }
      } catch (error) {
        console.warn('Provider health check failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  // Subscribe a widget to real-time updates
  subscribe(subscription: ChartSubscription): void {
    const { symbol, widgetId } = subscription;
    
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, []);
    }
    
    this.subscriptions.get(symbol)!.push(subscription);
    console.log(`📡 Widget ${widgetId} subscribed to ${symbol} updates`);
    
    // Send initial data
    this.sendInitialData(subscription);
  }

  // Unsubscribe a widget from updates
  unsubscribe(widgetId: string, symbol?: string): void {
    if (symbol) {
      const subscriptions = this.subscriptions.get(symbol);
      if (subscriptions) {
        const filtered = subscriptions.filter(sub => sub.widgetId !== widgetId);
        if (filtered.length === 0) {
          this.subscriptions.delete(symbol);
        } else {
          this.subscriptions.set(symbol, filtered);
        }
      }
    } else {
      // Unsubscribe from all symbols
      for (const [sym, subs] of Array.from(this.subscriptions.entries())) {
        const filtered = subs.filter(sub => sub.widgetId !== widgetId);
        if (filtered.length === 0) {
          this.subscriptions.delete(sym);
        } else {
          this.subscriptions.set(sym, filtered);
        }
      }
    }
    
    console.log(`📡 Widget ${widgetId} unsubscribed from updates`);
  }

  // Send initial data to new subscribers
  private async sendInitialData(subscription: ChartSubscription): Promise<void> {
    try {
      const provider = getProvider();
      const [prices, kpis] = await Promise.all([
        provider.getPrices(subscription.symbol, '1D'),
        provider.getKpis(subscription.symbol)
      ]);

      if (prices && prices.length > 0) {
        const latestPrice = prices[0];
        const update: ChartUpdate = {
          symbol: subscription.symbol,
          type: 'price',
          data: latestPrice,
          timestamp: Date.now(),
          widgetId: subscription.widgetId,
          priority: 'normal'
        };
        
        subscription.callback(update);
      }

      if (kpis) {
        const update: ChartUpdate = {
          symbol: subscription.symbol,
          type: 'volume',
          data: kpis,
          timestamp: Date.now(),
          widgetId: subscription.widgetId,
          priority: 'normal'
        };
        
        subscription.callback(update);
      }
    } catch (error) {
      console.warn(`Failed to send initial data for ${subscription.symbol}:`, error);
    }
  }

  // Queue an update for processing
  queueUpdate(update: ChartUpdate): void {
    // Check if this is a duplicate update (within 1 second)
    const key = `${update.symbol}-${update.type}`;
    const lastUpdateTime = this.lastUpdate.get(key);
    
    if (lastUpdateTime && Date.now() - lastUpdateTime < 1000) {
      return; // Skip duplicate updates
    }
    
    this.lastUpdate.set(key, Date.now());
    this.updateQueue.push(update);
    
    // Prioritize critical updates
    if (update.priority === 'critical') {
      this.updateQueue.sort((a, b) => {
        if (a.priority === 'critical' && b.priority !== 'critical') return -1;
        if (b.priority === 'critical' && a.priority !== 'critical') return 1;
        return 0;
      });
    }
  }

  // Process the update queue
  private processUpdateQueue(): void {
    if (this.isProcessing || this.updateQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      // Process up to 10 updates per cycle for smooth performance
      const updatesToProcess = this.updateQueue.splice(0, 10);
      
      for (const update of updatesToProcess) {
        this.broadcastUpdate(update);
      }
    } catch (error) {
      console.error('Error processing update queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Broadcast update to all subscribed widgets
  private broadcastUpdate(update: ChartUpdate): void {
    const subscriptions = this.subscriptions.get(update.symbol);
    if (!subscriptions) return;
    
    for (const subscription of subscriptions) {
      try {
        // Check if widget is interested in this update type
        if (subscription.updateTypes.includes(update.type) || 
            subscription.updateTypes.includes('*')) {
          subscription.callback(update);
        }
      } catch (error) {
        console.warn(`Error delivering update to widget ${subscription.widgetId}:`, error);
      }
    }
    
    // Emit global update event
    this.emit('chart-update', update);
  }

  // Manually trigger an update for a symbol
  async triggerUpdate(symbol: string, type: string = 'price'): Promise<void> {
    try {
      const provider = getProvider();
      let data: any;
      
      switch (type) {
        case 'price':
          data = await provider.getPrices(symbol, '1D');
          if (data && data.length > 0) {
            data = data[0]; // Latest price
          }
          break;
        case 'volume':
          data = await provider.getKpis(symbol);
          break;
        default:
          data = await provider.getKpis(symbol);
      }
      
      if (data) {
        const update: ChartUpdate = {
          symbol,
          type: type as any,
          data,
          timestamp: Date.now(),
          priority: 'normal'
        };
        
        this.queueUpdate(update);
      }
    } catch (error) {
      console.warn(`Failed to trigger update for ${symbol}:`, error);
    }
  }

  // Get current subscription status
  getSubscriptionStatus(): {
    totalSubscriptions: number;
    symbols: string[];
    widgetCount: number;
    providerHealth: Record<string, boolean>;
  } {
    const symbols = Array.from(this.subscriptions.keys());
    const widgetCount = Array.from(this.subscriptions.values())
      .reduce((total, subs) => total + subs.length, 0);
    
    return {
      totalSubscriptions: this.subscriptions.size,
      symbols,
      widgetCount,
      providerHealth: Object.fromEntries(this.providerHealth)
    };
  }

  // Batch update multiple symbols
  async batchUpdate(symbols: string[], type: string = 'price'): Promise<void> {
    const updates: ChartUpdate[] = [];
    
    try {
      const provider = getProvider();
      
      for (const symbol of symbols) {
        try {
          let data: any;
          
          if (type === 'price') {
            const prices = await provider.getPrices(symbol, '1D');
            data = prices && prices.length > 0 ? prices[0] : null;
          } else {
            data = await provider.getKpis(symbol);
          }
          
          if (data) {
            updates.push({
              symbol,
              type: type as any,
              data,
              timestamp: Date.now(),
              priority: 'low' // Batch updates are lower priority
            });
          }
        } catch (error) {
          console.warn(`Failed to batch update ${symbol}:`, error);
        }
      }
      
      // Queue all updates
      updates.forEach(update => this.queueUpdate(update));
      
    } catch (error) {
      console.error('Batch update failed:', error);
    }
  }

  // Clean up resources
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.subscriptions.clear();
    this.updateQueue.length = 0;
    this.lastUpdate.clear();
    this.providerHealth.clear();
    
    this.removeAllListeners();
    console.log('📊 Chart update service destroyed');
  }
}

// Export singleton instance
export const chartUpdateService = new RealtimeChartUpdateService();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    chartUpdateService.destroy();
  });
}