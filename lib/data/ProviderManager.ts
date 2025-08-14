/**
 * Data Provider Manager
 * Intelligently manages multiple data providers with fallback, load balancing,
 * and cost optimization capabilities
 */

import type { DataProvider, KpiData, PricePoint, PriceRange } from './providers';
import { iexCloudProvider } from './providers/IEXCloudProvider';
import { polygonProvider } from './providers/PolygonProvider';
import { analytics } from '@/lib/analytics';

export interface ProviderConfig {
  provider: DataProvider;
  priority: number;           // Lower number = higher priority
  costPerCall: number;        // Cost in USD per API call
  monthlyLimit: number;       // Monthly call limit
  usageCount: number;         // Current usage this month
  enabled: boolean;           // Whether provider is enabled
  healthStatus: 'healthy' | 'degraded' | 'down';
  lastHealthCheck: number;    // Timestamp of last health check
}

export interface ProviderStrategy {
  type: 'cost-optimized' | 'performance-first' | 'reliability-first' | 'balanced';
  maxCostPerMonth?: number;   // Maximum monthly cost limit
  maxLatency?: number;        // Maximum acceptable latency (ms)
  requireBackup?: boolean;    // Require at least one backup provider
}

export interface DataRequest {
  type: 'quote' | 'historical' | 'batch' | 'intraday' | 'news' | 'fundamentals';
  symbol: string;
  params?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  maxCost?: number;          // Maximum cost willing to pay for this request
  maxLatency?: number;       // Maximum latency acceptable for this request
}

export class ProviderManager {
  private providers: Map<string, ProviderConfig> = new Map();
  private strategy: ProviderStrategy = { type: 'balanced' };
  private usageTracking: Map<string, { calls: number; cost: number; month: number }> = new Map();
  private requestQueue: Array<{ request: DataRequest; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializeProviders();
    this.scheduleHealthChecks();
  }

  private async initializeProviders() {
    // Register available providers
    await this.registerProvider(iexCloudProvider as unknown as DataProvider, {
      priority: 1,
      costPerCall: 0.0001,
      monthlyLimit: 500000,
      enabled: true,
    });

    await this.registerProvider(polygonProvider, {
      priority: 2,
      costPerCall: 0.004,
      monthlyLimit: 1000,
      enabled: true,
    });

    // Perform initial health checks
    await this.checkAllProviderHealth();
  }

  async registerProvider(
    provider: DataProvider, 
    config: Partial<ProviderConfig>
  ): Promise<void> {
    try {
      await provider.initialize?.();
      
      const providerConfig: ProviderConfig = {
        provider,
        priority: config.priority || 999,
        costPerCall: config.costPerCall || 0.001,
        monthlyLimit: config.monthlyLimit || 10000,
        usageCount: 0,
        enabled: config.enabled ?? true,
        healthStatus: 'healthy',
        lastHealthCheck: Date.now(),
        ...config,
      };

      this.providers.set(provider.id, providerConfig);
      
      console.log(`✅ Registered provider: ${provider.name} (${provider.id})`);
    } catch (error) {
      console.error(`❌ Failed to register provider ${provider.id}:`, error);
    }
  }

  setStrategy(strategy: ProviderStrategy): void {
    this.strategy = strategy;
    console.log(`📊 Provider strategy set to: ${strategy.type}`);
  }

  async getQuote(symbol: string, options: Partial<DataRequest> = {}): Promise<KpiData> {
    const request: DataRequest = {
      type: 'quote',
      symbol,
      priority: 'normal',
      ...options,
    };

    return this.executeRequest(request, async (provider: DataProvider) => {
      return provider.getQuote(symbol);
    });
  }

  async getHistoricalPrices(
    symbol: string, 
    range: PriceRange = '1Y',
    options: Partial<DataRequest> = {}
  ): Promise<PricePoint[]> {
    const request: DataRequest = {
      type: 'historical',
      symbol,
      params: { range },
      priority: 'normal',
      ...options,
    };

    return this.executeRequest(request, async (provider: DataProvider) => {
      return provider.getHistoricalPrices(symbol, range);
    });
  }

  async getBatchQuotes(
    symbols: string[],
    options: Partial<DataRequest> = {}
  ): Promise<Record<string, KpiData>> {
    const request: DataRequest = {
      type: 'batch',
      symbol: symbols.join(','),
      params: { symbols },
      priority: 'normal',
      ...options,
    };

    return this.executeRequest(request, async (provider: DataProvider) => {
      // Check if provider supports batch quotes
      if ('getBatchQuotes' in provider && typeof provider.getBatchQuotes === 'function') {
        return (provider as any).getBatchQuotes(symbols);
      } else {
        // Fallback to individual quotes
        const results: Record<string, KpiData> = {};
        const promises = symbols.map(async (symbol) => {
          try {
            const quote = await provider.getQuote(symbol);
            results[symbol] = quote;
          } catch (error) {
            console.warn(`Failed to get quote for ${symbol}:`, error);
          }
        });
        await Promise.all(promises);
        return results;
      }
    });
  }

  private async executeRequest<T>(
    request: DataRequest,
    operation: (provider: DataProvider) => Promise<T>
  ): Promise<T> {
    const suitableProviders = this.selectProviders(request);
    
    if (suitableProviders.length === 0) {
      throw new Error('No suitable data providers available');
    }

    let lastError: Error | null = null;

    // Try providers in order of suitability
    for (const config of suitableProviders) {
      try {
        const startTime = Date.now();
        
        // Check if we're within usage limits
        if (!this.canUseProvider(config, request)) {
          console.warn(`Provider ${config.provider.id} usage limit exceeded`);
          continue;
        }

        // Execute the operation
        const result = await operation(config.provider);
        const latency = Date.now() - startTime;

        // Track usage and cost
        this.trackUsage(config, request, latency);

        // Track success analytics
        analytics.track('data_provider_success', {
          providerId: config.provider.id,
          requestType: request.type,
          symbol: request.symbol,
          latency,
          cost: config.costPerCall,
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Track failure analytics
        analytics.track('data_provider_failure', {
          providerId: config.provider.id,
          requestType: request.type,
          symbol: request.symbol,
          error: lastError.message,
        });

        // Mark provider as degraded if it's failing
        config.healthStatus = 'degraded';
        
        console.warn(`Provider ${config.provider.id} failed for ${request.type}:`, error);
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw lastError || new Error('All data providers failed');
  }

  private selectProviders(request: DataRequest): ProviderConfig[] {
    const availableProviders = Array.from(this.providers.values())
      .filter(config => 
        config.enabled && 
        config.healthStatus !== 'down' &&
        config.provider.isSymbolSupported?.(request.symbol) !== false
      );

    if (availableProviders.length === 0) {
      return [];
    }

    // Sort providers based on strategy
    switch (this.strategy.type) {
      case 'cost-optimized':
        return availableProviders.sort((a, b) => a.costPerCall - b.costPerCall);
      
      case 'performance-first':
        return availableProviders.sort((a, b) => a.priority - b.priority);
      
      case 'reliability-first':
        return availableProviders
          .filter(config => config.healthStatus === 'healthy')
          .sort((a, b) => a.priority - b.priority);
      
      case 'balanced':
      default:
        // Balanced approach: consider cost, performance, and reliability
        return availableProviders.sort((a, b) => {
          const scoreA = this.calculateProviderScore(a, request);
          const scoreB = this.calculateProviderScore(b, request);
          return scoreB - scoreA; // Higher score first
        });
    }
  }

  private calculateProviderScore(config: ProviderConfig, request: DataRequest): number {
    let score = 100;

    // Penalize based on cost
    score -= config.costPerCall * 10000;

    // Penalize based on priority (lower priority = higher penalty)
    score -= config.priority * 5;

    // Penalize unhealthy providers
    if (config.healthStatus === 'degraded') score -= 20;
    if (config.healthStatus === 'down') score -= 100;

    // Penalize if approaching usage limits
    const usageRatio = config.usageCount / config.monthlyLimit;
    if (usageRatio > 0.8) score -= 30;
    if (usageRatio > 0.9) score -= 50;

    // Bonus for high priority requests on reliable providers
    if (request.priority === 'critical' && config.healthStatus === 'healthy') {
      score += 20;
    }

    return score;
  }

  private canUseProvider(config: ProviderConfig, request: DataRequest): boolean {
    // Check usage limits
    if (config.usageCount >= config.monthlyLimit) {
      return false;
    }

    // Check cost constraints
    if (request.maxCost && config.costPerCall > request.maxCost) {
      return false;
    }

    // Check strategy cost limits
    if (this.strategy.maxCostPerMonth) {
      const currentUsage = this.usageTracking.get(config.provider.id);
      if (currentUsage && currentUsage.cost >= this.strategy.maxCostPerMonth) {
        return false;
      }
    }

    return true;
  }

  private trackUsage(config: ProviderConfig, request: DataRequest, latency: number): void {
    // Update provider usage count
    config.usageCount++;

    // Track monthly usage and cost
    const currentMonth = new Date().getMonth();
    const providerId = config.provider.id;
    
    let usage = this.usageTracking.get(providerId);
    if (!usage || usage.month !== currentMonth) {
      usage = { calls: 0, cost: 0, month: currentMonth };
    }
    
    usage.calls++;
    usage.cost += config.costPerCall;
    this.usageTracking.set(providerId, usage);

    // Log usage for monitoring
    console.log(`📊 Provider ${providerId}: ${usage.calls} calls, $${usage.cost.toFixed(4)} cost this month`);
  }

  private async checkAllProviderHealth(): Promise<void> {
    const healthChecks = Array.from(this.providers.values()).map(async (config) => {
      try {
        if ('healthCheck' in config.provider && typeof config.provider.healthCheck === 'function') {
          const health = await (config.provider as any).healthCheck();
          config.healthStatus = health.status;
          config.lastHealthCheck = Date.now();
          
          console.log(`🏥 Provider ${config.provider.id} health: ${health.status} (${health.latency}ms)`);
        }
      } catch (error) {
        config.healthStatus = 'down';
        console.error(`🚨 Provider ${config.provider.id} health check failed:`, error);
      }
    });

    await Promise.all(healthChecks);
  }

  private scheduleHealthChecks(): void {
    // Check provider health every 5 minutes
    setInterval(() => {
      this.checkAllProviderHealth();
    }, 5 * 60 * 1000);
  }

  // Get provider status and usage statistics
  getProviderStatus(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    healthStatus: string;
    usageCount: number;
    monthlyLimit: number;
    usagePercent: number;
    costPerCall: number;
    monthlyCost: number;
    priority: number;
  }> {
    return Array.from(this.providers.values()).map(config => {
      const usage = this.usageTracking.get(config.provider.id);
      return {
        id: config.provider.id,
        name: config.provider.name,
        enabled: config.enabled,
        healthStatus: config.healthStatus,
        usageCount: config.usageCount,
        monthlyLimit: config.monthlyLimit,
        usagePercent: (config.usageCount / config.monthlyLimit) * 100,
        costPerCall: config.costPerCall,
        monthlyCost: usage?.cost || 0,
        priority: config.priority,
      };
    });
  }

  // Enable/disable specific providers
  setProviderEnabled(providerId: string, enabled: boolean): void {
    const config = this.providers.get(providerId);
    if (config) {
      config.enabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} Provider ${providerId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Get total cost for the month
  getTotalMonthlyCost(): number {
    return Array.from(this.usageTracking.values())
      .reduce((total, usage) => total + usage.cost, 0);
  }

  // Emergency fallback to specific provider
  async forceProvider(providerId: string): Promise<DataProvider | null> {
    const config = this.providers.get(providerId);
    if (config && config.enabled) {
      return config.provider;
    }
    return null;
  }
}

// Global provider manager instance
export const providerManager = new ProviderManager();