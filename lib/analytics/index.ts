/**
 * MAD LAB Analytics System
 * Comprehensive usage tracking and instrumentation for financial professionals
 */

// Event tracking interface
export interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  context: {
    platform: string;
    userAgent: string;
    viewport: { width: number; height: number };
    timezone: string;
    version: string;
  };
}

// User behavior categories
export type EventCategory = 
  | 'widget_interaction'
  | 'data_request'
  | 'export_action'
  | 'navigation'
  | 'error'
  | 'performance'
  | 'user_flow'
  | 'feature_usage'
  | 'auth'
  | 'system'
  | 'user_action'
  | 'admin_action';

// Analytics configuration
interface AnalyticsConfig {
  enabled: boolean;
  bufferSize: number;
  flushInterval: number;
  endpoint?: string;
  apiKey?: string;
  debugMode: boolean;
  sampleRate: number;
}

class AnalyticsManager {
  private config: AnalyticsConfig;
  private eventBuffer: AnalyticsEvent[] = [];
  private sessionId: string;
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private userId?: string;
  private readonly consentStorageKey = 'madlab_consent_analytics';

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      bufferSize: 50,
      flushInterval: 30000, // 30 seconds
      debugMode: process.env.NODE_ENV === 'development',
      sampleRate: 1.0,
      ...config,
    };

    this.sessionId = this.generateSessionId();

    // Respect Do Not Track and user consent on the client
    if (typeof window !== 'undefined') {
      if (this.isDoNotTrack()) {
        this.config.enabled = false;
      }
      const hasConsent = this.readConsentFromStorage();
      this.config.enabled = this.config.enabled && hasConsent;

      if (this.config.enabled) {
        this.initialize();
      }
    }
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Start flush timer
    this.startFlushTimer();

    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Track unload events
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    // Track errors
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // Track performance
    this.trackPerformanceMetrics();

    this.isInitialized = true;

    if (this.config.debugMode) {
      console.log('[Analytics] Initialized with config:', this.config);
    }
  }

  /**
   * Enable/disable analytics at runtime (e.g., after consent choice)
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled && typeof window !== 'undefined' && !this.isInitialized) {
      this.initialize();
    }
  }

  /**
   * Track a custom event
   */
  track(name: string, properties: Record<string, any> = {}, category?: EventCategory): void {
    if (!this.config.enabled || !this.shouldSample()) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        category: category || 'user_flow',
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      context: this.getContext(),
    };

    this.addToBuffer(event);

    if (this.config.debugMode) {
      console.log('[Analytics] Event tracked:', event);
    }
  }

  /**
   * Track widget interactions
   */
  trackWidget(action: string, widgetType: string, properties: Record<string, any> = {}): void {
    this.track(`widget_${action}`, {
      widget_type: widgetType,
      ...properties,
    }, 'widget_interaction');
  }

  /**
   * Track data requests and performance
   */
  trackDataRequest(provider: string, query: any, result: {
    success: boolean;
    loadTime: number;
    fromCache: boolean;
    error?: string;
  }): void {
    this.track('data_request', {
      provider,
      query_type: typeof query,
      success: result.success,
      load_time: result.loadTime,
      from_cache: result.fromCache,
      error: result.error,
    }, 'data_request');
  }

  /**
   * Track export actions
   */
  trackExport(format: string, widgetType: string, dataSize: number): void {
    this.track('data_export', {
      format,
      widget_type: widgetType,
      data_size: dataSize,
    }, 'export_action');
  }

  /**
   * Track navigation patterns
   */
  trackNavigation(from: string, to: string, method: 'click' | 'keyboard' | 'url'): void {
    this.track('navigation', {
      from_page: from,
      to_page: to,
      method,
    }, 'navigation');
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string, action: 'discovered' | 'used' | 'completed', properties: Record<string, any> = {}): void {
    this.track('feature_usage', {
      feature,
      action,
      ...properties,
    }, 'feature_usage');
  }

  /**
   * Track user flow milestones
   */
  trackMilestone(milestone: string, properties: Record<string, any> = {}): void {
    this.track('milestone_reached', {
      milestone,
      session_duration: Date.now() - parseInt(this.sessionId.split('_')[1]),
      ...properties,
    }, 'user_flow');
  }

  /**
   * Set user identifier
   */
  identify(userId: string, traits: Record<string, any> = {}): void {
    this.userId = userId;
    this.track('user_identified', {
      user_id: userId,
      ...traits,
    }, 'user_flow');
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: {
    name: string;
    value: number;
    unit?: string;
    context?: Record<string, any>;
  }): void {
    this.track('performance_metric', {
      metric_name: metrics.name,
      metric_value: metrics.value,
      metric_unit: metrics.unit || 'ms',
      ...metrics.context,
    }, 'performance');
  }

  /**
   * Flush events immediately
   */
  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.eventBuffer.length === 0) {
        resolve();
        return;
      }

      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      this.sendEvents(events).finally(() => resolve());
    });
  }

  /**
   * Clear all buffered events
   */
  clear(): void {
    this.eventBuffer = [];
  }

  /**
   * Get analytics stats
   */
  getStats(): {
    bufferSize: number;
    sessionId: string;
    userId?: string;
    isEnabled: boolean;
  } {
    return {
      bufferSize: this.eventBuffer.length,
      sessionId: this.sessionId,
      userId: this.userId,
      isEnabled: this.config.enabled,
    };
  }

  // Private methods

  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private getContext() {
    return {
      platform: typeof window !== 'undefined' ? 'web' : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      viewport: typeof window !== 'undefined' 
        ? { width: window.innerWidth, height: window.innerHeight }
        : { width: 0, height: 0 },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    };
  }

  private isDoNotTrack(): boolean {
    try {
      if (typeof navigator === 'undefined' && typeof window === 'undefined') return false;
      const navDnt = typeof navigator !== 'undefined' ? (navigator as any).doNotTrack : undefined;
      const winDnt = typeof window !== 'undefined' ? (window as any).doNotTrack : undefined;
      return navDnt === '1' || winDnt === '1';
    } catch {
      return false;
    }
  }

  private readConsentFromStorage(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const v = window.localStorage.getItem(this.consentStorageKey);
      return v === 'true';
    } catch {
      return false;
    }
  }

  private addToBuffer(event: AnalyticsEvent): void {
    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    if (!this.config.endpoint) {
      // Store locally for development
      if (this.config.debugMode) {
        console.log('[Analytics] Events to send:', events);
        this.storeEventsLocally(events);
      }
      return;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.config.debugMode) {
        console.log('[Analytics] Events sent successfully:', events.length);
      }
    } catch (error) {
      console.error('[Analytics] Failed to send events:', error);
      
      // Store failed events locally as backup
      this.storeEventsLocally(events);
      
      // Track the analytics error
      this.track('analytics_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        events_count: events.length,
      }, 'error');
    }
  }

  private storeEventsLocally(events: AnalyticsEvent[]): void {
    try {
      const stored = localStorage.getItem('madlab_analytics_events');
      const existingEvents: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];
      const allEvents = [...existingEvents, ...events];
      
      // Keep only last 1000 events and 30 days of data
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filtered = allEvents.filter(e => e.timestamp >= cutoff);
      const recentEvents = filtered.slice(-1000);
      
      localStorage.setItem('madlab_analytics_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('[Analytics] Failed to store events locally:', error);
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.track('session_hidden', {}, 'user_flow');
      this.flush();
    } else {
      this.track('session_visible', {}, 'user_flow');
    }
  }

  private handleBeforeUnload(): void {
    this.track('session_end', {
      session_duration: Date.now() - parseInt(this.sessionId.split('_')[1]),
    }, 'user_flow');
    
    // Use sendBeacon for reliable event sending on page unload
    if (navigator.sendBeacon && this.config.endpoint) {
      navigator.sendBeacon(
        this.config.endpoint,
        JSON.stringify({ events: this.eventBuffer })
      );
    } else {
      this.flush();
    }
  }

  private handleError(event: ErrorEvent): void {
    this.track('javascript_error', {
      message: event.message,
      filename: event.filename,
      line_number: event.lineno,
      column_number: event.colno,
      stack: event.error?.stack,
    }, 'error');
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.track('unhandled_promise_rejection', {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
    }, 'error');
  }

  private trackPerformanceMetrics(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          this.trackPerformance({
            name: 'page_load_time',
            value: navigation.loadEventEnd - navigation.fetchStart,
          });

          this.trackPerformance({
            name: 'dom_content_loaded',
            value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          });

          this.trackPerformance({
            name: 'first_byte_time',
            value: navigation.responseStart - navigation.requestStart,
          });
        }

        // Track paint metrics
        const paintMetrics = performance.getEntriesByType('paint');
        paintMetrics.forEach(metric => {
          this.trackPerformance({
            name: metric.name.replace('-', '_'),
            value: metric.startTime,
          });
        });
      }, 1000);
    });

    // Track Core Web Vitals
    this.trackWebVitals();
    // Try web-vitals integration for more accurate metrics (LCP, CLS, INP)
    // Guard to avoid resolving module during tests/dev where it's not installed
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      try {
        // dynamic import to avoid bundling on server
        // @ts-ignore - module may not be installed
        import('web-vitals').then((wv: any) => {
          try { wv.onLCP((m: any) => this.trackPerformance({ name: 'LCP', value: m.value })) } catch {}
          try { wv.onCLS((m: any) => this.trackPerformance({ name: 'CLS', value: m.value, unit: '' })) } catch {}
          try { wv.onINP((m: any) => this.trackPerformance({ name: 'INP', value: m.value })) } catch {}
        }).catch(() => {})
      } catch {}
    }
  }

  private trackWebVitals(): void {
    // This would integrate with web-vitals library in a real implementation
    // For now, we'll track basic performance metrics
    
    if ('PerformanceObserver' in window) {
      // Track Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.trackPerformance({
          name: 'largest_contentful_paint',
          value: lastEntry.startTime,
        });
      });

      try {
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        // LCP not supported
      }

      // Track First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const perfEntry = entry as any; // FID entries have processingStart
          if (perfEntry.processingStart) {
            this.trackPerformance({
              name: 'first_input_delay',
              value: perfEntry.processingStart - entry.startTime,
            });
          }
        });
      });

      try {
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        // FID not supported
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flush();
    this.isInitialized = false;
  }
}

// Create singleton instance
export const analytics = new AnalyticsManager({
  enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',
  endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_ANALYTICS_API_KEY,
  debugMode: process.env.NODE_ENV === 'development',
});

// Convenience functions
export const track = analytics.track.bind(analytics);
export const trackWidget = analytics.trackWidget.bind(analytics);
export const trackDataRequest = analytics.trackDataRequest.bind(analytics);
export const trackExport = analytics.trackExport.bind(analytics);
export const trackNavigation = analytics.trackNavigation.bind(analytics);
export const trackFeature = analytics.trackFeature.bind(analytics);
export const trackMilestone = analytics.trackMilestone.bind(analytics);
export const identify = analytics.identify.bind(analytics);
export const trackPerformance = analytics.trackPerformance.bind(analytics);

export default analytics;