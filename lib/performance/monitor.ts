/**
 * Performance monitoring and budget enforcement for MAD LAB
 * Tracks key metrics and ensures platform maintains optimal performance
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number;        // Largest Contentful Paint
  fid?: number;        // First Input Delay  
  cls?: number;        // Cumulative Layout Shift
  fcp?: number;        // First Contentful Paint
  ttfb?: number;       // Time to First Byte
  
  // Custom metrics
  widgetRenderTime?: number;
  chartLoadTime?: number;
  dataFetchTime?: number;
  bundleSize?: number;
  memoryUsage?: number;
  
  // Navigation metrics
  navigationStart?: number;
  domContentLoaded?: number;
  loadComplete?: number;
}

export interface PerformanceBudget {
  lcp: number;         // Target: < 2.5s
  fid: number;         // Target: < 100ms
  cls: number;         // Target: < 0.1
  fcp: number;         // Target: < 1.8s
  ttfb: number;        // Target: < 600ms
  
  widgetRenderTime: number;    // Target: < 200ms
  chartLoadTime: number;       // Target: < 500ms
  dataFetchTime: number;       // Target: < 1000ms
  bundleSize: number;          // Target: < 3MB
  memoryUsage: number;         // Target: < 100MB
}

// Performance budgets based on expert analysis recommendations
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  lcp: 2500,           // 2.5s
  fid: 100,            // 100ms
  cls: 0.1,            // 0.1
  fcp: 1800,           // 1.8s
  ttfb: 600,           // 600ms
  
  widgetRenderTime: typeof process !== 'undefined' && process.env.CI ? 300 : 200,       // keep local stricter
  chartLoadTime: 500,          // 500ms
  dataFetchTime: 1000,         // 1s
  bundleSize: 3 * 1024 * 1024, // 3MB
  memoryUsage: 100 * 1024 * 1024, // 100MB
};

interface PerformanceAlert {
  metric: keyof PerformanceBudget;
  actual: number;
  budget: number;
  severity: 'warning' | 'critical';
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private budget: PerformanceBudget = DEFAULT_PERFORMANCE_BUDGET;
  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private memoryTimer?: number;
  
  constructor(customBudget?: Partial<PerformanceBudget>) {
    if (customBudget) {
      this.budget = { ...this.budget, ...customBudget };
    }
    
    this.initializeObservers();
    this.measureInitialMetrics();
    this.startMemorySampling();
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals observer
    if ('PerformanceObserver' in window) {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.lcp = lastEntry.startTime;
        this.checkBudget('lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          this.checkBudget('fid', this.metrics.fid);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // CLS Observer
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cls = clsValue;
        this.checkBudget('cls', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Navigation timing observer
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.navigationStart = entry.startTime;
          this.metrics.domContentLoaded = entry.domContentLoadedEventEnd - entry.startTime;
          this.metrics.loadComplete = entry.loadEventEnd - entry.startTime;
          this.metrics.ttfb = entry.responseStart - entry.requestStart;
          this.checkBudget('ttfb', this.metrics.ttfb);
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    }
  }

  private measureInitialMetrics() {
    if (typeof window === 'undefined') return;

    // FCP measurement
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.fcp = fcpEntry.startTime;
        this.checkBudget('fcp', fcpEntry.startTime);
      }
    }

    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
      this.checkBudget('memoryUsage', memory.usedJSHeapSize);
    }
  }

  private startMemorySampling() {
    if (typeof window === 'undefined' || !(performance as any)?.memory) return;
    // Sample memory every 5s
    const sample = () => {
      try {
        const mem = (performance as any).memory;
        if (mem && typeof mem.usedJSHeapSize === 'number') {
          this.metrics.memoryUsage = mem.usedJSHeapSize;
          const warn = 80 * 1024 * 1024;
          const critical = 100 * 1024 * 1024;
          if (mem.usedJSHeapSize > warn) {
            this.checkBudget('memoryUsage', mem.usedJSHeapSize);
            try {
              const { analytics } = require('../analytics');
              analytics.track('memory_usage', { used: mem.usedJSHeapSize }, 'performance');
            } catch {}
            if (mem.usedJSHeapSize > critical) {
              try {
                const { showWarningToast } = require('../errors/toast');
                showWarningToast('High memory usage', `Heap used ${(mem.usedJSHeapSize / (1024*1024)).toFixed(1)} MB`);
              } catch {}
            }
          }
        }
      } catch {}
    }
    sample();
    // @ts-ignore setInterval type differences in some envs
    this.memoryTimer = setInterval(sample, 5000) as unknown as number;
  }

  // Measure widget render time
  measureWidgetRender<T>(widgetType: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    this.metrics.widgetRenderTime = renderTime;
    this.checkBudget('widgetRenderTime', renderTime);
    
    // Log detailed widget performance
    if (renderTime > this.budget.widgetRenderTime) {
      console.warn(`⚠️ Widget ${widgetType} render time: ${renderTime.toFixed(2)}ms (budget: ${this.budget.widgetRenderTime}ms)`);
    }
    
    return result;
  }

  // Measure chart load time
  measureChartLoad<T>(chartType: string, loadFn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    return loadFn().then(result => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      this.metrics.chartLoadTime = loadTime;
      this.checkBudget('chartLoadTime', loadTime);
      
      if (loadTime > this.budget.chartLoadTime) {
        console.warn(`⚠️ Chart ${chartType} load time: ${loadTime.toFixed(2)}ms (budget: ${this.budget.chartLoadTime}ms)`);
      }
      
      return result;
    });
  }

  // Measure data fetch time
  measureDataFetch<T>(source: string, fetchFn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    return fetchFn().then(result => {
      const endTime = performance.now();
      const fetchTime = endTime - startTime;
      
      this.metrics.dataFetchTime = fetchTime;
      this.checkBudget('dataFetchTime', fetchTime);
      
      if (fetchTime > this.budget.dataFetchTime) {
        console.warn(`⚠️ Data fetch from ${source}: ${fetchTime.toFixed(2)}ms (budget: ${this.budget.dataFetchTime}ms)`);
      }
      
      return result;
    });
  }

  private checkBudget(metric: keyof PerformanceBudget, value: number) {
    const budget = this.budget[metric];
    
    if (value > budget) {
      const severity = value > budget * 1.5 ? 'critical' : 'warning';
      const alert: PerformanceAlert = {
        metric,
        actual: value,
        budget,
        severity,
        timestamp: Date.now()
      };
      
      this.alerts.push(alert);
      
      // Keep only recent alerts (last 100)
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
      
      if (severity === 'critical') {
        console.error(`🚨 Performance critical: ${metric} = ${value.toFixed(2)} (budget: ${budget})`);
      } else {
        console.warn(`⚠️ Performance warning: ${metric} = ${value.toFixed(2)} (budget: ${budget})`);
      }
    }
  }

  // Get current performance report
  getReport(): {
    metrics: PerformanceMetrics;
    budget: PerformanceBudget;
    alerts: PerformanceAlert[];
    score: number;
  } {
    const score = this.calculatePerformanceScore();
    
    return {
      metrics: { ...this.metrics },
      budget: { ...this.budget },
      alerts: [...this.alerts],
      score
    };
  }

  private calculatePerformanceScore(): number {
    let totalScore = 0;
    let metricsCount = 0;

    // Score each metric (0-100)
    const scoreMetric = (actual: number | undefined, budget: number, weight = 1) => {
      if (actual === undefined) return 0;
      
      const score = Math.max(0, Math.min(100, (budget / actual) * 100));
      totalScore += score * weight;
      metricsCount += weight;
    };

    // Core Web Vitals (higher weight)
    scoreMetric(this.metrics.lcp, this.budget.lcp, 2);
    scoreMetric(this.metrics.fid, this.budget.fid, 2);
    scoreMetric(this.metrics.cls, this.budget.cls, 2);
    scoreMetric(this.metrics.fcp, this.budget.fcp, 1);
    scoreMetric(this.metrics.ttfb, this.budget.ttfb, 1);

    // Custom metrics
    scoreMetric(this.metrics.widgetRenderTime, this.budget.widgetRenderTime, 1);
    scoreMetric(this.metrics.chartLoadTime, this.budget.chartLoadTime, 1);
    scoreMetric(this.metrics.dataFetchTime, this.budget.dataFetchTime, 1);

    return metricsCount > 0 ? totalScore / metricsCount : 0;
  }

  // Export metrics for analytics
  exportMetrics(): string {
    const report = this.getReport();
    return JSON.stringify({
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      ...report
    }, null, 2);
  }

  // Clean up observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    try { if (this.memoryTimer) clearInterval(this.memoryTimer as unknown as number) } catch {}
  }
}

// Global performance monitor instance
let globalMonitor: PerformanceMonitor | null = null;

export function initializePerformanceMonitoring(customBudget?: Partial<PerformanceBudget>) {
  if (typeof window === 'undefined') return null;
  
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(customBudget);
    
    // Add performance monitoring to window for debugging
    (window as any).__madlabPerformance = globalMonitor;
  }
  
  return globalMonitor;
}

export function getPerformanceMonitor(): PerformanceMonitor | null {
  return globalMonitor;
}

// Convenience functions for common measurements
export function measureWidgetRender<T>(widgetType: string, renderFn: () => T): T {
  if (!globalMonitor) return renderFn();
  return globalMonitor.measureWidgetRender(widgetType, renderFn);
}

export function measureChartLoad<T>(chartType: string, loadFn: () => Promise<T>): Promise<T> {
  if (!globalMonitor) return loadFn();
  return globalMonitor.measureChartLoad(chartType, loadFn);
}

export function measureDataFetch<T>(source: string, fetchFn: () => Promise<T>): Promise<T> {
  if (!globalMonitor) return fetchFn();
  return globalMonitor.measureDataFetch(source, fetchFn);
}

// Performance budget checker for CI/CD
export function checkPerformanceBudgets(): { passed: boolean; report: string } {
  if (!globalMonitor) {
    return { passed: false, report: 'Performance monitoring not initialized' };
  }
  
  const report = globalMonitor.getReport();
  const criticalAlerts = report.alerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = report.alerts.filter(alert => alert.severity === 'warning');
  
  const passed = criticalAlerts.length === 0 && report.score >= 80;
  
  const reportText = `
Performance Score: ${report.score.toFixed(1)}/100
Critical Issues: ${criticalAlerts.length}
Warnings: ${warningAlerts.length}

Metrics:
- LCP: ${report.metrics.lcp?.toFixed(2) || 'N/A'}ms (budget: ${report.budget.lcp}ms)
- FID: ${report.metrics.fid?.toFixed(2) || 'N/A'}ms (budget: ${report.budget.fid}ms)
- CLS: ${report.metrics.cls?.toFixed(3) || 'N/A'} (budget: ${report.budget.cls})
- Widget Render: ${report.metrics.widgetRenderTime?.toFixed(2) || 'N/A'}ms (budget: ${report.budget.widgetRenderTime}ms)

${criticalAlerts.length > 0 ? 'CRITICAL ALERTS:\n' + criticalAlerts.map(a => `- ${a.metric}: ${a.actual.toFixed(2)} > ${a.budget}`).join('\n') : ''}
`.trim();
  
  return { passed, report: reportText };
}