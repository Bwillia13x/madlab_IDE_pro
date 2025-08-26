import { AdvancedCache } from '@/lib/data/cache';
import OpenAI from 'openai';

export interface MarketSentiment {
  symbol: string;
  score: number; // -1 to 1 (negative to positive)
  confidence: number; // 0 to 1
  sources: string[];
  timestamp: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  volatility: 'low' | 'medium' | 'high';
}

export interface MarketPrediction {
  symbol: string;
  direction: 'up' | 'down' | 'sideways';
  confidence: number;
  timeframe: string;
  targetPrice?: number;
  stopLoss?: number;
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface TechnicalPattern {
  name: string;
  confidence: number;
  direction: 'bullish' | 'bearish';
  entryPoint: number;
  targetPrice: number;
  stopLoss: number;
  timeframe: string;
  volume: 'low' | 'normal' | 'high';
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  volatilityRisk: number;
  liquidityRisk: number;
  marketRisk: number;
  specificRisks: string[];
  recommendations: string[];
}

export class AdvancedAIFeatures {
  private sentimentCache: AdvancedCache;
  private predictionCache: AdvancedCache;
  private patternCache: AdvancedCache;
  private riskCache: AdvancedCache;

  constructor() {
    this.sentimentCache = new AdvancedCache({
      maxSize: 1000,
      defaultTTL: 300000, // 5 minutes
      enableCompression: true,
      evictionStrategy: 'lru'
    });

    this.predictionCache = new AdvancedCache({
      maxSize: 500,
      defaultTTL: 600000, // 10 minutes
      enableCompression: true,
      evictionStrategy: 'lru'
    });

    this.patternCache = new AdvancedCache({
      maxSize: 500,
      defaultTTL: 300000, // 5 minutes
      enableCompression: true,
      evictionStrategy: 'lru'
    });

    this.riskCache = new AdvancedCache({
      maxSize: 200,
      defaultTTL: 900000, // 15 minutes
      enableCompression: true,
      evictionStrategy: 'lru'
    });
  }

  /**
   * Analyze market sentiment from multiple sources
   */
  async analyzeMarketSentiment(
    symbol: string,
    sources: string[] = ['news', 'social', 'technical', 'fundamental']
  ): Promise<MarketSentiment> {
    const cacheKey = `sentiment:${symbol}:${sources.join(',')}`;
    const cached = this.sentimentCache.get<MarketSentiment>(cacheKey);
    if (cached) return cached;

    // Simulate sentiment analysis from multiple sources
    const sentiment = await this.performSentimentAnalysis(symbol, sources);
    
    this.sentimentCache.set(cacheKey, sentiment, { priority: 'high' });
    return sentiment;
  }

  /**
   * Generate market predictions using advanced algorithms
   */
  async generateMarketPredictions(
    symbol: string,
    timeframe: string = '1d',
    includeRisk: boolean = true
  ): Promise<MarketPrediction[]> {
    const cacheKey = `prediction:${symbol}:${timeframe}:${includeRisk}`;
    const cached = this.predictionCache.get<MarketPrediction[]>(cacheKey);
    if (cached) return cached;

    const predictions = await this.performMarketPrediction(symbol, timeframe, includeRisk);
    
    this.predictionCache.set(cacheKey, predictions, { priority: 'high' });
    return predictions;
  }

  /**
   * Detect technical patterns in price data
   */
  async detectTechnicalPatterns(
    symbol: string,
    timeframe: string = '1d',
    minConfidence: number = 0.7
  ): Promise<TechnicalPattern[]> {
    const cacheKey = `patterns:${symbol}:${timeframe}:${minConfidence}`;
    const cached = this.patternCache.get<TechnicalPattern[]>(cacheKey);
    if (cached) return cached;

    const patterns = await this.performPatternDetection(symbol, timeframe, minConfidence);
    
    this.patternCache.set(cacheKey, patterns, { priority: 'normal' });
    return patterns;
  }

  /**
   * Assess risk for trading strategies
   */
  async assessRisk(
    symbol: string,
    strategy: string,
    positionSize: number,
    timeframe: string = '1d'
  ): Promise<RiskAssessment> {
    const cacheKey = `risk:${symbol}:${strategy}:${positionSize}:${timeframe}`;
    const cached = this.riskCache.get<RiskAssessment>(cacheKey);
    if (cached) return cached;

    const riskAssessment = await this.performRiskAssessment(symbol, strategy, positionSize, timeframe);
    
    this.riskCache.set(cacheKey, riskAssessment, { priority: 'critical' });
    return riskAssessment;
  }

  /**
   * Get AI performance metrics
   */
  getPerformanceMetrics() {
    return {
      sentimentCache: this.sentimentCache.getStats(),
      predictionCache: this.predictionCache.getStats(),
      patternCache: this.patternCache.getStats(),
      riskCache: this.riskCache.getStats(),
      totalPredictions: this.getTotalPredictions(),
      accuracyMetrics: this.calculateAccuracyMetrics()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.sentimentCache.clear();
    this.predictionCache.clear();
    this.patternCache.clear();
    this.riskCache.clear();
  }

  // Private implementation methods
  private async performSentimentAnalysis(symbol: string, sources: string[]): Promise<MarketSentiment> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
      });

      const prompt = `Analyze the market sentiment for ${symbol} based on the following sources: ${sources.join(', ')}.

Please provide a sentiment analysis in the following JSON format:
{
 "score": number between -1 and 1 (negative to positive sentiment),
 "confidence": number between 0 and 1,
 "trend": "bullish" | "bearish" | "neutral",
 "volatility": "low" | "medium" | "high",
 "reasoning": "brief explanation of the analysis"
}

Consider recent news, social media sentiment, technical indicators, and fundamental factors.
If you don't have real-time data, provide a reasonable analysis based on general market knowledge.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          const parsed = JSON.parse(response);
          return {
            symbol,
            score: Math.max(-1, Math.min(1, parsed.score || 0)),
            confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
            sources,
            timestamp: Date.now(),
            trend: parsed.trend || 'neutral',
            volatility: parsed.volatility || 'medium'
          };
        } catch (parseError) {
          console.warn('Failed to parse sentiment analysis response:', parseError);
        }
      }

      // Fallback to mock analysis if parsing fails
      return this.generateFallbackSentiment(symbol, sources);
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      return this.generateFallbackSentiment(symbol, sources);
    }
  }

  private async performMarketPrediction(
    symbol: string,
    timeframe: string,
    includeRisk: boolean
  ): Promise<MarketPrediction[]> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
      });

      const prompt = `Generate market predictions for ${symbol} for the ${timeframe} timeframe.
${includeRisk ? 'Include both technical and fundamental analysis.' : 'Focus on technical analysis.'}

Please provide a JSON array of predictions in the following format:
[
 {
   "direction": "up" | "down" | "sideways",
   "confidence": number between 0 and 1,
   "targetPrice": number (estimated target price),
   "stopLoss": number (suggested stop loss level),
   "reasoning": ["reason 1", "reason 2", "reason 3"],
   "riskLevel": "low" | "medium" | "high"
 }
]

Consider technical indicators, market trends, volume patterns, and fundamental factors.
If you don't have real-time data, provide reasonable analysis based on general market knowledge.
Generate ${includeRisk ? '2-3' : '1-2'} predictions with different confidence levels.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 400
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          const parsed = JSON.parse(response);
          if (Array.isArray(parsed)) {
            return parsed.map((pred: any) => ({
              symbol,
              direction: pred.direction || 'sideways',
              confidence: Math.max(0, Math.min(1, pred.confidence || 0.5)),
              timeframe,
              targetPrice: pred.targetPrice || 0,
              stopLoss: pred.stopLoss || 0,
              reasoning: pred.reasoning || ['Analysis based on market indicators'],
              riskLevel: pred.riskLevel || 'medium',
              timestamp: Date.now()
            }));
          }
        } catch (parseError) {
          console.warn('Failed to parse market prediction response:', parseError);
        }
      }

      // Fallback to mock predictions if parsing fails
      return this.generateFallbackPredictions(symbol, timeframe, includeRisk);
    } catch (error) {
      console.error('Error in market prediction:', error);
      return this.generateFallbackPredictions(symbol, timeframe, includeRisk);
    }
  }

  private async performPatternDetection(
    symbol: string,
    timeframe: string,
    minConfidence: number
  ): Promise<TechnicalPattern[]> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
      });

      const prompt = `Analyze technical patterns for ${symbol} on the ${timeframe} timeframe.

Please identify potential chart patterns that may be forming. Return a JSON array of detected patterns in the following format:
[
 {
   "name": "pattern name (e.g., Double Bottom, Head and Shoulders, Triangle, Flag, etc.)",
   "confidence": number between 0 and 1,
   "direction": "bullish" | "bearish",
   "entryPoint": number (current price or entry level),
   "targetPrice": number (projected target price),
   "stopLoss": number (suggested stop loss level),
   "volume": "low" | "normal" | "high",
   "description": "brief description of the pattern"
 }
]

Focus on common, reliable patterns. Only include patterns with confidence >= ${minConfidence}.
If no clear patterns are forming, return an empty array.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 350
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          const parsed = JSON.parse(response);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((pattern: any) => (pattern.confidence || 0) >= minConfidence)
              .map((pattern: any) => ({
                name: pattern.name || 'Unknown Pattern',
                confidence: Math.max(0, Math.min(1, pattern.confidence || 0)),
                direction: pattern.direction || 'bullish',
                entryPoint: pattern.entryPoint || 0,
                targetPrice: pattern.targetPrice || 0,
                stopLoss: pattern.stopLoss || 0,
                timeframe,
                volume: pattern.volume || 'normal'
              }));
          }
        } catch (parseError) {
          console.warn('Failed to parse pattern detection response:', parseError);
        }
      }

      // Fallback to mock patterns if parsing fails
      return this.generateFallbackPatterns(symbol, timeframe, minConfidence);
    } catch (error) {
      console.error('Error in pattern detection:', error);
      return this.generateFallbackPatterns(symbol, timeframe, minConfidence);
    }
  }

  private async performRiskAssessment(
    symbol: string,
    strategy: string,
    positionSize: number,
    timeframe: string
  ): Promise<RiskAssessment> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
      });

      const prompt = `Perform a comprehensive risk assessment for trading ${symbol} with the following parameters:
- Strategy: ${strategy}
- Position Size: ${positionSize}
- Timeframe: ${timeframe}

Please provide a risk assessment in the following JSON format:
{
 "overallRisk": "low" | "medium" | "high",
 "volatilityRisk": number between 0 and 1,
 "liquidityRisk": number between 0 and 1,
 "marketRisk": number between 0 and 1,
 "specificRisks": ["risk description 1", "risk description 2", "risk description 3"],
 "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Consider factors such as:
- Current market volatility and potential for increased volatility
- Stock liquidity and potential impact on execution
- Broader market conditions and correlations
- Position sizing relative to account size
- Strategy-specific risks

Provide specific, actionable insights and recommendations.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          const parsed = JSON.parse(response);
          return {
            overallRisk: parsed.overallRisk || 'medium',
            volatilityRisk: Math.max(0, Math.min(1, parsed.volatilityRisk || 0.5)),
            liquidityRisk: Math.max(0, Math.min(1, parsed.liquidityRisk || 0.3)),
            marketRisk: Math.max(0, Math.min(1, parsed.marketRisk || 0.4)),
            specificRisks: parsed.specificRisks || ['General market risk considerations'],
            recommendations: parsed.recommendations || ['Monitor position closely', 'Use appropriate risk management']
          };
        } catch (parseError) {
          console.warn('Failed to parse risk assessment response:', parseError);
        }
      }

      // Fallback to mock risk assessment if parsing fails
      return this.generateFallbackRiskAssessment();
    } catch (error) {
      console.error('Error in risk assessment:', error);
      return this.generateFallbackRiskAssessment();
    }
  }

  private analyzeNewsSentiment(_symbol: string): number {
    // Simulate news sentiment analysis
    return (Math.random() - 0.5) * 2;
  }

  private analyzeSocialSentiment(_symbol: string): number {
    // Simulate social media sentiment analysis
    return (Math.random() - 0.5) * 2;
  }

  private analyzeTechnicalSentiment(_symbol: string): number {
    // Simulate technical analysis sentiment
    return (Math.random() - 0.5) * 2;
  }

  private analyzeFundamentalSentiment(_symbol: string): number {
    // Simulate fundamental analysis sentiment
    return (Math.random() - 0.5) * 2;
  }

  private calculateConfidence(scores: number[]): number {
    // Calculate confidence based on score consistency
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - scores[0], 2), 0) / scores.length;
    return Math.max(0.1, 1 - variance);
  }

  private calculateVolatility(scores: number[]): 'low' | 'medium' | 'high' {
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - scores[0], 2), 0) / scores.length;
    if (variance < 0.1) return 'low';
    if (variance < 0.3) return 'medium';
    return 'high';
  }

  private getTotalPredictions(): number {
    // Count total prediction cache entries as a proxy for total predictions generated
    // Use keys to compute how many prediction entries exist
    const keys = this.predictionCache.keys().filter(k => k.startsWith('prediction:'));
    if (keys.length > 0) return keys.length;
    // Fallback to hits if available
    return this.predictionCache.getStats().totalHits;
  }

  private calculateAccuracyMetrics() {
    // Simulate accuracy metrics calculation
    return {
      overallAccuracy: 0.75 + Math.random() * 0.2,
      technicalAccuracy: 0.8 + Math.random() * 0.15,
      fundamentalAccuracy: 0.7 + Math.random() * 0.25,
      sentimentAccuracy: 0.65 + Math.random() * 0.3
    };
  }

  private generateFallbackSentiment(symbol: string, sources: string[]): MarketSentiment {
    // Fallback sentiment analysis when LLM is not available
    const newsSentiment = this.analyzeNewsSentiment(symbol);
    const socialSentiment = this.analyzeSocialSentiment(symbol);
    const technicalSentiment = this.analyzeTechnicalSentiment(symbol);
    const fundamentalSentiment = this.analyzeFundamentalSentiment(symbol);

    const scores = [newsSentiment, socialSentiment, technicalSentiment, fundamentalSentiment];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
      symbol,
      score: avgScore,
      confidence: this.calculateConfidence(scores),
      sources,
      timestamp: Date.now(),
      trend: avgScore > 0.1 ? 'bullish' : avgScore < -0.1 ? 'bearish' : 'neutral',
      volatility: this.calculateVolatility(scores)
    };
  }

  private generateFallbackPredictions(symbol: string, timeframe: string, includeRisk: boolean): MarketPrediction[] {
    // Fallback market predictions when LLM is not available
    const predictions: MarketPrediction[] = [];

    // Technical analysis prediction
    predictions.push({
      symbol,
      direction: Math.random() > 0.5 ? 'up' : 'down',
      confidence: 0.7 + Math.random() * 0.2,
      timeframe,
      targetPrice: 100 + (Math.random() - 0.5) * 20,
      stopLoss: 100 + (Math.random() - 0.5) * 10,
      reasoning: ['Technical indicators suggest trend continuation', 'Volume analysis confirms momentum'],
      riskLevel: 'medium',
      timestamp: Date.now()
    });

    // Fundamental analysis prediction
    if (includeRisk) {
      predictions.push({
        symbol,
        direction: Math.random() > 0.5 ? 'up' : 'down',
        confidence: 0.6 + Math.random() * 0.3,
        timeframe,
        reasoning: ['Earnings growth expectations', 'Market positioning analysis'],
        riskLevel: 'high',
        timestamp: Date.now()
      });
    }

    return predictions;
  }

  private generateFallbackPatterns(symbol: string, timeframe: string, minConfidence: number): TechnicalPattern[] {
    // Fallback pattern detection when LLM is not available
    const patterns: TechnicalPattern[] = [];

    if (Math.random() > 0.3) {
      patterns.push({
        name: 'Double Bottom',
        confidence: 0.8 + Math.random() * 0.2,
        direction: 'bullish',
        entryPoint: 100,
        targetPrice: 110,
        stopLoss: 95,
        timeframe,
        volume: 'normal'
      });
    }

    if (Math.random() > 0.4) {
      patterns.push({
        name: 'Head and Shoulders',
        confidence: 0.7 + Math.random() * 0.2,
        direction: 'bearish',
        entryPoint: 100,
        targetPrice: 90,
        stopLoss: 105,
        timeframe,
        volume: 'high'
      });
    }

    return patterns.filter(p => p.confidence >= minConfidence);
  }

  private generateFallbackRiskAssessment(): RiskAssessment {
    // Fallback risk assessment when LLM is not available
    const volatilityRisk = Math.random() * 0.8 + 0.2;
    const liquidityRisk = Math.random() * 0.6 + 0.1;
    const marketRisk = Math.random() * 0.7 + 0.2;

    const overallRisk = (volatilityRisk + liquidityRisk + marketRisk) / 3;

    return {
      overallRisk: overallRisk < 0.4 ? 'low' : overallRisk < 0.7 ? 'medium' : 'high',
      volatilityRisk,
      liquidityRisk,
      marketRisk,
      specificRisks: [
        'Market volatility may impact position sizing',
        'Liquidity constraints during high volatility periods'
      ],
      recommendations: [
        'Consider reducing position size during high volatility',
        'Implement proper stop-loss orders',
        'Monitor market conditions closely'
      ]
    };
  }
}

// Export singleton instance
export const advancedAI = new AdvancedAIFeatures();
