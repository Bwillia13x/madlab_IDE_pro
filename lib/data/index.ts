/**
 * Enhanced Data System Exports
 */

// Core providers (existing)
export {
  type PriceRange,
  type PricePoint,
  type KpiData,
  type VolSurface,
  type VolPoint,
  type CorrelationMatrix,
  type VolConePoint,
  type Kpis,
  type RiskSummary,
  type DataProvider,
  dataProviderRegistry,
  setDataProvider,
  getDataProvider,
  registerDataProvider,
  setProvider,
  getProvider,
} from './providers';

// Mock provider
export { mockProvider } from './mock';

// Data hooks (existing)
export {
  useKpis,
  usePrices,
  useVolSurface,
  useRisk,
  useCorrelation,
} from './hooks';

// Data sources (new)
export {
  type DataSourceConfig,
  type DataSourceCredentials,
  type DataSourceStatus,
  DataSource,
  RestDataSource,
  FileDataSource,
  WebSocketDataSource,
  createDataSource,
} from './sources';

// Connection management (new)
export {
  type ConnectionConfig,
  type ConnectionStatus,
  connectionManager,
  addConnection,
  removeConnection,
  connectToDataSource,
  disconnectFromDataSource,
  getConnectionStatuses,
  getActiveDataSource,
  testDataSourceConnection,
  builtinConnections,
} from './connections';

// New data integration layer
export * from './source';
export * from './providers';
export { DataSourceManager, dataSourceManager } from './manager';
export {
  DataCache,
  dataCache,
  getCachedData,
  setCachedData,
  invalidateCache,
  getCacheStats,
  createDataSourceCacheKey,
} from './cache';

// Re-export everything for convenience
export * from './providers';
export * from './mock';
export * from './hooks';
export * from './sources';
export * from './connections';