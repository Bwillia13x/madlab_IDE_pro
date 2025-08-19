import { mockAdapter } from './adapters/mock';
import { registerProvider } from './providers';

export async function initializeDataProviders(): Promise<void> {
  try {
    // Register mock provider immediately (synchronous)
    registerProvider('mock', mockAdapter);
    
    // Use Promise.all for concurrent initialization of real providers
    const initPromises = [
      // TODO: Initialize real data providers concurrently
      // initializeAlphaVantage(),
      // initializeYahooFinance(),
      // initializeBloomberg(),
    ].filter(Boolean);
    
    if (initPromises.length > 0) {
      await Promise.allSettled(initPromises);
    }
    
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