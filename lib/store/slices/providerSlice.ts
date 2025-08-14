/**
 * Provider slice
 */
import { dataProviderRegistry, registerDataProvider } from '@/lib/data/providers';
import { extensionProvider } from '@/lib/data/providers/ExtensionBridgeProvider';

export function createProviderSlice(set: any, get: any): Record<string, unknown> {
  return {
    setDataProvider: async (provider: string) => {
      const previousProvider = String((get() as any).dataProvider || '').replace(':loading', '');
      try {
        set({ dataProvider: `${provider}:loading` });
        if (provider === 'extension' && !dataProviderRegistry.getProvider('extension')) {
          try {
            const bridgeAvailable = typeof window !== 'undefined' && !!(window as any).madlabBridge && typeof (window as any).madlabBridge.request === 'function';
            if (bridgeAvailable) registerDataProvider('extension', extensionProvider);
          } catch {}
        }
        const success = dataProviderRegistry.setActive(provider);
        if (!success) throw new Error(`Failed to activate provider ${provider}`);
        const activeProvider = dataProviderRegistry.getActive();
        if (activeProvider && (typeof activeProvider.isAvailable !== 'function' || activeProvider.isAvailable())) {
          set({ dataProvider: provider });
        } else {
          throw new Error(`Provider ${provider} failed availability check`);
        }
      } catch (error) {
        set({ dataProvider: previousProvider });
        console.error(`Failed to set data provider to '${provider}':`, error);
      }
    },
    getDataProvider: () => (get() as any).dataProvider,
  };
}


