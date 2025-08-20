import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { advancedAI, MarketSentiment, MarketPrediction, TechnicalPattern, RiskAssessment } from '@/lib/ai/advancedFeatures';

describe('AdvancedAIFeatures', () => {
  beforeEach(() => {
    // Clear caches before each test
    advancedAI.clearCaches();
  });

  afterEach(() => {
    // Clear caches after each test
    advancedAI.clearCaches();
  });

  describe('Market Sentiment Analysis', () => {
    it('should analyze market sentiment from multiple sources', async () => {
      const sentiment = await advancedAI.analyzeMarketSentiment('AAPL', ['news', 'social', 'technical']);
      
      expect(sentiment).toBeDefined();
      expect(sentiment.symbol).toBe('AAPL');
      expect(sentiment.score).toBeGreaterThanOrEqual(-1);
      expect(sentiment.score).toBeLessThanOrEqual(1);
      expect(sentiment.confidence).toBeGreaterThan(0);
      expect(sentiment.confidence).toBeLessThanOrEqual(1);
      expect(sentiment.sources).toContain('news');
      expect(sentiment.sources).toContain('social');
      expect(sentiment.sources).toContain('technical');
      expect(sentiment.trend).toMatch(/bullish|bearish|neutral/);
      expect(sentiment.volatility).toMatch(/low|medium|high/);
      expect(sentiment.timestamp).toBeGreaterThan(0);
    });

    it('should cache sentiment analysis results', async () => {
      const symbol = 'TSLA';
      const sources = ['news', 'fundamental'];
      
      // First call should compute
      const sentiment1 = await advancedAI.analyzeMarketSentiment(symbol, sources);
      
      // Second call should return cached result
      const sentiment2 = await advancedAI.analyzeMarketSentiment(symbol, sources);
      
      expect(sentiment1).toEqual(sentiment2);
      expect(sentiment1.timestamp).toBe(sentiment2.timestamp);
    });

    it('should handle different source combinations', async () => {
      const symbol = 'MSFT';
      
      const sentiment1 = await advancedAI.analyzeMarketSentiment(symbol, ['news']);
      const sentiment2 = await advancedAI.analyzeMarketSentiment(symbol, ['technical', 'fundamental']);
      
      expect(sentiment1.sources).toEqual(['news']);
      expect(sentiment2.sources).toEqual(['technical', 'fundamental']);
    });
  });

  describe('Market Predictions', () => {
    it('should generate market predictions with technical analysis', async () => {
      const predictions = await advancedAI.generateMarketPredictions('AAPL', '1d', false);
      
      expect(predictions).toBeInstanceOf(Array);
      expect(predictions.length).toBeGreaterThan(0);
      
      const prediction = predictions[0];
      expect(prediction.symbol).toBe('AAPL');
      expect(prediction.direction).toMatch(/up|down|sideways/);
      expect(prediction.confidence).toBeGreaterThan(0.6);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.timeframe).toBe('1d');
      expect(prediction.reasoning).toBeInstanceOf(Array);
      expect(prediction.reasoning.length).toBeGreaterThan(0);
      expect(prediction.riskLevel).toBe('medium');
      expect(prediction.timestamp).toBeGreaterThan(0);
    });

    it('should include risk assessment when requested', async () => {
      const predictions = await advancedAI.generateMarketPredictions('TSLA', '1w', true);
      
      expect(predictions.length).toBeGreaterThan(1);
      
      // Should have both technical and fundamental predictions
      const hasTechnical = predictions.some(p => p.reasoning.some(r => r.includes('Technical')));
      const hasFundamental = predictions.some(p => p.reasoning.some(r => r.includes('Earnings')));
      
      expect(hasTechnical).toBe(true);
      expect(hasFundamental).toBe(true);
    });

    it('should cache prediction results', async () => {
      const symbol = 'GOOGL';
      const timeframe = '1d';
      
      const predictions1 = await advancedAI.generateMarketPredictions(symbol, timeframe, true);
      const predictions2 = await advancedAI.generateMarketPredictions(symbol, timeframe, true);
      
      expect(predictions1).toEqual(predictions2);
    });

    it('should handle different timeframes', async () => {
      const symbol = 'AMZN';
      const timeframes = ['1h', '1d', '1w', '1m'];
      
      for (const timeframe of timeframes) {
        const predictions = await advancedAI.generateMarketPredictions(symbol, timeframe, false);
        expect(predictions.length).toBeGreaterThan(0);
        expect(predictions[0].timeframe).toBe(timeframe);
      }
    });
  });

  describe('Technical Pattern Detection', () => {
    it('should detect technical patterns with confidence scoring', async () => {
      const patterns = await advancedAI.detectTechnicalPatterns('AAPL', '1d', 0.7);
      
      expect(patterns).toBeInstanceOf(Array);
      
      if (patterns.length > 0) {
        const pattern = patterns[0];
        expect(pattern.name).toBeDefined();
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.7);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
        expect(pattern.direction).toMatch(/bullish|bearish/);
        expect(pattern.entryPoint).toBeGreaterThan(0);
        expect(pattern.targetPrice).toBeGreaterThan(0);
        expect(pattern.stopLoss).toBeGreaterThan(0);
        expect(pattern.timeframe).toBe('1d');
        expect(pattern.volume).toMatch(/low|normal|high/);
      }
    });

    it('should respect minimum confidence threshold', async () => {
      const patterns = await advancedAI.detectTechnicalPatterns('TSLA', '1d', 0.9);
      
      for (const pattern of patterns) {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('should cache pattern detection results', async () => {
      const symbol = 'MSFT';
      const timeframe = '1d';
      const minConfidence = 0.7;
      
      const patterns1 = await advancedAI.detectTechnicalPatterns(symbol, timeframe, minConfidence);
      const patterns2 = await advancedAI.detectTechnicalPatterns(symbol, timeframe, minConfidence);
      
      expect(patterns1).toEqual(patterns2);
    });

    it('should handle different timeframes for pattern detection', async () => {
      const symbol = 'GOOGL';
      const timeframes = ['1h', '4h', '1d', '1w'];
      
      for (const timeframe of timeframes) {
        const patterns = await advancedAI.detectTechnicalPatterns(symbol, timeframe, 0.6);
        expect(patterns).toBeInstanceOf(Array);
        if (patterns.length > 0) {
          expect(patterns[0].timeframe).toBe(timeframe);
        }
      }
    });
  });

  describe('Risk Assessment', () => {
    it('should assess risk for trading strategies', async () => {
      const riskAssessment = await advancedAI.assessRisk('AAPL', 'long', 10000, '1d');
      
      expect(riskAssessment).toBeDefined();
      expect(riskAssessment.overallRisk).toMatch(/low|medium|high/);
      expect(riskAssessment.volatilityRisk).toBeGreaterThan(0);
      expect(riskAssessment.volatilityRisk).toBeLessThanOrEqual(1);
      expect(riskAssessment.liquidityRisk).toBeGreaterThan(0);
      expect(riskAssessment.liquidityRisk).toBeLessThanOrEqual(1);
      expect(riskAssessment.marketRisk).toBeGreaterThan(0);
      expect(riskAssessment.marketRisk).toBeLessThanOrEqual(1);
      expect(riskAssessment.specificRisks).toBeInstanceOf(Array);
      expect(riskAssessment.recommendations).toBeInstanceOf(Array);
    });

    it('should provide actionable recommendations', async () => {
      const riskAssessment = await advancedAI.assessRisk('TSLA', 'short', 5000, '1w');
      
      expect(riskAssessment.recommendations.length).toBeGreaterThan(0);
      
      for (const recommendation of riskAssessment.recommendations) {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      }
    });

    it('should cache risk assessment results', async () => {
      const symbol = 'MSFT';
      const strategy = 'swing';
      const positionSize = 15000;
      const timeframe = '1d';
      
      const assessment1 = await advancedAI.assessRisk(symbol, strategy, positionSize, timeframe);
      const assessment2 = await advancedAI.assessRisk(symbol, strategy, positionSize, timeframe);
      
      expect(assessment1).toEqual(assessment2);
    });

    it('should handle different position sizes', async () => {
      const symbol = 'GOOGL';
      const strategy = 'day';
      const timeframe = '1d';
      const positionSizes = [1000, 5000, 10000, 50000];
      
      for (const size of positionSizes) {
        const assessment = await advancedAI.assessRisk(symbol, strategy, size, timeframe);
        expect(assessment).toBeDefined();
        expect(assessment.overallRisk).toMatch(/low|medium|high/);
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should provide comprehensive performance metrics', async () => {
      // Generate some activity first
      await advancedAI.analyzeMarketSentiment('AAPL');
      await advancedAI.generateMarketPredictions('TSLA', '1d');
      await advancedAI.detectTechnicalPatterns('MSFT', '1d');
      await advancedAI.assessRisk('GOOGL', 'long', 10000, '1d');
      
      const metrics = advancedAI.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.sentimentCache).toBeDefined();
      expect(metrics.predictionCache).toBeDefined();
      expect(metrics.patternCache).toBeDefined();
      expect(metrics.riskCache).toBeDefined();
      expect(metrics.totalPredictions).toBeGreaterThan(0);
      expect(metrics.accuracyMetrics).toBeDefined();
      
      // Check accuracy metrics
      expect(metrics.accuracyMetrics.overallAccuracy).toBeGreaterThan(0);
      expect(metrics.accuracyMetrics.overallAccuracy).toBeLessThanOrEqual(1);
      expect(metrics.accuracyMetrics.technicalAccuracy).toBeGreaterThan(0);
      expect(metrics.accuracyMetrics.technicalAccuracy).toBeLessThanOrEqual(1);
      expect(metrics.accuracyMetrics.fundamentalAccuracy).toBeGreaterThan(0);
      expect(metrics.accuracyMetrics.fundamentalAccuracy).toBeLessThanOrEqual(1);
      expect(metrics.accuracyMetrics.sentimentAccuracy).toBeGreaterThan(0);
      expect(metrics.accuracyMetrics.sentimentAccuracy).toBeLessThanOrEqual(1);
    });

    it('should track cache performance', async () => {
      const metrics = advancedAI.getPerformanceMetrics();
      
      expect(metrics.sentimentCache.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.sentimentCache.hitRate).toBeLessThanOrEqual(1);
      expect(metrics.predictionCache.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.predictionCache.hitRate).toBeLessThanOrEqual(1);
      expect(metrics.patternCache.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.patternCache.hitRate).toBeLessThanOrEqual(1);
      expect(metrics.riskCache.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.riskCache.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', async () => {
      // Generate some data
      await advancedAI.analyzeMarketSentiment('AAPL');
      await advancedAI.generateMarketPredictions('TSLA', '1d');
      
      // Verify data exists
      const metricsBefore = advancedAI.getPerformanceMetrics();
      expect(metricsBefore.totalPredictions).toBeGreaterThan(0);
      
      // Clear caches
      advancedAI.clearCaches();
      
      // Verify caches are cleared
      const metricsAfter = advancedAI.getPerformanceMetrics();
      expect(metricsAfter.totalPredictions).toBe(0);
    });

    it('should maintain separate caches for different features', async () => {
      // Generate data for different features
      await advancedAI.analyzeMarketSentiment('AAPL');
      await advancedAI.generateMarketPredictions('TSLA', '1d');
      
      const metrics = advancedAI.getPerformanceMetrics();
      
      // Each cache should have its own stats
      expect(metrics.sentimentCache.totalHits).toBeGreaterThan(0);
      expect(metrics.predictionCache.totalHits).toBeGreaterThan(0);
      expect(metrics.patternCache.totalHits).toBe(0); // No pattern detection yet
      expect(metrics.riskCache.totalHits).toBe(0); // No risk assessment yet
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid symbols gracefully', async () => {
      // Test with empty string
      const sentiment = await advancedAI.analyzeMarketSentiment('', ['news']);
      expect(sentiment).toBeDefined();
      expect(sentiment.symbol).toBe('');
      
      // Test with very long symbol
      const longSymbol = 'A'.repeat(1000);
      const predictions = await advancedAI.generateMarketPredictions(longSymbol, '1d');
      expect(predictions).toBeInstanceOf(Array);
    });

    it('should handle edge cases in confidence calculations', async () => {
      // This tests the internal confidence calculation logic
      // The actual implementation should handle edge cases gracefully
      const sentiment = await advancedAI.analyzeMarketSentiment('EDGE', ['news', 'social', 'technical', 'fundamental']);
      expect(sentiment.confidence).toBeGreaterThan(0);
      expect(sentiment.confidence).toBeLessThanOrEqual(1);
    });
  });
});

