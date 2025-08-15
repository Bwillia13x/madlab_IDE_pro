import { mockAdapter } from './adapters/mock';
import { registerProvider } from './providers';

export async function initializeDataProviders(): Promise<void> {
  try {
    // Register mock provider (always available)
    registerProvider('mock', mockAdapter);
    
    // TODO: Initialize real data providers
    // await initializeAlphaVantage();
    // await initializeYahooFinance();
    // await initializeBloomberg();
    
    console.log('Data providers initialized successfully');
  } catch (error) {
    console.error('Failed to initialize data providers:', error);
    // Ensure mock provider is always available as fallback
    if (!getProvider('mock')) {
      registerProvider('mock', mockAdapter);
    }
    throw error;
  }
}

// Helper function to get provider (imported from providers.ts)
function getProvider(name: string) {
  // This is a temporary implementation - the real one is in providers.ts
  return name === 'mock' ? mockAdapter : null;
}