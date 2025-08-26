import { EventEmitter } from 'events';
import { getProvider } from './providers';

export interface RealtimeData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  exchange?: string;
  bid?: number;
  ask?: number;
  lastSize?: number;
}

export interface RealtimeConfig {
  webSocketUrl?: string;
  pollingInterval: number;
  maxReconnectAttempts: number;
  symbols: string[];
  provider: string;
}

export class RealtimeDataService extends EventEmitter {
  private config: RealtimeConfig;
  private webSocket?: WebSocket;
  private pollingInterval?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private isConnected = false;
  private currentProvider = 'mock';

  constructor(config: Partial<RealtimeConfig> = {}) {
    super();
    this.config = {
      pollingInterval: 5000,
      maxReconnectAttempts: 5,
      symbols: [],
      provider: 'mock',
      ...config,
    };
    
    // Auto-detect best available provider
    this.detectBestProvider();
  }

  private async detectBestProvider(): Promise<void> {
    try {
      // Check available providers and their health
      const providers = ['alpaca', 'polygon', 'alpha-vantage', 'mock'];
      
      for (const providerName of providers) {
        try {
          const provider = getProvider(providerName);
          if (provider.name !== 'mock') {
            const [available, authenticated] = await Promise.all([
              provider.isAvailable(),
              provider.isAuthenticated()
            ]);
            
            if (available && authenticated) {
              this.currentProvider = providerName;
              console.log(`🚀 Real-time service using ${providerName} provider`);
              break;
            }
          }
        } catch (error) {
          console.warn(`Provider ${providerName} check failed:`, error);
        }
      }
      
      if (this.currentProvider === 'mock') {
        console.log('📊 Real-time service using mock provider (demo mode)');
      }
    } catch (error) {
      console.warn('Provider detection failed, using mock:', error);
      this.currentProvider = 'mock';
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Try WebSocket first for supported providers
      if (this.shouldUseWebSocket()) {
        await this.connectWebSocket();
      } else {
        // Fall back to polling
        this.startPolling();
      }
      
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      console.error('Failed to connect to real-time service:', error);
      this.fallbackToPolling();
    }
  }

  private shouldUseWebSocket(): boolean {
    // Only use WebSocket for providers that support it
    return ['alpaca', 'polygon'].includes(this.currentProvider);
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.config.webSocketUrl) {
      throw new Error('WebSocket URL not configured');
    }

    try {
      this.webSocket = new WebSocket(this.config.webSocketUrl);
      
      this.webSocket.onopen = () => {
        console.log(`🔌 WebSocket connected to ${this.currentProvider} for real-time data`);
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Subscribe to symbols
        this.subscribeToSymbols();
      };
      
      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeData;
          this.emit('data', data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.webSocket.onclose = () => {
        console.log(`🔌 WebSocket disconnected from ${this.currentProvider}`);
        this.isConnected = false;
        this.emit('disconnected');
        this.handleReconnection();
      };
      
      this.webSocket.onerror = (error) => {
        console.error(`🔌 WebSocket error with ${this.currentProvider}:`, error);
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error(`Failed to connect WebSocket to ${this.currentProvider}:`, error);
      throw error;
    }
  }

  private subscribeToSymbols(): void {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) return;

    try {
      // Provider-specific subscription logic
      if (this.currentProvider === 'alpaca') {
        // Alpaca WebSocket subscription
        const subscribeMsg = {
          action: 'subscribe',
          trades: this.config.symbols,
          quotes: this.config.symbols,
          bars: this.config.symbols
        };
        this.webSocket.send(JSON.stringify(subscribeMsg));
      } else if (this.currentProvider === 'polygon') {
        // Polygon WebSocket subscription
        const subscribeMsg = {
          action: 'subscribe',
          params: this.config.symbols.map(symbol => `T.${symbol}`)
        };
        this.webSocket.send(JSON.stringify(subscribeMsg));
      }
    } catch (error) {
      console.error('Failed to subscribe to symbols:', error);
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.fallbackToPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connectWebSocket().catch(() => {
        this.handleReconnection();
      });
    }, delay);
  }

  private fallbackToPolling(): void {
    console.log('Falling back to polling for real-time data');
    this.startPolling();
  }

  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollData();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, this.config.pollingInterval);
  }

  private async pollData(): Promise<void> {
    try {
      const provider = getProvider(this.currentProvider);
      
      // Poll for each symbol
      for (const symbol of this.config.symbols) {
        try {
          const [priceData, kpiData] = await Promise.all([
            provider.getPrices(symbol, '1D'),
            provider.getKpis(symbol)
          ]);

          if (priceData && priceData.length > 0) {
            const latestPrice = priceData[priceData.length - 1];
            const realtimeData: RealtimeData = {
              symbol,
              price: latestPrice.close,
              volume: kpiData?.volume || 0,
              timestamp: Date.now(),
              exchange: this.currentProvider,
              bid: latestPrice.close * 0.999, // Simulated bid
              ask: latestPrice.close * 1.001, // Simulated ask
              lastSize: kpiData?.volume || 0
            };

            this.emit('data', realtimeData);
          }
        } catch (error) {
          console.warn(`Failed to poll data for ${symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }

  disconnect(): void {
    this.isConnected = false;
    
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = undefined;
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    
    this.emit('disconnected');
  }

  stop(): void {
    this.disconnect();
  }

  // Enhanced methods for better provider management
  async switchProvider(providerName: string): Promise<void> {
    try {
      const provider = getProvider(providerName);
      const [available, authenticated] = await Promise.all([
        provider.isAvailable(),
        provider.isAuthenticated()
      ]);

      if (!available) {
        throw new Error(`Provider ${providerName} is not available`);
      }

      if (!authenticated) {
        throw new Error(`Provider ${providerName} requires authentication`);
      }

      // Disconnect from current provider
      this.disconnect();

      // Switch to new provider
      this.currentProvider = providerName;
      console.log(`🔄 Switched real-time service to ${providerName}`);

      // Reconnect with new provider
      await this.connect();
    } catch (error) {
      console.error(`Failed to switch to provider ${providerName}:`, error);
      throw error;
    }
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  getConnectionStatus(): { isConnected: boolean; provider: string; method: 'websocket' | 'polling' } {
    return {
      isConnected: this.isConnected,
      provider: this.currentProvider,
      method: this.webSocket ? 'websocket' : 'polling'
    };
  }

  // Add symbols to real-time monitoring
  addSymbols(symbols: string[]): void {
    const newSymbols = symbols.filter(s => !this.config.symbols.includes(s));
    this.config.symbols.push(...newSymbols);
    
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.subscribeToSymbols();
    }
  }

  // Remove symbols from real-time monitoring
  removeSymbols(symbols: string[]): void {
    this.config.symbols = this.config.symbols.filter(s => !symbols.includes(s));
    
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      // Re-subscribe with updated symbol list
      this.subscribeToSymbols();
    }
  }

  // Get current symbols being monitored
  getMonitoredSymbols(): string[] {
    return [...this.config.symbols];
  }
}