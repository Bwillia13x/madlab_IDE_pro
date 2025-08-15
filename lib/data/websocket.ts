import { EventEmitter } from 'events';

export interface MarketDataMessage {
  type: 'price' | 'trade' | 'quote' | 'volume' | 'error';
  symbol: string;
  data: any;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class MarketDataWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isDestroyed = false;

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: MarketDataMessage = JSON.parse(event.data);
            this.emit('message', message);
            this.emit(message.type, message);
          } catch (error) {
            console.warn('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected', event.code, event.reason);

          if (!this.isDestroyed && event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }

  subscribe(symbols: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        action: 'subscribe',
        symbols,
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  unsubscribe(symbols: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        action: 'unsubscribe',
        symbols,
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect().catch((error) => {
          console.warn('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.removeAllListeners();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  get readyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Factory function to create WebSocket connections for different providers
export function createMarketDataWebSocket(
  provider: string,
  config: Partial<WebSocketConfig> = {}
): MarketDataWebSocket {
  const providerConfigs: Record<string, WebSocketConfig> = {
    polygon: {
      url: 'wss://delayed.polygon.io/stocks',
      ...config,
    },
    iex: {
      url: 'wss://ws-api.iex.cloud/v1/stock',
      ...config,
    },
    'alpha-vantage': {
      url: 'wss://stream.alphavantage.co/v2/forex',
      ...config,
    },
  };

  const providerConfig = providerConfigs[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return new MarketDataWebSocket(providerConfig);
}

// WebSocket manager for handling multiple connections
export class WebSocketManager {
  private connections = new Map<string, MarketDataWebSocket>();

  createConnection(provider: string, config?: Partial<WebSocketConfig>): MarketDataWebSocket {
    const connection = createMarketDataWebSocket(provider, config);
    this.connections.set(provider, connection);
    return connection;
  }

  getConnection(provider: string): MarketDataWebSocket | undefined {
    return this.connections.get(provider);
  }

  closeConnection(provider: string): void {
    const connection = this.connections.get(provider);
    if (connection) {
      connection.destroy();
      this.connections.delete(provider);
    }
  }

  closeAllConnections(): void {
    for (const connection of this.connections.values()) {
      connection.destroy();
    }
    this.connections.clear();
  }

  getConnectionStats(): Record<string, { readyState: number; isConnected: boolean }> {
    const stats: Record<string, { readyState: number; isConnected: boolean }> = {};

    for (const [provider, connection] of this.connections.entries()) {
      stats[provider] = {
        readyState: connection.readyState,
        isConnected: connection.isConnected,
      };
    }

    return stats;
  }
}

export default MarketDataWebSocket;
