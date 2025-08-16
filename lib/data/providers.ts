import { mockAdapter } from './adapters/mock';
import { createAlphaVantageAdapter } from './adapters/alpha-vantage';
import type { Provider } from './provider.types';

// Data provider registry
const providers: Record<string, Provider> = {
  mock: mockAdapter,
  // Alpha Vantage will be added dynamically when configured
};

// Function to add Alpha Vantage provider with API key
export function addAlphaVantageProvider(apiKey: string): void {
  if (apiKey && apiKey !== 'demo') {
    providers['alpha-vantage'] = createAlphaVantageAdapter(apiKey);
  }
}

// Function to remove Alpha Vantage provider
export function removeAlphaVantageProvider(): void {
  delete providers['alpha-vantage'];
}

let currentProvider = 'mock';

export function setDataProvider(providerName: string): Promise<void> {
  if (!providers[providerName]) {
    throw new Error(`Unknown data provider: ${providerName}`);
  }
  
  currentProvider = providerName;
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
  return Object.keys(providers);
}

export function registerProvider(name: string, provider: Provider): void {
  providers[name] = provider;
}

export function unregisterProvider(name: string): void {
  if (name === 'mock') {
    throw new Error('Cannot unregister mock provider');
  }
  delete providers[name];
  if (currentProvider === name) {
    currentProvider = 'mock';
  }
}