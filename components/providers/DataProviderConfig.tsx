'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Key, Shield, Zap, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { getAvailableProviders, getProvider, addAlphaVantageProvider, removeAlphaVantageProvider, getProviderCapabilities } from '@/lib/data/providers';
import { toast } from 'sonner';

interface DataProviderConfigProps {
  onClose?: () => void;
}

export function DataProviderConfig({ onClose }: DataProviderConfigProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('mock');
  const [apiKey, setApiKey] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [status, setStatus] = useState<'ok' | 'warn' | 'error'>('ok');
  const [statusMsg, setStatusMsg] = useState('');
  
  const { dataProvider, setDataProvider } = useWorkspaceStore();
  const availableProviders = getAvailableProviders();

  useEffect(() => {
    setSelectedProvider(dataProvider);
    // probe provider status
    const run = async () => {
      try {
        const p = getProvider(dataProvider);
        const [avail, auth] = await Promise.all([p.isAvailable(), p.isAuthenticated()]);
        if (avail && auth) { setStatus('ok'); setStatusMsg('Ready'); }
        else if (avail && !auth) { setStatus('warn'); setStatusMsg('Available, authentication required'); }
        else { setStatus('error'); setStatusMsg('Unavailable'); }
      } catch {
        setStatus('error'); setStatusMsg('Error probing provider');
      }
    };
    run();
  }, [dataProvider]);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
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
      } else if (selectedProvider === 'mock') {
        removeAlphaVantageProvider();
        localStorage.removeItem('madlab_alpha-vantage_apikey');
      }
      
      await setDataProvider(selectedProvider);
      setTestResult({ success: true, message: 'Provider configuration saved successfully!' });
      toast.success(`Switched to ${selectedProvider}`);
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
      setTestResult({ success: true, message: 'Switched to mock provider' });
      toast.success('Switched to mock provider');
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
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label>Select Data Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.map(provider => {
                const info = getProviderInfo(provider);
                return (
                  <SelectItem key={provider} value={provider}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${info.color}`} />
                      {info.name}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Provider Information */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${currentProviderInfo.color} flex items-center justify-center`}>
                <currentProviderInfo.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{currentProviderInfo.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentProviderInfo.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentProviderInfo.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Key Configuration */}
        {selectedProvider !== 'mock' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Key
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-api-key"
                  checked={showApiKey}
                  onCheckedChange={setShowApiKey}
                />
                <Label htmlFor="show-api-key" className="text-xs">Show</Label>
              </div>
            </div>
            
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="pr-20"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting || !apiKey.trim()}
                className="absolute right-1 top-1 h-7 px-2"
              >
                {isTesting ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never shared. 
              <Shield className="h-3 w-3 inline ml-1" />
            </p>
          </div>
        )}

        {/* Test Results */}
        {testResult && (
          <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveProvider}
            disabled={selectedProvider !== 'mock' && !apiKey.trim()}
            className="flex-1"
          >
            Save Configuration
          </Button>
          <Button
            variant="secondary"
            onClick={handleSwitchToMock}
            className="flex-1"
          >
            Switch to Mock
          </Button>
        </div>

        {/* Current Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Provider:</span>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getProviderInfo(dataProvider).color}`} />
              {getProviderInfo(dataProvider).name}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={status === 'ok' ? 'default' : status === 'warn' ? 'secondary' : 'destructive'}>{statusMsg}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>Capabilities</span>
            <div className="flex gap-2">
              <Badge variant={capabilities.realtime ? 'default' : 'outline'}>Realtime</Badge>
              <Badge variant={capabilities.historical ? 'default' : 'outline'}>Historical</Badge>
              <Badge variant={capabilities.trading ? 'default' : 'outline'}>Trading</Badge>
              <Badge variant={capabilities.options ? 'default' : 'outline'}>Options</Badge>
              <Badge variant={capabilities.crypto ? 'default' : 'outline'}>Crypto</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
