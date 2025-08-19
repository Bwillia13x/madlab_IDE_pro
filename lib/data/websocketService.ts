import { EventEmitter } from 'events';

// Enhanced WebSocket service with clustering and connection pooling
export class WebSocketService extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map();
  private connectionPool: Map<string, WebSocket[]> = new Map();
  private maxConnectionsPerPool = 5;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionHealth: Map<string, { lastPing: number; lastPong: number; isHealthy: boolean }> = new Map();
  private loadBalancer: LoadBalancer;
  private circuitBreaker: CircuitBreaker;
  private subscriptions: Set<string> = new Set();
  private endpoints: string[] = [];

  constructor() {
    super();
    this.loadBalancer = new LoadBalancer();
    this.circuitBreaker = new CircuitBreaker();
    this.startHeartbeat();
  }

  // Enhanced connection management with clustering
  async connectToCluster(endpoints: string[], options: ConnectionOptions = {}): Promise<string> {
    const clusterId = this.generateClusterId();
    this.endpoints = endpoints;
    
    if (endpoints.length === 0) {
      throw new Error('No endpoints provided for clustering');
    }

    const healthyEndpoints = await this.loadBalancer.getHealthyEndpoints(endpoints);
    
    if (healthyEndpoints.length === 0) {
      throw new Error('No healthy endpoints available in cluster');
    }

    const connection = await this.createConnection(healthyEndpoints[0], options);
    this.connections.set(clusterId, connection);
    this.connectionHealth.set(clusterId, { lastPing: Date.now(), lastPong: Date.now(), isHealthy: true });
    
    this.setupConnectionHandlers(clusterId, connection);
    return clusterId;
  }

  // Connection pooling for high-frequency data
  async getConnectionFromPool(poolName: string, endpoint: string): Promise<WebSocket> {
    if (!this.connectionPool.has(poolName)) {
      this.connectionPool.set(poolName, []);
    }

    const pool = this.connectionPool.get(poolName)!;
    const availableConnection = pool.find(conn => conn.readyState === WebSocket.OPEN);

    if (availableConnection) {
      return availableConnection;
    }

    if (pool.length < this.maxConnectionsPerPool) {
      const newConnection = await this.createConnection(endpoint);
      pool.push(newConnection);
      return newConnection;
    }

    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkForConnection = () => {
        const conn = pool.find(c => c.readyState === WebSocket.OPEN);
        if (conn) {
          resolve(conn);
        } else {
          setTimeout(checkForConnection, 100);
        }
      };
      checkForConnection();
    });
  }

  // Advanced error handling with circuit breaker pattern
  private async createConnection(endpoint: string, options: ConnectionOptions = {}): Promise<WebSocket> {
    if (this.circuitBreaker.isOpen(endpoint)) {
      throw new Error(`Circuit breaker is open for ${endpoint}`);
    }

    try {
      const connection = new WebSocket(endpoint, options.protocols);
      
      // Set WebSocket options
      if (options.protocols) (connection as any).protocol = options.protocols;
      if (options.extensions) (connection as any).extensions = options.extensions;
      
      return connection;
    } catch (error) {
      this.circuitBreaker.recordFailure(endpoint);
      throw error;
    }
  }

  // Enhanced reconnection with exponential backoff and jitter
  private async reconnect(clusterId: string, endpoint: string): Promise<void> {
    const attempts = this.reconnectAttempts.get(clusterId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached', { clusterId, endpoint });
      return;
    }

    const delay = this.calculateReconnectDelay(attempts);
    this.reconnectAttempts.set(clusterId, attempts + 1);

    setTimeout(async () => {
      try {
        const newConnection = await this.createConnection(endpoint);
        this.connections.set(clusterId, newConnection);
        this.setupConnectionHandlers(clusterId, newConnection);
        this.reconnectAttempts.set(clusterId, 0);
        this.emit('reconnected', { clusterId, endpoint });
      } catch (error) {
        this.emit('reconnectFailed', { clusterId, endpoint, error });
        await this.reconnect(clusterId, endpoint);
      }
    }, delay);
  }

  // Calculate reconnect delay with exponential backoff and jitter
  private calculateReconnectDelay(attempts: number): number {
    const baseDelay = this.reconnectDelay * Math.pow(2, attempts);
    const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
    return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
  }

  // Enhanced heartbeat with health monitoring
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((connection, clusterId) => {
        if (connection.readyState === WebSocket.OPEN) {
          const health = this.connectionHealth.get(clusterId);
          if (health) {
            health.lastPing = Date.now();
            connection.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }
      });
    }, 30000); // 30 second heartbeat
  }

  // Connection health monitoring
  private updateConnectionHealth(clusterId: string, isHealthy: boolean): void {
    const health = this.connectionHealth.get(clusterId);
    if (health) {
      health.isHealthy = isHealthy;
      health.lastPong = Date.now();
      
      if (!isHealthy) {
        this.emit('connectionUnhealthy', { clusterId, health });
      }
    }
  }

  // Load balancing for multiple endpoints
  async sendToCluster(clusterId: string, data: any): Promise<void> {
    const connection = this.connections.get(clusterId);
    if (!connection || connection.readyState !== WebSocket.OPEN) {
      throw new Error(`No active connection for cluster ${clusterId}`);
    }

    try {
      connection.send(JSON.stringify(data));
    } catch (error) {
      this.circuitBreaker.recordFailure(clusterId);
      throw error;
    }
  }

  // Graceful shutdown with connection cleanup
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections gracefully
    const closePromises = Array.from(this.connections.values()).map(conn => {
      return new Promise<void>((resolve) => {
        if (conn.readyState === WebSocket.OPEN) {
          conn.close(1000, 'Service shutdown');
        }
        resolve();
      });
    });

    await Promise.all(closePromises);
    this.connections.clear();
    this.connectionPool.clear();
    this.connectionHealth.clear();
    this.subscriptions.clear();
    this.endpoints = [];
  }

  // Get connection statistics
  getConnectionStats(): ConnectionStats {
    const totalConnections = this.connections.size;
    const healthyConnections = Array.from(this.connectionHealth.values()).filter(h => h.isHealthy).length;
    const poolStats = Array.from(this.connectionPool.entries()).map(([name, pool]) => ({
      name,
      total: pool.length,
      active: pool.filter(c => c.readyState === WebSocket.OPEN).length
    }));

    return {
      totalConnections,
      healthyConnections,
      unhealthyConnections: totalConnections - healthyConnections,
      poolStats,
      circuitBreakerStatus: this.circuitBreaker.getStatus()
    };
  }

  // Get connection status for compatibility
  getConnectionStatus(): { isConnected: boolean; status: string } {
    const stats = this.getConnectionStats();
    const isConnected = stats.healthyConnections > 0;
    return {
      isConnected,
      status: isConnected ? 'connected' : 'disconnected'
    };
  }

  // Connect to WebSocket endpoints
  async connect(): Promise<void> {
    try {
      const healthyEndpoints = await this.loadBalancer.getHealthyEndpoints(this.endpoints);
      
      if (healthyEndpoints.length === 0) {
        throw new Error('No healthy endpoints available');
      }

      // Create connections to healthy endpoints
      for (const endpoint of healthyEndpoints) {
        await this.createConnection(endpoint);
      }

      this.emit('connected', { endpoints: healthyEndpoints });
    } catch (error) {
      this.emit('connectionError', { error });
      throw error;
    }
  }

  // Subscribe to a symbol
  subscribe(symbol: string): void {
    this.subscriptions.add(symbol);
    
    // Send subscription message to all active connections
    for (const [clusterId, connection] of Array.from(this.connections)) {
      if (connection.readyState === WebSocket.OPEN) {
        const message = {
          type: 'subscribe',
          symbol,
          clusterId
        };
        connection.send(JSON.stringify(message));
      }
    }

    this.emit('subscribed', { symbol });
  }

  // Unsubscribe from a symbol
  unsubscribe(symbol: string): void {
    this.subscriptions.delete(symbol);
    
    // Send unsubscription message to all active connections
    for (const [clusterId, connection] of Array.from(this.connections)) {
      if (connection.readyState === WebSocket.OPEN) {
        const message = {
          type: 'unsubscribe',
          symbol,
          clusterId
        };
        connection.send(JSON.stringify(message));
      }
    }

    this.emit('unsubscribed', { symbol });
  }

  private generateClusterId(): string {
    return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupConnectionHandlers(clusterId: string, connection: WebSocket): void {
    connection.onopen = () => {
      this.emit('connected', { clusterId });
      this.updateConnectionHealth(clusterId, true);
    };

    connection.onclose = (event) => {
      this.emit('disconnected', { clusterId, code: event.code, reason: event.reason });
      this.updateConnectionHealth(clusterId, false);
      
      if (event.code !== 1000) { // Not a normal closure
        this.reconnect(clusterId, connection.url);
      }
    };

    connection.onerror = (error) => {
      this.emit('error', { clusterId, error });
      this.updateConnectionHealth(clusterId, false);
    };

    connection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          this.updateConnectionHealth(clusterId, true);
        } else {
          this.emit('message', { clusterId, data });
        }
      } catch (error) {
        this.emit('parseError', { clusterId, error, rawData: event.data });
      }
    };
  }
}

// Load balancer for endpoint health checking
class LoadBalancer {
  private endpointHealth: Map<string, { isHealthy: boolean; lastCheck: number; responseTime: number }> = new Map();

  async getHealthyEndpoints(endpoints: string[]): Promise<string[]> {
    const healthChecks = endpoints.map(endpoint => this.checkEndpointHealth(endpoint));
    await Promise.allSettled(healthChecks);
    
    return endpoints.filter(endpoint => {
      const health = this.endpointHealth.get(endpoint);
      return health && health.isHealthy;
    });
  }

  private async checkEndpointHealth(endpoint: string): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${endpoint}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      this.endpointHealth.set(endpoint, {
        isHealthy: response.ok,
        lastCheck: Date.now(),
        responseTime
      });
    } catch (error) {
      this.endpointHealth.set(endpoint, {
        isHealthy: false,
        lastCheck: Date.now(),
        responseTime: -1
      });
    }
  }
}

// Circuit breaker pattern for fault tolerance
class CircuitBreaker {
  private failures: Map<string, number> = new Map();
  private lastFailureTime: Map<string, number> = new Map();
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  isOpen(endpoint: string): boolean {
    const failures = this.failures.get(endpoint) || 0;
    const lastFailure = this.lastFailureTime.get(endpoint) || 0;
    
    if (failures >= this.failureThreshold) {
      const timeSinceLastFailure = Date.now() - lastFailure;
      if (timeSinceLastFailure < this.resetTimeout) {
        return true; // Circuit is open
      } else {
        // Reset circuit breaker
        this.failures.set(endpoint, 0);
        this.lastFailureTime.set(endpoint, 0);
        return false;
      }
    }
    
    return false;
  }

  recordFailure(endpoint: string): void {
    const currentFailures = this.failures.get(endpoint) || 0;
    this.failures.set(endpoint, currentFailures + 1);
    this.lastFailureTime.set(endpoint, Date.now());
  }

  recordSuccess(endpoint: string): void {
    this.failures.set(endpoint, 0);
    this.lastFailureTime.set(endpoint, 0);
  }

  getStatus(): Record<string, { failures: number; isOpen: boolean }> {
    const status: Record<string, { failures: number; isOpen: boolean }> = {};
    
    this.failures.forEach((failures, endpoint) => {
      status[endpoint] = {
        failures,
        isOpen: this.isOpen(endpoint)
      };
    });
    
    return status;
  }
}

// Types for the enhanced WebSocket service
interface ConnectionOptions {
  protocols?: string | string[];
  binaryType?: BinaryType;
  extensions?: string;
}

interface ConnectionStats {
  totalConnections: number;
  healthyConnections: number;
  unhealthyConnections: number;
  poolStats: Array<{ name: string; total: number; active: number }>;
  circuitBreakerStatus: Record<string, { failures: number; isOpen: boolean }>;
}

// Export singleton instance
export const webSocketService = new WebSocketService();