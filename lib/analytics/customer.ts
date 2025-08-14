/**
 * Customer Analytics for Market Validation
 * Tracks user behavior to validate product-market fit hypotheses
 */

export interface CustomerProfile {
  userId: string;
  userType: 'financial-analyst' | 'quant-developer' | 'portfolio-manager' | 'trader' | 'other';
  company?: string;
  experience: 'entry' | 'mid' | 'senior' | 'executive';
  currentTools: string[];
  signupDate: string;
  lastActive: string;
}

export interface UsageSession {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  lastActivity?: string;
  actions: UserAction[];
  widgetsUsed: string[];
  sheetsCreated: number;
  dataFetches: number;
  errorCount: number;
}

export interface UserAction {
  type: 'widget_added' | 'widget_removed' | 'widget_configured' | 'sheet_created' | 
        'sheet_switched' | 'data_exported' | 'preset_used' | 'agent_interaction' |
        'panel_toggled' | 'keyboard_shortcut' | 'error_encountered' |
        'profile_updated' | 'milestone_reached';
  timestamp: string;
  details: Record<string, any>;
}

export interface ProductMetrics {
  // Market validation metrics
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  retentionRate: {
    day1: number;
    day7: number;
    day30: number;
  };
  
  // Product-market fit indicators
  timeToValue: number;           // Time to first successful analysis
  sessionDuration: number;       // Average session length
  featureAdoption: Record<string, number>;
  userSatisfaction: number;      // NPS or satisfaction score
  
  // Business metrics
  conversionRate: number;        // Trial to paid conversion
  churnRate: number;            // Monthly churn rate
  expandRevenue: number;        // Revenue expansion from existing users
}

class CustomerAnalytics {
  private userId: string | null = null;
  private sessionId: string | null = null;
  private currentSession: Partial<UsageSession> | null = null;
  private profile: Partial<CustomerProfile> | null = null;

  constructor() {
    this.initializeSession();
    this.loadUserProfile();
  }

  // Initialize tracking session
  private initializeSession() {
    if (typeof window === 'undefined') return;

    this.sessionId = crypto.randomUUID();
    this.currentSession = {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      actions: [],
      widgetsUsed: [],
      sheetsCreated: 0,
      dataFetches: 0,
      errorCount: 0,
    };

    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Track session activity
    this.startActivityTracking();
  }

  private loadUserProfile() {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('madlab-customer-profile');
    if (stored) {
      this.profile = JSON.parse(stored);
      this.userId = this.profile?.userId || null;
      if (this.currentSession) {
        this.currentSession.userId = this.userId || undefined;
      }
    } else {
      // Generate anonymous user ID
      this.userId = `anon_${crypto.randomUUID()}`;
      this.profile = {
        userId: this.userId,
        signupDate: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      this.saveUserProfile();
    }
  }

  private saveUserProfile() {
    if (typeof window === 'undefined' || !this.profile) return;
    
    this.profile.lastActive = new Date().toISOString();
    localStorage.setItem('madlab-customer-profile', JSON.stringify(this.profile));
  }

  private startActivityTracking() {
    if (typeof window === 'undefined') return;

    // Track user interactions
    const events = ['click', 'keydown', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        if (this.currentSession) {
          this.currentSession.lastActivity = new Date().toISOString();
        }
      });
    });
  }

  // Update user profile for market segmentation
  updateProfile(updates: Partial<CustomerProfile>) {
    if (!this.profile) return;

    this.profile = { ...this.profile, ...updates };
    this.saveUserProfile();
    
    // Track profile completion for onboarding metrics
    this.trackAction('profile_updated', updates);
  }

  // Track user actions for behavior analysis
  trackAction(type: UserAction['type'], details: Record<string, any> = {}) {
    if (!this.currentSession) return;

    const action: UserAction = {
      type,
      timestamp: new Date().toISOString(),
      details,
    };

    this.currentSession.actions?.push(action);

    // Update session metrics based on action
    switch (type) {
      case 'widget_added':
        if (details.widgetType && !this.currentSession.widgetsUsed?.includes(details.widgetType)) {
          this.currentSession.widgetsUsed?.push(details.widgetType);
        }
        break;
      case 'sheet_created':
        this.currentSession.sheetsCreated = (this.currentSession.sheetsCreated || 0) + 1;
        break;
      case 'data_exported':
        this.currentSession.dataFetches = (this.currentSession.dataFetches || 0) + 1;
        break;
      case 'error_encountered':
        this.currentSession.errorCount = (this.currentSession.errorCount || 0) + 1;
        break;
    }

    // Save to local storage for development
    this.saveSessionData();
  }

  // Track feature usage for product decisions
  trackFeatureUsage(feature: string, context?: Record<string, any>) {
    this.trackAction('widget_configured', {
      feature,
      context,
      timestamp: new Date().toISOString(),
    });

    // Update feature adoption metrics
    const featureMetrics = this.getFeatureMetrics();
    featureMetrics[feature] = (featureMetrics[feature] || 0) + 1;
    localStorage.setItem('madlab-feature-metrics', JSON.stringify(featureMetrics));
  }

  // Track time to value (key metric for product-market fit)
  trackTimeToValue(milestone: 'first_widget' | 'first_analysis' | 'first_export' | 'first_agent_use') {
    if (!this.profile?.signupDate) return;

    const timeToValue = Date.now() - new Date(this.profile.signupDate).getTime();
    
    this.trackAction('milestone_reached', {
      milestone,
      timeToValue,
      timeToValueHours: timeToValue / (1000 * 60 * 60),
    });

    console.log(`🎯 Time to ${milestone}: ${Math.round(timeToValue / 1000 / 60)} minutes`);
  }

  // End current session
  private endSession() {
    if (!this.currentSession) return;

    this.currentSession.endTime = new Date().toISOString();
    this.currentSession.duration = new Date(this.currentSession.endTime).getTime() - 
                                   new Date(this.currentSession.startTime!).getTime();

    this.saveSessionData();
  }

  private saveSessionData() {
    if (typeof window === 'undefined' || !this.currentSession) return;

    const sessions = JSON.parse(localStorage.getItem('madlab-usage-sessions') || '[]');
    
    // Update existing session or add new one
    const existingIndex = sessions.findIndex((s: any) => s.sessionId === this.sessionId);
    if (existingIndex >= 0) {
      sessions[existingIndex] = this.currentSession;
    } else {
      sessions.push(this.currentSession);
    }

    // Keep only last 50 sessions
    if (sessions.length > 50) {
      sessions.splice(0, sessions.length - 50);
    }

    localStorage.setItem('madlab-usage-sessions', JSON.stringify(sessions));
  }

  // Get customer insights for product decisions
  getCustomerInsights(): {
    profile: CustomerProfile | null;
    currentSession: UsageSession | null;
    metrics: Partial<ProductMetrics>;
    recommendations: string[];
  } {
    const sessions = this.getAllSessions();
    const featureMetrics = this.getFeatureMetrics();
    
    // Calculate key metrics
    const avgSessionDuration = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length / 1000 / 60
      : 0;

    const uniqueWidgets = new Set(sessions.flatMap(s => s.widgetsUsed || [])).size;
    const totalActions = sessions.reduce((sum, s) => sum + (s.actions?.length || 0), 0);

    // Generate recommendations based on usage patterns
    const recommendations: string[] = [];
    
    if (avgSessionDuration < 5) {
      recommendations.push('Consider improving onboarding - short session duration suggests difficulty getting started');
    }
    
    if (uniqueWidgets < 3) {
      recommendations.push('Users not exploring widget variety - consider better widget discovery');
    }
    
    if (totalActions / sessions.length < 10) {
      recommendations.push('Low engagement per session - consider more guided workflows');
    }

    const mostUsedFeature = Object.entries(featureMetrics)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    if (mostUsedFeature) {
      recommendations.push(`Focus on enhancing ${mostUsedFeature} - it's your most used feature`);
    }

    return {
      profile: this.profile as CustomerProfile | null,
      currentSession: this.currentSession as UsageSession | null,
      metrics: {
        sessionDuration: avgSessionDuration,
        featureAdoption: featureMetrics,
        timeToValue: this.calculateTimeToValue(),
      },
      recommendations,
    };
  }

  private getAllSessions(): UsageSession[] {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('madlab-usage-sessions') || '[]');
  }

  private getFeatureMetrics(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('madlab-feature-metrics') || '{}');
  }

  private calculateTimeToValue(): number {
    const sessions = this.getAllSessions();
    const firstMilestone = sessions.find(s => 
      s.actions?.some(a => a.type === 'widget_added' || a.type === 'data_exported')
    );
    
    if (!firstMilestone || !this.profile?.signupDate) return 0;
    
    return new Date(firstMilestone.startTime).getTime() - 
           new Date(this.profile.signupDate).getTime();
  }

  // Export analytics data for business intelligence
  exportAnalyticsData(): string {
    const data = {
      profile: this.profile,
      sessions: this.getAllSessions(),
      featureMetrics: this.getFeatureMetrics(),
      insights: this.getCustomerInsights(),
      exportTimestamp: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  // Simple KPI aggregation for dev-friendly local reporting
  getKpis(): { featureDiscoveryRate: number; averageSessionMinutes: number; returnRate: number } {
    if (typeof window === 'undefined') return { featureDiscoveryRate: 0, averageSessionMinutes: 0, returnRate: 0 };
    const sessions = this.getAllSessions();
    const avgSessionMinutes = sessions.length > 0 ? sessions.reduce((s, x) => s + ((x.duration || 0) / 60000), 0) / sessions.length : 0;
    const featureMetrics = this.getFeatureMetrics();
    const totalFeatures = Object.values(featureMetrics).reduce((s, n) => s + (n as number), 0);
    const featureDiscoveryRate = sessions.length > 0 ? totalFeatures / sessions.length : 0;
    // return rate: users with at least 2 sessions / users with >=1 session
    const byUser: Record<string, number> = {};
    sessions.forEach(s => { const id = s.userId || 'anon'; byUser[id] = (byUser[id] || 0) + 1; });
    const users = Object.keys(byUser).length;
    const returning = Object.values(byUser).filter(c => c >= 2).length;
    const returnRate = users > 0 ? returning / users : 0;
    try { localStorage.setItem('madlab-kpi-cache', JSON.stringify({ featureDiscoveryRate, averageSessionMinutes: avgSessionMinutes, returnRate })); } catch {}
    return { featureDiscoveryRate, averageSessionMinutes: avgSessionMinutes, returnRate };
  }
}

// Global analytics instance
let customerAnalytics: CustomerAnalytics | null = null;

export function initializeCustomerAnalytics(): CustomerAnalytics {
  if (typeof window === 'undefined') return {} as CustomerAnalytics;
  
  if (!customerAnalytics) {
    customerAnalytics = new CustomerAnalytics();
    
    // Add to window for debugging
    (window as any).__madlabAnalytics = customerAnalytics;
  }
  
  return customerAnalytics;
}

export function getCustomerAnalytics(): CustomerAnalytics | null {
  return customerAnalytics;
}

// Convenience functions
export function trackFeature(feature: string, context?: Record<string, any>) {
  customerAnalytics?.trackFeatureUsage(feature, context);
}

export function trackMilestone(milestone: 'first_widget' | 'first_analysis' | 'first_export' | 'first_agent_use') {
  customerAnalytics?.trackTimeToValue(milestone);
}

export function updateCustomerProfile(updates: Partial<CustomerProfile>) {
  customerAnalytics?.updateProfile(updates);
}

export function getBusinessMetrics(): Partial<ProductMetrics> {
  return customerAnalytics?.getCustomerInsights().metrics || {};
}