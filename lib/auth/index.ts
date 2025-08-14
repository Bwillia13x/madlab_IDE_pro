/**
 * Enterprise Authentication System
 * Basic SSO and role-based access control for enterprise deployment
 */

import { analytics } from '../analytics';
import React from 'react';
import { errorHandler } from '../errors';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  organization?: Organization;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt: string;
}

export type UserRole = 
  | 'viewer' 
  | 'analyst' 
  | 'admin' 
  | 'super_admin'
  | 'enterprise_user';

export type Permission = 
  | 'read_data'
  | 'write_data'
  | 'manage_widgets'
  | 'admin_panel'
  | 'user_management'
  | 'org_settings'
  | 'billing_access'
  | 'export_data'
  | 'api_access';

export interface Organization {
  id: string;
  name: string;
  domain: string;
  tier: 'free' | 'professional' | 'enterprise';
  settings: OrganizationSettings;
  branding: BrandingConfig;
  features: FeatureFlags;
  limits: UsageLimits;
}

export interface OrganizationSettings {
  ssoEnabled: boolean;
  ssoProvider?: 'okta' | 'azure-ad' | 'google' | 'saml';
  ssoConfig?: Record<string, any>;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number; // minutes
  allowGuestAccess: boolean;
  dataRetentionDays: number;
}

export interface BrandingConfig {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
  footerText?: string;
  applicationName?: string;
}

export interface FeatureFlags {
  advancedCharts: boolean;
  aiAgent: boolean;
  dataExport: boolean;
  apiAccess: boolean;
  customWidgets: boolean;
  collaboration: boolean;
  advancedAnalytics: boolean;
  whitelabeling: boolean;
}

export interface UsageLimits {
  maxUsers: number;
  maxDataQueries: number;
  maxStorageGB: number;
  maxWidgets: number;
  maxCustomIndicators: number;
  apiCallsPerMonth: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  defaultLayout: string;
  notifications: NotificationSettings;
  dashboardSettings: Record<string, any>;
}

export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  desktop: boolean;
  priceAlerts: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // last N passwords
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  expiresAt: number;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: number;
}

class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;
  private currentSession: AuthSession | null = null;
  private organization: Organization | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Initialize authentication system
   */
  async initialize(): Promise<void> {
    try {
      // Check for existing session
      await this.restoreSession();
      
      // Load organization config if user is authenticated
      if (this.currentUser?.organization) {
        await this.loadOrganization(this.currentUser.organization.id);
      }
      
      analytics.track('auth_initialized', {
        authenticated: !!this.currentUser,
        organization_id: this.organization?.id,
      }, 'system');
      
    } catch (error) {
      console.error('[AuthManager] Initialization failed:', error);
    }
  }

  /**
   * Login with email/password
   */
  async login(email: string, password: string): Promise<User> {
    try {
      // In a real implementation, this would call your auth API
      // For now, we'll simulate authentication
      const user = await this.simulateAuth(email, password);
      
      await this.createSession(user);
      
      analytics.track('user_login', {
        user_id: user.id,
        role: user.role,
        organization_id: user.organization?.id,
        method: 'email_password',
      }, 'auth');
      
      return user;
      
    } catch (error) {
      analytics.track('login_failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'auth');
      
      throw errorHandler.handle(error instanceof Error ? error : new Error('Login failed'), {
        email,
        method: 'email_password',
      });
    }
  }

  /**
   * SSO Login
   */
  async ssoLogin(provider: string, token: string): Promise<User> {
    try {
      // Validate SSO token and get user info
      const user = await this.validateSSOToken(provider, token);
      
      await this.createSession(user);
      
      analytics.track('user_login', {
        user_id: user.id,
        role: user.role,
        organization_id: user.organization?.id,
        method: 'sso',
        provider,
      }, 'auth');
      
      return user;
      
    } catch (error) {
      analytics.track('sso_login_failed', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'auth');
      
      throw errorHandler.handle(error instanceof Error ? error : new Error('SSO login failed'), {
        provider,
        method: 'sso',
      });
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      const userId = this.currentUser?.id;
      const sessionId = this.currentSession?.sessionId;
      
      // Clear session from server
      if (sessionId) {
        await this.revokeSession(sessionId);
      }
      
      // Clear local state
      this.currentUser = null;
      this.currentSession = null;
      this.organization = null;
      
      // Clear stored session
      try { sessionStorage.removeItem('madlab_auth_session'); } catch {}
      
      analytics.track('user_logout', {
        user_id: userId,
        session_id: sessionId,
      }, 'auth');
      
    } catch (error) {
      throw errorHandler.handle(error instanceof Error ? error : new Error('Logout failed'));
    }
  }

  /**
   * Check user permissions
   */
  hasPermission(permission: Permission): boolean {
    return this.currentUser?.permissions.includes(permission) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasRole(...roles: UserRole[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current organization
   */
  getCurrentOrganization(): Organization | null {
    return this.organization;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Update preferences on server
      await this.updateUserOnServer({
        ...this.currentUser,
        preferences: { ...this.currentUser.preferences, ...preferences }
      });
      
      // Update local user
      this.currentUser.preferences = { ...this.currentUser.preferences, ...preferences };
      
      analytics.track('user_preferences_updated', {
        user_id: this.currentUser.id,
        preferences_updated: Object.keys(preferences),
      }, 'user_action');
      
    } catch (error) {
      throw errorHandler.handle(error instanceof Error ? error : new Error('Failed to update preferences'));
    }
  }

  /**
   * Update organization branding
   */
  async updateOrganizationBranding(branding: Partial<BrandingConfig>): Promise<void> {
    if (!this.organization || !this.hasPermission('org_settings')) {
      throw new Error('Insufficient permissions');
    }

    try {
      const updatedOrg = {
        ...this.organization,
        branding: { ...this.organization.branding, ...branding }
      };
      
      await this.updateOrganizationOnServer(updatedOrg);
      this.organization = updatedOrg;
      
      // Apply branding to DOM
      this.applyBranding(updatedOrg.branding);
      
      analytics.track('organization_branding_updated', {
        organization_id: this.organization.id,
        branding_keys: Object.keys(branding),
      }, 'admin_action');
      
    } catch (error) {
      throw errorHandler.handle(error instanceof Error ? error : new Error('Failed to update branding'));
    }
  }

  /**
   * Apply branding to the application
   */
  applyBranding(branding: BrandingConfig): void {
    const root = document.documentElement;
    
    // Apply vetted CSS custom properties only (avoid arbitrary CSS injection)
    if (branding.primaryColor) {
      root.style.setProperty('--primary', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      root.style.setProperty('--secondary', branding.secondaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty('--accent', branding.accentColor);
    }
    if (branding.fontFamily) {
      root.style.setProperty('--font-family', branding.fontFamily);
    }
    
    // Update document title
    if (branding.applicationName) {
      document.title = branding.applicationName;
    }
    
    // Update favicon
    if (branding.faviconUrl) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = branding.faviconUrl;
      }
    }
    
    // Do not inject arbitrary CSS into the DOM in multi-tenant contexts
  }

  // Private methods

  private async simulateAuth(email: string, password: string): Promise<User> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock user based on email domain
    const domain = email.split('@')[1];
    const isEnterprise = ['company.com', 'corp.com', 'enterprise.com'].includes(domain);
    
    return {
      id: `user_${Date.now()}`,
      email,
      name: email.split('@')[0].replace(/[._]/g, ' '),
      role: isEnterprise ? 'enterprise_user' : 'analyst',
      permissions: isEnterprise 
        ? ['read_data', 'write_data', 'manage_widgets', 'export_data', 'api_access']
        : ['read_data', 'write_data'],
      organization: isEnterprise ? {
        id: `org_${domain}`,
        name: domain.split('.')[0].toUpperCase() + ' Corp',
        domain,
        tier: 'enterprise',
        settings: this.getDefaultOrgSettings(),
        branding: this.getDefaultBranding(),
        features: this.getDefaultFeatures(true),
        limits: this.getDefaultLimits('enterprise'),
      } : undefined,
      preferences: this.getDefaultPreferences(),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  }

  private async validateSSOToken(provider: string, token: string): Promise<User> {
    // In a real implementation, this would validate the SSO token
    // For now, we'll simulate
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.simulateAuth(`sso.user@${provider}.com`, 'sso_token');
  }

  private async createSession(user: User): Promise<void> {
    const session: AuthSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours
      lastActivity: Date.now(),
    };
    
    this.currentUser = user;
    this.currentSession = session;
    
    // Store session (sessionStorage reduces persistence and XSS blast radius)
    try { sessionStorage.setItem('madlab_auth_session', JSON.stringify(session)); } catch {}

    // Setup idle timeout auto-logout (15 minutes of inactivity)
    if (typeof window !== 'undefined') {
      const updateActivity = () => {
        if (this.currentSession) this.currentSession.lastActivity = Date.now();
      };
      ['click', 'keydown', 'mousemove', 'scroll', 'visibilitychange'].forEach((evt) =>
        window.addEventListener(evt, updateActivity)
      );
      const idleCheckIntervalMs = 60 * 1000;
      const maxIdleMs = 15 * 60 * 1000;
      const idleTimer = setInterval(() => {
        if (!this.currentSession) return;
        if (Date.now() - this.currentSession.lastActivity > maxIdleMs) {
          clearInterval(idleTimer);
          this.logout();
        }
      }, idleCheckIntervalMs);
    }
    
    // Load organization if exists
    if (user.organization) {
      this.organization = user.organization;
      this.applyBranding(user.organization.branding);
    }
  }

  private async restoreSession(): Promise<void> {
    try {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('madlab_auth_session') : null;
      if (!stored) return;
      
      const session: AuthSession = JSON.parse(stored);
      
      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        try { sessionStorage.removeItem('madlab_auth_session'); } catch {}
        return;
      }
      
      // Validate session with server (simulated)
      const user = await this.validateSession(session);
      
      this.currentSession = session;
      this.currentUser = user;
      
      if (user.organization) {
        this.organization = user.organization;
        this.applyBranding(user.organization.branding);
      }
      
    } catch (error) {
      try { sessionStorage.removeItem('madlab_auth_session'); } catch {}
      console.error('[AuthManager] Session restoration failed:', error);
    }
  }

  private async validateSession(session: AuthSession): Promise<User> {
    // Simulate session validation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Return mock user
    return this.simulateAuth('restored.user@company.com', 'session_token');
  }

  private async revokeSession(sessionId: string): Promise<void> {
    // In a real implementation, this would revoke the session on the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async loadOrganization(orgId: string): Promise<void> {
    // In a real implementation, this would load organization data
    // For now, it's already loaded with the user
  }

  private async updateUserOnServer(user: User): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private async updateOrganizationOnServer(organization: Organization): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private getDefaultOrgSettings(): OrganizationSettings {
    return {
      ssoEnabled: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        maxAge: 90,
        preventReuse: 3,
      },
      sessionTimeout: 480, // 8 hours
      allowGuestAccess: false,
      dataRetentionDays: 365,
    };
  }

  private getDefaultBranding(): BrandingConfig {
    return {
      applicationName: 'MAD LAB Workbench',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      accentColor: '#f59e0b',
    };
  }

  private getDefaultFeatures(isEnterprise: boolean): FeatureFlags {
    return {
      advancedCharts: true,
      aiAgent: isEnterprise,
      dataExport: isEnterprise,
      apiAccess: isEnterprise,
      customWidgets: true,
      collaboration: isEnterprise,
      advancedAnalytics: isEnterprise,
      whitelabeling: isEnterprise,
    };
  }

  private getDefaultLimits(tier: 'free' | 'professional' | 'enterprise'): UsageLimits {
    const limits = {
      free: {
        maxUsers: 3,
        maxDataQueries: 1000,
        maxStorageGB: 1,
        maxWidgets: 10,
        maxCustomIndicators: 5,
        apiCallsPerMonth: 10000,
      },
      professional: {
        maxUsers: 25,
        maxDataQueries: 10000,
        maxStorageGB: 10,
        maxWidgets: 50,
        maxCustomIndicators: 25,
        apiCallsPerMonth: 100000,
      },
      enterprise: {
        maxUsers: -1, // unlimited
        maxDataQueries: -1,
        maxStorageGB: -1,
        maxWidgets: -1,
        maxCustomIndicators: -1,
        apiCallsPerMonth: -1,
      },
    };
    
    return limits[tier];
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'system',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      defaultLayout: 'default',
      notifications: {
        email: true,
        browser: true,
        desktop: false,
        priceAlerts: true,
        systemUpdates: true,
        marketingEmails: false,
      },
      dashboardSettings: {},
    };
  }
}

// Create singleton instance
export const authManager = AuthManager.getInstance();

// Auth context hook for React components
export function useAuth() {
  // Simple state management without React import
  return {
    user: authManager.getCurrentUser(),
    organization: authManager.getCurrentOrganization(),
    login: authManager.login.bind(authManager),
    logout: authManager.logout.bind(authManager),
    hasPermission: authManager.hasPermission.bind(authManager),
    hasRole: authManager.hasRole.bind(authManager),
    updatePreferences: authManager.updateUserPreferences.bind(authManager),
    updateBranding: authManager.updateOrganizationBranding.bind(authManager),
  };
}

export default authManager;