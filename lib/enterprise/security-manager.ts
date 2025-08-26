import { useState, useEffect, useCallback, useRef } from 'react';

export interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: {
    [resource: string]: {
      read: boolean;
      write: boolean;
      delete: boolean;
      admin: boolean;
    };
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enabled: boolean;
  priority: number;
}

export interface SecurityRule {
  type: 'password' | 'session' | 'access' | 'data' | 'rate-limit';
  condition: string;
  action: 'allow' | 'deny' | 'challenge' | 'log';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // days
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  compliance: string[];
}

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyRotationDays: number;
  encryptedFields: string[];
  masterKeyId: string;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private auditLogs: AuditLogEntry[] = [];
  private permissions = new Map<string, UserPermissions>();
  private securityPolicies: SecurityPolicy[] = [];
  private failedLoginAttempts = new Map<string, { count: number; lastAttempt: Date; lockoutUntil?: Date }>();
  private rateLimiters = new Map<string, { requests: number; windowStart: Date }>();
  private encryptionKeys = new Map<string, { id: string; key: string; expires: Date }>();

  private constructor() {
    this.initializeDefaultPolicies();
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  private initializeDefaultPolicies() {
    // Password policy
    this.securityPolicies.push({
      id: 'password-policy',
      name: 'Password Security Policy',
      description: 'Enforce strong password requirements',
      enabled: true,
      priority: 100,
      rules: [
        {
          type: 'password',
          condition: 'length < 8',
          action: 'deny',
          severity: 'high'
        },
        {
          type: 'password',
          condition: 'no_uppercase',
          action: 'deny',
          severity: 'medium'
        },
        {
          type: 'password',
          condition: 'no_lowercase',
          action: 'deny',
          severity: 'medium'
        },
        {
          type: 'password',
          condition: 'no_numbers',
          action: 'deny',
          severity: 'medium'
        }
      ]
    });

    // Session policy
    this.securityPolicies.push({
      id: 'session-policy',
      name: 'Session Management Policy',
      description: 'Control session timeout and concurrent sessions',
      enabled: true,
      priority: 90,
      rules: [
        {
          type: 'session',
          condition: 'inactive > 30min',
          action: 'challenge',
          severity: 'medium'
        },
        {
          type: 'session',
          condition: 'concurrent_sessions > 5',
          action: 'deny',
          severity: 'high'
        }
      ]
    });

    // Rate limiting policy
    this.securityPolicies.push({
      id: 'rate-limit-policy',
      name: 'API Rate Limiting Policy',
      description: 'Prevent API abuse through rate limiting',
      enabled: true,
      priority: 80,
      rules: [
        {
          type: 'rate-limit',
          condition: 'requests_per_minute > 1000',
          action: 'deny',
          severity: 'medium'
        },
        {
          type: 'rate-limit',
          condition: 'requests_per_hour > 10000',
          action: 'challenge',
          severity: 'high'
        }
      ]
    });
  }

  // User Authentication & Authorization
  async authenticateUser(username: string, password: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    const clientIP = this.getClientIP();
    const userAgent = navigator.userAgent;

    try {
      // Check if account is locked
      const loginAttempts = this.failedLoginAttempts.get(username);
      if (loginAttempts?.lockoutUntil && loginAttempts.lockoutUntil > new Date()) {
        const error = 'Account temporarily locked due to multiple failed login attempts';
        this.logAudit({
          timestamp: new Date(),
          userId: username,
          action: 'LOGIN_FAILED_LOCKED',
          resource: 'authentication',
          details: { username, reason: 'account_locked' },
          ipAddress: clientIP,
          userAgent,
          success: false,
          errorMessage: error
        });
        return { success: false, error };
      }

      // Validate credentials (this would integrate with your actual auth system)
      const isValidCredentials = await this.validateCredentials(username, password);

      if (!isValidCredentials) {
        // Track failed attempts
        const attempts = this.failedLoginAttempts.get(username) || { count: 0, lastAttempt: new Date() };
        attempts.count++;
        attempts.lastAttempt = new Date();

        // Lock account after 5 failed attempts
        if (attempts.count >= 5) {
          attempts.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        this.failedLoginAttempts.set(username, attempts);

        const error = 'Invalid username or password';
        this.logAudit({
          timestamp: new Date(),
          userId: username,
          action: 'LOGIN_FAILED_INVALID',
          resource: 'authentication',
          details: { username, attemptCount: attempts.count },
          ipAddress: clientIP,
          userAgent,
          success: false,
          errorMessage: error
        });

        return { success: false, error };
      }

      // Clear failed attempts on successful login
      this.failedLoginAttempts.delete(username);

      const userId = await this.getUserIdByUsername(username);

      this.logAudit({
        timestamp: new Date(),
        userId,
        action: 'LOGIN_SUCCESS',
        resource: 'authentication',
        details: { username },
        ipAddress: clientIP,
        userAgent,
        success: true
      });

      return { success: true, userId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication error';
      this.logAudit({
        timestamp: new Date(),
        userId: username,
        action: 'LOGIN_ERROR',
        resource: 'authentication',
        details: { username, error: errorMessage },
        ipAddress: clientIP,
        userAgent,
        success: false,
        errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  async validateCredentials(username: string, password: string): Promise<boolean> {
    // This would integrate with your actual authentication system
    // For demo purposes, we'll simulate validation
    return new Promise(resolve => {
      setTimeout(() => {
        // Simulate validation logic
        resolve(username.length > 0 && password.length >= 8);
      }, 100);
    });
  }

  async getUserIdByUsername(username: string): Promise<string> {
    // This would fetch from your user database
    return `user-${username}`;
  }

  // Permission Management
  setUserPermissions(userId: string, permissions: UserPermissions): void {
    this.permissions.set(userId, permissions);
    this.logAudit({
      timestamp: new Date(),
      userId,
      action: 'PERMISSIONS_UPDATED',
      resource: 'permissions',
      details: { permissions },
      success: true
    });
  }

  getUserPermissions(userId: string): UserPermissions | null {
    return this.permissions.get(userId) || null;
  }

  checkPermission(userId: string, resource: string, action: 'read' | 'write' | 'delete' | 'admin'): boolean {
    const permissions = this.permissions.get(userId);
    if (!permissions) return false;

    const resourcePerms = permissions.permissions[resource] || permissions.permissions['*'];
    if (!resourcePerms) return false;

    // Check if user has admin role
    if (permissions.roles.includes('admin')) return true;

    return resourcePerms[action];
  }

  // Role-based Access Control
  assignRole(userId: string, role: string): void {
    const permissions = this.permissions.get(userId);
    if (permissions && !permissions.roles.includes(role)) {
      permissions.roles.push(role);
      this.permissions.set(userId, permissions);
    }
  }

  revokeRole(userId: string, role: string): void {
    const permissions = this.permissions.get(userId);
    if (permissions) {
      permissions.roles = permissions.roles.filter(r => r !== role);
      this.permissions.set(userId, permissions);
    }
  }

  hasRole(userId: string, role: string): boolean {
    const permissions = this.permissions.get(userId);
    return permissions?.roles.includes(role) || false;
  }

  // Audit Logging
  logAudit(entry: Omit<AuditLogEntry, 'id'>): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.auditLogs.push(auditEntry);

    // Keep only last 10000 entries in memory (in production, this would be persisted)
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    // In production, you would also send to external logging service
    console.log('AUDIT:', auditEntry);
  }

  getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    dateFrom?: Date;
    dateTo?: Date;
    success?: boolean;
  }): AuditLogEntry[] {
    let logs = [...this.auditLogs];

    if (filters) {
      logs = logs.filter(entry => {
        if (filters.userId && entry.userId !== filters.userId) return false;
        if (filters.action && entry.action !== filters.action) return false;
        if (filters.resource && entry.resource !== filters.resource) return false;
        if (filters.dateFrom && entry.timestamp < filters.dateFrom) return false;
        if (filters.dateTo && entry.timestamp > filters.dateTo) return false;
        if (filters.success !== undefined && entry.success !== filters.success) return false;
        return true;
      });
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  exportAuditLogs(filters?: any): string {
    const logs = this.getAuditLogs(filters);
    return JSON.stringify(logs, null, 2);
  }

  // Security Policies
  addSecurityPolicy(policy: SecurityPolicy): void {
    this.securityPolicies.push(policy);
    this.securityPolicies.sort((a, b) => b.priority - a.priority);
  }

  updateSecurityPolicy(id: string, updates: Partial<SecurityPolicy>): void {
    const index = this.securityPolicies.findIndex(p => p.id === id);
    if (index >= 0) {
      this.securityPolicies[index] = { ...this.securityPolicies[index], ...updates };
      this.securityPolicies.sort((a, b) => b.priority - a.priority);
    }
  }

  removeSecurityPolicy(id: string): void {
    this.securityPolicies = this.securityPolicies.filter(p => p.id !== id);
  }

  getSecurityPolicies(): SecurityPolicy[] {
    return [...this.securityPolicies];
  }

  evaluateSecurityPolicies(context: {
    type: SecurityRule['type'];
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    action?: string;
  }): { action: SecurityRule['action']; reason?: string } {
    for (const policy of this.securityPolicies) {
      if (!policy.enabled) continue;

      for (const rule of policy.rules) {
        if (rule.type === context.type) {
          // Evaluate rule condition (simplified)
          if (this.evaluateRuleCondition(rule.condition, context)) {
            return {
              action: rule.action,
              reason: `${policy.name}: ${rule.condition}`
            };
          }
        }
      }
    }

    return { action: 'allow' };
  }

  private evaluateRuleCondition(condition: string, context: any): boolean {
    // This is a simplified rule evaluator
    // In production, you'd want a more sophisticated rule engine
    switch (condition) {
      case 'length < 8':
        return context.password?.length < 8;
      case 'inactive > 30min':
        return context.lastActivity && (Date.now() - context.lastActivity) > 30 * 60 * 1000;
      case 'concurrent_sessions > 5':
        return context.sessionCount > 5;
      case 'requests_per_minute > 1000':
        return this.checkRateLimit(context.userId || context.ipAddress, 'minute', 1000);
      default:
        return false;
    }
  }

  // Rate Limiting
  checkRateLimit(identifier: string, window: 'minute' | 'hour', limit: number): boolean {
    const now = new Date();
    const windowMs = window === 'minute' ? 60 * 1000 : 60 * 60 * 1000;

    const limiter = this.rateLimiters.get(identifier);
    if (!limiter) {
      this.rateLimiters.set(identifier, { requests: 1, windowStart: now });
      return false;
    }

    if (now.getTime() - limiter.windowStart.getTime() > windowMs) {
      // Reset window
      limiter.requests = 1;
      limiter.windowStart = now;
      return false;
    }

    if (limiter.requests >= limit) {
      return true; // Rate limit exceeded
    }

    limiter.requests++;
    return false;
  }

  // Data Encryption
  async encryptData(data: string, keyId?: string): Promise<{ encrypted: string; keyId: string }> {
    const key = await this.getEncryptionKey(keyId);
    // This is a simplified encryption example
    // In production, use proper cryptographic libraries
    const encrypted = btoa(JSON.stringify({ data, keyId: key.id }));
    return { encrypted, keyId: key.id };
  }

  async decryptData(encryptedData: string): Promise<string> {
    try {
      const { data, keyId } = JSON.parse(atob(encryptedData));
      // Verify key is still valid
      const key = this.encryptionKeys.get(keyId);
      if (!key || key.expires < new Date()) {
        throw new Error('Encryption key expired or not found');
      }
      return data;
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  private async getEncryptionKey(keyId?: string): Promise<{ id: string; key: string; expires: Date }> {
    if (keyId) {
      const existingKey = this.encryptionKeys.get(keyId);
      if (existingKey && existingKey.expires > new Date()) {
        return existingKey;
      }
    }

    // Generate new key
    const newKey = {
      id: `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      key: Math.random().toString(36).substr(2, 32), // Simplified key generation
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    };

    this.encryptionKeys.set(newKey.id, newKey);
    return newKey;
  }

  // Data Retention
  getDataRetentionPolicies(): DataRetentionPolicy[] {
    return [
      {
        dataType: 'audit_logs',
        retentionPeriod: 7 * 365, // 7 years for compliance
        autoDelete: true,
        archiveBeforeDelete: true,
        compliance: ['GDPR', 'SOX', 'HIPAA']
      },
      {
        dataType: 'user_data',
        retentionPeriod: 3 * 365, // 3 years
        autoDelete: true,
        archiveBeforeDelete: true,
        compliance: ['GDPR']
      },
      {
        dataType: 'analytics_data',
        retentionPeriod: 2 * 365, // 2 years
        autoDelete: true,
        archiveBeforeDelete: false,
        compliance: []
      }
    ];
  }

  // Utility Methods
  private getClientIP(): string {
    // In a real implementation, this would get the actual client IP
    return '127.0.0.1';
  }

  // Cleanup
  clearOldData(): void {
    const now = new Date();

    // Clear old failed login attempts (older than 1 day)
    for (const [username, attempts] of this.failedLoginAttempts.entries()) {
      if (now.getTime() - attempts.lastAttempt.getTime() > 24 * 60 * 60 * 1000) {
        this.failedLoginAttempts.delete(username);
      }
    }

    // Clear old rate limiters (older than 1 hour)
    for (const [identifier, limiter] of this.rateLimiters.entries()) {
      if (now.getTime() - limiter.windowStart.getTime() > 60 * 60 * 1000) {
        this.rateLimiters.delete(identifier);
      }
    }
  }

  // Initialize cleanup interval
  startCleanupInterval(): void {
    setInterval(() => this.clearOldData(), 60 * 60 * 1000); // Clean up every hour
  }
}

// React hook for using security manager
export function useSecurityManager() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const securityManager = useRef(SecurityManager.getInstance());

  useEffect(() => {
    securityManager.current.startCleanupInterval();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await securityManager.current.authenticateUser(username, password);
    if (result.success && result.userId) {
      setCurrentUser(result.userId);
      const userPermissions = securityManager.current.getUserPermissions(result.userId);
      setPermissions(userPermissions);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setPermissions(null);
  }, []);

  const checkPermission = useCallback((resource: string, action: 'read' | 'write' | 'delete' | 'admin') => {
    if (!currentUser) return false;
    return securityManager.current.checkPermission(currentUser, resource, action);
  }, [currentUser]);

  const hasRole = useCallback((role: string) => {
    if (!currentUser) return false;
    return securityManager.current.hasRole(currentUser, role);
  }, [currentUser]);

  const getAuditLogs = useCallback((filters?: any) => {
    return securityManager.current.getAuditLogs(filters);
  }, []);

  return {
    currentUser,
    permissions,
    login,
    logout,
    checkPermission,
    hasRole,
    getAuditLogs,
    securityManager: securityManager.current
  };
}
