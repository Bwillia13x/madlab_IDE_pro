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

// Function to add Polygon provider with API key
export function addPolygonProvider(apiKey: string): void {
  if (apiKey && apiKey !== 'demo') {
    providers['polygon'] = createPolygonAdapter(apiKey);
  }
}

// Function to remove Polygon provider
export function removePolygonProvider(): void {
  delete providers['polygon'];
}

// Function to add Alpaca provider with API key and secret
export function addAlpacaProvider(apiKey: string, secretKey: string, paperTrading: boolean = true): void {
  if (apiKey && secretKey && apiKey !== 'demo' && secretKey !== 'demo') {
    providers['alpaca'] = createAlpacaAdapter(apiKey, secretKey, paperTrading);
  }
}

// Function to remove Alpaca provider
export function removeAlpacaProvider(): void {
  delete providers['alpaca'];
}

// Function to add Interactive Brokers provider with connection config
export function addIBKRProvider(host: string, port: number, clientId: number): void {
  if (host && port && clientId) {
    providers['ibkr'] = new InteractiveBrokersAdapter({ host, port, clientId });
  }
}

// Function to add Interactive Brokers Real provider with TWS connection
export function addIBKRRealProvider(host: string, port: number, clientId: number): void {
  if (host && port && clientId) {
    providers['ibkr-real'] = new InteractiveBrokersRealAdapter({ host, port, clientId });
  }
}

// Function to remove Interactive Brokers provider
export function removeIBKRProvider(): void {
  delete providers['ibkr'];
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

// Enhanced provider management functions
export function getProviderInfo(providerName: string): { name: string; available: boolean; type: string } | null {
  const provider = providers[providerName];
  if (!provider) return null;

  let type = 'market-data';
  if (providerName === 'alpaca') type = 'brokerage';
  else if (providerName === 'ibkr') type = 'brokerage';
  else if (providerName === 'ibkr-real') type = 'brokerage';
  else if (providerName === 'polygon') type = 'market-data-realtime';
  else if (providerName === 'alpha-vantage') type = 'market-data';

  return {
    name: provider.name,
    available: true,
    type,
  };
}

export function getProviderCapabilities(providerName: string): {
  realtime: boolean;
  historical: boolean;
  trading: boolean;
  options: boolean;
  crypto: boolean;
} {
  const capabilities = {
    realtime: false,
    historical: true,
    trading: false,
    options: false,
    crypto: false,
  };

  switch (providerName) {
    case 'polygon':
      capabilities.realtime = true;
      capabilities.options = true;
      break;
    case 'alpaca':
      capabilities.realtime = true;
      capabilities.trading = true;
      capabilities.crypto = true;
      break;
    case 'alpha-vantage':
      capabilities.historical = true;
      break;
    case 'mock':
      capabilities.historical = true;
      break;
  }

  return capabilities;
}