'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Date range picker not available, using Select for time range instead
import {
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  Clock,
  Download,
  Share2,
  Filter,
  Calendar,
  PieChart,
  LineChart,
  Target,
  Zap,
  Eye,
  MousePointer
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { usePerformanceMonitoring } from '@/lib/performance/enhanced-performance-monitor';
import { useEnhancedAgent } from '@/lib/ai/enhancedAgent';

interface AnalyticsData {
  timeRange: {
    start: Date;
    end: Date;
  };
  platformMetrics: {
    totalUsers: number;
    activeUsers: number;
    sessionDuration: number;
    pageViews: number;
    uniqueVisitors: number;
    bounceRate: number;
  };
  widgetMetrics: {
    totalWidgets: number;
    mostUsedWidgets: Array<{
      type: string;
      count: number;
      avgRenderTime: number;
    }>;
    widgetErrors: Array<{
      widgetType: string;
      errorCount: number;
      lastError: Date;
    }>;
    widgetPerformance: Array<{
      widgetType: string;
      avgLoadTime: number;
      avgRenderTime: number;
      errorRate: number;
    }>;
  };
  userBehavior: {
    popularActions: Array<{
      action: string;
      count: number;
      avgTimeSpent: number;
    }>;
    userFlows: Array<{
      flow: string;
      conversion: number;
      dropOff: number;
    }>;
    featureAdoption: Array<{
      feature: string;
      adoptionRate: number;
      lastUsed: Date;
    }>;
  };
  performanceMetrics: {
    coreWebVitals: {
      cls: number;
      fid: number;
      lcp: number;
      fcp: number;
    };
    customMetrics: {
      avgWidgetLoadTime: number;
      avgDataFetchTime: number;
      cacheHitRate: number;
      errorRate: number;
    };
  };
}

interface DashboardProps {
  data: AnalyticsData;
  onExport?: (format: 'pdf' | 'csv' | 'json') => void;
  onShare?: () => void;
  onTimeRangeChange?: (range: { start: Date; end: Date }) => void;
}

export function AdvancedAnalyticsDashboard({
  data,
  onExport,
  onShare,
  onTimeRangeChange
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { metrics, cacheStats, getPerformanceScore } = usePerformanceMonitoring();
  const { processQuery } = useEnhancedAgent();

  // Time range options
  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    return {
      userEngagement: (data.platformMetrics.activeUsers / data.platformMetrics.totalUsers) * 100,
      avgSessionDuration: data.platformMetrics.sessionDuration,
      widgetsPerUser: data.widgetMetrics.totalWidgets / data.platformMetrics.totalUsers,
      performanceScore: getPerformanceScore(),
      topWidget: data.widgetMetrics.mostUsedWidgets[0]?.type || 'N/A',
      errorRate: data.widgetMetrics.widgetErrors.reduce((sum, err) => sum + err.errorCount, 0) / data.widgetMetrics.totalWidgets
    };
  }, [data, getPerformanceScore]);

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setSelectedTimeRange(value as '7d' | '30d' | '90d' | '1y');
    const now = new Date();
    let start: Date;

    switch (value) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    onTimeRangeChange?.({ start, end: now });
  };

  return (
    <div className="w-full h-full bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into platform usage and performance
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedTimeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          <Button variant="outline" onClick={() => onExport?.('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.platformMetrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.platformMetrics.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Engagement</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{derivedMetrics.userEngagement.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {data.platformMetrics.sessionDuration}m avg session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{derivedMetrics.performanceScore}</div>
            <p className="text-xs text-muted-foreground">
              Core Web Vitals: {metrics.cls.toFixed(3)} CLS
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Widget Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.widgetMetrics.totalWidgets}</div>
            <p className="text-xs text-muted-foreground">
              {derivedMetrics.widgetsPerUser.toFixed(1)} per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="widgets">Widgets</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Page Views</span>
                  <Badge variant="secondary">{data.platformMetrics.pageViews.toLocaleString()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Unique Visitors</span>
                  <Badge variant="secondary">{data.platformMetrics.uniqueVisitors.toLocaleString()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bounce Rate</span>
                  <Badge variant="secondary">{data.platformMetrics.bounceRate.toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Most Popular Widget</span>
                  <Badge variant="outline">{derivedMetrics.topWidget}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Core Web Vitals */}
            <Card>
              <CardHeader>
                <CardTitle>Core Web Vitals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Largest Contentful Paint</span>
                    <span className={`text-sm font-medium ${
                      data.performanceMetrics.coreWebVitals.lcp < 1000 ? 'text-green-600' :
                      data.performanceMetrics.coreWebVitals.lcp < 2500 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {data.performanceMetrics.coreWebVitals.lcp}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">First Input Delay</span>
                    <span className={`text-sm font-medium ${
                      data.performanceMetrics.coreWebVitals.fid < 100 ? 'text-green-600' :
                      data.performanceMetrics.coreWebVitals.fid < 300 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {data.performanceMetrics.coreWebVitals.fid}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cumulative Layout Shift</span>
                    <span className={`text-sm font-medium ${
                      data.performanceMetrics.coreWebVitals.cls < 0.1 ? 'text-green-600' :
                      data.performanceMetrics.coreWebVitals.cls < 0.25 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {data.performanceMetrics.coreWebVitals.cls.toFixed(3)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Popular Actions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Popular Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.userBehavior.popularActions.slice(0, 5).map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{action.action}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{action.count} uses</span>
                        <span>{action.avgTimeSpent}s avg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Widgets Tab */}
        <TabsContent value="widgets" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Used Widgets */}
            <Card>
              <CardHeader>
                <CardTitle>Most Used Widgets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.widgetMetrics.mostUsedWidgets.map((widget, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{widget.type}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="secondary">{widget.count} uses</Badge>
                        <span className="text-muted-foreground">{widget.avgRenderTime}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Widget Errors */}
            <Card>
              <CardHeader>
                <CardTitle>Widget Errors</CardTitle>
              </CardHeader>
              <CardContent>
                {data.widgetMetrics.widgetErrors.length > 0 ? (
                  <div className="space-y-3">
                    {data.widgetMetrics.widgetErrors.map((error, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Activity className="h-4 w-4 text-destructive" />
                          <span className="font-medium">{error.widgetType}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="destructive">{error.errorCount} errors</Badge>
                          <span className="text-muted-foreground">
                            {error.lastError.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No widget errors reported</p>
                )}
              </CardContent>
            </Card>

            {/* Widget Performance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Widget Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.widgetMetrics.widgetPerformance.map((widget, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">{widget.widgetType}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Load Time:</span>
                          <span className="font-medium">{widget.avgLoadTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Render Time:</span>
                          <span className="font-medium">{widget.avgRenderTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error Rate:</span>
                          <span className={`font-medium ${
                            widget.errorRate < 1 ? 'text-green-600' :
                            widget.errorRate < 5 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {widget.errorRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Behavior */}
            <Card>
              <CardHeader>
                <CardTitle>User Behavior</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="font-medium">User Flows</h4>
                  {data.userBehavior.userFlows.map((flow, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{flow.flow}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">{flow.conversion.toFixed(1)}% conversion</span>
                        <span className="text-red-600">{flow.dropOff.toFixed(1)}% drop-off</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feature Adoption */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Adoption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.userBehavior.featureAdoption.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{feature.feature}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">{feature.adoptionRate.toFixed(1)}% adoption</span>
                        <span className="text-muted-foreground">
                          {feature.lastUsed.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custom Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Widget Load Time</span>
                  <Badge variant="secondary">
                    {data.performanceMetrics.customMetrics.avgWidgetLoadTime}ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Data Fetch Time</span>
                  <Badge variant="secondary">
                    {data.performanceMetrics.customMetrics.avgDataFetchTime}ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cache Hit Rate</span>
                  <Badge variant="secondary">
                    {data.performanceMetrics.customMetrics.cacheHitRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Error Rate</span>
                  <Badge variant="secondary">
                    {data.performanceMetrics.customMetrics.errorRate.toFixed(2)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Real-time Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current CLS</span>
                  <Badge variant={metrics.cls < 0.1 ? 'default' : 'destructive'}>
                    {metrics.cls.toFixed(3)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current FID</span>
                  <Badge variant={metrics.fid < 100 ? 'default' : 'destructive'}>
                    {metrics.fid}ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current LCP</span>
                  <Badge variant={metrics.lcp < 1000 ? 'default' : 'destructive'}>
                    {metrics.lcp}ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cache Stats</span>
                  <Badge variant="outline">
                    {cacheStats.hitRate.toFixed(1)}% hit rate
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Available Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  User Activity Report (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Performance Summary (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Widget Usage Report (CSV)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Error Analysis Report (JSON)
                </Button>
              </CardContent>
            </Card>

            {/* Report Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Weekly Performance Report</p>
                    <p className="text-sm text-muted-foreground">Every Monday at 9 AM</p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Monthly Usage Report</p>
                    <p className="text-sm text-muted-foreground">1st of each month</p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule New Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
