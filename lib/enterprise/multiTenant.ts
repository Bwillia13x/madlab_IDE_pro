import { AdvancedCache } from '@/lib/data/cache';
import { EventEmitter } from 'events';

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: 'basic' | 'professional' | 'enterprise';
  features: string[];
  limits: {
    users: number;
    storage: number; // bytes
    apiCalls: number;
    widgets: number;
    dataProviders: string[];
  };
  settings: {
    theme: string;
    language: string;
    timezone: string;
    currency: string;
    dataRetention: number; // days
  };
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: number;
  createdAt: number;
  updatedAt: number;
}

export interface TenantResource {
  id: string;
  tenantId: string;
  type: 'widget' | 'data' | 'workspace' | 'api';
  name: string;
  size: number; // bytes
  lastAccessed: number;
  metadata: Record<string, any>;
}

export interface TenantUsage {
  tenantId: string;
  period: string; // 'daily' | 'weekly' | 'monthly'
  startDate: number;
  endDate: number;
  metrics: {
    users: number;
    storage: number;
    apiCalls: number;
    widgets: number;
    dataRequests: number;
  };
  limits: {
    users: number;
    storage: number;
    apiCalls: number;
    widgets: number;
  };
  utilization: {
    users: number; // percentage
    storage: number; // percentage
    apiCalls: number; // percentage
    widgets: number; // percentage
  };
}

export interface TenantBilling {
  tenantId: string;
  plan: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: number;
  status: 'active' | 'past_due' | 'cancelled';
  features: string[];
}

export class MultiTenantManager extends EventEmitter {
  private tenantCache: AdvancedCache<Tenant>;
  private userCache: AdvancedCache<TenantUser[]>;
  private resourceCache: AdvancedCache<TenantResource[]>;
  private usageCache: AdvancedCache<TenantUsage[]>;
  private billingCache: AdvancedCache<TenantBilling[]>;
  private currentTenantId?: string;

  constructor() {
    super();
    
    this.tenantCache = new AdvancedCache({
      maxSize: 100,
      defaultTTL: 3600000, // 1 hour
      enableCompression: true,
      evictionStrategy: 'lru'
    });

    this.userCache = new AdvancedCache({
      maxSize: 500,
      defaultTTL: 1800000, // 30 minutes
      enableCompression: true,
      evictionStrategy: 'lru'
    });

    this.resourceCache = new AdvancedCache({
      maxSize: 1000,
      defaultTTL: 900000, // 15 minutes
      enableCompression: true,
      evictionStrategy: 'lru'
    });

    this.usageCache = new AdvancedCache({
      maxSize: 200,
      defaultTTL: 7200000, // 2 hours
      enableCompression: true,
      evictionStrategy: 'lru'
    });

    this.billingCache = new AdvancedCache({
      maxSize: 100,
      defaultTTL: 86400000, // 24 hours
      enableCompression: true,
      evictionStrategy: 'lru'
    });
  }

  /**
   * Set current tenant context
   */
  setCurrentTenant(tenantId: string): void {
    this.currentTenantId = tenantId;
    this.emit('tenantChanged', tenantId);
  }

  /**
   * Get current tenant context
   */
  getCurrentTenant(): string | undefined {
    return this.currentTenantId;
  }

  /**
   * Create a new tenant
   */
  async createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const tenant: Tenant = {
      ...tenantData,
      id: this.generateTenantId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tenantCache.set(`tenant:${tenant.id}`, tenant, { priority: 'high' });
    
    // Initialize default resources
    await this.initializeTenantResources(tenant.id);
    
    this.emit('tenantCreated', tenant);
    return tenant;
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    return this.tenantCache.get(`tenant:${tenantId}`);
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return null;

    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      updatedAt: Date.now()
    };

    this.tenantCache.set(`tenant:${tenantId}`, updatedTenant, { priority: 'high' });
    
    this.emit('tenantUpdated', updatedTenant);
    return updatedTenant;
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId: string): Promise<boolean> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return false;

    // Clean up all tenant resources
    await this.cleanupTenantResources(tenantId);
    
    // Remove from caches
    this.tenantCache.delete(`tenant:${tenantId}`);
    this.userCache.delete(`users:${tenantId}`);
    this.resourceCache.delete(`resources:${tenantId}`);
    this.usageCache.delete(`usage:${tenantId}`);
    this.billingCache.delete(`billing:${tenantId}`);
    
    this.emit('tenantDeleted', tenantId);
    return true;
  }

  /**
   * List all tenants
   */
  async listTenants(): Promise<Tenant[]> {
    const keys = Array.from(this.tenantCache.keys());
    const tenants: Tenant[] = [];
    
    for (const key of keys) {
      if (key.startsWith('tenant:')) {
        const tenant = this.tenantCache.get(key);
        if (tenant) tenants.push(tenant);
      }
    }
    
    return tenants;
  }

  /**
   * Create tenant user
   */
  async createUser(userData: Omit<TenantUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantUser> {
    const user: TenantUser = {
      ...userData,
      id: this.generateUserId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const users = await this.getUsers(userData.tenantId);
    users.push(user);
    this.userCache.set(`users:${userData.tenantId}`, users, { priority: 'high' });
    
    this.emit('userCreated', user);
    return user;
  }

  /**
   * Get users for a tenant
   */
  async getUsers(tenantId: string): Promise<TenantUser[]> {
    return this.userCache.get(`users:${tenantId}`) || [];
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string, tenantId: string): Promise<TenantUser | null> {
    const users = await this.getUsers(tenantId);
    return users.find(u => u.id === userId) || null;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, tenantId: string, updates: Partial<TenantUser>): Promise<TenantUser | null> {
    const users = await this.getUsers(tenantId);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return null;

    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: Date.now()
    };

    this.userCache.set(`users:${tenantId}`, users, { priority: 'high' });
    
    this.emit('userUpdated', users[userIndex]);
    return users[userIndex];
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string, tenantId: string): Promise<boolean> {
    const users = await this.getUsers(tenantId);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return false;

    const deletedUser = users.splice(userIndex, 1)[0];
    this.userCache.set(`users:${tenantId}`, users, { priority: 'high' });
    
    this.emit('userDeleted', deletedUser);
    return true;
  }

  /**
   * Track resource usage
   */
  async trackResourceUsage(
    tenantId: string,
    resourceType: TenantResource['type'],
    name: string,
    size: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const resource: TenantResource = {
      id: this.generateResourceId(),
      tenantId,
      type: resourceType,
      name,
      size,
      lastAccessed: Date.now(),
      metadata
    };

    const resources = await this.getResources(tenantId);
    resources.push(resource);
    this.resourceCache.set(`resources:${tenantId}`, resources, { priority: 'normal' });
    
    // Update usage metrics
    await this.updateUsageMetrics(tenantId, resourceType, size);
  }

  /**
   * Get resources for a tenant
   */
  async getResources(tenantId: string): Promise<TenantResource[]> {
    return this.resourceCache.get(`resources:${tenantId}`) || [];
  }

  /**
   * Get tenant usage metrics
   */
  async getTenantUsage(tenantId: string, period: string = 'monthly'): Promise<TenantUsage | null> {
    const usage = this.usageCache.get(`usage:${tenantId}`) || [];
    return usage.find(u => u.period === period) || null;
  }

  /**
   * Check if tenant has exceeded limits
   */
  async checkTenantLimits(tenantId: string): Promise<{
    exceeded: boolean;
    limits: string[];
    warnings: string[];
  }> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      return { exceeded: false, limits: [], warnings: [] };
    }

    const usage = await this.getTenantUsage(tenantId, 'monthly');
    if (!usage) {
      return { exceeded: false, limits: [], warnings: [] };
    }

    const exceeded: string[] = [];
    const warnings: string[] = [];

    // Check user limit
    if (usage.metrics.users > usage.limits.users) {
      exceeded.push('users');
    } else if (usage.metrics.users > usage.limits.users * 0.8) {
      warnings.push('users');
    }

    // Check storage limit
    if (usage.metrics.storage > usage.limits.storage) {
      exceeded.push('storage');
    } else if (usage.metrics.storage > usage.limits.storage * 0.8) {
      warnings.push('storage');
    }

    // Check API calls limit
    if (usage.metrics.apiCalls > usage.limits.apiCalls) {
      exceeded.push('apiCalls');
    } else if (usage.metrics.apiCalls > usage.limits.apiCalls * 0.8) {
      warnings.push('apiCalls');
    }

    // Check widgets limit
    if (usage.metrics.widgets > usage.limits.widgets) {
      exceeded.push('widgets');
    } else if (usage.metrics.widgets > usage.limits.widgets * 0.8) {
      warnings.push('widgets');
    }

    return {
      exceeded: exceeded.length > 0,
      limits: exceeded,
      warnings
    };
  }

  /**
   * Get tenant billing information
   */
  async getTenantBilling(tenantId: string): Promise<TenantBilling | null> {
    const billing = this.billingCache.get(`billing:${tenantId}`) || [];
    return billing[0] || null;
  }

  /**
   * Update tenant billing
   */
  async updateTenantBilling(tenantId: string, billingData: Partial<TenantBilling>): Promise<TenantBilling | null> {
    const existingBilling = await this.getTenantBilling(tenantId);
    if (!existingBilling) return null;

    const updatedBilling: TenantBilling = {
      ...existingBilling,
      ...billingData
    };

    this.billingCache.set(`billing:${tenantId}`, [updatedBilling], { priority: 'high' });
    
    this.emit('billingUpdated', updatedBilling);
    return updatedBilling;
  }

  /**
   * Get multi-tenant statistics
   */
  getStats(): {
    totalTenants: number;
    totalUsers: number;
    totalResources: number;
    totalUsage: number;
    totalBilling: number;
    cacheStats: {
      tenantCache: any;
      userCache: any;
      resourceCache: any;
      usageCache: any;
      billingCache: any;
    };
  } {
    const tenantKeys = Array.from(this.tenantCache.keys()).filter(k => k.startsWith('tenant:'));
    const userKeys = Array.from(this.userCache.keys()).filter(k => k.startsWith('users:'));
    const resourceKeys = Array.from(this.resourceCache.keys()).filter(k => k.startsWith('resources:'));
    const usageKeys = Array.from(this.usageCache.keys()).filter(k => k.startsWith('usage:'));
    const billingKeys = Array.from(this.billingCache.keys()).filter(k => k.startsWith('billing:'));

    return {
      totalTenants: tenantKeys.length,
      totalUsers: userKeys.length,
      totalResources: resourceKeys.length,
      totalUsage: usageKeys.length,
      totalBilling: billingKeys.length,
      cacheStats: {
        tenantCache: this.tenantCache.getStats(),
        userCache: this.userCache.getStats(),
        resourceCache: this.resourceCache.getStats(),
        usageCache: this.usageCache.getStats(),
        billingCache: this.billingCache.getStats()
      }
    };
  }

  /**
   * Initialize tenant resources
   */
  private async initializeTenantResources(tenantId: string): Promise<void> {
    // Create default workspace
    await this.trackResourceUsage(tenantId, 'workspace', 'Default Workspace', 1024, {
      type: 'default',
      description: 'Default workspace for new tenant'
    });

    // Initialize usage metrics
    const tenant = await this.getTenant(tenantId);
    if (tenant) {
      const usage: TenantUsage = {
        tenantId,
        period: 'monthly',
        startDate: Date.now(),
        endDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        metrics: {
          users: 0,
          storage: 1024,
          apiCalls: 0,
          widgets: 0,
          dataRequests: 0
        },
        limits: tenant.limits,
        utilization: {
          users: 0,
          storage: (1024 / tenant.limits.storage) * 100,
          apiCalls: 0,
          widgets: 0
        }
      };

      this.usageCache.set(`usage:${tenantId}`, [usage], { priority: 'high' });
    }
  }

  /**
   * Cleanup tenant resources
   */
  private async cleanupTenantResources(tenantId: string): Promise<void> {
    // This would typically involve cleaning up database records,
    // file storage, and other persistent resources
    // For now, we just clear the caches
  }

  /**
   * Update usage metrics
   */
  private async updateUsageMetrics(tenantId: string, resourceType: string, size: number): Promise<void> {
    const usage = await this.getTenantUsage(tenantId, 'monthly');
    if (!usage) return;

    // Update relevant metrics based on resource type
    switch (resourceType) {
      case 'widget':
        usage.metrics.widgets++;
        break;
      case 'data':
        usage.metrics.dataRequests++;
        usage.metrics.storage += size;
        break;
      case 'workspace':
        usage.metrics.storage += size;
        break;
    }

    // Recalculate utilization
    usage.utilization.storage = (usage.metrics.storage / usage.limits.storage) * 100;
    usage.utilization.widgets = (usage.metrics.widgets / usage.limits.widgets) * 100;

    this.usageCache.set(`usage:${tenantId}`, [usage], { priority: 'high' });
  }

  /**
   * Generate unique tenant ID
   */
  private generateTenantId(): string {
    return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique resource ID
   */
  private generateResourceId(): string {
    return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.tenantCache.clear();
    this.userCache.clear();
    this.resourceCache.clear();
    this.usageCache.clear();
    this.billingCache.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearCaches();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const multiTenantManager = new MultiTenantManager();

