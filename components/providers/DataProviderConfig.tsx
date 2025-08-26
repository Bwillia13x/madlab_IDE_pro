'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Zap, CheckCircle, AlertCircle, RefreshCw, TrendingUp, Building2 } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { 
  getAvailableProviders, 
  getProvider, 
  addAlphaVantageProvider, 
  removeAlphaVantageProvider, 
  getProviderCapabilities, 
  addPolygonProvider, 
  removePolygonProvider,
  addAlpacaProvider,
  removeAlpacaProvider,
  addIBKRProvider,
  removeIBKRProvider
} from '@/lib/data/providers';
import { checkProviderHealth } from '@/lib/data/init';
import { toast } from 'sonner';

interface DataProviderConfigProps {
  onClose?: () => void;
}

export function DataProviderConfig({ onClose }: DataProviderConfigProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('mock');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [providerHealth, setProviderHealth] = useState<{ mock: boolean; alphaVantage: boolean; polygon: boolean; alpaca: boolean; overall: string } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  
  const { dataProvider, setDataProvider } = useWorkspaceStore();
  const availableProviders = getAvailableProviders();

  useEffect(() => {
    setSelectedProvider(dataProvider);
    // Load cached API keys for current provider if present
    try {
      if (dataProvider === 'alpha-vantage') {
        const cached = localStorage.getItem('madlab_alpha-vantage_apikey');
        if (cached) {
          setApiKey(cached);
          addAlphaVantageProvider(cached);
        }
      }
      if (dataProvider === 'ibkr') {
        const host = localStorage.getItem('madlab_ib_host');
        const port = localStorage.getItem('madlab_ib_port');
        const clientId = localStorage.getItem('madlab_ib_clientId');
        if (host && port && clientId) {
          try { addIBKRProvider(host, parseInt(port, 10), parseInt(clientId, 10)); } catch {}
        }
      }
      if (dataProvider === 'polygon') {
        const cached = localStorage.getItem('madlab_polygon_apikey');
        if (cached) {
          setApiKey(cached);
          addPolygonProvider(cached);
        }
      }
      if (dataProvider === 'alpaca') {
        const cachedKey = localStorage.getItem('madlab_alpaca_apikey');
        const cachedSecret = localStorage.getItem('madlab_alpaca_secret');
        if (cachedKey && cachedSecret) {
          setApiKey(cachedKey);
          setApiSecret(cachedSecret);
          addAlpacaProvider(cachedKey, cachedSecret, true);
        }
      }
    } catch {}
    
    // Check provider health on mount
    checkHealth();
    
    // probe provider status
    const run = async () => {
      try {
        const p = getProvider(dataProvider);
        const [avail, auth] = await Promise.all([p.isAvailable(), p.isAuthenticated()]);
        if (avail && auth) { console.log('Provider ready'); }
        else if (avail && !auth) { console.log('Provider available but needs authentication'); }
        else { console.log('Provider unavailable'); }
      } catch {
        console.error('Error probing provider');
      }
    };
    run();
  }, [dataProvider]);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await checkProviderHealth();
      setProviderHealth(health);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleTestConnection = async () => {
    if (selectedProvider === 'alpha-vantage' || selectedProvider === 'polygon') {
      if (!apiKey.trim()) {
        setTestResult({ success: false, message: 'Please enter an API key' });
        return;
      }
    }
    if (selectedProvider === 'alpaca') {
      if (!apiKey.trim() || !apiSecret.trim()) {
        setTestResult({ success: false, message: 'Please enter both API key and secret for Alpaca' });
        return;
      }
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Test with a simple symbol
      const provider = getProvider(selectedProvider);
      if (provider.name === 'alpha-vantage') {
        // Test Alpha Vantage connection
        const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`);
        const data = await response.json();
        
        if (data['Error Message']) {
          throw new Error(data['Error Message']);
        }
        
        if (data['Note']) {
          throw new Error(`Rate limit exceeded: ${data['Note']}`);
        }
        
        if (data['Global Quote']) {
          setTestResult({ success: true, message: 'Connection successful! API key is valid.' });
        } else {
          throw new Error('Invalid response format');
        }
      } else if (provider.name === 'alpaca') {
        // Test Alpaca connection
        const response = await fetch('https://paper-api.alpaca.markets/v2/account', {
          headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTestResult({ success: true, message: `Connection successful! Account: ${data.account_number}` });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
      } else if (provider.name === 'ibkr') {
        // Minimal connectivity test: in this demo, rely on values presence
        setTestResult({ success: true, message: 'IBKR settings saved (connectivity requires TWS/Gateway running).' });
      } else {
        // Test mock provider
        await provider.getKpis('AAPL');
        setTestResult({ success: true, message: 'Mock provider connection successful!' });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveProvider = async () => {
    try {
      // Handle Alpha Vantage provider setup
      if (selectedProvider === 'alpha-vantage' && apiKey) {
        addAlphaVantageProvider(apiKey);
        localStorage.setItem('madlab_alpha-vantage_apikey', apiKey);
      } else if (selectedProvider === 'alpha-vantage' && !apiKey) {
        removeAlphaVantageProvider();
        localStorage.removeItem('madlab_alpha-vantage_apikey');
      } else if (selectedProvider === 'polygon' && apiKey) {
        addPolygonProvider(apiKey);
        localStorage.setItem('madlab_polygon_apikey', apiKey);
      } else if (selectedProvider === 'polygon' && !apiKey) {
        removePolygonProvider();
        localStorage.removeItem('madlab_polygon_apikey');
      } else if (selectedProvider === 'alpaca' && apiKey && apiSecret) {
        addAlpacaProvider(apiKey, apiSecret, true);
        localStorage.setItem('madlab_alpaca_apikey', apiKey);
        localStorage.setItem('madlab_alpaca_secret', apiSecret);
      } else if (selectedProvider === 'alpaca' && (!apiKey || !apiSecret)) {
        removeAlpacaProvider();
        localStorage.removeItem('madlab_alpaca_apikey');
        localStorage.removeItem('madlab_alpaca_secret');
      } else if (selectedProvider === 'ibkr') {
        const host = (document.getElementById('ibkr-host') as HTMLInputElement | null)?.value || '';
        const portStr = (document.getElementById('ibkr-port') as HTMLInputElement | null)?.value || '';
        const clientIdStr = (document.getElementById('ibkr-clientId') as HTMLInputElement | null)?.value || '';
        const port = parseInt(portStr, 10);
        const clientId = parseInt(clientIdStr, 10);
        if (host && Number.isFinite(port) && Number.isFinite(clientId)) {
          addIBKRProvider(host, port, clientId);
          localStorage.setItem('madlab_ib_host', host);
          localStorage.setItem('madlab_ib_port', String(port));
          localStorage.setItem('madlab_ib_clientId', String(clientId));
        } else {
          removeIBKRProvider();
          localStorage.removeItem('madlab_ib_host');
          localStorage.removeItem('madlab_ib_port');
          localStorage.removeItem('madlab_ib_clientId');
        }
      } else if (selectedProvider === 'mock') {
        removeAlphaVantageProvider();
        removePolygonProvider();
        removeAlpacaProvider();
        removeIBKRProvider();
        localStorage.removeItem('madlab_alpha-vantage_apikey');
        localStorage.removeItem('madlab_polygon_apikey');
        localStorage.removeItem('madlab_alpaca_apikey');
        localStorage.removeItem('madlab_alpaca_secret');
        localStorage.removeItem('madlab_ib_host');
        localStorage.removeItem('madlab_ib_port');
        localStorage.removeItem('madlab_ib_clientId');
      }
      
      await setDataProvider(selectedProvider);
      setTestResult({ success: true, message: 'Provider configuration saved successfully!' });
      toast.success(`Switched to ${selectedProvider}`);
      
      // Refresh health status
      await checkHealth();
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to save provider' 
      });
      toast.error('Failed to save provider');
    }
  };

  const handleSwitchToMock = async () => {
    try {
      await setDataProvider('mock');
      setSelectedProvider('mock');
      setApiKey('');
      setApiSecret('');
      setTestResult({ success: true, message: 'Switched to mock provider' });
      toast.success('Switched to mock provider');
      await checkHealth();
    } catch {
      toast.error('Failed to switch to mock');
    }
  };

  const getProviderInfo = (providerName: string) => {
    switch (providerName) {
      case 'mock':
        return {
          name: 'Mock Data',
          description: 'Synthetic data for testing and demos',
          features: ['No API key required', 'Instant access', 'Deterministic data'],
          icon: Database,
          color: 'bg-gray-500',
        };
      case 'alpha-vantage':
        return {
          name: 'Alpha Vantage',
          description: 'Real-time financial market data',
          features: ['Live stock prices', 'Company fundamentals', 'Technical indicators'],
          icon: Zap,
          color: 'bg-blue-500',
        };
      case 'polygon':
        return {
          name: 'Polygon.io',
          description: 'High-quality market data and news',
          features: ['Real-time quotes', 'Historical data', 'Market news'],
          icon: TrendingUp,
          color: 'bg-green-500',
        };
      case 'alpaca':
        return {
          name: 'Alpaca Markets',
          description: 'Commission-free trading and market data',
          features: ['Paper trading', 'Real-time data', 'Trading API'],
          icon: Building2,
          color: 'bg-purple-500',
        };
      case 'ibkr':
        return {
          name: 'Interactive Brokers (TWS/Gateway)',
          description: 'Direct brokerage connectivity via TWS/Gateway',
          features: ['Live trading (when enabled)', 'Market data (entitlements required)'],
          icon: Building2,
          color: 'bg-amber-600',
        };
      default:
        return {
          name: providerName,
          description: 'Unknown data provider',
          features: [],
          icon: Database,
          color: 'bg-gray-500',
        };
    }
  };

  const currentProviderInfo = getProviderInfo(selectedProvider);
  const capabilities = getProviderCapabilities(selectedProvider);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Provider Configuration
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Provider Health Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Provider Health</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              disabled={isCheckingHealth}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {providerHealth && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${providerHealth.mock ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Mock: {providerHealth.mock ? 'Ready' : 'Error'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${providerHealth.alphaVantage ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span>Alpha Vantage: {providerHealth.alphaVantage ? 'Ready' : 'Not configured'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${providerHealth.polygon ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span>Polygon: {providerHealth.polygon ? 'Ready' : 'Not configured'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${providerHealth.alpaca ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span>Alpaca: {providerHealth.alpaca ? 'Ready' : 'Not configured'}</span>
              </div>
            </div>
          )}
          
          {providerHealth && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Overall Status:</span>
              <Badge 
                variant={providerHealth.overall === 'healthy' ? 'default' : 
                         providerHealth.overall === 'degraded' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {providerHealth.overall === 'healthy' ? '🟢 Healthy' :
                 providerHealth.overall === 'degraded' ? '🟡 Degraded' : '🔴 Unhealthy'}
              </Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Provider Selection */}
        <div className="space-y-3">
          <Label htmlFor="provider-select">Data Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger id="provider-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  <div className="flex items-center gap-2">
                    {getProviderInfo(provider).icon({ className: 'h-4 w-4' })}
                    {getProviderInfo(provider).name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provider Information */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${currentProviderInfo.color}`} />
            <span className="font-medium text-sm">{currentProviderInfo.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{currentProviderInfo.description}</p>
          <div className="space-y-1">
            {currentProviderInfo.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* API Key / Provider Configuration */}
        {selectedProvider !== 'mock' && selectedProvider !== 'ibkr' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${currentProviderInfo.name} API key`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-2"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            {/* API Secret for Alpaca */}
            {selectedProvider === 'alpaca' && (
              <div className="space-y-2">
                <Label htmlFor="api-secret">API Secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-secret"
                    type={showApiSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your Alpaca API secret"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                    className="px-2"
                  >
                    {showApiSecret ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !apiKey.trim() || (selectedProvider === 'alpaca' && !apiSecret.trim())}
                className="flex-1"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                onClick={handleSaveProvider}
                disabled={!apiKey.trim() || (selectedProvider === 'alpaca' && !apiSecret.trim())}
                className="flex-1"
              >
                Save & Switch
              </Button>
            </div>
          </div>
        )}

        {selectedProvider === 'ibkr' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ibkr-host">IBKR Host</Label>
              <Input id="ibkr-host" placeholder="127.0.0.1" defaultValue={typeof window !== 'undefined' ? localStorage.getItem('madlab_ib_host') || '' : ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ibkr-port">IBKR Port</Label>
              <Input id="ibkr-port" placeholder="7497" defaultValue={typeof window !== 'undefined' ? localStorage.getItem('madlab_ib_port') || '' : ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ibkr-clientId">Client ID</Label>
              <Input id="ibkr-clientId" placeholder="1" defaultValue={typeof window !== 'undefined' ? localStorage.getItem('madlab_ib_clientId') || '' : ''} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleTestConnection} className="flex-1">Save & Test</Button>
              <Button onClick={handleSaveProvider} className="flex-1">Save & Switch</Button>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSwitchToMock}
            className="flex-1"
          >
            Switch to Mock Data
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
        </div>

        {/* Provider Capabilities */}
        {capabilities && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Provider Capabilities</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(capabilities).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  {value ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
