/**
 * Advanced AI agent with financial domain knowledge and memory management.
 * Provides context-aware financial analysis and intelligent recommendations.
 */

export interface AgentMemory {
  id: string;
  type: 'conversation' | 'analysis' | 'recommendation' | 'error';
  content: string;
  context: Record<string, unknown>;
  timestamp: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  expiresAt?: number;
}

export interface FinancialContext {
  symbol?: string;
  sector?: string;
  marketCap?: number;
  currentPrice?: number;
  timeframes?: string[];
  analysisType?: 'technical' | 'fundamental' | 'risk' | 'options' | 'portfolio';
  userPreferences?: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    investmentHorizon: 'short' | 'medium' | 'long';
    focusAreas: string[];
  };
}

export interface AgentResponse {
  content: string;
  directives: string[];
  confidence: number;
  context: FinancialContext;
  recommendations: string[];
  nextSteps: string[];
  memory: AgentMemory[];
}

export class AdvancedAgent {
  private memory: AgentMemory[] = [];
  private context: FinancialContext = {};
  private maxMemorySize = 100;
  private memoryTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.loadMemory();
  }

  /**
   * Process user input with advanced context awareness
   */
  async processInput(
    message: string,
    currentContext: Partial<FinancialContext>,
    history: Array<{ role: string; content: string }>
  ): Promise<AgentResponse> {
    // Update context with current state
    this.updateContext(currentContext);
    
    // Analyze message intent and extract financial context
    const intent = this.analyzeIntent(message);
    const extractedContext = this.extractFinancialContext(message);
    
    // Merge contexts
    this.mergeContext(extractedContext);
    
    // Generate intelligent response
    const response = await this.generateResponse(message, intent, history);
    
    // Store in memory
    this.storeMemory({
      type: 'conversation',
      content: message,
      context: this.context as Record<string, unknown>,
      timestamp: Date.now(),
      importance: this.calculateImportance(message, intent),
      tags: this.extractTags(message, intent),
    });
    
    return response;
  }

  /**
   * Analyze user intent from message
   */
  private analyzeIntent(message: string): {
    primary: string;
    secondary: string[];
    confidence: number;
  } {
    const lowerMessage = message.toLowerCase();
    
    // Financial analysis intents
    if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
      return {
        primary: 'financial_analysis',
        secondary: ['data_interpretation', 'insights'],
        confidence: 0.9,
      };
    }
    
    if (lowerMessage.includes('risk') || lowerMessage.includes('var') || lowerMessage.includes('volatility')) {
      return {
        primary: 'risk_assessment',
        secondary: ['volatility_analysis', 'stress_testing'],
        confidence: 0.85,
      };
    }
    
    if (lowerMessage.includes('options') || lowerMessage.includes('greeks') || lowerMessage.includes('strike')) {
      return {
        primary: 'options_analysis',
        secondary: ['greeks_calculation', 'strategy_building'],
        confidence: 0.9,
      };
    }
    
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('allocation') || lowerMessage.includes('diversification')) {
      return {
        primary: 'portfolio_optimization',
        secondary: ['asset_allocation', 'risk_management'],
        confidence: 0.8,
      };
    }
    
    if (lowerMessage.includes('valuation') || lowerMessage.includes('dcf') || lowerMessage.includes('pe ratio')) {
      return {
        primary: 'valuation_analysis',
        secondary: ['fundamental_analysis', 'modeling'],
        confidence: 0.85,
      };
    }
    
    // Default to general assistance
    return {
      primary: 'general_assistance',
      secondary: ['information', 'guidance'],
      confidence: 0.6,
    };
  }

  /**
   * Extract financial context from message
   */
  private extractFinancialContext(message: string): Partial<FinancialContext> {
    const context: Partial<FinancialContext> = {};
    
    // Extract symbol
    const symbolMatch = message.match(/\b[A-Z]{1,5}\b/g);
    if (symbolMatch) {
      context.symbol = symbolMatch[0];
    }
    
    // Extract timeframes
    const timeframeMatch = message.match(/(\d+)\s*(day|week|month|year)s?/gi);
    if (timeframeMatch) {
      context.timeframes = timeframeMatch.map(t => t.toLowerCase());
    }
    
    // Extract analysis type
    if (message.match(/technical|chart|price|trend/i)) {
      context.analysisType = 'technical';
    } else if (message.match(/fundamental|financial|earnings|revenue/i)) {
      context.analysisType = 'fundamental';
    } else if (message.match(/risk|volatility|var|stress/i)) {
      context.analysisType = 'risk';
    } else if (message.match(/options|greeks|strike|expiry/i)) {
      context.analysisType = 'options';
    }
    
    return context;
  }

  /**
   * Generate intelligent response based on context
   */
  private async generateResponse(
    message: string,
    intent: ReturnType<typeof this.analyzeIntent>,
    _history: Array<{ role: string; content: string }>
  ): Promise<AgentResponse> {
    const response: AgentResponse = {
      content: '',
      directives: [],
      confidence: intent.confidence,
      context: this.context,
      recommendations: [],
      nextSteps: [],
      memory: [],
    };

    // Generate context-aware content
    response.content = this.generateContextualContent(message, intent);
    
    // Generate relevant directives
    response.directives = this.generateDirectives(intent, this.context);
    
    // Generate recommendations
    response.recommendations = this.generateRecommendations(intent, this.context);
    
    // Generate next steps
    response.nextSteps = this.generateNextSteps(intent, this.context);
    
    // Add relevant memory
    response.memory = this.getRelevantMemory(intent, this.context);

    return response;
  }

  /**
   * Generate contextual content based on intent and financial context
   */
  private generateContextualContent(
    message: string,
    intent: ReturnType<typeof this.analyzeIntent>
  ): string {
    const { primary } = intent;
    
    switch (primary) {
      case 'financial_analysis':
        return this.generateAnalysisContent();
      case 'risk_assessment':
        return this.generateRiskContent();
      case 'options_analysis':
        return this.generateOptionsContent();
      case 'portfolio_optimization':
        return this.generatePortfolioContent();
      case 'valuation_analysis':
        return this.generateValuationContent();
      default:
        return this.generateGeneralContent();
    }
  }

  private generateAnalysisContent(): string {
    const { symbol, analysisType } = this.context;
    let content = '';
    
    if (symbol) {
      content += `I'll help you analyze ${symbol}. `;
    }
    
    if (analysisType === 'technical') {
      content += 'For technical analysis, I recommend starting with price charts and key indicators. ';
    } else if (analysisType === 'fundamental') {
      content += 'For fundamental analysis, let\'s examine financial statements and key ratios. ';
    } else if (analysisType === 'risk') {
      content += 'For risk assessment, we should analyze volatility and potential downside scenarios. ';
    }
    
    content += 'What specific aspect would you like to focus on?';
    return content;
  }

  private generateRiskContent(): string {
    const { symbol } = this.context;
    let content = '';
    
    if (symbol) {
      content += `Let's assess the risk profile for ${symbol}. `;
    }
    
    content += 'I recommend analyzing volatility, calculating VaR metrics, and running stress tests. ';
    content += 'Would you like me to help set up risk analysis widgets?';
    return content;
  }

  private generateOptionsContent(): string {
    const { symbol } = this.context;
    let content = '';
    
    if (symbol) {
      content += `For options analysis on ${symbol}, `;
    }
    
    content += 'we should examine implied volatility, Greeks, and build strategy profiles. ';
    content += 'I can help you set up options chain analysis and Greeks visualization.';
    return content;
  }

  private generatePortfolioContent(): string {
    let content = 'For portfolio optimization, we should analyze asset allocation, correlation matrices, and risk metrics. ';
    content += 'I recommend starting with allocation charts and then diving into specific risk analysis.';
    return content;
  }

  private generateValuationContent(): string {
    const { symbol } = this.context;
    let content = '';
    
    if (symbol) {
      content += `Let's build a comprehensive valuation model for ${symbol}. `;
    }
    
    content += 'We can start with DCF analysis, peer comparisons, and sensitivity testing. ';
    content += 'Would you like me to help set up valuation widgets?';
    return content;
  }

  private generateGeneralContent(): string {
    return 'I\'m here to help with your financial analysis. I can assist with technical analysis, fundamental valuation, risk assessment, options analysis, and portfolio optimization. What would you like to work on?';
  }

  /**
   * Generate relevant agent directives
   */
  private generateDirectives(
    intent: ReturnType<typeof this.analyzeIntent>,
    context: FinancialContext
  ): string[] {
    const directives: string[] = [];
    
    switch (intent.primary) {
      case 'financial_analysis':
        if (context.analysisType === 'technical') {
          directives.push('action:add_widget:candlestick-chart');
          directives.push('action:add_widget:technical-indicators');
        } else if (context.analysisType === 'fundamental') {
          directives.push('action:add_widget:financials-summary');
          directives.push('action:add_widget:dcf-basic');
        }
        break;
        
      case 'risk_assessment':
        directives.push('action:add_widget:var-es');
        directives.push('action:add_widget:stress-scenarios');
        break;
        
      case 'options_analysis':
        directives.push('action:add_widget:options-chain');
        directives.push('action:add_widget:greeks-surface');
        break;
        
      case 'portfolio_optimization':
        directives.push('action:add_widget:portfolio-allocation-charts');
        directives.push('action:add_widget:correlation-matrix');
        break;
        
      case 'valuation_analysis':
        directives.push('action:add_widget:dcf-basic');
        directives.push('action:add_widget:peer-comparison');
        break;
    }
    
    return directives;
  }

  /**
   * Generate intelligent recommendations
   */
  private generateRecommendations(
    intent: ReturnType<typeof this.analyzeIntent>,
    context: FinancialContext
  ): string[] {
    const recommendations: string[] = [];
    
    switch (intent.primary) {
      case 'financial_analysis':
        recommendations.push('Start with a candlestick chart to visualize price action');
        recommendations.push('Add technical indicators for trend analysis');
        recommendations.push('Consider fundamental metrics for long-term perspective');
        break;
        
      case 'risk_assessment':
        recommendations.push('Calculate VaR at different confidence levels');
        recommendations.push('Analyze historical volatility patterns');
        recommendations.push('Run stress tests on key risk factors');
        break;
        
      case 'options_analysis':
        recommendations.push('Examine implied volatility surface');
        recommendations.push('Analyze Greeks for risk management');
        recommendations.push('Build strategy P&L profiles');
        break;
        
      case 'portfolio_optimization':
        recommendations.push('Analyze current asset allocation');
        recommendations.push('Calculate portfolio risk metrics');
        recommendations.push('Identify diversification opportunities');
        break;
        
      case 'valuation_analysis':
        recommendations.push('Build DCF model with multiple scenarios');
        recommendations.push('Compare to peer valuations');
        recommendations.push('Perform sensitivity analysis');
        break;
    }
    
    return recommendations;
  }

  /**
   * Generate next steps for user
   */
  private generateNextSteps(
    intent: ReturnType<typeof this.analyzeIntent>,
    context: FinancialContext
  ): string[] {
    const steps: string[] = [];
    
    steps.push('Review the widgets I\'ve added to your workspace');
    steps.push('Customize the analysis parameters as needed');
    steps.push('Ask me for help interpreting the results');
    
    if (context.symbol) {
      steps.push(`Consider adding more analysis widgets for ${context.symbol}`);
    }
    
    return steps;
  }

  /**
   * Store information in agent memory
   */
  private storeMemory(memory: Omit<AgentMemory, 'id'>): void {
    const newMemory: AgentMemory = {
      ...memory,
      id: this.generateId(),
    };
    
    this.memory.unshift(newMemory);
    
    // Maintain memory size limit
    if (this.memory.length > this.maxMemorySize) {
      this.memory = this.memory.slice(0, this.maxMemorySize);
    }
    
    // Clean expired memory
    this.cleanExpiredMemory();
    
    // Save to localStorage
    this.saveMemory();
  }

  /**
   * Get relevant memory based on current context
   */
  private getRelevantMemory(
    intent: ReturnType<typeof this.analyzeIntent>,
    context: FinancialContext
  ): AgentMemory[] {
    const relevant = this.memory.filter(memory => {
      // Check if memory is relevant to current intent
      const intentRelevant = memory.tags.some(tag => 
        intent.secondary.includes(tag) || intent.primary === tag
      );
      
      // Check if memory is relevant to current context
      const contextRelevant = memory.context.symbol === context.symbol ||
                             memory.context.analysisType === context.analysisType;
      
      return intentRelevant || contextRelevant;
    });
    
    return relevant.slice(0, 5); // Return top 5 relevant memories
  }

  /**
   * Update agent context
   */
  private updateContext(newContext: Partial<FinancialContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Merge extracted context with existing context
   */
  private mergeContext(extractedContext: Partial<FinancialContext>): void {
    this.context = { ...this.context, ...extractedContext };
  }

  /**
   * Calculate importance of memory entry
   */
  private calculateImportance(
    message: string,
    intent: ReturnType<typeof this.analyzeIntent>
  ): AgentMemory['importance'] {
    if (intent.confidence > 0.9) return 'high';
    if (intent.confidence > 0.7) return 'medium';
    if (intent.confidence > 0.5) return 'low';
    return 'low';
  }

  /**
   * Extract tags from message and intent
   */
  private extractTags(
    message: string,
    intent: ReturnType<typeof this.analyzeIntent>
  ): string[] {
    const tags = [intent.primary, ...intent.secondary];
    
    // Extract financial terms
    const financialTerms = message.match(/\b(var|volatility|greeks|dcf|pe|pb|roe|beta)\b/gi);
    if (financialTerms) {
      tags.push(...financialTerms.map(t => t.toLowerCase()));
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Clean expired memory entries
   */
  private cleanExpiredMemory(): void {
    const now = Date.now();
    this.memory = this.memory.filter(memory => {
      if (!memory.expiresAt) return true;
      return now < memory.expiresAt;
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save memory to localStorage
   */
  private saveMemory(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('madlab_agent_memory', JSON.stringify(this.memory));
      }
    } catch (error) {
      console.warn('Failed to save agent memory:', error);
    }
  }

  /**
   * Load memory from localStorage
   */
  private loadMemory(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('madlab_agent_memory');
        if (stored) {
          this.memory = JSON.parse(stored);
          this.cleanExpiredMemory();
        }
      }
    } catch (error) {
      console.warn('Failed to load agent memory:', error);
      this.memory = [];
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    total: number;
    byType: Record<string, number>;
    byImportance: Record<string, number>;
    averageAge: number;
  } {
    const now = Date.now();
    const byType: Record<string, number> = {};
    const byImportance: Record<string, number> = {};
    let totalAge = 0;
    
    this.memory.forEach(memory => {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
      byImportance[memory.importance] = (byImportance[memory.importance] || 0) + 1;
      totalAge += now - memory.timestamp;
    });
    
    return {
      total: this.memory.length,
      byType,
      byImportance,
      averageAge: this.memory.length > 0 ? totalAge / this.memory.length : 0,
    };
  }

  /**
   * Clear all memory
   */
  clearMemory(): void {
    this.memory = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('madlab_agent_memory');
    }
  }
}

// Export singleton instance
export const advancedAgent = new AdvancedAgent();
