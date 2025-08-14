/**
 * Data provider initialization
 * This file registers all available data providers with the registry
 */
import { registerDataProvider, setDataProvider, dataProviderRegistry } from './providers';
import { mockProvider } from './mock';
import { extensionProvider } from './providers/ExtensionBridgeProvider';

// Register all available providers
export function initializeProviders() {
  // Always register mock provider as fallback
  registerDataProvider('mock', mockProvider);
  
  // Prefer pre-registering extension provider only when a bridge exists to avoid races
  try {
    const hasBridge = typeof window !== 'undefined' && !!(window as any).madlabBridge && typeof (window as any).madlabBridge.request === 'function';
    if (hasBridge) {
      registerDataProvider('extension', extensionProvider);
    }
  } catch {}
  
  // Set default provider to mock for safety
  const success = setDataProvider('mock');
  if (!success) {
    console.warn('Failed to set default mock provider');
  }
  
  return { mockProvider, extensionProvider: dataProviderRegistry.getProvider('extension') };
}

// Auto-initialize when module is imported (safe for SSR/E2E)
try {
  initializeProviders();
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('Provider auto-initialization skipped:', e);
}