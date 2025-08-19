import { TemplateSharingService } from './sharing';

interface CreatorProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatar: string;
  joinDate: Date;
  templateCount: number;
  totalDownloads: number;
  averageRating: number;
  isVerified: boolean;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
}

interface UserFeedback {
  id: string;
  userId: string;
  templateId: string;
  rating: number;
  review: string;
  helpful: number;
  timestamp: Date;
  isVerified: boolean;
}

interface MarketingCampaign {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  targetAudience: string[];
  channels: string[];
  budget: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
}

interface LaunchMetrics {
  totalUsers: number;
  totalTemplates: number;
  totalDownloads: number;
  averageRating: number;
  activeCreators: number;
  conversionRate: number;
  userRetention: number;
  topCategories: Array<{ name: string; count: number }>;
  topCreators: Array<{ name: string; templates: number; downloads: number }>;
}

export class MarketplaceLaunch {
  private templateService: TemplateSharingService;
  private creators: Map<string, CreatorProfile> = new Map();
  private feedback: Map<string, UserFeedback[]> = new Map();
  private campaigns: Map<string, MarketingCampaign> = new Map();
  private metrics: LaunchMetrics = {
    totalUsers: 0,
    totalTemplates: 0,
    totalDownloads: 0,
    averageRating: 0,
    activeCreators: 0,
    conversionRate: 0,
    userRetention: 0,
    topCategories: [],
    topCreators: []
  };

  constructor() {
    this.templateService = TemplateSharingService.getInstance();
  }

  /**
   * Register a new creator
   */
  async registerCreator(profile: Omit<CreatorProfile, 'id' | 'joinDate' | 'templateCount' | 'totalDownloads' | 'averageRating' | 'isVerified'>): Promise<string> {
    const creatorId = `creator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const creator: CreatorProfile = {
      ...profile,
      id: creatorId,
      joinDate: new Date(),
      templateCount: 0,
      totalDownloads: 0,
      averageRating: 0,
      isVerified: false
    };

    this.creators.set(creatorId, creator);
    this.updateMetrics();

    return creatorId;
  }

  /**
   * Update creator profile
   */
  async updateCreatorProfile(creatorId: string, updates: Partial<CreatorProfile>): Promise<boolean> {
    const creator = this.creators.get(creatorId);
    if (!creator) return false;

    Object.assign(creator, updates);
    this.creators.set(creatorId, creator);
    this.updateMetrics();

    return true;
  }

  /**
   * Verify a creator
   */
  async verifyCreator(creatorId: string): Promise<boolean> {
    const creator = this.creators.get(creatorId);
    if (!creator) return false;

    creator.isVerified = true;
    this.creators.set(creatorId, creator);
    this.updateMetrics();

    return true;
  }

  /**
   * Submit user feedback
   */
  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'isVerified'>): Promise<string> {
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newFeedback: UserFeedback = {
      ...feedback,
      id: feedbackId,
      timestamp: new Date(),
      isVerified: false
    };

    if (!this.feedback.has(feedback.templateId)) {
      this.feedback.set(feedback.templateId, []);
    }

    this.feedback.get(feedback.templateId)!.push(newFeedback);
    this.updateMetrics();

    return feedbackId;
  }

  /**
   * Mark feedback as helpful
   */
  async markFeedbackHelpful(feedbackId: string): Promise<boolean> {
    const templateFeedbacksArray = Array.from(this.feedback.values());
    for (const templateFeedbacks of templateFeedbacksArray) {
      const feedback = templateFeedbacks.find(f => f.id === feedbackId);
      if (feedback) {
        feedback.helpful++;
        this.updateMetrics();
        return true;
      }
    }
    return false;
  }

  /**
   * Verify user feedback
   */
  async verifyFeedback(feedbackId: string): Promise<boolean> {
    const templateFeedbacksArray = Array.from(this.feedback.values());
    for (const templateFeedbacks of templateFeedbacksArray) {
      const feedback = templateFeedbacks.find(f => f.id === feedbackId);
      if (feedback) {
        feedback.isVerified = true;
        this.updateMetrics();
        return true;
      }
    }
    return false;
  }

  /**
   * Create a marketing campaign
   */
  async createCampaign(campaign: Omit<MarketingCampaign, 'id' | 'status' | 'metrics'>): Promise<string> {
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newCampaign: MarketingCampaign = {
      ...campaign,
      id: campaignId,
      status: 'draft',
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0
      }
    };

    this.campaigns.set(campaignId, newCampaign);
    return campaignId;
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(campaignId: string, status: MarketingCampaign['status']): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    campaign.status = status;
    this.campaigns.set(campaignId, campaign);

    return true;
  }

  /**
   * Update campaign metrics
   */
  async updateCampaignMetrics(campaignId: string, metrics: Partial<MarketingCampaign['metrics']>): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    Object.assign(campaign.metrics, metrics);
    this.campaigns.set(campaignId, campaign);

    return true;
  }

  /**
   * Get creator profile
   */
  async getCreatorProfile(creatorId: string): Promise<CreatorProfile | null> {
    return this.creators.get(creatorId) || null;
  }

  /**
   * Get all creators
   */
  async getAllCreators(): Promise<CreatorProfile[]> {
    return Array.from(this.creators.values());
  }

  /**
   * Get verified creators
   */
  async getVerifiedCreators(): Promise<CreatorProfile[]> {
    return Array.from(this.creators.values()).filter(creator => creator.isVerified);
  }

  /**
   * Get top creators by downloads
   */
  async getTopCreators(limit: number = 10): Promise<CreatorProfile[]> {
    return Array.from(this.creators.values())
      .sort((a, b) => b.totalDownloads - a.totalDownloads)
      .slice(0, limit);
  }

  /**
   * Get feedback for a template
   */
  async getTemplateFeedback(templateId: string): Promise<UserFeedback[]> {
    return this.feedback.get(templateId) || [];
  }

  /**
   * Get verified feedback for a template
   */
  async getVerifiedTemplateFeedback(templateId: string): Promise<UserFeedback[]> {
    const allFeedback = this.feedback.get(templateId) || [];
    return allFeedback.filter(feedback => feedback.isVerified);
  }

  /**
   * Get all campaigns
   */
  async getAllCampaigns(): Promise<MarketingCampaign[]> {
    return Array.from(this.campaigns.values());
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<MarketingCampaign[]> {
    return Array.from(this.campaigns.values()).filter(campaign => campaign.status === 'active');
  }

  /**
   * Get launch metrics
   */
  async getLaunchMetrics(): Promise<LaunchMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get creator statistics
   */
  async getCreatorStats(creatorId: string): Promise<{
    totalTemplates: number;
    totalDownloads: number;
    averageRating: number;
    totalFeedback: number;
    monthlyGrowth: number;
  } | null> {
    const creator = this.creators.get(creatorId);
    if (!creator) return null;

    const templates = await this.templateService.getCommunityTemplates({ author: creator.name });
    const totalFeedback = templates.reduce((sum, template) => {
      const templateFeedback = this.feedback.get(template.id) || [];
      return sum + templateFeedback.length;
    }, 0);

    // Calculate monthly growth (simplified)
    const monthlyGrowth = Math.random() * 20 - 10; // Mock data

    return {
      totalTemplates: creator.templateCount,
      totalDownloads: creator.totalDownloads,
      averageRating: creator.averageRating,
      totalFeedback,
      monthlyGrowth
    };
  }

  /**
   * Get marketplace insights
   */
  async getMarketplaceInsights(): Promise<{
    trendingTemplates: any[];
    popularCategories: Array<{ name: string; growth: number }>;
    userEngagement: {
      dailyActiveUsers: number;
      weeklyActiveUsers: number;
      monthlyActiveUsers: number;
    };
    revenueMetrics: {
      totalRevenue: number;
      averageOrderValue: number;
      conversionRate: number;
    };
  }> {
    // Mock data for insights
    const trendingTemplates = await this.templateService.getCommunityTemplates();
    const popularCategories = [
      { name: 'Trading Strategies', growth: 15.2 },
      { name: 'Risk Management', growth: 12.8 },
      { name: 'Technical Analysis', growth: 8.5 },
      { name: 'Portfolio Optimization', growth: 6.3 }
    ];

    const userEngagement = {
      dailyActiveUsers: Math.floor(Math.random() * 1000) + 500,
      weeklyActiveUsers: Math.floor(Math.random() * 5000) + 2000,
      monthlyActiveUsers: Math.floor(Math.random() * 20000) + 10000
    };

    const revenueMetrics = {
      totalRevenue: Math.floor(Math.random() * 100000) + 50000,
      averageOrderValue: Math.floor(Math.random() * 100) + 50,
      conversionRate: Math.random() * 5 + 2
    };

    return {
      trendingTemplates: trendingTemplates.slice(0, 5),
      popularCategories,
      userEngagement,
      revenueMetrics
    };
  }

  /**
   * Update marketplace metrics
   */
  private updateMetrics(): void {
    // Update total creators
    this.metrics.activeCreators = Array.from(this.creators.values()).filter(c => c.isVerified).length;

    // Update total templates and downloads
    let totalTemplates = 0;
    let totalDownloads = 0;
    let totalRating = 0;
    let ratingCount = 0;

    const creatorsArray1 = Array.from(this.creators.values());
    for (const creator of creatorsArray1) {
      totalTemplates += creator.templateCount;
      totalDownloads += creator.totalDownloads;
      if (creator.averageRating > 0) {
        totalRating += creator.averageRating;
        ratingCount++;
      }
    }

    this.metrics.totalTemplates = totalTemplates;
    this.metrics.totalDownloads = totalDownloads;
    this.metrics.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    // Update top creators
    const creatorsArray2 = Array.from(this.creators.values());
    this.metrics.topCreators = creatorsArray2
      .sort((a, b) => b.totalDownloads - a.totalDownloads)
      .slice(0, 5)
      .map(creator => ({
        name: creator.name,
        templates: creator.templateCount,
        downloads: creator.totalDownloads
      }));

    // Update top categories (mock data)
    this.metrics.topCategories = [
      { name: 'Trading Strategies', count: Math.floor(Math.random() * 100) + 50 },
      { name: 'Risk Management', count: Math.floor(Math.random() * 80) + 40 },
      { name: 'Technical Analysis', count: Math.floor(Math.random() * 60) + 30 },
      { name: 'Portfolio Optimization', count: Math.floor(Math.random() * 40) + 20 }
    ];

    // Update conversion rate (mock data)
    this.metrics.conversionRate = Math.random() * 10 + 5;

    // Update user retention (mock data)
    this.metrics.userRetention = Math.random() * 30 + 60;
  }

  /**
   * Generate creator onboarding checklist
   */
  async getCreatorOnboardingChecklist(creatorId: string): Promise<{
    completed: string[];
    pending: string[];
    total: number;
    progress: number;
  }> {
    const creator = this.creators.get(creatorId);
    if (!creator) throw new Error('Creator not found');

    const checklist = [
      'Complete profile information',
      'Upload profile avatar',
      'Add social media links',
      'Create first template',
      'Verify email address',
      'Complete identity verification',
      'Set up payment method',
      'Read community guidelines'
    ];

    const completed: string[] = [];
    const pending: string[] = [];

    // Check completed items
    if (creator.bio) completed.push('Complete profile information');
    if (creator.avatar) completed.push('Upload profile avatar');
    if (Object.values(creator.socialLinks).some(link => link)) completed.push('Add social media links');
    if (creator.templateCount > 0) completed.push('Create first template');
    if (creator.isVerified) completed.push('Complete identity verification');

    // Add remaining items to pending
    checklist.forEach(item => {
      if (!completed.includes(item)) {
        pending.push(item);
      }
    });

    const total = checklist.length;
    const progress = (completed.length / total) * 100;

    return { completed, pending, total, progress };
  }

  /**
   * Send creator welcome email
   */
  async sendCreatorWelcomeEmail(creatorId: string): Promise<boolean> {
    const creator = this.creators.get(creatorId);
    if (!creator) return false;

    // Mock email sending
    console.log(`Welcome email sent to ${creator.email} for creator ${creator.name}`);
    return true;
  }

  /**
   * Generate marketing report
   */
  async generateMarketingReport(campaignId: string): Promise<{
    campaign: MarketingCampaign;
    performance: {
      roi: number;
      ctr: number;
      cpc: number;
      conversionRate: number;
    };
    recommendations: string[];
  }> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const performance = {
      roi: ((campaign.metrics.conversions * 100 - campaign.metrics.spend) / campaign.metrics.spend) * 100,
      ctr: (campaign.metrics.clicks / campaign.metrics.impressions) * 100,
      cpc: campaign.metrics.spend / campaign.metrics.clicks,
      conversionRate: (campaign.metrics.conversions / campaign.metrics.clicks) * 100
    };

    const recommendations = [
      'Optimize ad copy for better CTR',
      'Target more specific audience segments',
      'Increase budget for high-performing ads',
      'Test different landing page designs'
    ];

    return { campaign, performance, recommendations };
  }
}
