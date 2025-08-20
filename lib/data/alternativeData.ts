import { EventEmitter } from 'events';

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  source: string;
  author: string;
  publishedAt: Date;
  url: string;
  symbols: string[];
  sentiment: SentimentScore;
  topics: string[];
  relevanceScore: number;
  impact: 'high' | 'medium' | 'low';
  category: 'earnings' | 'merger' | 'regulatory' | 'market' | 'general';
}

export interface SentimentScore {
  overall: number; // -1 to 1
  positive: number; // 0 to 1
  negative: number; // 0 to 1
  neutral: number; // 0 to 1
  confidence: number; // 0 to 1
  keywords: SentimentKeyword[];
}

export interface SentimentKeyword {
  word: string;
  sentiment: number;
  weight: number;
  frequency: number;
}

export interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'reddit' | 'stocktwits' | 'discord' | 'telegram';
  content: string;
  author: string;
  authorFollowers: number;
  authorVerified: boolean;
  publishedAt: Date;
  symbols: string[];
  sentiment: SentimentScore;
  engagement: EngagementMetrics;
  reach: number;
  influence: number;
}

export interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  views: number;
  engagement_rate: number;
}

export interface MarketSentiment {
  symbol: string;
  timestamp: Date;
  overall_sentiment: number;
  news_sentiment: number;
  social_sentiment: number;
  analyst_sentiment: number;
  insider_sentiment: number;
  options_sentiment: number;
  volume_weighted_sentiment: number;
  sentiment_trend: SentimentTrend;
  sentiment_distribution: SentimentDistribution;
}

export interface SentimentTrend {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  momentum: number;
  volatility: number;
  consistency: number;
  timeframe: '1h' | '1d' | '1w' | '1m';
}

export interface SentimentDistribution {
  very_bullish: number;
  bullish: number;
  neutral: number;
  bearish: number;
  very_bearish: number;
  sample_size: number;
}

export interface EconomicIndicator {
  id: string;
  name: string;
  value: number;
  previous_value: number;
  forecast: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  release_date: Date;
  next_release: Date;
  country: string;
  category: 'employment' | 'inflation' | 'gdp' | 'manufacturing' | 'consumer' | 'housing' | 'trade';
  importance: 'high' | 'medium' | 'low';
  market_impact: MarketImpact;
}

export interface MarketImpact {
  expected_volatility: number;
  historical_move: number;
  affected_sectors: string[];
  affected_currencies: string[];
  correlation_strength: number;
}

export interface InsiderTrading {
  id: string;
  symbol: string;
  insider_name: string;
  title: string;
  transaction_date: Date;
  transaction_type: 'buy' | 'sell' | 'exercise' | 'gift';
  shares: number;
  price: number;
  value: number;
  remaining_shares: number;
  ownership_percent: number;
  form_type: '4' | '5' | '144';
  confidence: number;
}

export interface OptionsFlow {
  id: string;
  symbol: string;
  option_type: 'call' | 'put';
  strike: number;
  expiration: Date;
  volume: number;
  open_interest: number;
  premium: number;
  implied_volatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  flow_type: 'sweep' | 'block' | 'split' | 'unusual';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  size_category: 'small' | 'medium' | 'large' | 'whale';
  timestamp: Date;
}

export interface SatelliteData {
  id: string;
  data_type: 'parking_lots' | 'oil_storage' | 'shipping' | 'agriculture' | 'construction' | 'mining';
  location: string;
  coordinates: { lat: number; lng: number };
  measurement: number;
  unit: string;
  capture_date: Date;
  resolution: string;
  confidence: number;
  change_from_previous: number;
  symbol_relevance: SymbolRelevance[];
}

export interface SymbolRelevance {
  symbol: string;
  relevance_score: number;
  correlation_strength: number;
  lead_lag_days: number;
}

export interface AlternativeDataSignal {
  id: string;
  signal_type: 'sentiment' | 'flow' | 'insider' | 'satellite' | 'economic' | 'social';
  symbol: string;
  strength: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  timeframe: '1h' | '1d' | '1w' | '1m';
  data_points: number;
  generated_at: Date;
  expires_at: Date;
  metadata: Record<string, AlternativeDataMetadata>;
}

interface AlternativeDataMetadata {
  source: string;
  confidence: number;
  lastUpdated: Date;
  [key: string]: unknown;
}

export class AlternativeDataProvider extends EventEmitter {
  private newsArticles: Map<string, NewsArticle> = new Map();
  private socialPosts: Map<string, SocialMediaPost> = new Map();
  private marketSentiment: Map<string, MarketSentiment> = new Map();
  private economicIndicators: Map<string, EconomicIndicator> = new Map();
  private insiderTradings: Map<string, InsiderTrading> = new Map();
  private optionsFlows: Map<string, OptionsFlow> = new Map();
  private satelliteData: Map<string, SatelliteData> = new Map();
  private signals: Map<string, AlternativeDataSignal> = new Map();

  constructor() {
    super();
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Initialize with sample data
    this.generateSampleNews();
    this.generateSampleSocialPosts();
    this.generateSampleEconomicIndicators();
  }

  private generateSampleNews(): void {
    const sampleNews: NewsArticle[] = [
      {
        id: 'news_1',
        title: 'Apple Reports Strong Q4 Earnings',
        content: 'Apple Inc. reported strong fourth-quarter earnings with revenue beating expectations...',
        summary: 'Apple beats Q4 earnings expectations with strong iPhone sales',
        source: 'Reuters',
        author: 'John Smith',
        publishedAt: new Date(),
        url: 'https://example.com/news/1',
        symbols: ['AAPL'],
        sentiment: {
          overall: 0.8,
          positive: 0.85,
          negative: 0.10,
          neutral: 0.05,
          confidence: 0.92,
          keywords: [
            { word: 'strong', sentiment: 0.8, weight: 0.3, frequency: 3 },
            { word: 'beats', sentiment: 0.9, weight: 0.4, frequency: 2 }
          ]
        },
        topics: ['earnings', 'revenue', 'iphone'],
        relevanceScore: 0.95,
        impact: 'high',
        category: 'earnings'
      }
    ];

    sampleNews.forEach(article => this.newsArticles.set(article.id, article));
  }

  private generateSampleSocialPosts(): void {
    const samplePosts: SocialMediaPost[] = [
      {
        id: 'social_1',
        platform: 'twitter',
        content: 'Just bought more $TSLA on this dip. Electric future is inevitable! 🚗⚡',
        author: '@investor123',
        authorFollowers: 50000,
        authorVerified: true,
        publishedAt: new Date(),
        symbols: ['TSLA'],
        sentiment: {
          overall: 0.7,
          positive: 0.8,
          negative: 0.1,
          neutral: 0.1,
          confidence: 0.85,
          keywords: [
            { word: 'bought', sentiment: 0.7, weight: 0.4, frequency: 1 },
            { word: 'inevitable', sentiment: 0.8, weight: 0.3, frequency: 1 }
          ]
        },
        engagement: {
          likes: 245,
          shares: 89,
          comments: 34,
          views: 12000,
          engagement_rate: 0.031
        },
        reach: 15000,
        influence: 0.7
      }
    ];

    samplePosts.forEach(post => this.socialPosts.set(post.id, post));
  }

  private generateSampleEconomicIndicators(): void {
    const sampleIndicators: EconomicIndicator[] = [
      {
        id: 'econ_1',
        name: 'Non-Farm Payrolls',
        value: 263000,
        previous_value: 315000,
        forecast: 200000,
        unit: 'jobs',
        frequency: 'monthly',
        release_date: new Date(),
        next_release: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        country: 'US',
        category: 'employment',
        importance: 'high',
        market_impact: {
          expected_volatility: 0.015,
          historical_move: 0.012,
          affected_sectors: ['financials', 'technology'],
          affected_currencies: ['USD', 'EUR'],
          correlation_strength: 0.8
        }
      }
    ];

    sampleIndicators.forEach(indicator => this.economicIndicators.set(indicator.id, indicator));
  }

  async fetchNews(
    symbols?: string[],
    sources?: string[],
    fromDate?: Date,
    toDate?: Date,
    minRelevance?: number
  ): Promise<NewsArticle[]> {
    let articles = Array.from(this.newsArticles.values());

    // Apply filters
    if (symbols && symbols.length > 0) {
      articles = articles.filter(article => 
        article.symbols.some(symbol => symbols.includes(symbol))
      );
    }

    if (sources && sources.length > 0) {
      articles = articles.filter(article => sources.includes(article.source));
    }

    if (fromDate) {
      articles = articles.filter(article => article.publishedAt >= fromDate);
    }

    if (toDate) {
      articles = articles.filter(article => article.publishedAt <= toDate);
    }

    if (minRelevance) {
      articles = articles.filter(article => article.relevanceScore >= minRelevance);
    }

    // Sort by relevance and recency
    articles.sort((a, b) => {
      const relevanceWeight = 0.7;
      const timeWeight = 0.3;
      
      const aScore = a.relevanceScore * relevanceWeight + 
                    (1 - (Date.now() - a.publishedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)) * timeWeight;
      const bScore = b.relevanceScore * relevanceWeight + 
                    (1 - (Date.now() - b.publishedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)) * timeWeight;
      
      return bScore - aScore;
    });

    this.emit('newsDataFetched', { articles, filters: { symbols, sources, fromDate, toDate, minRelevance } });
    return articles;
  }

  async fetchSocialSentiment(
    symbols?: string[],
    platforms?: string[],
    fromDate?: Date,
    minInfluence?: number
  ): Promise<SocialMediaPost[]> {
    let posts = Array.from(this.socialPosts.values());

    // Apply filters
    if (symbols && symbols.length > 0) {
      posts = posts.filter(post => 
        post.symbols.some(symbol => symbols.includes(symbol))
      );
    }

    if (platforms && platforms.length > 0) {
      posts = posts.filter(post => platforms.includes(post.platform));
    }

    if (fromDate) {
      posts = posts.filter(post => post.publishedAt >= fromDate);
    }

    if (minInfluence) {
      posts = posts.filter(post => post.influence >= minInfluence);
    }

    // Sort by influence and engagement
    posts.sort((a, b) => {
      const influenceWeight = 0.6;
      const engagementWeight = 0.4;
      
      const aScore = a.influence * influenceWeight + a.engagement.engagement_rate * engagementWeight;
      const bScore = b.influence * influenceWeight + b.engagement.engagement_rate * engagementWeight;
      
      return bScore - aScore;
    });

    this.emit('socialDataFetched', { posts, filters: { symbols, platforms, fromDate, minInfluence } });
    return posts;
  }

  async calculateMarketSentiment(symbol: string, timeframe: '1h' | '1d' | '1w' | '1m' = '1d'): Promise<MarketSentiment> {
    const now = new Date();
    const timeMap: Record<'1h' | '1d' | '1w' | '1m', number> = {
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1m': 30 * 24 * 60 * 60 * 1000
    };
    
    const fromDate = new Date(now.getTime() - timeMap[timeframe]);

    // Fetch relevant data
    const news = await this.fetchNews([symbol], undefined, fromDate);
    const social = await this.fetchSocialSentiment([symbol], undefined, fromDate);
    const options = Array.from(this.optionsFlows.values()).filter(
      flow => flow.symbol === symbol && flow.timestamp >= fromDate
    );

    // Calculate weighted sentiment
    const newsSentiment = this.calculateNewsSentiment(news);
    const socialSentiment = this.calculateSocialSentiment(social);
    const optionsSentiment = this.calculateOptionsSentiment(options);

    // Weight different sources
    const weights = {
      news: 0.4,
      social: 0.3,
      options: 0.3
    };

    const overall_sentiment = 
      newsSentiment * weights.news +
      socialSentiment * weights.social +
      optionsSentiment * weights.options;

    const sentiment: MarketSentiment = {
      symbol,
      timestamp: now,
      overall_sentiment,
      news_sentiment: newsSentiment,
      social_sentiment: socialSentiment,
      analyst_sentiment: 0, // Would integrate analyst data
      insider_sentiment: 0, // Would integrate insider trading
      options_sentiment: optionsSentiment,
      volume_weighted_sentiment: overall_sentiment, // Simplified
      sentiment_trend: this.calculateSentimentTrend(symbol, timeframe),
      sentiment_distribution: this.calculateSentimentDistribution(news, social)
    };

    this.marketSentiment.set(`${symbol}_${timeframe}`, sentiment);
    this.emit('sentimentCalculated', sentiment);
    
    return sentiment;
  }

  private calculateNewsSentiment(articles: NewsArticle[]): number {
    if (articles.length === 0) return 0;

    let weightedSentiment = 0;
    let totalWeight = 0;

    articles.forEach(article => {
      const weight = article.relevanceScore * article.sentiment.confidence;
      weightedSentiment += article.sentiment.overall * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  private calculateSocialSentiment(posts: SocialMediaPost[]): number {
    if (posts.length === 0) return 0;

    let weightedSentiment = 0;
    let totalWeight = 0;

    posts.forEach(post => {
      const weight = post.influence * post.engagement.engagement_rate;
      weightedSentiment += post.sentiment.overall * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  private calculateOptionsSentiment(flows: OptionsFlow[]): number {
    if (flows.length === 0) return 0;

    let bullishFlow = 0;
    let bearishFlow = 0;
    let totalPremium = 0;

    flows.forEach(flow => {
      const premium = flow.premium * flow.volume;
      totalPremium += premium;

      if (flow.sentiment === 'bullish') {
        bullishFlow += premium;
      } else if (flow.sentiment === 'bearish') {
        bearishFlow += premium;
      }
    });

    if (totalPremium === 0) return 0;
    return (bullishFlow - bearishFlow) / totalPremium;
  }

  private calculateSentimentTrend(symbol: string, timeframe: '1h' | '1d' | '1w' | '1m'): SentimentTrend {
    // Simplified trend calculation
    return {
      direction: 'bullish',
      strength: 0.7,
      momentum: 0.3,
      volatility: 0.2,
      consistency: 0.8,
      timeframe
    };
  }

  private calculateSentimentDistribution(articles: NewsArticle[], posts: SocialMediaPost[]): SentimentDistribution {
    const all_sentiments = [
      ...articles.map(a => a.sentiment.overall),
      ...posts.map(p => p.sentiment.overall)
    ];

    const total = all_sentiments.length;
    if (total === 0) {
      return {
        very_bullish: 0,
        bullish: 0,
        neutral: 0,
        bearish: 0,
        very_bearish: 0,
        sample_size: 0
      };
    }

    const distribution: SentimentDistribution = {
      very_bullish: all_sentiments.filter(s => s > 0.6).length / total,
      bullish: all_sentiments.filter(s => s > 0.2 && s <= 0.6).length / total,
      neutral: all_sentiments.filter(s => s >= -0.2 && s <= 0.2).length / total,
      bearish: all_sentiments.filter(s => s >= -0.6 && s < -0.2).length / total,
      very_bearish: all_sentiments.filter(s => s < -0.6).length / total,
      sample_size: total
    };

    return distribution;
  }

  async fetchInsiderTrading(
    symbols?: string[],
    fromDate?: Date,
    minValue?: number
  ): Promise<InsiderTrading[]> {
    let trades = Array.from(this.insiderTradings.values());

    if (symbols && symbols.length > 0) {
      trades = trades.filter(trade => symbols.includes(trade.symbol));
    }

    if (fromDate) {
      trades = trades.filter(trade => trade.transaction_date >= fromDate);
    }

    if (minValue) {
      trades = trades.filter(trade => Math.abs(trade.value) >= minValue);
    }

    trades.sort((a, b) => b.transaction_date.getTime() - a.transaction_date.getTime());

    this.emit('insiderDataFetched', { trades, filters: { symbols, fromDate, minValue } });
    return trades;
  }

  async fetchOptionsFlow(
    symbols?: string[],
    flowTypes?: string[],
    minPremium?: number
  ): Promise<OptionsFlow[]> {
    let flows = Array.from(this.optionsFlows.values());

    if (symbols && symbols.length > 0) {
      flows = flows.filter(flow => symbols.includes(flow.symbol));
    }

    if (flowTypes && flowTypes.length > 0) {
      flows = flows.filter(flow => flowTypes.includes(flow.flow_type));
    }

    if (minPremium) {
      flows = flows.filter(flow => flow.premium >= minPremium);
    }

    flows.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    this.emit('optionsDataFetched', { flows, filters: { symbols, flowTypes, minPremium } });
    return flows;
  }

  async fetchEconomicIndicators(
    categories?: string[],
    importance?: string[],
    countries?: string[]
  ): Promise<EconomicIndicator[]> {
    let indicators = Array.from(this.economicIndicators.values());

    if (categories && categories.length > 0) {
      indicators = indicators.filter(indicator => categories.includes(indicator.category));
    }

    if (importance && importance.length > 0) {
      indicators = indicators.filter(indicator => importance.includes(indicator.importance));
    }

    if (countries && countries.length > 0) {
      indicators = indicators.filter(indicator => countries.includes(indicator.country));
    }

    indicators.sort((a, b) => b.release_date.getTime() - a.release_date.getTime());

    this.emit('economicDataFetched', { indicators, filters: { categories, importance, countries } });
    return indicators;
  }

  async generateSignals(symbols: string[]): Promise<AlternativeDataSignal[]> {
    const signals: AlternativeDataSignal[] = [];

    for (const symbol of symbols) {
      // Generate sentiment-based signal
      const sentiment = await this.calculateMarketSentiment(symbol);
      if (Math.abs(sentiment.overall_sentiment) > 0.3) {
        signals.push({
          id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          signal_type: 'sentiment',
          symbol,
          strength: Math.abs(sentiment.overall_sentiment),
          direction: sentiment.overall_sentiment > 0 ? 'bullish' : 'bearish',
          confidence: 0.8,
          timeframe: '1d',
          data_points: 100,
          generated_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          metadata: { sentiment_score: { source: 'sentiment', confidence: 1, lastUpdated: new Date() } as unknown as AlternativeDataMetadata }
        });
      }

      // Generate options flow signal
      const recentFlows = await this.fetchOptionsFlow([symbol]);
      const unusualFlows = recentFlows.filter(flow => flow.flow_type === 'unusual');
      
      if (unusualFlows.length > 0) {
        const bullishFlows = unusualFlows.filter(flow => flow.sentiment === 'bullish');
        const bearishFlows = unusualFlows.filter(flow => flow.sentiment === 'bearish');
        
        if (bullishFlows.length > bearishFlows.length * 2) {
          signals.push({
            id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            signal_type: 'flow',
            symbol,
            strength: 0.7,
            direction: 'bullish',
            confidence: 0.75,
            timeframe: '1w',
            data_points: unusualFlows.length,
            generated_at: new Date(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            metadata: { unusual_flows: { source: 'options', confidence: 1, lastUpdated: new Date() } as unknown as AlternativeDataMetadata }
          });
        }
      }
    }

    signals.forEach(signal => this.signals.set(signal.id, signal));
    this.emit('signalsGenerated', signals);
    
    return signals;
  }

  getSignals(symbol?: string, signalType?: string): AlternativeDataSignal[] {
    let signals = Array.from(this.signals.values());

    if (symbol) {
      signals = signals.filter(signal => signal.symbol === symbol);
    }

    if (signalType) {
      signals = signals.filter(signal => signal.signal_type === signalType);
    }

    // Filter out expired signals
    const now = new Date();
    signals = signals.filter(signal => signal.expires_at > now);

    return signals.sort((a, b) => b.strength - a.strength);
  }

  async addNewsArticle(article: Omit<NewsArticle, 'id'>): Promise<NewsArticle> {
    const newArticle: NewsArticle = {
      ...article,
      id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.newsArticles.set(newArticle.id, newArticle);
    this.emit('newsAdded', newArticle);
    
    return newArticle;
  }

  async addSocialPost(post: Omit<SocialMediaPost, 'id'>): Promise<SocialMediaPost> {
    const newPost: SocialMediaPost = {
      ...post,
      id: `social_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.socialPosts.set(newPost.id, newPost);
    this.emit('socialPostAdded', newPost);
    
    return newPost;
  }

  async analyzeSentimentKeywords(text: string): Promise<SentimentKeyword[]> {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'strong', 'bullish', 'buy', 'positive', 'growth', 'beat', 'outperform'];
    const negativeWords = ['bad', 'terrible', 'weak', 'bearish', 'sell', 'negative', 'decline', 'miss', 'underperform', 'concern'];

    const words = text.toLowerCase().split(/\s+/);
    const keywords: SentimentKeyword[] = [];

    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      
      if (positiveWords.includes(cleanWord)) {
        keywords.push({
          word: cleanWord,
          sentiment: 0.8,
          weight: 0.3,
          frequency: 1
        });
      } else if (negativeWords.includes(cleanWord)) {
        keywords.push({
          word: cleanWord,
          sentiment: -0.8,
          weight: 0.3,
          frequency: 1
        });
      }
    });

    return keywords;
  }
}

export const alternativeDataProvider = new AlternativeDataProvider();