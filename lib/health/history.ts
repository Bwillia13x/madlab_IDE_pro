import { ComprehensiveHealthStatus } from './orchestrator';

export interface HealthHistoryEntry {
  id: string;
  timestamp: string;
  healthScore: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    system: HealthCheckSnapshot;
    database: HealthCheckSnapshot;
    providers: HealthCheckSnapshot;
    caches: HealthCheckSnapshot;
    monitoring: HealthCheckSnapshot;
    aiService: HealthCheckSnapshot;
  };
  summary: HealthSummarySnapshot;
  uptime: number;
}

export interface HealthCheckSnapshot {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: Record<string, unknown>;
}

export interface HealthSummarySnapshot {
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  unhealthyChecks: number;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export interface HealthTrend {
  timeframe: '1h' | '6h' | '24h' | '7d' | '30d';
  averageScore: number;
  minScore: number;
  maxScore: number;
  incidents: number;
  uptime: number;
  statusDistribution: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface HealthAnalytics {
  trends: Record<string, HealthTrend>;
  topIssues: Array<{
    component: string;
    issueType: string;
    frequency: number;
    lastOccurrence: string;
  }>;
  performanceMetrics: {
    averageResponseTimes: Record<string, number>;
    slowestComponents: Array<{
      component: string;
      averageResponseTime: number;
    }>;
  };
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high';
    component: string;
    issue: string;
    recommendation: string;
  }>;
}

// In-memory health history storage (in production, use a proper database)
class HealthHistoryStorage {
  private history: HealthHistoryEntry[] = [];
  private maxEntries = 10000; // Limit memory usage
  
  addEntry(healthStatus: ComprehensiveHealthStatus): void {
    const entry: HealthHistoryEntry = {
      id: this.generateId(),
      timestamp: healthStatus.timestamp,
      healthScore: healthStatus.healthScore,
      status: healthStatus.status,
      checks: {
        system: {
          status: healthStatus.checks.system.status,
          responseTime: healthStatus.checks.system.responseTime,
          details: {
            uptime: healthStatus.checks.system.uptime,
            alerts: healthStatus.checks.system.alerts,
            healthChecks: healthStatus.checks.system.healthChecks
          }
        },
        database: {
          status: healthStatus.checks.database.status,
          responseTime: healthStatus.checks.database.responseTime,
          details: {
            postgres: healthStatus.checks.database.postgres,
            redis: healthStatus.checks.database.redis
          }
        },
        providers: {
          status: healthStatus.checks.providers.status,
          responseTime: healthStatus.checks.providers.responseTime,
          details: {
            total: healthStatus.checks.providers.total,
            healthy: healthStatus.checks.providers.healthy,
            current: healthStatus.checks.providers.current
          }
        },
        caches: {
          status: healthStatus.checks.caches.status,
          responseTime: healthStatus.checks.caches.responseTime,
          details: {
            globalData: healthStatus.checks.caches.globalData,
            price: healthStatus.checks.caches.price,
            financial: healthStatus.checks.caches.financial,
            kpi: healthStatus.checks.caches.kpi
          }
        },
        monitoring: {
          status: healthStatus.checks.monitoring.status,
          responseTime: healthStatus.checks.monitoring.responseTime,
          details: {
            totalAlerts: healthStatus.checks.monitoring.totalAlerts,
            activeAlerts: healthStatus.checks.monitoring.activeAlerts
          }
        },
        aiService: {
          status: healthStatus.checks.aiService.status,
          responseTime: healthStatus.checks.aiService.responseTime,
          details: {
            models: healthStatus.checks.aiService.models,
            queue: healthStatus.checks.aiService.queue,
            performance: healthStatus.checks.aiService.performance
          }
        }
      },
      summary: healthStatus.summary,
      uptime: healthStatus.uptime
    };
    
    this.history.push(entry);
    
    // Remove old entries if we exceed the limit
    if (this.history.length > this.maxEntries) {
      this.history.shift();
    }
  }
  
  getHistory(
    limit: number = 100,
    timeframe?: string,
    component?: string
  ): HealthHistoryEntry[] {
    let filteredHistory = this.history;
    
    // Filter by timeframe
    if (timeframe) {
      const now = Date.now();
      const timeframePeriods = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      const period = timeframePeriods[timeframe as keyof typeof timeframePeriods];
      if (period) {
        const cutoff = now - period;
        filteredHistory = this.history.filter(entry => 
          new Date(entry.timestamp).getTime() > cutoff
        );
      }
    }
    
    // Return most recent entries
    return filteredHistory.slice(-limit).reverse();
  }
  
  getTrends(): Record<string, HealthTrend> {
    const trends: Record<string, HealthTrend> = {};
    const timeframes = ['1h', '6h', '24h', '7d', '30d'];
    
    for (const timeframe of timeframes) {
      const entries = this.getHistory(1000, timeframe);
      
      if (entries.length === 0) {
        trends[timeframe] = {
          timeframe: timeframe as any,
          averageScore: 0,
          minScore: 0,
          maxScore: 0,
          incidents: 0,
          uptime: 0,
          statusDistribution: { healthy: 0, degraded: 0, unhealthy: 0 }
        };
        continue;
      }
      
      const scores = entries.map(e => e.healthScore);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      
      const incidents = entries.filter(e => e.status === 'unhealthy').length;
      const uptime = entries.filter(e => e.status === 'healthy').length / entries.length;
      
      const statusDistribution = entries.reduce(
        (acc, entry) => {
          acc[entry.status]++;
          return acc;
        },
        { healthy: 0, degraded: 0, unhealthy: 0 }
      );
      
      trends[timeframe] = {
        timeframe: timeframe as any,
        averageScore,
        minScore,
        maxScore,
        incidents,
        uptime,
        statusDistribution
      };
    }
    
    return trends;
  }
  
  getAnalytics(): HealthAnalytics {
    const trends = this.getTrends();
    const recentEntries = this.getHistory(1000, '24h');
    
    // Analyze top issues
    const issueCount: Record<string, { frequency: number; lastOccurrence: string }> = {};
    
    recentEntries.forEach(entry => {
      Object.entries(entry.checks).forEach(([component, check]) => {
        if (check.status !== 'healthy') {
          const key = `${component}-${check.status}`;
          if (!issueCount[key]) {
            issueCount[key] = { frequency: 0, lastOccurrence: entry.timestamp };
          }
          issueCount[key].frequency++;
          if (new Date(entry.timestamp) > new Date(issueCount[key].lastOccurrence)) {
            issueCount[key].lastOccurrence = entry.timestamp;
          }
        }
      });
    });
    
    const topIssues = Object.entries(issueCount)
      .map(([key, data]) => {
        const [component, issueType] = key.split('-');
        return {
          component,
          issueType,
          frequency: data.frequency,
          lastOccurrence: data.lastOccurrence
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    
    // Calculate average response times
    const averageResponseTimes: Record<string, number> = {};
    const componentResponseTimes: Record<string, number[]> = {};
    
    recentEntries.forEach(entry => {
      Object.entries(entry.checks).forEach(([component, check]) => {
        if (!componentResponseTimes[component]) {
          componentResponseTimes[component] = [];
        }
        componentResponseTimes[component].push(check.responseTime);
      });
    });
    
    Object.entries(componentResponseTimes).forEach(([component, times]) => {
      averageResponseTimes[component] = times.reduce((sum, time) => sum + time, 0) / times.length;
    });
    
    const slowestComponents = Object.entries(averageResponseTimes)
      .map(([component, averageResponseTime]) => ({ component, averageResponseTime }))
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, 5);
    
    // Generate recommendations
    const recommendations: Array<{
      priority: 'low' | 'medium' | 'high';
      component: string;
      issue: string;
      recommendation: string;
    }> = [];
    
    // Check for high response times
    slowestComponents.forEach(comp => {
      if (comp.averageResponseTime > 1000) {
        recommendations.push({
          priority: 'high',
          component: comp.component,
          issue: `High response time (${comp.averageResponseTime.toFixed(0)}ms)`,
          recommendation: 'Investigate performance bottlenecks and optimize queries/operations'
        });
      }
    });
    
    // Check for frequent issues
    topIssues.forEach(issue => {
      if (issue.frequency > 10) {
        recommendations.push({
          priority: 'medium',
          component: issue.component,
          issue: `Frequent ${issue.issueType} status (${issue.frequency} occurrences)`,
          recommendation: 'Investigate root cause and implement preventive measures'
        });
      }
    });
    
    // Check uptime
    const last24hTrend = trends['24h'];
    if (last24hTrend && last24hTrend.uptime < 0.95) {
      recommendations.push({
        priority: 'high',
        component: 'system',
        issue: `Low uptime (${(last24hTrend.uptime * 100).toFixed(1)}%)`,
        recommendation: 'Review system stability and implement redundancy measures'
      });
    }
    
    return {
      trends,
      topIssues,
      performanceMetrics: {
        averageResponseTimes,
        slowestComponents
      },
      recommendations
    };
  }
  
  clear(): void {
    this.history = [];
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Global health history storage instance
export const healthHistoryStorage = new HealthHistoryStorage();

// Helper functions
export function recordHealthStatus(healthStatus: ComprehensiveHealthStatus): void {
  healthHistoryStorage.addEntry(healthStatus);
}

export function getHealthHistory(limit?: number, timeframe?: string, component?: string): HealthHistoryEntry[] {
  return healthHistoryStorage.getHistory(limit, timeframe, component);
}

export function getHealthTrends(): Record<string, HealthTrend> {
  return healthHistoryStorage.getTrends();
}

export function getHealthAnalytics(): HealthAnalytics {
  return healthHistoryStorage.getAnalytics();
}

export function clearHealthHistory(): void {
  healthHistoryStorage.clear();
}

