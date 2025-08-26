import { getProviderHealth, getProviderStats } from '@/lib/data/providers';

export interface ProviderHealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: number;
  available: boolean;
  authenticated: boolean;
  capabilities: string[];
  priority: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface ProviderHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  current: string;
  providers: ProviderHealthCheck[];
}

// Enhanced provider health check with detailed information
export async function checkAllProvidersHealth(): Promise<ProviderHealthSummary> {
  const startTime = Date.now();
  
  try {
    // Get provider health from the existing provider system
    const providerHealth = await getProviderHealth();
    const providerStats = getProviderStats();
    
    const providers: ProviderHealthCheck[] = [];
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    
    for (const [name, health] of Object.entries(providerHealth)) {
      const checkStartTime = Date.now();
      
      // Determine status based on health
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (health.healthy) {
        status = 'healthy';
        healthy++;
      } else if (health.available && !health.authenticated) {
        status = 'degraded';
        degraded++;
      } else {
        status = 'unhealthy';
        unhealthy++;
      }
      
      // Get provider capabilities (this would need to be implemented in the provider system)
      const capabilities = await getProviderCapabilities(name);
      const priority = getProviderPriority(name);
      
      providers.push({
        name,
        status,
        responseTime: Date.now() - checkStartTime,
        lastCheck: Date.now(),
        available: health.available,
        authenticated: health.authenticated,
        capabilities,
        priority,
        details: {
          total: providerStats.total,
          real: providerStats.real,
          mock: providerStats.mock
        }
      });
    }
    
    return {
      total: providerStats.total,
      healthy,
      degraded,
      unhealthy,
      current: providerStats.current,
      providers
    };
  } catch (error) {
    console.error('Provider health check failed:', error);
    
    return {
      total: 0,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      current: 'unknown',
      providers: []
    };
  }
}

// Get provider capabilities (placeholder - needs to be implemented in provider system)
async function getProviderCapabilities(providerName: string): Promise<string[]> {
  // This would need to be implemented in the provider system
  // For now, return basic capabilities based on provider name
  const capabilitiesMap: Record<string, string[]> = {
    'alpaca': ['realtime', 'historical', 'trading', 'options', 'crypto'],
    'polygon': ['realtime', 'historical', 'options', 'crypto'],
    'alpha-vantage': ['historical', 'options'],
    'mock': ['realtime', 'historical', 'trading', 'options', 'crypto'],
    'ibkr': ['realtime', 'historical', 'trading', 'options'],
    'ibkr-real': ['realtime', 'historical', 'trading', 'options']
  };
  
  return capabilitiesMap[providerName] || [];
}

// Get provider priority (placeholder - needs to be implemented in provider system)
function getProviderPriority(providerName: string): number {
  const priorityMap: Record<string, number> = {
    'alpaca': 1,
    'polygon': 2,
    'alpha-vantage': 3,
    'ibkr': 4,
    'ibkr-real': 5,
    'mock': 999
  };
  
  return priorityMap[providerName] || 999;
}

// Get individual provider health check
export async function checkProviderHealth(providerName: string): Promise<ProviderHealthCheck | null> {
  try {
    const providerHealth = await getProviderHealth();
    const health = providerHealth[providerName];
    
    if (!health) {
      return null;
    }
    
    const checkStartTime = Date.now();
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (health.healthy) {
      status = 'healthy';
    } else if (health.available && !health.authenticated) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    const capabilities = await getProviderCapabilities(providerName);
    const priority = getProviderPriority(providerName);
    
    return {
      name: providerName,
      status,
      responseTime: Date.now() - checkStartTime,
      lastCheck: Date.now(),
      available: health.available,
      authenticated: health.authenticated,
      capabilities,
      priority
    };
  } catch (error) {
    console.error(`Provider health check failed for ${providerName}:`, error);
    return null;
  }
}

