'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  Zap, 
  TrendingUp, 
  Building2, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Activity,
  BarChart3,
  TrendingDown
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { 
  getProviderStats, 
  getProviderHealth, 
  autoSwitchToBestProvider,
  getProviderCapabilities 
} from '@/lib/data/providers';
import { checkProviderHealth } from '@/lib/data/init';
import { toast } from 'sonner';

interface ProviderStatusProps {
  className?: string;
}

export function DataProviderStatus({ className }: ProviderStatusProps) {
  const [providerStats, setProviderStats] = useState<any>(null);
  const [providerHealth, setProviderHealth] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);
  
  const { dataProvider } = useWorkspaceStore();

  useEffect(() => {
    refreshStatus();
  }, [dataProvider]);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const [stats, health] = await Promise.all([
        getProviderStats(),
        checkProviderHealth()
      ]);
      setProviderStats(stats);
      setProviderHealth(health);
    } catch (error) {
      console.error('Failed to refresh provider status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAutoSwitch = async () => {
    try {
      const bestProvider = await autoSwitchToBestProvider();
      if (bestProvider !== dataProvider) {
        toast.success(`Auto-switched to best provider: ${bestProvider}`);
        await refreshStatus();
      } else {
        toast.info('Already using the best available provider');
      }
    } catch (error) {
      toast.error('Auto-switch failed');
      console.error('Auto-switch error:', error);
    }
  };

  const getProviderIcon = (providerName: string) => {
    switch (providerName) {
      case 'mock':
        return Database;
      case 'alpha-vantage':
        return Zap;
      case 'polygon':
        return TrendingUp;
      case 'alpaca':
        return Building2;
      default:
        return Database;
    }
  };

  const getProviderColor = (providerName: string) => {
    switch (providerName) {
      case 'mock':
        return 'bg-gray-500';
      case 'alpha-vantage':
        return 'bg-blue-500';
      case 'polygon':
        return 'bg-green-500';
      case 'alpaca':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getHealthStatus = (overall: string) => {
    switch (overall) {
      case 'healthy':
        return { color: 'text-green-600', icon: CheckCircle, label: 'Healthy' };
      case 'degraded':
        return { color: 'text-yellow-600', icon: AlertCircle, label: 'Degraded' };
      case 'unhealthy':
        return { color: 'text-red-600', icon: AlertCircle, label: 'Unhealthy' };
      default:
        return { color: 'text-gray-600', icon: AlertCircle, label: 'Unknown' };
    }
  };

  const getConnectionStatus = (providerName: string) => {
    if (providerName === 'mock') {
      return { status: 'connected', icon: Wifi, color: 'text-green-600', label: 'Mock Data' };
    }
    
    if (providerHealth && providerHealth[providerName]) {
      const health = providerHealth[providerName];
      if (health) {
        return { status: 'connected', icon: Wifi, color: 'text-green-600', label: 'Connected' };
      } else {
        return { status: 'disconnected', icon: WifiOff, color: 'text-red-600', label: 'Disconnected' };
      }
    }
    
    return { status: 'unknown', icon: WifiOff, color: 'text-gray-600', label: 'Unknown' };
  };

  if (!providerStats || !providerHealth) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Data Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentProviderHealth = providerHealth.overall;
  const healthStatus = getHealthStatus(currentProviderHealth);
  const connectionStatus = getConnectionStatus(dataProvider);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Data Provider Status</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Health Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Overall Health</span>
            <Badge 
              variant={currentProviderHealth === 'healthy' ? 'default' : 
                       currentProviderHealth === 'degraded' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              <healthStatus.icon className="h-3 w-3 mr-1" />
              {healthStatus.label}
            </Badge>
          </div>
          
          <Progress 
            value={currentProviderHealth === 'healthy' ? 100 : 
                   currentProviderHealth === 'degraded' ? 60 : 20} 
            className="h-2"
          />
        </div>

        <Separator />

        {/* Current Provider */}
        <div className="space-y-2">
          <span className="text-xs font-medium">Current Provider</span>
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${getProviderColor(dataProvider)}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {getProviderIcon(dataProvider)({ className: 'h-4 w-4' })}
                <span className="text-sm font-medium capitalize">
                  {dataProvider === 'alpha-vantage' ? 'Alpha Vantage' : 
                   dataProvider === 'ibkr' ? 'Interactive Brokers' :
                   dataProvider === 'ibkr-real' ? 'IBKR Real' :
                   dataProvider}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <connectionStatus.icon className={`h-3 w-3 ${connectionStatus.color}`} />
                <span className={`text-xs ${connectionStatus.color}`}>
                  {connectionStatus.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Provider Statistics */}
        <div className="space-y-2">
          <span className="text-xs font-medium">Provider Statistics</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
              <span>Total Providers</span>
              <Badge variant="outline" className="text-xs">{providerStats.total}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
              <span>Real Providers</span>
              <Badge variant="outline" className="text-xs">{providerStats.real}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
              <span>Healthy</span>
              <Badge variant="outline" className="text-xs">{providerStats.healthy}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
              <span>Mock</span>
              <Badge variant="outline" className="text-xs">{providerStats.mock}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Provider Health Details */}
        <div className="space-y-2">
          <span className="text-xs font-medium">Provider Health Details</span>
          <div className="space-y-1">
            {Object.entries(providerHealth).map(([providerName, health]) => {
              if (providerName === 'overall') return null;
              
              const isHealthy = health as boolean;
              const Icon = getProviderIcon(providerName);
              const color = getProviderColor(providerName);
              
              return (
                <div key={providerName} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <Icon className="h-3 w-3" />
                    <span className="text-xs capitalize">
                      {providerName === 'alpha-vantage' ? 'Alpha Vantage' : 
                       providerName === 'ibkr' ? 'IBKR' :
                       providerName === 'ibkr-real' ? 'IBKR Real' :
                       providerName}
                    </span>
                  </div>
                  <Badge 
                    variant={isHealthy ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {isHealthy ? 'Ready' : 'Not Configured'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Auto-Switch Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Auto-Switch</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoSwitch}
              disabled={isRefreshing}
              className="h-7 px-2 text-xs"
            >
              <Activity className="h-3 w-3 mr-1" />
              Auto-Switch
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically switch to the best available provider based on capabilities and health.
          </p>
        </div>

        {/* Current Provider Capabilities */}
        {dataProvider !== 'mock' && (
          <>
            <Separator />
            <div className="space-y-2">
              <span className="text-xs font-medium">Current Provider Capabilities</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(getProviderCapabilities(dataProvider)).map(([capability, available]) => (
                  <div key={capability} className="flex items-center gap-2">
                    {available ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-gray-400" />
                    )}
                    <span className="capitalize">{capability.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
