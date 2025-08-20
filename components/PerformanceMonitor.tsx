'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react';
import { 
  globalDataCache, 
  priceCache, 
  financialCache, 
  kpiCache, 
  technicalIndicatorsCache, 
  sentimentCache, 
  newsCache 
} from '@/lib/data/cache';

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  averageTTL: number;
  memoryUsage: number;
  maxMemoryUsage: number;
  compressionRatio: number;
  averageEntrySize: number;
  priorityDistribution: Record<string, number>;
  performanceMetrics?: {
    totalRequests: number;
    averageResponseTime: number;
    evictionCount: number;
    compressionCount: number;
    uptime: number;
    requestsPerSecond: number;
  };
}

interface DetailedPerformanceMetrics {
  cacheEfficiency: number;
  memoryEfficiency: number;
  compressionEfficiency: number;
  responseTimePercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  throughputMetrics: {
    requestsPerSecond: number;
    hitsPerSecond: number;
    missesPerSecond: number;
  };
  resourceUtilization: {
    memoryUsagePercent: number;
    cacheSizePercent: number;
    compressionSavings: number;
  };
}

interface CacheMetrics {
  name: string;
  stats: CacheStats;
  health: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
  performance: DetailedPerformanceMetrics;
}

interface SystemMetrics {
  timestamp: number;
  memoryUsage: number;
  cacheEfficiency: number;
  averageResponseTime: number;
  totalRequests: number;
}

const PerformanceMonitor: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<CacheMetrics[]>([]);
  const [, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);

  const caches = useMemo(() => [
    { name: 'Global Data Cache', instance: globalDataCache },
    { name: 'Price Cache', instance: priceCache },
    { name: 'Financial Cache', instance: financialCache },
    { name: 'KPI Cache', instance: kpiCache },
    { name: 'Technical Indicators Cache', instance: technicalIndicatorsCache },
    { name: 'Sentiment Cache', instance: sentimentCache },
    { name: 'News Cache', instance: newsCache },
  ], []);

  const collectMetrics = useCallback(() => {
    const newMetrics = caches.map(({ name, instance }: { name: string; instance: any }) => ({
      name,
      stats: instance.getStats(),
      health: instance.getHealthStatus(),
      performance: instance.getDetailedPerformanceMetrics(),
    }));

    setMetrics(newMetrics);
    setLastUpdate(new Date());

    // Add system-level metrics
    const totalMemoryUsage = newMetrics.reduce((sum: number, m: any) => sum + m.stats.memoryUsage, 0);
    const totalMaxMemory = newMetrics.reduce((sum: number, m: any) => sum + m.stats.maxMemoryUsage, 0);
    const averageHitRate = newMetrics.reduce((sum: number, m: any) => sum + m.stats.hitRate, 0) / newMetrics.length;
    const totalRequests = newMetrics.reduce((sum: number, m: any) => sum + (m.stats.performanceMetrics?.totalRequests || 0), 0);
    const averageResponseTime = newMetrics.reduce((sum: number, m: any) => sum + (m.stats.performanceMetrics?.averageResponseTime || 0), 0) / newMetrics.length;

    setSystemMetrics(prev => [...prev.slice(-50), {
      timestamp: Date.now(),
      memoryUsage: totalMemoryUsage / totalMaxMemory,
      cacheEfficiency: averageHitRate,
      averageResponseTime,
      totalRequests,
    }]);
  }, [caches]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    collectMetrics();
    const interval = setInterval(collectMetrics, 2000); // Update every 2 seconds
    setMonitoringInterval(interval);
  }, [collectMetrics]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  }, [monitoringInterval]);

  const resetMetrics = useCallback(() => {
    caches.forEach(({ instance }: { name: string; instance: any }) => instance.resetMetrics());
    setSystemMetrics([]);
    collectMetrics();
  }, [caches, collectMetrics]);

  useEffect(() => {
    collectMetrics();
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, [collectMetrics, monitoringInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatTime = (ms: number) => `${ms.toFixed(2)}ms`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of cache performance and system metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className="flex items-center gap-2"
          >
            {isMonitoring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          <Button
            variant="outline"
            onClick={resetMetrics}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Metrics
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Overview
          </CardTitle>
          <CardDescription>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Total Memory Usage</span>
                <span className="font-mono">
                  {formatBytes(metrics.reduce((sum, m) => sum + m.stats.memoryUsage, 0))}
                </span>
              </div>
              <Progress 
                value={metrics.reduce((sum, m) => sum + m.stats.memoryUsage, 0) / 
                       metrics.reduce((sum, m) => sum + m.stats.maxMemoryUsage, 0) * 100} 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Average Hit Rate</span>
                <span className="font-mono">
                  {formatPercentage(metrics.reduce((sum, m) => sum + m.stats.hitRate, 0) / metrics.length)}
                </span>
              </div>
              <Progress 
                value={metrics.reduce((sum, m) => sum + m.stats.hitRate, 0) / metrics.length * 100} 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Total Requests</span>
                <span className="font-mono">
                  {metrics.reduce((sum, m) => sum + (m.stats.performanceMetrics?.totalRequests || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Avg Response Time</span>
                <span className="font-mono">
                  {formatTime(metrics.reduce((sum, m) => sum + (m.stats.performanceMetrics?.averageResponseTime || 0), 0) / metrics.length)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="health">Health Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {metrics.map((cache) => (
              <Card key={cache.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cache.name}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(cache.health.status)} text-white`}
                    >
                      {cache.health.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2 font-mono">{cache.stats.size}/{cache.stats.maxSize}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hit Rate:</span>
                      <span className="ml-2 font-mono">{formatPercentage(cache.stats.hitRate)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Memory:</span>
                      <span className="ml-2 font-mono">{formatBytes(cache.stats.memoryUsage)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">TTL:</span>
                      <span className="ml-2 font-mono">{Math.round(cache.stats.averageTTL / 1000)}s</span>
                    </div>
                  </div>
                  {cache.stats.performanceMetrics && (
                    <div className="pt-2 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Requests:</span>
                          <span className="ml-2 font-mono">{cache.stats.performanceMetrics.totalRequests.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Response:</span>
                          <span className="ml-2 font-mono">{formatTime(cache.stats.performanceMetrics.averageResponseTime)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {metrics.map((cache) => (
            <Card key={cache.name}>
              <CardHeader>
                <CardTitle>{cache.name} - Detailed Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Performance Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Cache Efficiency:</span>
                        <span className="font-mono">{formatPercentage(cache.performance.cacheEfficiency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory Efficiency:</span>
                        <span className="font-mono">{formatPercentage(cache.performance.memoryEfficiency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Compression Savings:</span>
                        <span className="font-mono">{formatPercentage(cache.performance.compressionEfficiency)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Response Time Percentiles</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>P50:</span>
                        <span className="font-mono">{formatTime(cache.performance.responseTimePercentiles.p50)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>P90:</span>
                        <span className="font-mono">{formatTime(cache.performance.responseTimePercentiles.p90)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>P95:</span>
                        <span className="font-mono">{formatTime(cache.performance.responseTimePercentiles.p95)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>P99:</span>
                        <span className="font-mono">{formatTime(cache.performance.responseTimePercentiles.p99)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Throughput</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Requests/sec:</span>
                        <span className="font-mono">{cache.performance.throughputMetrics.requestsPerSecond.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hits/sec:</span>
                        <span className="font-mono">{cache.performance.throughputMetrics.hitsPerSecond.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Misses/sec:</span>
                        <span className="font-mono">{cache.performance.throughputMetrics.missesPerSecond.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {metrics.map((cache) => (
            <Card key={cache.name}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {getStatusIcon(cache.health.status)}
                  <CardTitle>{cache.name} - Health Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(cache.health.status)} text-white`}
                    >
                      {cache.health.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {cache.health.issues.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div><strong>Issues Found:</strong></div>
                          <ul className="list-disc list-inside space-y-1">
                            {cache.health.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {cache.health.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-semibold">Recommendations:</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {cache.health.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {cache.health.issues.length === 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>All systems operational</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMonitor;
