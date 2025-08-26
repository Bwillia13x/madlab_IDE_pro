'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  TrendingUp,
  Building2,
  Info,
  Settings,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { getProviderStats } from '@/lib/data/providers';

interface DemoBannerProps {
  className?: string;
}

export function DemoBanner({ className }: DemoBannerProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { dataProvider, setSettingsOpen } = useWorkspaceStore();
  const [providerStats, setProviderStats] = useState<any>(null);

  // Get provider stats when component mounts
  useState(() => {
    const stats = getProviderStats();
    setProviderStats(stats);
  });

  // Only show banner if using mock data
  if (dataProvider !== 'mock') {
    return null;
  }

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const getProviderInfo = (providerName: string) => {
    switch (providerName) {
      case 'alpha-vantage':
        return {
          name: 'Alpha Vantage',
          description: 'Real-time financial market data',
          features: ['Live stock prices', 'Company fundamentals', 'Technical indicators'],
          icon: Zap,
          color: 'bg-blue-500',
          url: 'https://www.alphavantage.co/support/#api-key',
          pricing: 'Free tier available'
        };
      case 'polygon':
        return {
          name: 'Polygon.io',
          description: 'High-quality market data and news',
          features: ['Real-time quotes', 'Historical data', 'Market news'],
          icon: TrendingUp,
          color: 'bg-green-500',
          url: 'https://polygon.io/pricing',
          pricing: 'Free tier available'
        };
      case 'alpaca':
        return {
          name: 'Alpaca Markets',
          description: 'Commission-free trading and market data',
          features: ['Paper trading', 'Real-time data', 'Trading API'],
          icon: Building2,
          color: 'bg-purple-500',
          url: 'https://alpaca.markets/',
          pricing: 'Free tier available'
        };
      default:
        return null;
    }
  };

  const availableProviders = ['alpha-vantage', 'polygon', 'alpaca'];

  return (
    <div className={className}>
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Demo Mode Active</span>
              <Badge variant="outline" className="text-xs">Mock Data</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-7 px-2 text-xs"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button
                size="sm"
                onClick={handleOpenSettings}
                className="h-7 px-2 text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                Enable Real Data
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {showDetails && (
        <Card className="mt-3 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800">Demo Mode Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-blue-700">
              <p className="mb-2">
                You're currently using synthetic data for demonstration purposes. To access real financial data:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Get free API keys from supported data providers</li>
                <li>Configure your API keys in Settings → Data</li>
                <li>Enjoy real-time market data and live trading capabilities</li>
              </ul>
            </div>

            <Separator className="border-blue-200" />

            {/* Available Providers */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-800">Available Data Providers</h4>
              <div className="grid gap-3">
                {availableProviders.map((providerName) => {
                  const info = getProviderInfo(providerName);
                  if (!info) return null;

                  return (
                    <div key={providerName} className="flex items-start gap-3 p-3 bg-white/50 rounded-lg border border-blue-200">
                      <div className={`w-8 h-8 rounded-lg ${info.color} flex items-center justify-center flex-shrink-0`}>
                        <info.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm">{info.name}</h5>
                          <Badge variant="outline" className="text-xs">{info.pricing}</Badge>
                        </div>
                        <p className="text-xs text-blue-700 mb-2">{info.description}</p>
                        <div className="space-y-1">
                          {info.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-blue-600">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {feature}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(info.url, '_blank')}
                            className="h-6 px-2 text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Get API Key
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator className="border-blue-200" />

            {/* Current Status */}
            {providerStats && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-800">Current Status</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 bg-white/50 rounded border border-blue-200">
                    <span>Total Providers</span>
                    <Badge variant="outline" className="text-xs">{providerStats.total}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/50 rounded border border-blue-200">
                    <span>Real Providers</span>
                    <Badge variant="outline" className="text-xs">{providerStats.real}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/50 rounded border border-blue-200">
                    <span>Current</span>
                    <Badge variant="outline" className="text-xs capitalize">{providerStats.current}</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleOpenSettings}
                className="flex-1"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Open Data Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDetails(false)}
                className="flex-1"
                size="sm"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}