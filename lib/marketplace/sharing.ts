import type { MarketplaceTemplate } from './templates';

export interface TemplateShareData {
  id: string;
  title: string;
  description: string;
  kind: string;
  widgets: any[];
  author: string;
  tags: string[];
  version: string;
  compatibility: string[];
  isPublic: boolean;
  allowForking: boolean;
  license: string;
}

export interface TemplateShareResponse {
  success: boolean;
  templateId?: string;
  shareUrl?: string;
  error?: string;
}

export interface TemplateForkData {
  originalTemplateId: string;
  newTitle: string;
  newDescription?: string;
  author: string;
  isPublic: boolean;
}

export interface CommunityTemplate extends MarketplaceTemplate {
  communityId: string;
  originalAuthor: string;
  forkCount: number;
  lastUpdated: string;
  isVerified: boolean;
  communityRating: number;
  reviewCount: number;
  allowForking: boolean;
}

export class TemplateSharingService {
  private static instance: TemplateSharingService;
  private templates: Map<string, CommunityTemplate> = new Map();
  private nextId = 1000; // Start from 1000 to avoid conflicts with built-in templates

  static getInstance(): TemplateSharingService {
    if (!TemplateSharingService.instance) {
      TemplateSharingService.instance = new TemplateSharingService();
    }
    return TemplateSharingService.instance;
  }

  /**
   * Share a template to the community
   */
  async shareTemplate(data: TemplateShareData): Promise<TemplateShareResponse> {
    try {
      // Validate template data
      if (!this.validateTemplate(data)) {
        return {
          success: false,
          error: 'Invalid template data'
        };
      }

      // Generate unique ID
      const templateId = `community_${this.nextId++}`;
      
      // Create community template
      const communityTemplate: CommunityTemplate = {
        id: templateId,
        title: data.title,
        description: data.description,
        kind: data.kind as any,
        widgets: data.widgets,
        author: data.author,
        tags: data.tags,
        version: data.version,
        compatibility: data.compatibility,
        rating: 0,
        popularity: 0,
        downloads: 0,
        views: 0,
        createdAt: new Date().toISOString(),
        communityId: templateId,
        originalAuthor: data.author,
        forkCount: 0,
        lastUpdated: new Date().toISOString(),
        isVerified: false,
        communityRating: 0,
        reviewCount: 0,
        allowForking: data.allowForking
      };

      // Store template
      this.templates.set(templateId, communityTemplate);

      // Generate share URL
      const shareUrl = `${window.location.origin}/marketplace/template/${templateId}`;

      return {
        success: true,
        templateId,
        shareUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fork an existing template
   */
  async forkTemplate(data: TemplateForkData): Promise<TemplateShareResponse> {
    try {
      // Find original template
      const originalTemplate = this.templates.get(data.originalTemplateId);
      if (!originalTemplate) {
        return {
          success: false,
          error: 'Original template not found'
        };
      }

      // Check if forking is allowed
      if (!originalTemplate.allowForking) {
        return {
          success: false,
          error: 'Forking not allowed for this template'
        };
      }

      // Generate unique ID for fork
      const templateId = `community_${this.nextId++}`;
      
      // Create forked template
      const forkedTemplate: CommunityTemplate = {
        ...originalTemplate,
        id: templateId,
        title: data.newTitle,
        description: data.newDescription || originalTemplate.description,
        author: data.author,
        createdAt: new Date().toISOString(),
        communityId: templateId,
        originalAuthor: originalTemplate.originalAuthor,
        forkCount: 0,
        lastUpdated: new Date().toISOString(),
        isVerified: false,
        communityRating: 0,
        reviewCount: 0,
        allowForking: originalTemplate.allowForking
      };

      // Store forked template
      this.templates.set(templateId, forkedTemplate);

      // Update original template fork count
      originalTemplate.forkCount++;

      // Generate share URL
      const shareUrl = `${window.location.origin}/marketplace/template/${templateId}`;

      return {
        success: true,
        templateId,
        shareUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get community templates
   */
  async getCommunityTemplates(filters?: {
    kind?: string;
    author?: string;
    tags?: string[];
    verifiedOnly?: boolean;
  }): Promise<CommunityTemplate[]> {
    let templates = Array.from(this.templates.values());

    // Apply filters
    if (filters?.kind) {
      templates = templates.filter(t => t.kind === filters.kind);
    }
    if (filters?.author) {
      templates = templates.filter(t => t.author === filters.author);
    }
    if (filters?.tags && filters.tags.length > 0) {
      templates = templates.filter(t => 
        t.tags && filters.tags!.some(tag => t.tags!.includes(tag))
      );
    }
    if (filters?.verifiedOnly) {
      templates = templates.filter(t => t.isVerified);
    }

    // Sort by popularity
    templates.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return templates;
  }

  /**
   * Rate a template
   */
  async rateTemplate(templateId: string, rating: number, review?: string): Promise<boolean> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return false;
      }

      // Update rating
      const currentRating = template.communityRating;
      const currentCount = template.reviewCount;
      
      template.communityRating = ((currentRating * currentCount) + rating) / (currentCount + 1);
      template.reviewCount++;

      // Update popularity based on rating
      template.popularity = Math.min(100, (template.popularity || 0) + (rating - 2.5) * 2);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Download a template (increment download count)
   */
  async downloadTemplate(templateId: string): Promise<boolean> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return false;
      }

      template.downloads = (template.downloads || 0) + 1;
      template.popularity = Math.min(100, (template.popularity || 0) + 1);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * View a template (increment view count)
   */
  async viewTemplate(templateId: string): Promise<boolean> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return false;
      }

      template.views = (template.views || 0) + 1;
      template.popularity = Math.min(100, (template.popularity || 0) + 0.1);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify a template (admin function)
   */
  async verifyTemplate(templateId: string): Promise<boolean> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return false;
      }

      template.isVerified = true;
      template.popularity = Math.min(100, (template.popularity || 0) + 10);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate template data
   */
  private validateTemplate(data: TemplateShareData): boolean {
    return !!(
      data.title &&
      data.description &&
      data.kind &&
      data.widgets &&
      data.widgets.length > 0 &&
      data.author &&
      data.version
    );
  }

  /**
   * Export template data
   */
  exportTemplate(templateId: string): string | null {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return null;
      }

      return JSON.stringify(template, null, 2);
    } catch (error) {
      return null;
    }
  }

  /**
   * Import template data
   */
  async importTemplate(templateData: string): Promise<TemplateShareResponse> {
    try {
      const data = JSON.parse(templateData);
      
      // Validate imported data
      if (!this.validateTemplate(data)) {
        return {
          success: false,
          error: 'Invalid template data format'
        };
      }

      // Share the imported template
      return await this.shareTemplate(data);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse template data'
      };
    }
  }
}

// Export singleton instance
export const templateSharingService = TemplateSharingService.getInstance();
