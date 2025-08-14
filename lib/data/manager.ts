/**
 * Data Source Manager for MAD LAB IDE
 * Manages data source instances and their lifecycle
 */

import { DataSource, DataSourceConfig, DataFrame } from './source';
import { StaticJSONProvider } from './providers/StaticJSONProvider';
import { CSVProvider } from './providers/CSVProvider';
import { FetchRESTProvider } from './providers/FetchRESTProvider';
import { dataCache, createDataSourceCacheKey } from './cache';

export class DataSourceManager {
  private dataSources = new Map<string, DataSource>();
  private configs = new Map<string, DataSourceConfig>();

  async createDataSource(config: DataSourceConfig): Promise<DataSource> {
    let dataSource: DataSource;

    switch (config.type) {
      case 'static-json':
        dataSource = new StaticJSONProvider(config as any);
        break;
      case 'csv':
        dataSource = new CSVProvider(config as any);
        break;
      case 'rest':
        dataSource = new FetchRESTProvider(config as any);
        break;
      default:
        throw new Error(`Unsupported data source type: ${config.type}`);
    }

    this.dataSources.set(config.id, dataSource);
    this.configs.set(config.id, config);

    return dataSource;
  }

  async connectDataSource(id: string): Promise<boolean> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    return await dataSource.connect();
  }

  async disconnectDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    await dataSource.disconnect();
  }

  async getData(id: string, query?: any, useCache = true): Promise<DataFrame> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    if (!dataSource.isConnected()) {
      const connected = await dataSource.connect();
      if (!connected) {
        throw new Error(`Failed to connect to data source: ${id}`);
      }
    }

    if (useCache) {
      const cacheKey = createDataSourceCacheKey(id, query);
      const cachedData = dataCache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const data = await dataSource.getData(query);
      dataCache.set(cacheKey, data, { source: id });
      return data;
    }

    return await dataSource.getData(query);
  }

  getDataSource(id: string): DataSource | undefined {
    return this.dataSources.get(id);
  }

  getDataSourceConfig(id: string): DataSourceConfig | undefined {
    return this.configs.get(id);
  }

  listDataSources(): Array<{ id: string; name: string; type: string; connected: boolean }> {
    return Array.from(this.dataSources.values()).map(ds => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      connected: ds.isConnected(),
    }));
  }

  removeDataSource(id: string): boolean {
    const dataSource = this.dataSources.get(id);
    if (dataSource) {
      if (dataSource.isConnected()) {
        dataSource.disconnect();
      }
      dataCache.clear(id);
    }

    this.configs.delete(id);
    return this.dataSources.delete(id);
  }

  async testConnection(id: string): Promise<boolean> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      return false;
    }

    try {
      return await dataSource.connect();
    } catch {
      return false;
    }
  }

  clearCache(sourceId?: string): void {
    dataCache.clear(sourceId);
  }
}

export const dataSourceManager = new DataSourceManager();