/**
 * REST API Data Provider for MAD LAB IDE
 * Provides data from REST API endpoints
 */

import { BaseDataSource, DataFrame, DataSourceConfig } from '../source';

export interface RESTOptions {
  baseUrl: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  authType?: 'none' | 'bearer' | 'apikey' | 'basic';
  authToken?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout?: number;
  retries?: number;
  dataPath?: string;
  defaultQuery?: Record<string, unknown>;
}

export class FetchRESTProvider extends BaseDataSource {
  private options: RESTOptions;
  private cachedData: unknown[] = [];
  private lastFetch?: Date;
  private inflight = new Map<string, Promise<DataFrame>>();

  constructor(config: DataSourceConfig & { options: RESTOptions }) {
    super(config);
    this.options = {
      method: 'GET',
      timeout: 10000,
      retries: 3,
      authType: 'none',
      ...config.options,
    };
  }

  async connect(): Promise<boolean> {
    try {
      const response = await this.makeRequest(this.options.endpoint || '');
      
      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
      }

      this.setConnected(true);
      return true;
    } catch (error) {
      console.error('FetchRESTProvider connection error:', error);
      this.setConnected(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.cachedData = [];
    this.lastFetch = undefined;
    this.setConnected(false);
  }

  async getData(query?: any): Promise<DataFrame> {
    if (!this.connected) {
      throw new Error('Not connected to REST API');
    }

    try {
      const mergedQuery = { ...this.options.defaultQuery, ...query };
      const key = JSON.stringify({ endpoint: this.options.endpoint || '', mergedQuery });

      if (this.inflight.has(key)) {
        return await this.inflight.get(key)!;
      }

      const work = (async (): Promise<DataFrame> => {
        const response = await this.makeRequest(this.options.endpoint || '', mergedQuery);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const rawData = await response.json();
        let processedData = this.extractDataFromResponse(rawData);
        
        if (query && query !== this.options.defaultQuery) {
          processedData = this.applyClientSideQuery(processedData, query);
        }

        this.cachedData = processedData;
        this.lastFetch = new Date();

        const columns = this.extractColumns(processedData);
        const columnTypes = this.inferColumnTypes(processedData, columns);

        return {
          columns,
          rows: processedData,
          metadata: {
            source: this.name,
            lastUpdated: this.lastFetch,
            rowCount: processedData.length,
            columnTypes,
          },
        };
      })();

      this.inflight.set(key, work);
      try {
        const df = await work;
        return df;
      } finally {
        this.inflight.delete(key);
      }
    } catch (error) {
      console.error('FetchRESTProvider getData error:', error);
      throw error;
    }
  }

  getMetadata() {
    const baseMetadata = super.getMetadata();
    const columns = this.cachedData.length > 0 ? this.extractColumns(this.cachedData) : [];
    
    return {
      ...baseMetadata,
      lastFetch: this.lastFetch,
      schema: {
        columns: columns.map(col => ({
          name: col,
          type: this.inferColumnType(this.cachedData, col),
          nullable: true,
        })),
      },
    };
  }

  private async makeRequest(endpoint: string, queryParams?: any): Promise<Response> {
    const url = new URL(endpoint, this.options.baseUrl);
    
    if (queryParams && this.options.method === 'GET') {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.options.headers,
    };

    this.addAuthHeaders(headers);

    const requestOptions: RequestInit = {
      method: this.options.method,
      headers,
      signal: AbortSignal.timeout(this.options.timeout!),
    };

    if (queryParams && this.options.method !== 'GET') {
      requestOptions.body = JSON.stringify(queryParams);
    }

    return await this.fetchWithRetry(url.toString(), requestOptions);
  }

  private addAuthHeaders(headers: Record<string, string>): void {
    switch (this.options.authType) {
      case 'bearer':
        if (this.options.authToken) {
          headers['Authorization'] = `Bearer ${this.options.authToken}`;
        }
        break;
      case 'apikey':
        if (this.options.apiKey) {
          headers['X-API-Key'] = this.options.apiKey;
        }
        break;
      case 'basic':
        if (this.options.username && this.options.password) {
          const credentials = btoa(`${this.options.username}:${this.options.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
    }
  }

  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.options.retries!; attempt++) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.options.retries!) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private extractDataFromResponse(data: any): any[] {
    if (this.options.dataPath) {
      const pathSegments = this.options.dataPath.split('.');
      let current = data;
      
      for (const segment of pathSegments) {
        if (current && typeof current === 'object') {
          current = current[segment];
        } else {
          throw new Error(`Invalid data path: ${this.options.dataPath}`);
        }
      }
      
      return Array.isArray(current) ? current : [current];
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object' && data.data) {
      return Array.isArray(data.data) ? data.data : [data.data];
    }

    if (data && typeof data === 'object' && data.results) {
      return Array.isArray(data.results) ? data.results : [data.results];
    }

    return [data];
  }

  private extractColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const columnSet = new Set<string>();
    
    for (const row of data) {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(key => columnSet.add(key));
      }
    }
    
    return Array.from(columnSet).sort();
  }

  private inferColumnTypes(data: any[], columns: string[]): Record<string, string> {
    const types: Record<string, string> = {};
    
    for (const column of columns) {
      types[column] = this.inferColumnType(data, column);
    }
    
    return types;
  }

  private inferColumnType(data: any[], column: string): string {
    const sampleSize = Math.min(data.length, 10);
    const typeCounts: Record<string, number> = {};
    
    for (let i = 0; i < sampleSize; i++) {
      const value = data[i]?.[column];
      const type = this.getValueType(value);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
    
    let maxType = 'string';
    let maxCount = 0;
    
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }
    
    return maxType;
  }

  private getValueType(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  private applyClientSideQuery(data: any[], query: any): any[] {
    let result = [...data];

    if (query.filter) {
      result = result.filter(row => this.matchesFilter(row, query.filter));
    }

    if (query.sort) {
      result = this.sortData(result, query.sort);
    }

    if (query.limit) {
      result = result.slice(0, query.limit);
    }

    if (query.offset) {
      result = result.slice(query.offset);
    }

    return result;
  }

  private matchesFilter(row: any, filter: any): boolean {
    for (const [field, condition] of Object.entries(filter)) {
      const value = row[field];
      
      if (typeof condition === 'object' && condition !== null) {
        for (const [operator, operand] of Object.entries(condition)) {
          switch (operator) {
            case '$eq':
              if (value !== operand) return false;
              break;
            case '$ne':
              if (value === operand) return false;
              break;
            case '$gt':
              if (value <= operand) return false;
              break;
            case '$gte':
              if (value < operand) return false;
              break;
            case '$lt':
              if (value >= operand) return false;
              break;
            case '$lte':
              if (value > operand) return false;
              break;
            case '$in':
              if (!Array.isArray(operand) || !operand.includes(value)) return false;
              break;
            case '$nin':
              if (Array.isArray(operand) && operand.includes(value)) return false;
              break;
            case '$contains':
              if (!String(value).toLowerCase().includes(String(operand).toLowerCase())) return false;
              break;
          }
        }
      } else {
        if (value !== condition) return false;
      }
    }
    
    return true;
  }

  private sortData(data: any[], sort: any): any[] {
    return data.sort((a, b) => {
      for (const [field, direction] of Object.entries(sort)) {
        const aVal = a[field];
        const bVal = b[field];
        const dir = direction === 'desc' || direction === -1 ? -1 : 1;
        
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
      }
      return 0;
    });
  }
}