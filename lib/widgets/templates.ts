import { z } from 'zod';

// Template schema for validation
export const WidgetTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  author: z.string(),
  version: z.string(),
  compatibility: z.array(z.string()),
  thumbnail: z.string().optional(),
  config: z.record(z.any()),
  metadata: z
    .object({
      createdAt: z.string().optional(),
      updatedAt: z.string(),
      downloads: z.number().default(0).optional(),
      rating: z.number().default(0).optional(),
      reviews: z.number().default(0).optional(),
    })
    .optional(),
});

export type WidgetTemplate = z.infer<typeof WidgetTemplateSchema>;

// Template categories
export const TEMPLATE_CATEGORIES = {
  CHARTS: 'charts',
  PORTFOLIO: 'portfolio',
  RISK: 'risk',
  NEWS: 'news',
  ANALYSIS: 'analysis',
  TRADING: 'trading',
  CUSTOM: 'custom',
} as const;

// Built-in widget templates
export const BUILTIN_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'basic-line-chart',
    name: 'Basic Line Chart',
    description: 'Simple line chart for price data visualization',
    category: TEMPLATE_CATEGORIES.CHARTS,
    tags: ['chart', 'line', 'basic', 'price'],
    author: 'MAD LAB Team',
    version: '1.0.0',
    compatibility: ['v1.0+'],
    config: {
      title: 'Price Chart',
      symbol: 'AAPL',
      timeframe: '1M',
      showVolume: true,
      showGrid: true,
      showLegend: true,
      colorScheme: 'default',
      height: 400,
    },
    metadata: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      downloads: 1250,
      rating: 4.5,
      reviews: 23,
    },
  },
  {
    id: 'portfolio-dashboard',
    name: 'Portfolio Dashboard',
    description: 'Comprehensive portfolio overview with key metrics',
    category: TEMPLATE_CATEGORIES.PORTFOLIO,
    tags: ['portfolio', 'dashboard', 'metrics', 'overview'],
    author: 'MAD LAB Team',
    version: '1.0.0',
    compatibility: ['v1.0+'],
    config: {
      title: 'Portfolio Overview',
      showTotalValue: true,
      showDailyChange: true,
      showAllocation: true,
      showPerformance: true,
      refreshInterval: 30000,
      theme: 'auto',
    },
    metadata: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      downloads: 890,
      rating: 4.7,
      reviews: 15,
    },
  },
  {
    id: 'risk-metrics',
    name: 'Risk Metrics',
    description: 'Key risk indicators for portfolio analysis',
    category: TEMPLATE_CATEGORIES.RISK,
    tags: ['risk', 'metrics', 'var', 'volatility'],
    author: 'MAD LAB Team',
    version: '1.0.0',
    compatibility: ['v1.0+'],
    config: {
      title: 'Risk Analysis',
      confidenceLevel: 0.95,
      timeHorizon: 1,
      showVaR: true,
      showVolatility: true,
      showBeta: true,
      showSharpeRatio: true,
      updateFrequency: 'daily',
    },
    metadata: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      downloads: 567,
      rating: 4.8,
      reviews: 8,
    },
  },
  {
    id: 'news-feed',
    name: 'Financial News Feed',
    description: 'Real-time financial news and market updates',
    category: TEMPLATE_CATEGORIES.NEWS,
    tags: ['news', 'feed', 'real-time', 'financial'],
    author: 'MAD LAB Team',
    version: '1.0.0',
    compatibility: ['v1.0+'],
    config: {
      title: 'Market News',
      sources: ['reuters', 'bloomberg', 'cnbc'],
      categories: ['markets', 'economy', 'companies'],
      maxArticles: 20,
      autoRefresh: true,
      refreshInterval: 60000,
      showSentiment: true,
    },
    metadata: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      downloads: 432,
      rating: 4.3,
      reviews: 12,
    },
  },
  {
    id: 'correlation-matrix',
    name: 'Correlation Matrix',
    description: 'Asset correlation analysis and visualization',
    category: TEMPLATE_CATEGORIES.ANALYSIS,
    tags: ['correlation', 'matrix', 'analysis', 'assets'],
    author: 'MAD LAB Team',
    version: '1.0.0',
    compatibility: ['v1.0+'],
    config: {
      title: 'Asset Correlations',
      symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
      timeframe: '1Y',
      correlationMethod: 'pearson',
      showHeatmap: true,
      showValues: true,
      colorScheme: 'diverging',
      updateFrequency: 'weekly',
    },
    metadata: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      downloads: 345,
      rating: 4.6,
      reviews: 6,
    },
  },
];

// Template manager class
export class WidgetTemplateManager {
  private templates = new Map<string, WidgetTemplate>();
  private categories = new Map<string, Set<string>>();
  private tags = new Map<string, Set<string>>();

  constructor() {
    this.initializeBuiltinTemplates();
  }

  private initializeBuiltinTemplates() {
    BUILTIN_TEMPLATES.forEach((template) => {
      this.addTemplate(template);
    });
  }

  // Add a new template
  addTemplate(template: WidgetTemplate): boolean {
    try {
      // Validate template
      const validated = WidgetTemplateSchema.parse(template);

      // Check for conflicts
      if (this.templates.has(validated.id)) {
        console.warn(`Template '${validated.id}' already exists. Overwriting.`);
      }

      this.templates.set(validated.id, validated);
      this.updateIndices(validated);

      console.log(`Added template: ${validated.name} (${validated.id})`);
      return true;
    } catch (error) {
      console.error(`Failed to add template ${template.id}:`, error);
      return false;
    }
  }

  // Get template by ID
  getTemplate(id: string): WidgetTemplate | undefined {
    return this.templates.get(id);
  }

  // Get all templates
  getAllTemplates(): WidgetTemplate[] {
    return Array.from(this.templates.values());
  }

  // Get templates by category
  getTemplatesByCategory(category: string): WidgetTemplate[] {
    const ids = this.categories.get(category) || new Set();
    return Array.from(ids)
      .map((id) => this.templates.get(id))
      .filter((template): template is WidgetTemplate => !!template);
  }

  // Search templates
  searchTemplates(query: string): WidgetTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter((template) => {
      return (
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        template.author.toLowerCase().includes(lowerQuery)
      );
    });
  }

  // Get templates by tags
  getTemplatesByTags(tags: string[]): WidgetTemplate[] {
    const tagSet = new Set(tags);
    return this.getAllTemplates().filter((template) =>
      template.tags.some((tag) => tagSet.has(tag))
    );
  }

  // Get popular templates
  getPopularTemplates(limit: number = 10): WidgetTemplate[] {
    return this.getAllTemplates()
      .sort((a, b) => (b.metadata?.downloads || 0) - (a.metadata?.downloads || 0))
      .slice(0, limit);
  }

  // Get recently updated templates
  getRecentTemplates(limit: number = 10): WidgetTemplate[] {
    return this.getAllTemplates()
      .sort(
        (a, b) =>
          new Date(b.metadata?.updatedAt || '').getTime() -
          new Date(a.metadata?.updatedAt || '').getTime()
      )
      .slice(0, limit);
  }

  // Get all categories
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  // Get all tags
  getTags(): string[] {
    return Array.from(this.tags.keys());
  }

  // Update template metadata
  updateTemplateMetadata(id: string, updates: Partial<WidgetTemplate['metadata']>): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    const updatedTemplate: WidgetTemplate = {
      ...template,
      metadata: {
        ...template.metadata,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    };

    this.templates.set(id, updatedTemplate);
    return true;
  }

  // Remove template
  removeTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    // Remove from main collection
    this.templates.delete(id);

    // Remove from indices
    this.categories.get(template.category)?.delete(id);
    template.tags.forEach((tag) => {
      this.tags.get(tag)?.delete(id);
    });

    return true;
  }

  // Export template
  exportTemplate(id: string): string | null {
    const template = this.templates.get(id);
    if (!template) return null;

    try {
      return JSON.stringify(template, null, 2);
    } catch (error) {
      console.error(`Failed to export template ${id}:`, error);
      return null;
    }
  }

  // Import template
  importTemplate(templateData: string): boolean {
    try {
      const template = JSON.parse(templateData);
      return this.addTemplate(template);
    } catch (error) {
      console.error('Failed to import template:', error);
      return false;
    }
  }

  // Get template statistics
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byAuthor: Record<string, number>;
    totalDownloads: number;
    averageRating: number;
  } {
    const stats = {
      total: this.templates.size,
      byCategory: {} as Record<string, number>,
      byAuthor: {} as Record<string, number>,
      totalDownloads: 0,
      totalRating: 0,
      ratedTemplates: 0,
    };

    this.templates.forEach((template) => {
      // Category count
      stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;

      // Author count
      stats.byAuthor[template.author] = (stats.byAuthor[template.author] || 0) + 1;

      // Downloads and rating
      if (template.metadata) {
        const downloads = template.metadata.downloads ?? 0;
        const rating = template.metadata.rating ?? 0;
        stats.totalDownloads += downloads;
        if (rating > 0) {
          stats.totalRating += rating;
          stats.ratedTemplates += 1;
        }
      }
    });

    return {
      total: stats.total,
      byCategory: stats.byCategory,
      byAuthor: stats.byAuthor,
      totalDownloads: stats.totalDownloads,
      averageRating: stats.ratedTemplates > 0 ? stats.totalRating / stats.ratedTemplates : 0,
    };
  }

  // Update indices for fast lookups
  private updateIndices(template: WidgetTemplate) {
    // Category index
    if (!this.categories.has(template.category)) {
      this.categories.set(template.category, new Set());
    }
    this.categories.get(template.category)!.add(template.id);

    // Tag index
    template.tags.forEach((tag) => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(template.id);
    });
  }

  // Clear all templates (useful for testing)
  clear(): void {
    this.templates.clear();
    this.categories.clear();
    this.tags.clear();
  }
}

// Create global template manager instance
export const templateManager = new WidgetTemplateManager();

// Export convenience functions
export function getTemplate(id: string): WidgetTemplate | undefined {
  return templateManager.getTemplate(id);
}

export function getAllTemplates(): WidgetTemplate[] {
  return templateManager.getAllTemplates();
}

export function searchTemplates(query: string): WidgetTemplate[] {
  return templateManager.searchTemplates(query);
}

export function getTemplatesByCategory(category: string): WidgetTemplate[] {
  return templateManager.getTemplatesByCategory(category);
}

export function addTemplate(template: WidgetTemplate): boolean {
  return templateManager.addTemplate(template);
}

export function removeTemplate(id: string): boolean {
  return templateManager.removeTemplate(id);
}
