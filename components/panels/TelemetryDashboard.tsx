'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity, Brain, TrendingUp, AlertTriangle, Clock, BarChart3, LineChart, Zap, Shield, Database, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTelemetry, getHistory, clearTelemetry, clearHistory } from '@/lib/utils/errorLogger';
import { advancedAgent } from '@/lib/ai/advancedAgent';
import { useWorkspaceStore } from '@/lib/store';
import { rateLimiter } from '@/lib/enterprise/rateLimiter';
import { authManager } from '@/lib/enterprise/auth';
import { errorHandler } from '@/lib/enterprise/errorHandler';
import { performanceOptimizer } from '@/lib/enterprise/performance';
import { highFrequencyHandler } from '@/lib/data/highFrequencyHandler';
import { multiExchangeAggregator } from '@/lib/data/multiExchangeAggregator';

interface TelemetryMetrics {
  totalEvents: number;
  successRate: number;
  averageResponseTime: number;
  topActions: Array<{ action: string; count: number; successRate: number }>;
  recentErrors: Array<{ message: string; timestamp: number; context: string }>;
  performanceTrends: Array<{ timestamp: number; successRate: number; responseTime: number }>;
}

export function TelemetryDashboard() {
  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    totalEvents: 0,
    successRate: 0,
    averageResponseTime: 0,
    topActions: [],
    recentErrors: [],
    performanceTrends: [],
  });
  const [memoryStats, setMemoryStats] = useState<{
    total: number;
    byType: Record<string, number>;
    byImportance: Record<string, number>;
    averageAge: number;
  } | null>(null);
  const [rateLimitStats, setRateLimitStats] = useState<any>(null);
  const [authStats, setAuthStats] = useState<any>(null);
  const [errorStats, setErrorStats] = useState<any>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval] = useState(5000); // 5 seconds
  const { dataProvider, globalSymbol } = useWorkspaceStore();
  const prevHftTotal = useRef(0);
  const [hftRate, setHftRate] = useState(0);
  const [hftStats, setHftStats] = useState<{ totalMessages: number; compressedMessages: number; averageProcessingTime: number }>({ totalMessages: 0, compressedMessages: 0, averageProcessingTime: 0 });
  const [aggregatorPerf, setAggregatorPerf] = useState<{ totalSymbols: number; totalExchanges: number; averageConfidence: number; dataUpdateRate: number }>({ totalSymbols: 0, totalExchanges: 0, averageConfidence: 0, dataUpdateRate: 0 });

  // Refresh metrics periodically
  useEffect(() => {
    const interval = setInterval(refreshMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Initial load
  useEffect(() => {
    refreshMetrics();
  }, []);

  const refreshMetrics = () => {
    const telemetry = getTelemetry(1000);
    const history = getHistory(100);
    const stats = advancedAgent.getMemoryStats();

    // Get enterprise system stats
    const rateLimitStats = rateLimiter.getStats();
    const authStats = authManager.getAuthStats();
    const errorStats = errorHandler.getErrorStats();
    const performanceStats = performanceOptimizer.getCacheStats();
    const hft = highFrequencyHandler.getPerformanceMetrics();
    const aggPerf = multiExchangeAggregator.getPerformanceStats();
    const prev = prevHftTotal.current;
    const msgs = hft.totalMessages;
    const secs = refreshInterval / 1000;
    setHftRate(Math.max(0, (msgs - prev) / (secs || 1)));
    prevHftTotal.current = msgs;

    // Calculate metrics
    const totalEvents = telemetry.length;
    const successfulEvents = telemetry.filter(e => e.success).length;
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;
    
    const responseTimes = telemetry.filter(e => e.duration).map(e => e.duration!);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Group by action
    const actionMap = new Map<string, { count: number; success: number }>();
    telemetry.forEach(event => {
      const existing = actionMap.get(event.action) || { count: 0, success: 0 };
      existing.count++;
      if (event.success) existing.success++;
      actionMap.set(event.action, existing);
    });

    const topActions = Array.from(actionMap.entries())
      .map(([action, stats]) => ({
        action,
        count: stats.count,
        successRate: (stats.success / stats.count) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent errors
    const recentErrors = history
      .filter(entry => entry.level === 'error')
      .slice(0, 5)
      .map(entry => ({
        message: entry.message,
        timestamp: entry.timestamp,
        context: JSON.stringify(entry.context || {}),
      }));

    // Performance trends (last 20 events)
    const performanceTrends = telemetry
      .slice(-20)
      .map(event => ({
        timestamp: event.timestamp,
        successRate: event.success ? 100 : 0,
        responseTime: event.duration || 0,
      }));

    setMetrics({
      totalEvents,
      successRate,
      averageResponseTime,
      topActions,
      recentErrors,
      performanceTrends,
    });

    setMemoryStats(stats);
    setRateLimitStats(rateLimitStats);
    setAuthStats(authStats);
    setErrorStats(errorStats);
    setPerformanceStats(performanceStats);
    setHftStats({ totalMessages: hft.totalMessages, compressedMessages: hft.compressedMessages, averageProcessingTime: hft.averageProcessingTime });
    setAggregatorPerf(aggPerf);
  };

  const handleClearData = (type: 'telemetry' | 'history' | 'memory') => {
    switch (type) {
      case 'telemetry':
        clearTelemetry();
        break;
      case 'history':
        clearHistory();
        break;
      case 'memory':
        advancedAgent.clearMemory();
        break;
    }
    refreshMetrics();
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceColor = (rate: number): string => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full h-full bg-[#1e1e1e] text-[#cccccc] overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-400" />
              System Telemetry Dashboard
            </h1>
            <p className="text-[#969696] mt-1">
              Real-time monitoring of system performance, agent metrics, and memory usage
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              Provider: {dataProvider}
            </Badge>
            {globalSymbol && (
              <Badge variant="outline" className="text-xs">
                Symbol: {globalSymbol}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshMetrics}
              className="text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metrics.totalEvents.toLocaleString()}</div>
              <p className="text-xs text-[#969696] mt-1">All tracked events</p>
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getSuccessRateColor(metrics.successRate)}`}>
                {metrics.successRate.toFixed(1)}%
              </div>
              <Progress
                value={metrics.successRate}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatDuration(metrics.averageResponseTime)}
              </div>
              <p className="text-xs text-[#969696] mt-1">Agent interactions</p>
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                Memory Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {memoryStats?.total || 0}
              </div>
              <p className="text-xs text-[#969696] mt-1">Agent memory entries</p>
            </CardContent>
          </Card>
        </div>

        {/* Enterprise System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                Rate Limit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {rateLimitStats?.totalRequests || 0}
              </div>
              <p className="text-xs text-[#969696] mt-1">Total requests</p>
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {authStats?.activeUsers || 0}
              </div>
              <p className="text-xs text-[#969696] mt-1">Authenticated sessions</p>
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {errorStats?.recoveryRate || 0}%
              </div>
              <p className="text-xs text-[#969696] mt-1">Auto-recovery rate</p>
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Cache Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {performanceStats?.hitRate || 0}%
              </div>
              <p className="text-xs text-[#969696] mt-1">Performance cache</p>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Data Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                HFT Throughput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{hftRate.toFixed(0)}</div>
              <p className="text-xs text-[#969696] mt-1">Messages/sec</p>
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                HFT Avg Proc
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{hftStats.averageProcessingTime.toFixed(1)}ms</div>
              <p className="text-xs text-[#969696] mt-1">Batch processing time</p>
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Avg Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{(aggregatorPerf.averageConfidence * 100).toFixed(1)}%</div>
              <p className="text-xs text-[#969696] mt-1">Multi-exchange</p>
            </CardContent>
          </Card>

          <Card className="bg-[#252526] border-[#2d2d30]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#cccccc] flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-400" />
                Symbols Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{aggregatorPerf.totalSymbols}</div>
              <p className="text-xs text-[#969696] mt-1">Across {aggregatorPerf.totalExchanges} exchanges</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[#252526] border-[#2d2d30]">
            <TabsTrigger value="overview" className="text-[#cccccc]">Overview</TabsTrigger>
            <TabsTrigger value="performance" className="text-[#cccccc]">Performance</TabsTrigger>
            <TabsTrigger value="memory" className="text-[#cccccc]">Memory</TabsTrigger>
            <TabsTrigger value="errors" className="text-[#cccccc]">Errors</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Actions */}
              <Card className="bg-[#252526] border-[#2d2d30]">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    Top Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.topActions.map((action, index) => (
                      <div key={action.action} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="text-sm font-medium text-[#cccccc]">
                            {action.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#969696]">
                            {action.count} calls
                          </span>
                          <span className={`text-xs font-medium ${getSuccessRateColor(action.successRate)}`}>
                            {action.successRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="bg-[#252526] border-[#2d2d30]">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-400" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#cccccc]">Data Provider</span>
                      <Badge variant="outline" className="text-xs">
                        {dataProvider || 'None'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#cccccc]">Active Symbol</span>
                      <Badge variant="outline" className="text-xs">
                        {globalSymbol || 'None'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#cccccc]">Memory Health</span>
                      <Badge
                        variant={memoryStats && memoryStats.total > 50 ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {memoryStats && memoryStats.total > 50 ? 'High' : 'Normal'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#cccccc]">Performance</span>
                      <Badge 
                        variant={metrics.successRate < 80 ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {metrics.successRate < 80 ? 'Degraded' : 'Optimal'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-6">
            <Card className="bg-[#252526] border-[#2d2d30]">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-green-400" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.performanceTrends.length > 0 ? (
                    <div className="space-y-3">
                      {metrics.performanceTrends.slice(-10).map((trend, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#2d2d30] rounded">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#969696]">
                              {formatTimestamp(trend.timestamp)}
                            </span>
                            <span className={`text-xs font-medium ${getSuccessRateColor(trend.successRate)}`}>
                              {trend.successRate}% success
                            </span>
                          </div>
                          <span className="text-xs text-[#cccccc]">
                            {formatDuration(trend.responseTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#969696]">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No performance data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memory Tab */}
          <TabsContent value="memory" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Memory Statistics */}
              <Card className="bg-[#252526] border-[#2d2d30]">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    Memory Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {memoryStats ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#cccccc]">Total Items</span>
                        <span className="text-lg font-bold text-white">{memoryStats?.total || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#cccccc]">Average Age</span>
                        <span className="text-sm text-[#cccccc]">
                          {memoryStats ? formatDuration(memoryStats.averageAge) : 'N/A'}
                        </span>
                      </div>
                      
                      {/* Memory by Type */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-[#cccccc]">By Type:</span>
                        {Object.entries(memoryStats.byType || {}).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-xs text-[#969696] capitalize">
                              {type.replace(/_/g, ' ')}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {count as number}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* Memory by Importance */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-[#cccccc]">By Importance:</span>
                        {Object.entries(memoryStats.byImportance || {}).map(([importance, count]) => (
                          <div key={importance} className="flex items-center justify-between">
                            <span className="text-xs text-[#969696] capitalize">
                              {importance}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {count as number}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#969696]">
                      <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No memory data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Memory Actions */}
              <Card className="bg-[#252526] border-[#2d2d30]">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-400" />
                    Memory Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={() => handleClearData('memory')}
                      className="w-full"
                    >
                      Clear Agent Memory
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleClearData('telemetry')}
                      className="w-full"
                    >
                      Clear Telemetry Data
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleClearData('history')}
                      className="w-full"
                    >
                      Clear Error History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="mt-6">
            <Card className="bg-[#252526] border-[#2d2d30]">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.recentErrors.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.recentErrors.map((error, index) => (
                      <div key={index} className="p-3 bg-[#2d2d30] rounded border-l-4 border-red-500">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white mb-1">
                              {error.message}
                            </p>
                            <p className="text-xs text-[#969696] mb-2">
                              {error.context}
                            </p>
                            <span className="text-xs text-[#969696]">
                              {formatTimestamp(error.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#969696]">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No errors reported</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
