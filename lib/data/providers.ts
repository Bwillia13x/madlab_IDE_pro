import { mockAdapter } from './adapters/mock';
import { createAlphaVantageAdapter } from './adapters/alpha-vantage';
import { createPolygonAdapter } from './adapters/polygon';
import { createAlpacaAdapter } from './adapters/alpaca';
import { InteractiveBrokersAdapter } from './adapters/interactive-brokers';
import { InteractiveBrokersRealAdapter } from './adapters/interactive-brokers-real';
import type { Provider } from './provider.types';

// Data provider registry
const providers: Record<string, Provider> = {
  mock: mockAdapter,
  // Alpha Vantage will be added dynamically when configured
  // Polygon will be added dynamically when configured
  // Alpaca will be added dynamically when configured
};

// Provider priority and capabilities mapping
const PROVIDER_PRIORITY = [
  { name: 'alpaca', priority: 1, features: ['realtime', 'historical', 'trading', 'options', 'crypto'] },
  { name: 'polygon', priority: 2, features: ['realtime', 'historical', 'options', 'crypto'] },
  { name: 'alpha-vantage', priority: 3, features: ['historical', 'options'] },
  { name: 'mock', priority: 999, features: ['realtime', 'historical', 'trading', 'options', 'crypto'] }
];

// Function to add Alpha Vantage provider with API key
export function addAlphaVantageProvider(apiKey: string): void {
  if (apiKey && apiKey !== 'demo') {
    providers['alpha-vantage'] = createAlphaVantageAdapter(apiKey);
    console.log('✅ Alpha Vantage provider added');
  }
}

// Function to remove Alpha Vantage provider
export function removeAlphaVantageProvider(): void {
  delete providers['alpha-vantage'];
  console.log('🗑️ Alpha Vantage provider removed');
}

// Function to add Polygon provider with API key
export function addPolygonProvider(apiKey: string): void {
  if (apiKey && apiKey !== 'demo') {
    providers['polygon'] = createPolygonAdapter(apiKey);
    console.log('✅ Polygon provider added');
  }
}

// Function to remove Polygon provider
export function removePolygonProvider(): void {
  delete providers['polygon'];
  console.log('🗑️ Polygon provider removed');
}

// Function to add Alpaca provider with API key and secret
export function addAlpacaProvider(apiKey: string, secretKey: string, paperTrading: boolean = true): void {
  if (apiKey && secretKey && apiKey !== 'demo' && secretKey !== 'demo') {
    providers['alpaca'] = createAlpacaAdapter(apiKey, secretKey, paperTrading);
    console.log(`✅ Alpaca provider added (${paperTrading ? 'Paper Trading' : 'Live Trading'})`);
  }
}

// Function to remove Alpaca provider
export function removeAlpacaProvider(): void {
  delete providers['alpaca'];
  console.log('🗑️ Alpaca provider removed');
}

// Function to add Interactive Brokers provider with connection config
export function addIBKRProvider(host: string, port: number, clientId: number): void {
  if (host && port && clientId) {
    providers['ibkr'] = new InteractiveBrokersAdapter({ host, port, clientId });
    console.log('✅ Interactive Brokers provider added');
  }
}

// Function to add Interactive Brokers Real provider with TWS connection
export function addIBKRRealProvider(host: string, port: number, clientId: number): void {
  if (host && port && clientId) {
    providers['ibkr-real'] = new InteractiveBrokersRealAdapter({ host, port, clientId });
    console.log('✅ Interactive Brokers Real provider added');
  }
}

// Function to remove Interactive Brokers provider
export function removeIBKRProvider(): void {
  delete providers['ibkr'];
  console.log('🗑️ Interactive Brokers provider removed');
}

let currentProvider = 'mock';

export function setDataProvider(providerName: string): Promise<void> {
  if (!providers[providerName]) {
    throw new Error(`Unknown data provider: ${providerName}`);
  }
  
  currentProvider = providerName;
  console.log(`🔄 Switched to data provider: ${providerName}`);
  return Promise.resolve();
}

export function getDataProvider(): string {
  return currentProvider;
}

export function getProvider(providerName?: string): Provider {
  const name = providerName || currentProvider;
  return providers[name] || providers.mock;
}

export function getAvailableProviders(): string[] {
  // Surface commonly supported providers in UI even if not yet registered
  const supported = ['mock', 'alpha-vantage', 'polygon', 'alpaca', 'ibkr'];
  return Array.from(new Set([...Object.keys(providers), ...supported]));
}

export function registerProvider(name: string, provider: Provider): void {
  providers[name] = provider;
}

// Enhanced provider capabilities
export function getProviderCapabilities(providerName: string): Record<string, boolean> {
  const provider = providers[providerName];
  if (!provider) {
    return {
      realtime: false,
      historical: false,
      trading: false,
      options: false,
      crypto: false,
    };
  }

  // Check if provider is mock (has all capabilities)
  if (provider.name === 'mock') {
    return {
      realtime: true,
      historical: true,
      trading: true,
      options: true,
      crypto: true,
    };
  }

  // For real providers, check their actual capabilities
  try {
    // This would ideally check the provider's actual capabilities
    // For now, we'll use the priority mapping
    const priorityInfo = PROVIDER_PRIORITY.find(p => p.name === providerName);
    if (priorityInfo) {
      const capabilities: Record<string, boolean> = {};
      priorityInfo.features.forEach(feature => {
        capabilities[feature] = true;
      });
      
      // Add missing capabilities as false
      ['realtime', 'historical', 'trading', 'options', 'crypto'].forEach(feature => {
        if (!(feature in capabilities)) {
          capabilities[feature] = false;
        }
      });
      
      return capabilities;
    }
  } catch (error) {
    console.warn(`Failed to get capabilities for ${providerName}:`, error);
  }

  // Fallback to basic capabilities
  return {
    realtime: false,
    historical: true,
    trading: false,
    options: false,
    crypto: false,
  };
}

// Smart provider selection based on capabilities and health
export async function getBestProvider(requiredCapabilities: string[] = []): Promise<string> {
  try {
    const availableProviders = Object.keys(providers).filter(name => name !== 'mock');
    
    if (availableProviders.length === 0) {
      console.log('📊 No real providers available, using mock');
      return 'mock';
    }

    // Check provider health and capabilities
    const providerHealth = await Promise.all(
      availableProviders.map(async (name) => {
        try {
          const provider = providers[name];
          const [available, authenticated] = await Promise.all([
            provider.isAvailable(),
            provider.isAuthenticated()
          ]);
          
          if (!available || !authenticated) {
            return { name, healthy: false, score: 0 };
          }

          // Calculate provider score based on capabilities and priority
          const capabilities = getProviderCapabilities(name);
          const priorityInfo = PROVIDER_PRIORITY.find(p => p.name === name);
          const priority = priorityInfo ? priorityInfo.priority : 999;
          
          // Score based on required capabilities and priority
          let score = 1000 - priority; // Lower priority = higher score
          
          if (requiredCapabilities.length > 0) {
            const supportedCapabilities = requiredCapabilities.filter(cap => capabilities[cap]);
            const capabilityScore = (supportedCapabilities.length / requiredCapabilities.length) * 100;
            score += capabilityScore;
          }

          return { name, healthy: true, score };
        } catch (error) {
          console.warn(`Health check failed for ${name}:`, error);
          return { name, healthy: false, score: 0 };
        }
      })
    );

    // Filter healthy providers and sort by score
    const healthyProviders = providerHealth
      .filter(p => p.healthy)
      .sort((a, b) => b.score - a.score);

    if (healthyProviders.length === 0) {
      console.log('⚠️ No healthy real providers available, using mock');
      return 'mock';
    }

    const bestProvider = healthyProviders[0];
    console.log(`🏆 Best provider selected: ${bestProvider.name} (score: ${bestProvider.score})`);
    
    return bestProvider.name;
  } catch (error) {
    console.error('Provider selection failed:', error);
    return 'mock';
  }
}

// Auto-switch to best available provider
export async function autoSwitchToBestProvider(requiredCapabilities: string[] = []): Promise<string> {
  try {
    const bestProvider = await getBestProvider(requiredCapabilities);
    
    if (bestProvider !== currentProvider) {
      await setDataProvider(bestProvider);
      console.log(`🔄 Auto-switched to best provider: ${bestProvider}`);
    }
    
    return bestProvider;
  } catch (error) {
    console.error('Auto-switch failed:', error);
    return currentProvider;
  }
}

// Get provider statistics
export function getProviderStats(): {
  total: number;
  real: number;
  mock: number;
  healthy: number;
  current: string;
} {
  const total = Object.keys(providers).length;
  const real = total - (providers.mock ? 1 : 0);
  const mock = providers.mock ? 1 : 0;
  
  return {
    total,
    real,
    mock,
    healthy: real, // This would need actual health checking
    current: currentProvider,
  };
}

// Provider health monitoring
export async function getProviderHealth(): Promise<Record<string, { available: boolean; authenticated: boolean; healthy: boolean }>> {
  const health: Record<string, { available: boolean; authenticated: boolean; healthy: boolean }> = {};
  
  for (const [name, provider] of Object.entries(providers)) {
    try {
      const [available, authenticated] = await Promise.all([
        provider.isAvailable(),
        provider.isAuthenticated()
      ]);
      
      health[name] = {
        available,
        authenticated,
        healthy: available && authenticated
      };
    } catch (error) {
      console.warn(`Health check failed for ${name}:`, error);
      health[name] = {
        available: false,
        authenticated: false,
        healthy: false
      };
    }
  }
  
  return health;
}
