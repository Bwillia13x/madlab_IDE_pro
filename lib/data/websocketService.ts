import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: 'price' | 'trade' | 'orderbook' | 'ticker' | 'kpi' | 'news' | 'error' | 'connection' | 'queued';
  symbol?: string;
  data: any;
  timestamp: number;
  source: string;
}

export interface WebSocketConfig {
  url: string;
  apiKey?: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  timeout: number;
}

export interface MarketDataProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  supportedSymbols: string[];
  rateLimit: number; // requests per second
  subscriptionLimit: number; // max symbols per connection
}

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private subscribedSymbols = new Set<string>();
  private messageQueue: WebSocketMessage[] = [];
  private lastMessageTime = 0;
  private connectionStartTime = 0;

  // Market data providers
  private providers: MarketDataProvider[] = [
    {
      name: 'Alpha Vantage',
      baseUrl: 'wss://ws.alphavantage.co',
      apiKey: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY,
      supportedSymbols: ['*'], // All symbols
      rateLimit: 5,
      subscriptionLimit: 100,
    },
    {
      name: 'Polygon.io',
      baseUrl: 'wss://delayed.polygon.io',
      apiKey: process.env.NEXT_PUBLIC_POLYGON_API_KEY,
      supportedSymbols: ['*'],
      rateLimit: 5,
      subscriptionLimit: 1000,
    },
    {
      name: 'Finnhub',
      baseUrl: 'wss://ws.finnhub.io',
      apiKey: process.env.NEXT_PUBLIC_FINNHUB_API_KEY,
      supportedSymbols: ['*'],
      rateLimit: 60,
      subscriptionLimit: 100,
    },
  ];

  constructor(config?: Partial<WebSocketConfig>) {
    super();
    this.config = {
      url: this.providers[0].baseUrl,
      apiKey: this.providers[0].apiKey,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      timeout: 10000,
      ...config,
    };
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      this.connectionStartTime = Date.now();
      this.ws = new WebSocket(this.config.url);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      // Set connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          this.emit('error', new Error('Connection timeout'));
          this.reconnect();
        }
      }, this.config.timeout);

    } catch (error) {
      this.emit('error', error);
      this.reconnect();
    }
  }

  private handleOpen(event: Event): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.connectionStartTime = Date.now();
    
    // Authenticate if API key is provided
    if (this.config.apiKey) {
      this.send({
        type: 'auth',
        apiKey: this.config.apiKey,
      });
    }

    // Resubscribe to previously subscribed symbols
    this.subscribedSymbols.forEach(symbol => {
      this.subscribe(symbol);
    });

    // Start heartbeat
    this.startHeartbeat();

    this.emit('connection', { status: 'connected', timestamp: Date.now() });
    console.log('WebSocket connected successfully');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.lastMessageTime = Date.now();
      
      // Process message based on type
      switch (message.type) {
        case 'price':
          this.emit('price', message);
          break;
        case 'trade':
          this.emit('trade', message);
          break;
        case 'orderbook':
          this.emit('orderbook', message);
          break;
        case 'ticker':
          this.emit('ticker', message);
          break;
        case 'kpi':
          this.emit('kpi', message);
          break;
        case 'news':
          this.emit('news', message);
          break;
        case 'error':
          this.emit('error', new Error(message.data));
          break;
        default:
          this.emit('message', message);
      }

      // Process queued messages if connection was restored
      if (this.messageQueue.length > 0) {
        this.processMessageQueue();
      }

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('error', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    this.isConnected = false;
    this.stopHeartbeat();
    
    this.emit('connection', { 
      status: 'disconnected', 
      code: event.code, 
      reason: event.reason,
      timestamp: Date.now() 
    });

    console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);

    // Attempt to reconnect if not a clean close
    if (event.code !== 1000) {
      this.reconnect();
    }
  }

  private handleError(event: Event): void {
    this.emit('error', new Error('WebSocket error occurred'));
    console.error('WebSocket error:', event);
  }

  // Reconnection logic
  private reconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Heartbeat mechanism
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Subscription management
  subscribe(symbol: string): void {
    if (!this.isConnected || !this.ws) {
      this.subscribedSymbols.add(symbol);
      return;
    }

    const message = {
      type: 'subscribe',
      symbol: symbol.toUpperCase(),
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
    this.subscribedSymbols.add(symbol);
    
    this.emit('subscription', { symbol, status: 'subscribed' });
  }

  unsubscribe(symbol: string): void {
    if (!this.isConnected || !this.ws) {
      this.subscribedSymbols.delete(symbol);
      return;
    }

    const message = {
      type: 'unsubscribe',
      symbol: symbol.toUpperCase(),
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
    this.subscribedSymbols.delete(symbol);
    
    this.emit('subscription', { symbol, status: 'unsubscribed' });
  }

  // Message sending
  private send(message: any): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later if not connected
      this.messageQueue.push({
        type: 'queued',
        data: message,
        timestamp: Date.now(),
        source: 'client',
      });
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.isConnected && this.ws) {
        this.ws.send(JSON.stringify(message.data));
      }
    }
  }

  // Data provider switching
  switchProvider(providerName: string): boolean {
    const provider = this.providers.find(p => p.name === providerName);
    if (!provider) {
      this.emit('error', new Error(`Provider ${providerName} not found`));
      return false;
    }

    // Disconnect from current provider
    this.disconnect();

    // Update configuration
    this.config.url = provider.baseUrl;
    this.config.apiKey = provider.apiKey;

    // Connect to new provider
    this.connect();
    return true;
  }

  // Connection status
  getConnectionStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    uptime: number;
    lastMessageTime: number;
    subscribedSymbols: string[];
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      uptime: this.isConnected ? Date.now() - this.connectionStartTime : 0,
      lastMessageTime: this.lastMessageTime,
      subscribedSymbols: Array.from(this.subscribedSymbols),
    };
  }

  // Cleanup
  disconnect(): void {
    this.isConnected = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.emit('connection', { status: 'disconnected', timestamp: Date.now() });
  }

  // Destructor
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();

// Export for use in other modules
export default webSocketService;