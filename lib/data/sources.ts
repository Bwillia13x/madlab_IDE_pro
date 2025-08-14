/**
 * Data Source Interfaces for MAD LAB IDE
 * Provides abstractions for connecting to various financial data sources
 */

import { DataProvider, PriceRange, PricePoint, KpiData, VolSurface, CorrelationMatrix } from './providers';

export interface DataSourceConfig {
  name: string;
  type: 'rest' | 'websocket' | 'file' | 'database' | 'mock';
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  rateLimit?: {
    requestsPerSecond: number;
    burstSize?: number;
  };
  timeout?: number;
  retries?: number;
  cacheTtl?: number;
}

export interface DataSourceCredentials {
  apiKey?: string;
  apiSecret?: string;
  token?: string;
  username?: string;
  password?: string;
  [key: string]: any;
}

export interface DataSourceStatus {
  connected: boolean;
  lastCheck: Date;
  errorCount: number;
  lastError?: string;
  rateLimitRemaining?: number;
  rateLimitResetTime?: Date;
}

/**
 * Abstract base class for data sources
 */
export abstract class DataSource implements Omit<DataProvider, 'healthCheck' | 'getQuote' | 'getHistoricalPrices'> {
  protected config: DataSourceConfig;
  protected credentials?: DataSourceCredentials;
  protected status: DataSourceStatus;
  protected cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(config: DataSourceConfig, credentials?: DataSourceCredentials) {
    this.config = config;
    this.credentials = credentials;
    this.status = {
      connected: false,
      lastCheck: new Date(),
      errorCount: 0,
    };
  }

  // Required DataProvider interface
  abstract get name(): string;
  get id(): string { return this.config.name.toLowerCase().replace(/\s+/g, '-'); }
  abstract getPrices(symbol: string, range?: PriceRange): Promise<PricePoint[]>;
  abstract getKpis(symbol: string): Promise<KpiData>;
  abstract getVolSurface(symbol: string): Promise<VolSurface>;
  abstract getCorrelation?(symbols: string[], period?: string): Promise<CorrelationMatrix>;
  abstract isAvailable(): boolean;

  // Data source specific methods
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
  // Adapter to DataProvider.healthCheck shape
  async providerHealthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latency: number }> {
    const start = Date.now();
    const ok = await this.healthCheck();
    const latency = Date.now() - start;
    return { status: ok ? 'healthy' : 'down', latency };
  }
  // Optional: provide DataProvider-compatible healthCheck signature via adapter if needed

  /**
   * Get current status
   */
  getStatus(): DataSourceStatus {
    return { ...this.status };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DataSourceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update credentials
   */
  updateCredentials(newCredentials: DataSourceCredentials): void {
    this.credentials = { ...this.credentials, ...newCredentials };
  }

  /**
   * Generic caching utility
   */
  protected getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Cache data with TTL
   */
  protected setCachedData(key: string, data: any, ttlMs?: number): void {
    const ttl = ttlMs || this.config.cacheTtl || 300000; // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Rate limiting check
   */
  protected async checkRateLimit(): Promise<boolean> {
    if (!this.config.rateLimit) return true;
    
    // Simple rate limiting - in production, use a proper rate limiter
    return this.status.rateLimitRemaining !== 0;
  }

  /**
   * Handle API errors
   */
  protected handleError(error: any, context?: string): void {
    this.status.errorCount++;
    this.status.lastError = error instanceof Error ? error.message : String(error);
    console.error(`Data source error (${this.name})${context ? ` in ${context}` : ''}:`, error);
  }
}

/**
 * REST API data source implementation
 */
export class RestDataSource extends DataSource {
  private baseUrl: string;

  constructor(config: DataSourceConfig, credentials?: DataSourceCredentials) {
    super(config, credentials);
    this.baseUrl = config.endpoint || '';
  }

  get name(): string {
    return this.config.name;
  }

  async connect(): Promise<boolean> {
    try {
      const healthy = await this.healthCheck();
      this.status.connected = healthy;
      this.status.lastCheck = new Date();
      return healthy;
    } catch (error) {
      this.handleError(error, 'connect');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.status.connected = false;
    this.clearCache();
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Basic ping to the API
      const response = await this.makeRequest('/health', { timeout: 5000 });
      return response.ok;
    } catch (error) {
      this.handleError(error, 'healthCheck');
      return false;
    }
  }

  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    const cacheKey = `prices:${symbol}:${range}`;
    const cached = this.getCachedData<PricePoint[]>(cacheKey);
    if (cached) return cached;

    try {
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const response = await this.makeRequest(`/prices/${symbol}`, {
        params: { range },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const prices = this.transformPriceData(data);
      
      this.setCachedData(cacheKey, prices);
      return prices;
    } catch (error) {
      this.handleError(error, 'getPrices');
      throw error;
    }
  }

  async getKpis(symbol: string): Promise<KpiData> {
    const cacheKey = `kpis:${symbol}`;
    const cached = this.getCachedData<KpiData>(cacheKey);
    if (cached) return cached;

    try {
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const response = await this.makeRequest(`/kpis/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const kpis = this.transformKpiData(data);
      
      this.setCachedData(cacheKey, kpis);
      return kpis;
    } catch (error) {
      this.handleError(error, 'getKpis');
      throw error;
    }
  }

  async getVolSurface(symbol: string): Promise<VolSurface> {
    const cacheKey = `vol:${symbol}`;
    const cached = this.getCachedData<VolSurface>(cacheKey);
    if (cached) return cached;

    try {
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const response = await this.makeRequest(`/volatility/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const volSurface = this.transformVolData(data);
      
      this.setCachedData(cacheKey, volSurface);
      return volSurface;
    } catch (error) {
      this.handleError(error, 'getVolSurface');
      throw error;
    }
  }

  async getCorrelation(symbols: string[], period = '1Y'): Promise<CorrelationMatrix> {
    const cacheKey = `corr:${symbols.join(',')}:${period}`;
    const cached = this.getCachedData<CorrelationMatrix>(cacheKey);
    if (cached) return cached;

    try {
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const response = await this.makeRequest('/correlation', {
        method: 'POST',
        body: { symbols, period },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const correlation = this.transformCorrelationData(data);
      
      this.setCachedData(cacheKey, correlation);
      return correlation;
    } catch (error) {
      this.handleError(error, 'getCorrelation');
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.status.connected && this.status.errorCount < 5;
  }

  getLastUpdate(symbol: string): Date | null {
    // In a real implementation, this would track per-symbol update times
    return this.status.lastCheck;
  }

  /**
   * Make HTTP request with proper headers and error handling
   */
  private async makeRequest(path: string, options: {
    method?: string;
    params?: Record<string, any>;
    body?: any;
    timeout?: number;
  } = {}): Promise<Response> {
    const { method = 'GET', params, body, timeout = this.config.timeout || 10000 } = options;
    
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += '?' + searchParams.toString();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.credentials?.apiKey) {
      headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Transform API price data to internal format
   */
  private transformPriceData(data: any): PricePoint[] {
    // This would be implemented based on the specific API response format
    if (Array.isArray(data)) {
      return data.map(item => ({
        date: new Date(item.date || item.timestamp),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume || 0),
      }));
    }
    return [];
  }

  /**
   * Transform API KPI data to internal format
   */
  private transformKpiData(data: any): KpiData {
    return {
      symbol: data.symbol || '',
      name: data.name || data.companyName || '',
      price: Number(data.price || data.currentPrice || 0),
      change: Number(data.change || data.priceChange || 0),
      changePercent: Number(data.changePercent || data.percentChange || 0),
      volume: Number(data.volume || 0),
      marketCap: Number(data.marketCap || 0),
      peRatio: data.peRatio ? Number(data.peRatio) : undefined,
      eps: data.eps ? Number(data.eps) : undefined,
      dividend: data.dividend ? Number(data.dividend) : undefined,
      divYield: data.dividendYield ? Number(data.dividendYield) : undefined,
      beta: data.beta ? Number(data.beta) : undefined,
      fiftyTwoWeekHigh: data.fiftyTwoWeekHigh ? Number(data.fiftyTwoWeekHigh) : undefined,
      fiftyTwoWeekLow: data.fiftyTwoWeekLow ? Number(data.fiftyTwoWeekLow) : undefined,
      timestamp: new Date(data.timestamp || Date.now()),
    };
  }

  /**
   * Transform API volatility data to internal format
   */
  private transformVolData(data: any): VolSurface {
    return {
      symbol: data.symbol || '',
      underlyingPrice: Number(data.underlyingPrice || 0),
      points: (data.points || []).map((point: any) => ({
        strike: Number(point.strike),
        expiry: new Date(point.expiry),
        impliedVol: Number(point.impliedVol || point.iv),
        delta: point.delta ? Number(point.delta) : undefined,
        gamma: point.gamma ? Number(point.gamma) : undefined,
        theta: point.theta ? Number(point.theta) : undefined,
        vega: point.vega ? Number(point.vega) : undefined,
      })),
      timestamp: new Date(data.timestamp || Date.now()),
    };
  }

  /**
   * Transform API correlation data to internal format
   */
  private transformCorrelationData(data: any): CorrelationMatrix {
    return {
      symbols: data.symbols || [],
      matrix: data.matrix || [],
      period: data.period || '1Y',
      timestamp: new Date(data.timestamp || Date.now()),
    };
  }
}

/**
 * File-based data source implementation
 */
export class FileDataSource extends DataSource {
  private filePath: string;

  constructor(config: DataSourceConfig) {
    super(config);
    this.filePath = config.endpoint || '';
  }

  get name(): string {
    return this.config.name;
  }

  async connect(): Promise<boolean> {
    try {
      // Check if file is accessible
      const healthy = await this.healthCheck();
      this.status.connected = healthy;
      this.status.lastCheck = new Date();
      return healthy;
    } catch (error) {
      this.handleError(error, 'connect');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.status.connected = false;
    this.clearCache();
  }

  async healthCheck(): Promise<boolean> {
    try {
      // In a browser environment, we can't directly check file access
      // This would be implemented differently in Node.js
      return true;
    } catch (error) {
      this.handleError(error, 'healthCheck');
      return false;
    }
  }

  // Placeholder implementations - would load from CSV, JSON, or other file formats
  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    // Would read and parse price data from file
    return [];
  }

  async getKpis(symbol: string): Promise<KpiData> {
    // Would read and parse KPI data from file
    throw new Error('File data source not fully implemented');
  }

  async getVolSurface(symbol: string): Promise<VolSurface> {
    // Would read and parse volatility data from file
    throw new Error('File data source not fully implemented');
  }

  async getCorrelation(symbols: string[], period = '1Y'): Promise<CorrelationMatrix> {
    // Would read and parse correlation data from file
    throw new Error('File data source not fully implemented');
  }

  isAvailable(): boolean {
    return this.status.connected;
  }

  getLastUpdate(symbol: string): Date | null {
    return this.status.lastCheck;
  }
}

/**
 * WebSocket data source for real-time data
 */
export class WebSocketDataSource extends DataSource {
  private ws?: WebSocket;
  private subscriptions = new Set<string>();

  constructor(config: DataSourceConfig, credentials?: DataSourceCredentials) {
    super(config, credentials);
  }

  get name(): string {
    return this.config.name;
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.config.endpoint) {
        throw new Error('WebSocket endpoint not configured');
      }

      this.ws = new WebSocket(this.config.endpoint);
      
      return new Promise((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket creation failed'));

        this.ws.onopen = () => {
          this.status.connected = true;
          this.status.lastCheck = new Date();
          resolve(true);
        };

        this.ws.onerror = (error) => {
          this.handleError(error, 'connect');
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          this.status.connected = false;
        };
      });
    } catch (error) {
      this.handleError(error, 'connect');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.status.connected = false;
    this.subscriptions.clear();
    this.clearCache();
  }

  async healthCheck(): Promise<boolean> {
    return this.ws?.readyState === WebSocket.OPEN || false;
  }

  // WebSocket data sources typically provide real-time updates
  // These methods would subscribe to data streams rather than make one-time requests
  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    this.subscribe(`prices.${symbol}`);
    // Return cached historical data or make initial REST request
    return [];
  }

  async getKpis(symbol: string): Promise<KpiData> {
    this.subscribe(`kpis.${symbol}`);
    throw new Error('WebSocket data source not fully implemented');
  }

  async getVolSurface(symbol: string): Promise<VolSurface> {
    this.subscribe(`vol.${symbol}`);
    throw new Error('WebSocket data source not fully implemented');
  }

  async getCorrelation(symbols: string[], period = '1Y'): Promise<CorrelationMatrix> {
    this.subscribe(`correlation.${symbols.join(',')}.${period}`);
    throw new Error('WebSocket data source not fully implemented');
  }

  isAvailable(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || false;
  }

  getLastUpdate(symbol: string): Date | null {
    return this.status.lastCheck;
  }

  /**
   * Subscribe to a data channel
   */
  private subscribe(channel: string): void {
    if (this.subscriptions.has(channel) || !this.ws) return;

    const message = {
      action: 'subscribe',
      channel,
      apiKey: this.credentials?.apiKey,
    };

    this.ws.send(JSON.stringify(message));
    this.subscriptions.add(channel);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      // Process real-time updates and update cache
      console.log('WebSocket message:', message);
    } catch (error) {
      this.handleError(error, 'handleMessage');
    }
  }
}

/**
 * Data source factory
 */
export function createDataSource(
  config: DataSourceConfig, 
  credentials?: DataSourceCredentials
): DataSource {
  switch (config.type) {
    case 'rest':
      return new RestDataSource(config, credentials);
    case 'file':
      return new FileDataSource(config);
    case 'websocket':
      return new WebSocketDataSource(config, credentials);
    default:
      throw new Error(`Unsupported data source type: ${config.type}`);
  }
}