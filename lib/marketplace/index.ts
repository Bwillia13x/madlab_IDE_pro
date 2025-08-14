/**
 * Widget Marketplace MVP Foundation
 * Extensible widget system with marketplace capabilities
 */

import { analytics } from '../analytics';
import { errorHandler } from '../errors';

// Widget marketplace types
export interface MarketplaceWidget {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: {
    name: string;
    email?: string;
    website?: string;
  };
  category: WidgetCategory;
  tags: string[];
  icon: string;
  screenshots: string[];
  
  // Marketplace metadata
  downloads: number;
  rating: number;
  reviewCount: number;
  lastUpdated: string;
  size: number; // in KB
  
  // Technical specs
  dependencies: string[];
  permissions: WidgetPermission[];
  compatibility: {
    minVersion: string;
    maxVersion?: string;
  };
  
  // Installation
  installUrl: string;
  sourceCode?: string;
  documentation?: string;
  
  // Pricing
  pricing: {
    type: 'free' | 'paid' | 'subscription';
    price?: number;
    currency?: string;
    trial?: boolean;
    trialDays?: number;
  };
  
  // Status
  status: 'published' | 'beta' | 'deprecated' | 'removed';
  verified: boolean;
}

export type WidgetCategory = 
  | 'charts'
  | 'analytics' 
  | 'data_visualization'
  | 'portfolio_management'
  | 'risk_management'
  | 'options_trading'
  | 'market_data'
  | 'utilities'
  | 'custom_indicators';

export type WidgetPermission = 
  | 'market_data_access'
  | 'portfolio_access' 
  | 'network_access'
  | 'file_system_access'
  | 'user_preferences'
  | 'notifications';

export interface WidgetInstallation {
  widgetId: string;
  version: string;
  installedAt: string;
  enabled: boolean;
  settings: Record<string, any>;
  autoUpdate: boolean;
}

export interface MarketplaceFilter {
  category?: WidgetCategory;
  tags?: string[];
  priceType?: 'free' | 'paid' | 'all';
  rating?: number;
  verified?: boolean;
  search?: string;
  sortBy?: 'popularity' | 'rating' | 'newest' | 'name';
  sortOrder?: 'asc' | 'desc';
}

class MarketplaceManager {
  private static instance: MarketplaceManager;
  private installedWidgets = new Map<string, WidgetInstallation>();
  private marketplace: MarketplaceWidget[] = [];
  private initialized = false;

  static getInstance(): MarketplaceManager {
    if (!MarketplaceManager.instance) {
      MarketplaceManager.instance = new MarketplaceManager();
    }
    return MarketplaceManager.instance;
  }

  /**
   * Initialize marketplace with sample widgets
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load installed widgets from storage
      this.loadInstalledWidgets();
      
      // Load marketplace catalog
      await this.loadMarketplaceCatalog();
      
      this.initialized = true;
      
      analytics.track('marketplace_initialized', {
        installed_widgets: this.installedWidgets.size,
        available_widgets: this.marketplace.length,
      }, 'feature_usage');
      
    } catch (error) {
      throw errorHandler.handle(error instanceof Error ? error : new Error('Marketplace initialization failed'));
    }
  }

  /**
   * Search and filter marketplace widgets
   */
  searchWidgets(filter: MarketplaceFilter = {}): MarketplaceWidget[] {
    let results = [...this.marketplace];

    // Filter by category
    if (filter.category) {
      results = results.filter(w => w.category === filter.category);
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(w => 
        filter.tags!.some(tag => w.tags.includes(tag))
      );
    }

    // Filter by price type
    if (filter.priceType && filter.priceType !== 'all') {
      results = results.filter(w => w.pricing.type === filter.priceType);
    }

    // Filter by minimum rating
    if (filter.rating) {
      results = results.filter(w => w.rating >= filter.rating!);
    }

    // Filter by verified status
    if (filter.verified !== undefined) {
      results = results.filter(w => w.verified === filter.verified);
    }

    // Search by name/description
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      results = results.filter(w => 
        w.name.toLowerCase().includes(searchTerm) ||
        w.displayName.toLowerCase().includes(searchTerm) ||
        w.description.toLowerCase().includes(searchTerm) ||
        w.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Sort results
    const sortBy = filter.sortBy || 'popularity';
    const sortOrder = filter.sortOrder || 'desc';
    
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'popularity':
          comparison = a.downloads - b.downloads;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'newest':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    analytics.track('marketplace_search', {
      filter,
      results_count: results.length,
    }, 'feature_usage');

    return results;
  }

  /**
   * Install a widget from marketplace
   */
  async installWidget(widgetId: string, version?: string): Promise<void> {
    const widget = this.marketplace.find(w => w.id === widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found in marketplace`);
    }

    try {
      // Check dependencies
      await this.checkDependencies(widget);
      
      // Download and install widget
      await this.downloadWidget(widget, version || widget.version);
      
      // Register installation
      const installation: WidgetInstallation = {
        widgetId: widget.id,
        version: version || widget.version,
        installedAt: new Date().toISOString(),
        enabled: true,
        settings: {},
        autoUpdate: true,
      };
      
      this.installedWidgets.set(widgetId, installation);
      this.saveInstalledWidgets();
      
      analytics.track('widget_installed', {
        widget_id: widgetId,
        widget_name: widget.displayName,
        version: installation.version,
        category: widget.category,
        author: widget.author.name,
      }, 'feature_usage');
      
    } catch (error) {
      throw errorHandler.handle(error instanceof Error ? error : new Error('Widget installation failed'), {
        widget_id: widgetId,
        widget_name: widget.displayName,
      });
    }
  }

  /**
   * Uninstall a widget
   */
  async uninstallWidget(widgetId: string): Promise<void> {
    const installation = this.installedWidgets.get(widgetId);
    if (!installation) {
      throw new Error(`Widget ${widgetId} is not installed`);
    }

    try {
      // Remove widget files and data
      await this.removeWidgetFiles(widgetId);
      
      // Remove from installed widgets
      this.installedWidgets.delete(widgetId);
      this.saveInstalledWidgets();
      
      analytics.track('widget_uninstalled', {
        widget_id: widgetId,
        version: installation.version,
      }, 'feature_usage');
      
    } catch (error) {
      throw errorHandler.handle(error instanceof Error ? error : new Error('Widget uninstallation failed'), {
        widget_id: widgetId,
      });
    }
  }

  /**
   * Enable/disable an installed widget
   */
  toggleWidget(widgetId: string, enabled: boolean): void {
    const installation = this.installedWidgets.get(widgetId);
    if (!installation) {
      throw new Error(`Widget ${widgetId} is not installed`);
    }

    installation.enabled = enabled;
    this.saveInstalledWidgets();
    
    analytics.track('widget_toggled', {
      widget_id: widgetId,
      enabled,
    }, 'feature_usage');
  }

  /**
   * Update widget settings
   */
  updateWidgetSettings(widgetId: string, settings: Record<string, any>): void {
    const installation = this.installedWidgets.get(widgetId);
    if (!installation) {
      throw new Error(`Widget ${widgetId} is not installed`);
    }

    installation.settings = { ...installation.settings, ...settings };
    this.saveInstalledWidgets();
    
    analytics.track('widget_settings_updated', {
      widget_id: widgetId,
      settings_keys: Object.keys(settings),
    }, 'feature_usage');
  }

  /**
   * Check for widget updates
   */
  async checkForUpdates(): Promise<Array<{ widgetId: string; currentVersion: string; newVersion: string }>> {
    const updates: Array<{ widgetId: string; currentVersion: string; newVersion: string }> = [];
    
    // Avoid downlevelIteration by iterating over an array copy
    for (const [widgetId, installation] of Array.from(this.installedWidgets.entries())) {
      if (installation.autoUpdate) {
        const marketplaceWidget = this.marketplace.find(w => w.id === widgetId);
        if (marketplaceWidget && marketplaceWidget.version !== installation.version) {
          updates.push({
            widgetId,
            currentVersion: installation.version,
            newVersion: marketplaceWidget.version,
          });
        }
      }
    }
    
    analytics.track('widget_updates_checked', {
      total_widgets: this.installedWidgets.size,
      updates_available: updates.length,
    }, 'feature_usage');
    
    return updates;
  }

  /**
   * Get installed widgets
   */
  getInstalledWidgets(): WidgetInstallation[] {
    return Array.from(this.installedWidgets.values());
  }

  /**
   * Get widget details
   */
  getWidgetDetails(widgetId: string): MarketplaceWidget | undefined {
    return this.marketplace.find(w => w.id === widgetId);
  }

  /**
   * Get marketplace statistics
   */
  getMarketplaceStats(): {
    totalWidgets: number;
    installedWidgets: number;
    categories: Record<WidgetCategory, number>;
    topTags: Array<{ tag: string; count: number }>;
  } {
    const categories = this.marketplace.reduce((acc, widget) => {
      acc[widget.category] = (acc[widget.category] || 0) + 1;
      return acc;
    }, {} as Record<WidgetCategory, number>);

    const tagCounts = new Map<string, number>();
    this.marketplace.forEach(widget => {
      widget.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const topTags = Array.from(tagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalWidgets: this.marketplace.length,
      installedWidgets: this.installedWidgets.size,
      categories,
      topTags,
    };
  }

  // Private methods

  private loadInstalledWidgets(): void {
    try {
      const stored = localStorage.getItem('madlab_installed_widgets');
      if (stored) {
        const installations: WidgetInstallation[] = JSON.parse(stored);
        installations.forEach(installation => {
          this.installedWidgets.set(installation.widgetId, installation);
        });
      }
    } catch (error) {
      console.error('[MarketplaceManager] Failed to load installed widgets:', error);
    }
  }

  private saveInstalledWidgets(): void {
    try {
      const installations = Array.from(this.installedWidgets.values());
      localStorage.setItem('madlab_installed_widgets', JSON.stringify(installations));
    } catch (error) {
      console.error('[MarketplaceManager] Failed to save installed widgets:', error);
    }
  }

  private async loadMarketplaceCatalog(): Promise<void> {
    // In a real implementation, this would fetch from marketplace API
    // For now, we'll create sample widgets
    this.marketplace = this.createSampleWidgets();
  }

  private createSampleWidgets(): MarketplaceWidget[] {
    return [
      {
        id: 'advanced-line-chart',
        name: 'advanced-line-chart',
        displayName: 'Advanced Line Chart',
        description: 'Interactive line chart with technical indicators, zoom, and crosshair functionality',
        version: '1.2.0',
        author: { name: 'MAD LAB Team', website: 'https://madlab.ai' },
        category: 'charts',
        tags: ['chart', 'technical-analysis', 'interactive'],
        icon: '📈',
        screenshots: [],
        downloads: 1250,
        rating: 4.8,
        reviewCount: 23,
        lastUpdated: '2024-01-15T00:00:00Z',
        size: 145,
        dependencies: ['recharts', 'react'],
        permissions: ['market_data_access'],
        compatibility: { minVersion: '1.0.0' },
        installUrl: '/widgets/advanced-line-chart',
        pricing: { type: 'free' },
        status: 'published',
        verified: true,
      },
      {
        id: 'monte-carlo-simulator',
        name: 'monte-carlo-simulator',
        displayName: 'Monte Carlo Simulator',
        description: 'Advanced Monte Carlo simulations for portfolio risk analysis using Web Workers',
        version: '2.1.0',
        author: { name: 'QuantLab', email: 'contact@quantlab.com' },
        category: 'risk_management',
        tags: ['simulation', 'risk', 'monte-carlo', 'portfolio'],
        icon: '🎲',
        screenshots: [],
        downloads: 890,
        rating: 4.9,
        reviewCount: 18,
        lastUpdated: '2024-01-12T00:00:00Z',
        size: 89,
        dependencies: ['web-workers'],
        permissions: ['portfolio_access', 'network_access'],
        compatibility: { minVersion: '1.0.0' },
        installUrl: '/widgets/monte-carlo-simulator',
        pricing: { type: 'paid', price: 29.99, currency: 'USD' },
        status: 'published',
        verified: true,
      },
      {
        id: 'options-greeks-dashboard',
        name: 'options-greeks-dashboard',
        displayName: 'Options Greeks Dashboard',
        description: 'Real-time options Greeks calculation and visualization with streaming data',
        version: '1.0.3',
        author: { name: 'DerivativesLab' },
        category: 'options_trading',
        tags: ['options', 'greeks', 'real-time', 'dashboard'],
        icon: '📊',
        screenshots: [],
        downloads: 567,
        rating: 4.6,
        reviewCount: 12,
        lastUpdated: '2024-01-10T00:00:00Z',
        size: 78,
        dependencies: ['streaming-api'],
        permissions: ['market_data_access', 'notifications'],
        compatibility: { minVersion: '1.0.0' },
        installUrl: '/widgets/options-greeks-dashboard',
        pricing: { type: 'subscription', price: 9.99, currency: 'USD' },
        status: 'published',
        verified: false,
      },
    ];
  }

  private async checkDependencies(widget: MarketplaceWidget): Promise<void> {
    // In a real implementation, this would check if dependencies are available
    // For now, we'll just simulate the check
    return Promise.resolve();
  }

  private async downloadWidget(widget: MarketplaceWidget, version: string): Promise<void> {
    // In a real implementation, this would download the widget package
    // For now, we'll just simulate the download
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async removeWidgetFiles(widgetId: string): Promise<void> {
    // In a real implementation, this would remove widget files
    // For now, we'll just simulate the removal
    return Promise.resolve();
  }
}

// Create singleton instance
export const marketplaceManager = MarketplaceManager.getInstance();

export default marketplaceManager;