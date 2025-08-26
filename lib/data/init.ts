import { mockAdapter } from './adapters/mock';
import { registerProvider, addAlphaVantageProvider, addPolygonProvider, addAlpacaProvider, addIBKRProvider } from './providers';

export async function initializeDataProviders(): Promise<void> {
  try {
    // Register mock provider immediately (synchronous) as fallback
    registerProvider('mock', mockAdapter);

    // Attempt to initialize real providers when credentials are present
    const isBrowser = typeof window !== 'undefined';
    let realProvidersInitialized = 0;

    // Alpha Vantage
    try {
      const lsKey = isBrowser ? window.localStorage.getItem('madlab_alpha-vantage_apikey') : null;
      const envKey = (process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '') as string;
      const alphaKey = (lsKey && lsKey.trim()) ? lsKey : (envKey && envKey.trim() ? envKey : null);

      if (alphaKey && alphaKey !== 'your_alpha_vantage_key') {
        // Allow demo keys for Alpha Vantage as they provide limited functionality
        addAlphaVantageProvider(alphaKey);
        realProvidersInitialized++;
        console.log(`✅ Alpha Vantage provider initialized${alphaKey === 'demo' ? ' (demo mode)' : ''}`);
      }
    } catch (e) {
      console.warn('⚠️ Alpha Vantage provider init skipped:', e);
    }

    // Polygon
    try {
      const lsKey = isBrowser ? window.localStorage.getItem('madlab_polygon_apikey') : null;
      const envKey = (process.env.NEXT_PUBLIC_POLYGON_API_KEY || '') as string;
      const polygonKey = (lsKey && lsKey.trim()) ? lsKey : (envKey && envKey.trim() ? envKey : null);
      
      if (polygonKey && polygonKey !== 'demo') {
        addPolygonProvider(polygonKey);
        realProvidersInitialized++;
        console.log('✅ Polygon provider initialized');
      }
    } catch (e) {
      console.warn('⚠️ Polygon provider init skipped:', e);
    }

    // Alpaca (Paper Trading)
    try {
      const lsKey = isBrowser ? window.localStorage.getItem('madlab_alpaca_apikey') : null;
      const lsSecret = isBrowser ? window.localStorage.getItem('madlab_alpaca_secret') : null;
      const envKey = (process.env.NEXT_PUBLIC_ALPACA_API_KEY || '') as string;
      const envSecret = (process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || '') as string;
      
      const alpacaKey = (lsKey && lsKey.trim()) ? lsKey : (envKey && envKey.trim() ? envKey : null);
      const alpacaSecret = (lsSecret && lsSecret.trim()) ? lsSecret : (envSecret && envSecret.trim() ? envSecret : null);
      
      if (alpacaKey && alpacaSecret && alpacaKey !== 'demo' && alpacaSecret !== 'demo') {
        addAlpacaProvider(alpacaKey, alpacaSecret, true); // paper trading
        realProvidersInitialized++;
        console.log('✅ Alpaca provider initialized (Paper Trading)');
      }
    } catch (e) {
      console.warn('⚠️ Alpaca provider init skipped:', e);
    }

    // Interactive Brokers (TWS / Gateway)
    try {
      const lsHost = isBrowser ? window.localStorage.getItem('madlab_ib_host') : null;
      const lsPort = isBrowser ? window.localStorage.getItem('madlab_ib_port') : null;
      const lsClientId = isBrowser ? window.localStorage.getItem('madlab_ib_clientId') : null;
      const envHost = (process.env.NEXT_PUBLIC_IB_HOST || '') as string;
      const envPort = (process.env.NEXT_PUBLIC_IB_PORT || '') as string;
      const envClientId = (process.env.NEXT_PUBLIC_IB_CLIENT_ID || '') as string;

      const host = (lsHost && lsHost.trim()) ? lsHost : (envHost && envHost.trim() ? envHost : null);
      const portRaw = (lsPort && lsPort.trim()) ? lsPort : (envPort && envPort.trim() ? envPort : null);
      const clientIdRaw = (lsClientId && lsClientId.trim()) ? lsClientId : (envClientId && envClientId.trim() ? envClientId : null);

      const port = portRaw ? parseInt(portRaw, 10) : NaN;
      const clientId = clientIdRaw ? parseInt(clientIdRaw, 10) : NaN;

      if (host && Number.isFinite(port) && Number.isFinite(clientId)) {
        addIBKRProvider(host, port, clientId);
        realProvidersInitialized++;
        console.log('✅ Interactive Brokers provider initialized');
      }
    } catch (e) {
      console.warn('⚠️ IBKR provider init skipped:', e);
    }

    if (realProvidersInitialized > 0) {
      console.log(`🚀 Data providers initialized: ${realProvidersInitialized} real + mock fallback`);
    } else {
      console.log('📊 Data providers initialized: mock data only (demo mode)');
      console.log('💡 To enable real data, add API keys in Settings > Data');
    }
  } catch (error) {
    console.error('❌ Failed to initialize data providers:', error);
    // Ensure mock provider is always available as fallback
    registerProvider('mock', mockAdapter);
    throw error;
  }
}

// Enhanced provider health check
export async function checkProviderHealth(): Promise<{
  mock: boolean;
  alphaVantage: boolean;
  polygon: boolean;
  alpaca: boolean;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}> {
  const health: {
    mock: boolean;
    alphaVantage: boolean;
    polygon: boolean;
    alpaca: boolean;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  } = {
    mock: false,
    alphaVantage: false,
    polygon: false,
    alpaca: false,
    overall: 'unhealthy'
  };

  try {
    // Mock provider is always available
    health.mock = true;

    // Check real providers
    const { getProvider } = await import('./providers');
    
    try {
      const alphaProvider = getProvider('alpha-vantage');
      if (alphaProvider.name !== 'mock') {
        const [available, authenticated] = await Promise.all([
          alphaProvider.isAvailable(),
          alphaProvider.isAuthenticated()
        ]);
        health.alphaVantage = available && authenticated;
      }
    } catch (e) {
      console.warn('Alpha Vantage health check failed:', e);
    }

    try {
      const polygonProvider = getProvider('polygon');
      if (polygonProvider.name !== 'mock') {
        const [available, authenticated] = await Promise.all([
          polygonProvider.isAvailable(),
          polygonProvider.isAuthenticated()
        ]);
        health.polygon = available && authenticated;
      }
    } catch (e) {
      console.warn('Polygon health check failed:', e);
    }

    try {
      const alpacaProvider = getProvider('alpaca');
      if (alpacaProvider.name !== 'mock') {
        const [available, authenticated] = await Promise.all([
          alpacaProvider.isAvailable(),
          alpacaProvider.isAuthenticated()
        ]);
        health.alpaca = available && authenticated;
      }
    } catch (e) {
      console.warn('Alpaca health check failed:', e);
    }

    // Determine overall health
    const realProviders = [health.alphaVantage, health.polygon, health.alpaca];
    const healthyRealProviders = realProviders.filter(Boolean).length;
    
    if (healthyRealProviders === 0) {
      health.overall = 'unhealthy'; // Only mock available
    } else if (healthyRealProviders === realProviders.length) {
      health.overall = 'healthy'; // All real providers working
    } else {
      health.overall = 'degraded'; // Some real providers working
    }

  } catch (error) {
    console.error('Provider health check failed:', error);
  }

  return health;
}
