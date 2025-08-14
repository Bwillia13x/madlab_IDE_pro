/**
 * Data Connection Manager for MAD LAB IDE
 * Manages multiple data source connections and failover strategies
 */

import { DataSource, DataSourceConfig, DataSourceCredentials, createDataSource } from './sources';
import { registerDataProvider, setDataProvider, dataProviderRegistry } from './providers';

export interface ConnectionConfig {
  id: string;
  name: string;
  source: DataSourceConfig;
  credentials?: DataSourceCredentials;
  priority: number;
  autoConnect?: boolean;
  failoverEnabled?: boolean;
  healthCheckInterval?: number;
}

export interface ConnectionStatus {
  id: string;
  name: string;
  connected: boolean;
  active: boolean;
  lastHealthCheck: Date;
  errorCount: number;
  latency?: number;
}

class ConnectionManager {
  private connections = new Map<string, DataSource>();
  private configs = new Map<string, ConnectionConfig>();
  private activeConnection?: string;
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();
  private failoverQueue: string[] = [];

  /**
   * Add a data source connection
   */
  async addConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const dataSource = createDataSource(config.source, config.credentials);
      
      this.connections.set(config.id, dataSource);
      this.configs.set(config.id, config);
      
      // Register with the data provider registry using DataProvider bridge
      registerDataProvider(config.id, {
        id: config.id,
        name: config.name,
        description: dataSource.getStatus().lastError ? 'Data source (degraded)' : 'Data source',
        getPrices: dataSource.getPrices.bind(dataSource),
        getKpis: dataSource.getKpis.bind(dataSource),
        getVolSurface: dataSource.getVolSurface.bind(dataSource),
        getCorrelation: dataSource.getCorrelation?.bind(dataSource),
        getFinancials: undefined,
        initialize: async () => { /* no-op for DataSource */ },
        getQuote: async (symbol: string) => dataSource.getKpis(symbol),
        getHistoricalPrices: async (symbol: string, range?: any) => dataSource.getPrices(symbol, range),
        isSymbolSupported: (_symbol: string) => true,
        healthCheck: dataSource.providerHealthCheck.bind(dataSource),
        isAvailable: dataSource.isAvailable.bind(dataSource),
        getLastUpdate: (symbol: string) => {
          if (typeof (dataSource as any).getLastUpdate === 'function') {
            return (dataSource as any).getLastUpdate(symbol);
          }
          return dataSource.getStatus().lastCheck;
        },
      } as any);
      
      if (config.autoConnect) {
        await this.connect(config.id);
      }
      
      // Set up health checking
      if (config.healthCheckInterval) {
        this.setupHealthCheck(config.id, config.healthCheckInterval);
      }
      
      // Update failover queue
      this.updateFailoverQueue();
      
      console.log(`Added data connection: ${config.name} (${config.id})`);
      return true;
    } catch (error) {
      console.error(`Failed to add connection ${config.id}:`, error);
      return false;
    }
  }

  /**
   * Remove a data source connection
   */
  async removeConnection(id: string): Promise<boolean> {
    const dataSource = this.connections.get(id);
    if (!dataSource) return false;

    try {
      await dataSource.disconnect();
      
      this.connections.delete(id);
      this.configs.delete(id);
      
      // Clear health check
      const interval = this.healthCheckIntervals.get(id);
      if (interval) {
        clearInterval(interval);
        this.healthCheckIntervals.delete(id);
      }
      
      // Update failover queue
      this.updateFailoverQueue();
      
      // Switch active connection if needed
      if (this.activeConnection === id) {
        await this.switchToNextAvailable();
      }
      
      console.log(`Removed data connection: ${id}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove connection ${id}:`, error);
      return false;
    }
  }

  /**
   * Connect to a data source
   */
  async connect(id: string): Promise<boolean> {
    const dataSource = this.connections.get(id);
    if (!dataSource) {
      console.error(`Connection not found: ${id}`);
      return false;
    }

    try {
      const connected = await dataSource.connect();
      
      if (connected) {
        // If this is the highest priority available connection, make it active
        const config = this.configs.get(id);
        if (config && (!this.activeConnection || this.shouldSwitchConnection(id))) {
          this.setActiveConnection(id);
        }
      }
      
      return connected;
    } catch (error) {
      console.error(`Failed to connect to ${id}:`, error);
      return false;
    }
  }

  /**
   * Disconnect from a data source
   */
  async disconnect(id: string): Promise<boolean> {
    const dataSource = this.connections.get(id);
    if (!dataSource) return false;

    try {
      await dataSource.disconnect();
      
      // Switch active connection if needed
      if (this.activeConnection === id) {
        await this.switchToNextAvailable();
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to disconnect from ${id}:`, error);
      return false;
    }
  }

  /**
   * Get connection status for all connections
   */
  getConnectionStatuses(): ConnectionStatus[] {
    return Array.from(this.connections.entries()).map(([id, dataSource]) => {
      const config = this.configs.get(id)!;
      const status = dataSource.getStatus();
      
      return {
        id,
        name: config.name,
        connected: status.connected,
        active: this.activeConnection === id,
        lastHealthCheck: status.lastCheck,
        errorCount: status.errorCount,
      };
    });
  }

  /**
   * Get active connection
   */
  getActiveConnection(): DataSource | undefined {
    return this.activeConnection ? this.connections.get(this.activeConnection) : undefined;
  }

  /**
   * Get active connection ID
   */
  getActiveConnectionId(): string | undefined {
    return this.activeConnection;
  }

  /**
   * Manually set active connection
   */
  setActiveConnection(id: string): boolean {
    const dataSource = this.connections.get(id);
    if (!dataSource || !dataSource.isAvailable()) {
      return false;
    }

    this.activeConnection = id;
    setDataProvider(id);
    
    const config = this.configs.get(id);
    console.log(`Switched to data connection: ${config?.name || id}`);
    return true;
  }

  /**
   * Test connection performance
   */
  async testConnection(id: string): Promise<{ success: boolean; latency?: number; error?: string }> {
    const dataSource = this.connections.get(id);
    if (!dataSource) {
      return { success: false, error: 'Connection not found' };
    }

    try {
      const start = Date.now();
      const healthy = await dataSource.healthCheck();
      const latency = Date.now() - start;

      return {
        success: healthy,
        latency: healthy ? latency : undefined,
        error: healthy ? undefined : 'Health check failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Connect to all configured connections
   */
  async connectAll(): Promise<boolean[]> {
    const promises = Array.from(this.connections.keys()).map(id => this.connect(id));
    return Promise.all(promises);
  }

  /**
   * Disconnect from all connections
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(id => this.disconnect(id));
    await Promise.all(promises);
    this.activeConnection = undefined;
  }

  /**
   * Get available connection IDs sorted by priority
   */
  getAvailableConnections(): string[] {
    return Array.from(this.configs.entries())
      .filter(([id]) => {
        const dataSource = this.connections.get(id);
        return dataSource?.isAvailable() || false;
      })
      .sort(([, a], [, b]) => b.priority - a.priority)
      .map(([id]) => id);
  }

  /**
   * Enable/disable failover for a connection
   */
  setFailoverEnabled(id: string, enabled: boolean): void {
    const config = this.configs.get(id);
    if (config) {
      config.failoverEnabled = enabled;
      this.updateFailoverQueue();
    }
  }

  /**
   * Clear all connections
   */
  async clear(): Promise<void> {
    await this.disconnectAll();
    
    // Clear all intervals
    this.healthCheckIntervals.forEach(interval => {
      clearInterval(interval);
    });
    
    this.connections.clear();
    this.configs.clear();
    this.healthCheckIntervals.clear();
    this.failoverQueue = [];
  }

  /**
   * Setup periodic health checking for a connection
   */
  private setupHealthCheck(id: string, intervalMs: number): void {
    const interval = setInterval(async () => {
      const dataSource = this.connections.get(id);
      if (dataSource) {
        try {
          const healthy = await dataSource.healthCheck();
          
          if (!healthy && this.activeConnection === id) {
            console.warn(`Active connection ${id} unhealthy, attempting failover`);
            await this.switchToNextAvailable();
          }
        } catch (error) {
          console.error(`Health check failed for ${id}:`, error);
        }
      }
    }, intervalMs);

    this.healthCheckIntervals.set(id, interval);
  }

  /**
   * Check if we should switch to a different connection
   */
  private shouldSwitchConnection(newId: string): boolean {
    if (!this.activeConnection) return true;
    
    const currentConfig = this.configs.get(this.activeConnection);
    const newConfig = this.configs.get(newId);
    
    if (!currentConfig || !newConfig) return false;
    
    // Switch if new connection has higher priority and current is unhealthy
    const currentSource = this.connections.get(this.activeConnection);
    return newConfig.priority > currentConfig.priority && 
           (!currentSource || !currentSource.isAvailable());
  }

  /**
   * Switch to the next available connection
   */
  private async switchToNextAvailable(): Promise<boolean> {
    const available = this.getAvailableConnections();
    
    for (const id of available) {
      if (id !== this.activeConnection && this.setActiveConnection(id)) {
        return true;
      }
    }
    
    console.warn('No available data connections for failover');
    this.activeConnection = undefined;
    return false;
  }

  /**
   * Update failover priority queue
   */
  private updateFailoverQueue(): void {
    this.failoverQueue = Array.from(this.configs.entries())
      .filter(([, config]) => config.failoverEnabled !== false)
      .sort(([, a], [, b]) => b.priority - a.priority)
      .map(([id]) => id);
  }
}

// Global connection manager instance
export const connectionManager = new ConnectionManager();

// Convenience functions
export async function addConnection(config: ConnectionConfig): Promise<boolean> {
  return connectionManager.addConnection(config);
}

export async function removeConnection(id: string): Promise<boolean> {
  return connectionManager.removeConnection(id);
}

export async function connectToDataSource(id: string): Promise<boolean> {
  return connectionManager.connect(id);
}

export async function disconnectFromDataSource(id: string): Promise<boolean> {
  return connectionManager.disconnect(id);
}

export function getConnectionStatuses(): ConnectionStatus[] {
  return connectionManager.getConnectionStatuses();
}

export function getActiveDataSource(): DataSource | undefined {
  return connectionManager.getActiveConnection();
}

export async function testDataSourceConnection(id: string) {
  return connectionManager.testConnection(id);
}

// Built-in connection configurations for common data sources
export const builtinConnections: Omit<ConnectionConfig, 'credentials'>[] = [
  {
    id: 'alpha-vantage',
    name: 'Alpha Vantage',
    priority: 90,
    autoConnect: false,
    failoverEnabled: true,
    healthCheckInterval: 300000, // 5 minutes
    source: {
      name: 'Alpha Vantage',
      type: 'rest',
      endpoint: 'https://www.alphavantage.co/query',
      rateLimit: { requestsPerSecond: 5 },
      timeout: 10000,
      cacheTtl: 300000,
    },
  },
  
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance',
    priority: 80,
    autoConnect: false,
    failoverEnabled: true,
    healthCheckInterval: 300000,
    source: {
      name: 'Yahoo Finance',
      type: 'rest',
      endpoint: 'https://query1.finance.yahoo.com/v8/finance',
      rateLimit: { requestsPerSecond: 2 },
      timeout: 15000,
      cacheTtl: 300000,
    },
  },
  
  {
    id: 'mock-data',
    name: 'Mock Data',
    priority: 10,
    autoConnect: true,
    failoverEnabled: true,
    source: {
      name: 'Mock Data Provider',
      type: 'mock',
      cacheTtl: 60000,
    },
  },
];