/**
 * Real-time Data Streaming System
 * Optimized WebSocket connections with connection pooling and data buffering
 */

import { analytics } from '../analytics';
import { errorHandler } from '../errors';
import { showErrorToast } from '../errors/toast';

// Stream data types
export interface StreamData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
}

export interface StreamSubscription {
  id: string;
  symbols: string[];
  callback: (data: StreamData) => void;
  options: {
    throttle?: number; // ms between updates
    batch?: boolean; // batch multiple updates
  };
}

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

class StreamingManager {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, StreamSubscription>();
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval?: NodeJS.Timeout;
  private messageBuffer: StreamData[] = [];
  private outboundQueue = new Map<string, any>();
  private outboundFlushTimer?: NodeJS.Timeout;
  private bufferFlushInterval?: NodeJS.Timeout;
  private throttleTimers = new Map<string, NodeJS.Timeout>();
  private lastUpdate = new Map<string, number>();

  // Connection pooling
  private static instance: StreamingManager;
  static getInstance(): StreamingManager {
    if (!StreamingManager.instance) {
      StreamingManager.instance = new StreamingManager();
    }
    return StreamingManager.instance;
  }

  /**
   * Connect to streaming data source
   */
  async connect(endpoint?: string): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    
    try {
      // Resolve endpoint from parameter, env, or origin
      const wsEndpoint = endpoint || this.getDefaultWebSocketEndpoint();
      this.ws = new WebSocket(wsEndpoint);

      this.setupWebSocketHandlers();
      this.startHeartbeat();
      this.startBufferFlush();
      this.startOutboundFlush();

      analytics.track('streaming_connection_attempt', {
        endpoint: wsEndpoint,
        attempt: this.reconnectAttempts + 1,
      }, 'data_request');

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        const onOpen = () => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          
          analytics.track('streaming_connected', {
            endpoint: wsEndpoint,
            connection_time: Date.now(),
          }, 'data_request');
          
          resolve();
        };

        const onError = (error: Event) => {
          this.connectionState = 'error';
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          
          const enhancedError = errorHandler.handle(new Error('WebSocket connection failed'), {
            endpoint: wsEndpoint,
            attempt: this.reconnectAttempts + 1,
          });
          
          reject(enhancedError);
        };

        this.ws.addEventListener('open', onOpen);
        this.ws.addEventListener('error', onError);
      });
    } catch (error) {
      this.connectionState = 'error';
      throw errorHandler.handle(error instanceof Error ? error : new Error('Connection failed'));
    }
  }

  /**
   * Subscribe to symbol updates
   */
  subscribe(symbols: string[], callback: (data: StreamData) => void, options: StreamSubscription['options'] = {}): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: StreamSubscription = {
      id,
      symbols: symbols.map(s => s.toUpperCase()),
      callback,
      options: {
        throttle: 100, // Default 100ms throttle
        batch: false,
        ...options,
      },
    };

    this.subscriptions.set(id, subscription);

    // Send subscription message if connected
    if (this.ws && this.connectionState === 'connected') {
      this.sendSubscriptionMessage(subscription);
    }

    analytics.track('streaming_subscribed', {
      symbols: subscription.symbols,
      subscription_id: id,
      throttle: subscription.options.throttle,
      batch: subscription.options.batch,
    }, 'data_request');

    return id;
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);
    
    // Clean up throttle timers
    const timerKey = `${subscriptionId}`;
    const timer = this.throttleTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.throttleTimers.delete(timerKey);
    }

    // Send unsubscription message if connected
    if (this.ws && this.connectionState === 'connected') {
      this.sendUnsubscriptionMessage(subscription);
    }

    analytics.track('streaming_unsubscribed', {
      subscription_id: subscriptionId,
      symbols: subscription.symbols,
    }, 'data_request');
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    connectionState: ConnectionState;
    subscriptions: number;
    bufferedMessages: number;
    reconnectAttempts: number;
    symbolsTracked: string[];
  } {
    const allSymbols = new Set<string>();
    this.subscriptions.forEach(sub => {
      sub.symbols.forEach(symbol => allSymbols.add(symbol));
    });

    return {
      connectionState: this.connectionState,
      subscriptions: this.subscriptions.size,
      bufferedMessages: this.messageBuffer.length,
      reconnectAttempts: this.reconnectAttempts,
      symbolsTracked: Array.from(allSymbols),
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    
    // Clear timers
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }

    // Clear throttle timers
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.clear();

    this.subscriptions.clear();
    this.messageBuffer = [];
    this.lastUpdate.clear();

    analytics.track('streaming_disconnected', {
      reconnect_attempts: this.reconnectAttempts,
    }, 'data_request');
  }

  // Private methods

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.connectionState = 'connected';
      
      // Re-subscribe to existing subscriptions
      this.subscriptions.forEach(subscription => {
        this.sendSubscriptionMessage(subscription);
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleIncomingMessage(data);
      } catch (error) {
        console.error('[StreamingManager] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      this.connectionState = 'disconnected';
      
      if (event.code !== 1000) { // Not a normal closure
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.connectionState = 'error';
      console.error('[StreamingManager] WebSocket error:', error);
    };
  }

  private handleIncomingMessage(message: any): void {
    // Handle different message types
    switch (message.type) {
      case 'price_update':
        this.handlePriceUpdate(message.data);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'error':
        this.handleServerError(message);
        break;
      default:
        console.warn('[StreamingManager] Unknown message type:', message.type);
    }
  }

  private handlePriceUpdate(data: StreamData): void {
    const symbol = data.symbol.toUpperCase();
    
    // Find subscriptions interested in this symbol
    const interestedSubs = Array.from(this.subscriptions.values())
      .filter(sub => sub.symbols.includes(symbol));

    interestedSubs.forEach(subscription => {
      if (subscription.options.batch) {
        // Add to buffer for batch processing
        this.messageBuffer.push(data);
      } else if (subscription.options.throttle) {
        // Throttle updates
        this.throttleUpdate(subscription, data);
      } else {
        // Immediate update
        subscription.callback(data);
      }
    });

    this.lastUpdate.set(symbol, Date.now());
  }

  private throttleUpdate(subscription: StreamSubscription, data: StreamData): void {
    const timerKey = `${subscription.id}_${data.symbol}`;
    const existingTimer = this.throttleTimers.get(timerKey);
    
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      subscription.callback(data);
      this.throttleTimers.delete(timerKey);
    }, subscription.options.throttle);

    this.throttleTimers.set(timerKey, timer);
  }

  private handleHeartbeat(message: any): void {
    // Respond to server heartbeat
    if (this.ws && this.connectionState === 'connected') {
      this.queueSend({ type: 'heartbeat_response', timestamp: Date.now() });
    }
  }

  private handleServerError(message: any): void {
    const error = new Error(message.message || 'Server error');
    const enhancedError = errorHandler.handle(error, {
      server_error: true,
      error_code: message.code,
      message_data: message,
    });
    
    showErrorToast(enhancedError, { duration: 5000 });
  }

  private sendSubscriptionMessage(subscription: StreamSubscription): void {
    if (!this.ws || this.connectionState !== 'connected') return;
    const message = {
      type: 'subscribe',
      symbols: subscription.symbols,
      options: subscription.options,
    };
    this.queueSend(message, `subscribe:${subscription.symbols.sort().join(',')}`);
  }

  private sendUnsubscriptionMessage(subscription: StreamSubscription): void {
    if (!this.ws || this.connectionState !== 'connected') return;
    const message = {
      type: 'unsubscribe',
      symbols: subscription.symbols,
    };
    this.queueSend(message, `unsubscribe:${subscription.symbols.sort().join(',')}`);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.connectionState === 'connected') {
        this.queueSend({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000); // 30 second heartbeat
  }

  private startBufferFlush(): void {
    this.bufferFlushInterval = setInterval(() => {
      if (this.messageBuffer.length > 0) {
        const batchedUpdates = new Map<string, StreamData[]>();
        
        // Group by subscription
        this.messageBuffer.forEach(data => {
          this.subscriptions.forEach(sub => {
            if (sub.symbols.includes(data.symbol) && sub.options.batch) {
              if (!batchedUpdates.has(sub.id)) {
                batchedUpdates.set(sub.id, []);
              }
              batchedUpdates.get(sub.id)!.push(data);
            }
          });
        });

        // Send batched updates
        batchedUpdates.forEach((dataList, subId) => {
          const subscription = this.subscriptions.get(subId);
          if (subscription) {
            dataList.forEach(data => subscription.callback(data));
            // reset batch buffer per subscription after flush
          }
        });

        this.messageBuffer = [];
      }
    }, 250); // Flush every 250ms
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState = 'error';
      
      const error = new Error('Max reconnection attempts reached');
      const enhancedError = errorHandler.handle(error, {
        max_attempts: this.maxReconnectAttempts,
        total_attempts: this.reconnectAttempts,
      });
      
      showErrorToast(enhancedError);
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[StreamingManager] Reconnection failed:', error);
      });
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
  }

  // Outbound send coalescing and rate limiting
  private queueSend(message: any, key?: string) {
    const k = key || (message?.type || 'unknown')
    this.outboundQueue.set(k, message)
  }

  private startOutboundFlush(): void {
    if (this.outboundFlushTimer) return
    this.outboundFlushTimer = setInterval(() => {
      if (!this.ws || this.connectionState !== 'connected') return
      const entries = Array.from(this.outboundQueue.entries()).slice(0, 50)
      for (const [, msg] of entries) {
        try { this.ws.send(JSON.stringify(msg)) } catch {}
      }
      this.outboundQueue.clear()
    }, 100)
  }

  // Default WebSocket endpoint resolution
  private getDefaultWebSocketEndpoint(): string {
    // NEXT_PUBLIC_WS_URL takes precedence if defined
    try {
      // eslint-disable-next-line no-process-env
      const fromEnv = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_WS_URL) as string | undefined
      if (fromEnv && typeof fromEnv === 'string' && fromEnv.startsWith('ws')) return fromEnv
    } catch {}
    if (typeof window !== 'undefined') {
      const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
      return `${scheme}://${window.location.host}/api/stream/ws`
    }
    // Fallback sensible default for SSR contexts (rarely used by client)
    return 'ws://localhost:3000/api/stream/ws'
  }
}

// Create singleton instance
export const streamingManager = StreamingManager.getInstance();

// Hooks are exported from './hooks' to separate concerns

export default streamingManager;