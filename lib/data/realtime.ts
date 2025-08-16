import { EventEmitter } from 'events';
import type { PricePoint, KpiData } from './provider.types';

export interface RealtimeData {
  symbol: string;
  type: 'price' | 'kpi' | 'volume';
  data: PricePoint | KpiData | number;
  timestamp: Date;
}

export interface RealtimeConfig {
  symbols: string[];
  updateInterval: number; // milliseconds
  enableWebSocket: boolean;
  webSocketUrl?: string;
}

export class RealtimeDataService extends EventEmitter {
  private config: RealtimeConfig;
  private isRunning = false;
  private updateTimer?: NodeJS.Timeout;
  private webSocket?: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: RealtimeConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    if (this.config.enableWebSocket && this.config.webSocketUrl) {
      await this.connectWebSocket();
    } else {
      this.startPolling();
    }
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = undefined;
    }
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.config.webSocketUrl) return;

    try {
      this.webSocket = new WebSocket(this.config.webSocketUrl);
      
      this.webSocket.onopen = () => {
        console.log('WebSocket connected for real-time data');
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
        console.log('WebSocket disconnected');
        this.emit('disconnected');
        this.handleReconnection();
      };
      
      this.webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.fallbackToPolling();
    }
  }

  private subscribeToSymbols(): void {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) return;

    const subscription = {
      type: 'subscribe',
      symbols: this.config.symbols,
      channels: ['price', 'kpi', 'volume']
    };

    this.webSocket.send(JSON.stringify(subscription));
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.fallbackToPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (this.isRunning) {
        this.connectWebSocket();
      }
    }, delay);
  }

  private fallbackToPolling(): void {
    console.log('Falling back to polling for real-time data');
    this.startPolling();
  }

  private startPolling(): void {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.pollData();
      } catch (error) {
        console.error('Polling error:', error);
        this.emit('error', error);
      }
    }, this.config.updateInterval);
  }

  private async pollData(): Promise<void> {
    // Simulate real-time data updates
    // In a real implementation, this would fetch from your data provider
    for (const symbol of this.config.symbols) {
      const mockPriceUpdate: RealtimeData = {
        symbol,
        type: 'price',
        data: {
          date: new Date(),
          open: Math.random() * 1000 + 100,
          high: Math.random() * 1000 + 100,
          low: Math.random() * 1000 + 100,
          close: Math.random() * 1000 + 100,
          volume: Math.floor(Math.random() * 1000000) + 100000,
        },
        timestamp: new Date(),
      };

      this.emit('data', mockPriceUpdate);
    }
  }

  // Public methods for external use
  addSymbol(symbol: string): void {
    if (!this.config.symbols.includes(symbol)) {
      this.config.symbols.push(symbol);
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.subscribeToSymbols();
      }
    }
  }

  removeSymbol(symbol: string): void {
    this.config.symbols = this.config.symbols.filter(s => s !== symbol);
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.subscribeToSymbols();
    }
  }

  updateConfig(newConfig: Partial<RealtimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  getStatus(): {
    isRunning: boolean;
    isConnected: boolean;
    symbols: string[];
    updateInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      isConnected: this.webSocket?.readyState === WebSocket.OPEN,
      symbols: [...this.config.symbols],
      updateInterval: this.config.updateInterval,
    };
  }
}

// Singleton instance
let realtimeService: RealtimeDataService | null = null;

export function getRealtimeService(): RealtimeDataService {
  if (!realtimeService) {
    realtimeService = new RealtimeDataService({
      symbols: ['AAPL', 'MSFT', 'GOOGL'],
      updateInterval: 5000, // 5 seconds
      enableWebSocket: false, // Disabled by default, enable when WebSocket endpoint is available
    });
  }
  return realtimeService;
}

export function createRealtimeService(config: RealtimeConfig): RealtimeDataService {
  if (realtimeService) {
    realtimeService.stop();
  }
  
  realtimeService = new RealtimeDataService(config);
  return realtimeService;
}