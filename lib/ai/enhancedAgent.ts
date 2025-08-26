import { useWorkspaceStore } from '@/lib/store';

export interface EnhancedAgentContext {
  userId: string;
  userName: string;
  currentSymbol: string;
  currentSheet: string | undefined;
  activeWidgets: Array<{
    id: string;
    type: string;
    title: string;
  }>;
  recentActions: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
  userPreferences: {
    experienceLevel: 'beginner' | 'expert';
    preferredDataSources: string[];
    theme: string;
  };
}

export interface EnhancedAgentResponse {
  content: string;
  confidence: number;
  suggestions: Array<{
    type: 'action' | 'widget' | 'analysis';
    title: string;
    description: string;
    action?: () => void;
  }>;
  followUpQuestions: string[];
  data?: unknown;
  visualizations?: Array<{
    type: 'chart' | 'table' | 'metric';
    title: string;
    data: unknown;
  }>;
}

export interface AgentCapability {
  name: string;
  description: string;
  examples: string[];
  enabled: boolean;
  requiresData: boolean;
}

export class EnhancedAgent {
  private capabilities: Map<string, AgentCapability> = new Map();
  private contextHistory: Map<string, EnhancedAgentContext[]> = new Map();
  private learningData: Map<string, any> = new Map();

  constructor() {
    this.initializeCapabilities();
  }

  private initializeCapabilities() {
    this.capabilities.set('market-analysis', {
      name: 'Market Analysis',
      description: 'Analyze market trends, patterns, and indicators',
      examples: ['analyze AAPL trends', 'show market sentiment', 'identify patterns'],
      enabled: true,
      requiresData: true
    });

    this.capabilities.set('portfolio-optimization', {
      name: 'Portfolio Optimization',
      description: 'Optimize portfolio allocation and risk management',
      examples: ['optimize my portfolio', 'rebalance suggestions', 'risk assessment'],
      enabled: true,
      requiresData: false
    });

    this.capabilities.set('widget-management', {
      name: 'Widget Management',
      description: 'Create, configure, and manage analysis widgets',
      examples: ['add chart widget', 'configure technical indicators', 'create dashboard'],
      enabled: true,
      requiresData: false
    });

    this.capabilities.set('data-export', {
      name: 'Data Export',
      description: 'Export analysis results and data',
      examples: ['export portfolio data', 'download chart', 'save analysis'],
      enabled: true,
      requiresData: false
    });

    this.capabilities.set('educational', {
      name: 'Educational Content',
      description: 'Provide explanations and learning resources',
      examples: ['explain RSI', 'how does DCF work', 'learn about options'],
      enabled: true,
      requiresData: false
    });
  }

  async processQuery(
    query: string,
    context: EnhancedAgentContext
  ): Promise<EnhancedAgentResponse> {
    const startTime = Date.now();

    // Store context for learning
    this.storeContext(context);

    // Analyze query intent
    const intent = this.analyzeIntent(query);
    const confidence = this.calculateConfidence(query, intent);

    // Generate response based on intent
    const response = await this.generateResponse(query, intent, context);

    // Add timing and performance metrics
    const processingTime = Date.now() - startTime;

    // Enhance response with contextual suggestions
    const enhancedResponse = this.enhanceResponse(response, context, intent);

    return {
      ...enhancedResponse,
      confidence,
      processingTime
    } as EnhancedAgentResponse;
  }

  private analyzeIntent(query: string): {
    primary: string;
    secondary: string[];
    entities: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    const lowercaseQuery = query.toLowerCase();

    // Extract entities (symbols, numbers, etc.)
    const entities = this.extractEntities(query);

    // Determine sentiment
    const sentiment = this.analyzeSentiment(query);

    // Determine complexity
    const complexity = this.analyzeComplexity(query);

    // Primary intent classification
    let primary = 'general';

    if (lowercaseQuery.includes('analyze') || lowercaseQuery.includes('analysis')) {
      primary = 'market-analysis';
    } else if (lowercaseQuery.includes('portfolio') || lowercaseQuery.includes('optimize')) {
      primary = 'portfolio-optimization';
    } else if (lowercaseQuery.includes('add') || lowercaseQuery.includes('create') || lowercaseQuery.includes('widget')) {
      primary = 'widget-management';
    } else if (lowercaseQuery.includes('export') || lowercaseQuery.includes('download')) {
      primary = 'data-export';
    } else if (lowercaseQuery.includes('explain') || lowercaseQuery.includes('learn') || lowercaseQuery.includes('what')) {
      primary = 'educational';
    }

    // Secondary intents
    const secondary: string[] = [];
    if (lowercaseQuery.includes('chart') || lowercaseQuery.includes('visual')) {
      secondary.push('visualization');
    }
    if (lowercaseQuery.includes('compare') || lowercaseQuery.includes('vs')) {
      secondary.push('comparison');
    }
    if (lowercaseQuery.includes('predict') || lowercaseQuery.includes('forecast')) {
      secondary.push('prediction');
    }

    return { primary, secondary, entities, sentiment, complexity };
  }

  private extractEntities(query: string): string[] {
    const entities: string[] = [];

    // Extract stock symbols (capital letters, 1-5 characters)
    const symbolRegex = /\b[A-Z]{1,5}\b/g;
    const symbols = query.match(symbolRegex);
    if (symbols) {
      entities.push(...symbols);
    }

    // Extract numbers with common financial patterns
    const numberRegex = /\$?[\d,]+\.?\d*%?/g;
    const numbers = query.match(numberRegex);
    if (numbers) {
      entities.push(...numbers);
    }

    // Extract date/time references
    const dateKeywords = ['today', 'yesterday', 'last week', 'this month', 'Q1', 'Q2', 'Q3', 'Q4', '2023', '2024'];
    dateKeywords.forEach(keyword => {
      if (query.toLowerCase().includes(keyword)) {
        entities.push(keyword);
      }
    });

    return [...new Set(entities)]; // Remove duplicates
  }

  private analyzeSentiment(query: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'bullish', 'up', 'gain', 'profit', 'buy'];
    const negativeWords = ['bad', 'terrible', 'bearish', 'down', 'loss', 'decline', 'sell', 'crash'];

    const lowercaseQuery = query.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowercaseQuery.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowercaseQuery.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private analyzeComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = query.split(' ').length;
    const hasMultipleClauses = (query.match(/,|and|or|but|however/g) || []).length > 1;
    const hasTechnicalTerms = /\b(rsi|macd|bollinger|dcf|capm|beta|gamma|delta|theta|vix)\b/gi.test(query);

    if (wordCount <= 5 && !hasTechnicalTerms) return 'simple';
    if (wordCount <= 15 && !hasMultipleClauses) return 'moderate';
    return 'complex';
  }

  private calculateConfidence(query: string, intent: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on clear intent
    if (intent.primary !== 'general') confidence += 0.2;

    // Increase confidence for specific entities
    if (intent.entities.length > 0) confidence += 0.15;

    // Increase confidence for clear commands
    if (query.includes('add') || query.includes('create') || query.includes('show')) {
      confidence += 0.15;
    }

    // Decrease confidence for ambiguous queries
    if (intent.complexity === 'complex' && intent.entities.length === 0) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1, confidence));
  }

  private async generateResponse(
    query: string,
    intent: any,
    context: EnhancedAgentContext
  ): Promise<Partial<EnhancedAgentResponse>> {
    const response: Partial<EnhancedAgentResponse> = {
      content: '',
      suggestions: [],
      followUpQuestions: [],
      visualizations: []
    };

    switch (intent.primary) {
      case 'market-analysis':
        response.content = await this.generateMarketAnalysis(query, intent, context);
        break;
      case 'portfolio-optimization':
        response.content = this.generatePortfolioOptimization(query, intent, context);
        break;
      case 'widget-management':
        response.content = this.generateWidgetManagement(query, intent, context);
        break;
      case 'data-export':
        response.content = this.generateDataExport(query, intent, context);
        break;
      case 'educational':
        response.content = this.generateEducationalContent(query, intent, context);
        break;
      default:
        response.content = this.generateGeneralResponse(query, intent, context);
    }

    return response;
  }

  private async generateMarketAnalysis(query: string, intent: any, context: EnhancedAgentContext): Promise<string> {
    const symbol = intent.entities.find((entity: string) => /^[A-Z]{1,5}$/.test(entity)) || context.currentSymbol;

    if (!symbol) {
      return "I'd be happy to help you analyze market data! Could you please specify which stock symbol you'd like me to analyze?";
    }

    // Mock market analysis - in real implementation, this would fetch actual data
    const analysis = `Market Analysis for ${symbol}:

📊 **Technical Indicators:**
- RSI: ${Math.floor(Math.random() * 40 + 30)} (${Math.random() > 0.5 ? 'Neutral' : Math.random() > 0.5 ? 'Oversold' : 'Overbought'})
- MACD: ${Math.random() > 0.5 ? 'Bullish crossover' : 'Bearish crossover'}
- Volume: ${(Math.random() * 2 + 1).toFixed(1)}x average

📈 **Price Action:**
- Current trend: ${Math.random() > 0.5 ? 'Upward' : 'Downward'} momentum
- Support level: $${(Math.random() * 50 + 100).toFixed(2)}
- Resistance level: $${(Math.random() * 50 + 150).toFixed(2)}

🎯 **Key Insights:**
• Market sentiment is ${Math.random() > 0.5 ? 'positive' : 'mixed'}
• Trading volume suggests ${Math.random() > 0.5 ? 'strong' : 'moderate'} conviction
• Consider monitoring ${Math.random() > 0.5 ? 'breakout levels' : 'support/resistance zones'}`;

    return analysis;
  }

  private generatePortfolioOptimization(query: string, intent: any, context: EnhancedAgentContext): string {
    return `Portfolio Optimization Analysis:

💼 **Current Allocation:**
Based on your current widgets, I can see you have a mix of assets. Here's an optimized suggestion:

📊 **Recommended Allocation:**
- Large Cap Stocks: 40% (diversification and stability)
- Growth Stocks: 30% (capital appreciation)
- Bonds/ETFs: 20% (risk management)
- Cash/Alternatives: 10% (liquidity and opportunities)

⚖️ **Risk Assessment:**
- Current Risk Level: ${Math.random() > 0.5 ? 'Moderate' : 'Conservative'}
- Suggested Risk Level: Balanced approach
- Diversification Score: ${Math.floor(Math.random() * 30 + 70)}/100

🔧 **Optimization Actions:**
• Consider rebalancing to reduce sector concentration
• Add defensive positions for downside protection
• Review tax-loss harvesting opportunities

Would you like me to create a portfolio tracker widget with these recommendations?`;
  }

  private generateWidgetManagement(query: string, intent: any, context: EnhancedAgentContext): string {
    const widgetTypes = ['candlestick-chart', 'portfolio-tracker', 'technical-indicators', 'kpi-card'];
    const suggestedWidget = widgetTypes[Math.floor(Math.random() * widgetTypes.length)];

    return `Widget Management Assistant:

🛠️ I can help you create and configure analysis widgets! Based on your query, I recommend adding a **${suggestedWidget.replace('-', ' ')}**.

**Available Actions:**
• Add widget to current sheet
• Configure widget settings
• Duplicate existing widgets
• Export widget data

**Quick Suggestions:**
- Add a candlestick chart for price analysis
- Create a KPI card for key metrics
- Set up technical indicators overlay
- Configure portfolio tracking

Would you like me to add a specific widget to your current sheet? Just let me know which type you'd prefer!`;
  }

  private generateDataExport(query: string, intent: any, context: EnhancedAgentContext): string {
    return `Data Export Assistant:

📤 I can help you export your analysis data in various formats:

**Available Export Options:**
• **JSON**: Complete data with metadata
• **CSV**: Tabular format for spreadsheets
• **PNG**: Visual snapshots of charts
• **PDF**: Comprehensive analysis reports

**Export Capabilities:**
- Individual widget data
- Complete sheet data
- Historical analysis results
- Portfolio snapshots

**Quick Export Actions:**
- Export current widget data
- Download chart as image
- Generate portfolio report
- Save analysis results

Which type of export would you like me to prepare?`;
  }

  private generateEducationalContent(query: string, intent: any, context: EnhancedAgentContext): string {
    const topics = {
      rsi: {
        title: "Relative Strength Index (RSI)",
        explanation: "RSI is a momentum oscillator that measures price changes to evaluate overbought or oversold conditions. It ranges from 0 to 100.",
        levels: "• Above 70: Potentially overbought\n• Below 30: Potentially oversold\n• 50: Neutral territory"
      },
      macd: {
        title: "MACD (Moving Average Convergence Divergence)",
        explanation: "MACD shows the relationship between two moving averages of a security's price to reveal momentum and trend changes.",
        signals: "• Signal line crossover: Buy/sell signals\n• Histogram divergence: Momentum shifts\n• Zero line cross: Trend changes"
      },
      dcf: {
        title: "Discounted Cash Flow (DCF)",
        explanation: "DCF is a valuation method that estimates the value of an investment based on its expected future cash flows.",
        components: "• Free Cash Flow projections\n• Terminal value calculation\n• Discount rate (WACC)\n• Present value computation"
      }
    };

    // Try to identify the topic from the query
    const topic = Object.keys(topics).find(key => query.toLowerCase().includes(key)) as keyof typeof topics;

    if (topic && topics[topic]) {
      const info = topics[topic];
      return `📚 **${info.title}**\n\n${info.explanation}\n\n**Key Points:**\n${Object.values(info)[2]}\n\nWould you like me to create a widget demonstrating this concept or explain any specific aspect in more detail?`;
    }

    return `📚 Educational Assistant:

I can help you learn about various financial concepts and analysis techniques:

**Popular Topics:**
• **Technical Analysis**: RSI, MACD, Bollinger Bands, Moving Averages
• **Fundamental Analysis**: DCF, Multiples, Financial Statement Analysis
• **Portfolio Management**: Asset Allocation, Risk Management, Diversification
• **Options Trading**: Greeks, Strategies, Risk/Reward

**Learning Resources:**
• Interactive widgets with explanations
• Step-by-step analysis examples
• Real-world application scenarios
• Practice exercises and simulations

What specific financial concept would you like to explore?`;
  }

  private generateGeneralResponse(query: string, intent: any, context: EnhancedAgentContext): string {
    const responses = [
      "I'm here to help you with financial analysis and trading insights! I can help you analyze markets, optimize portfolios, create widgets, export data, or explain financial concepts.",
      "I can assist you with various financial analysis tasks. Try asking me about market trends, portfolio optimization, widget creation, or educational topics.",
      "Need help with your financial analysis? I can help you analyze stocks, create visualizations, manage your portfolio, or explain complex financial concepts."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private enhanceResponse(
    response: Partial<EnhancedAgentResponse>,
    context: EnhancedAgentContext,
    intent: any
  ): EnhancedAgentResponse {
    const suggestions: EnhancedAgentResponse['suggestions'] = [];

    // Add contextual suggestions
    if (intent.primary === 'market-analysis' && context.activeWidgets.length < 3) {
      suggestions.push({
        type: 'widget',
        title: 'Add Technical Analysis',
        description: 'Create a technical indicators widget for deeper analysis',
        action: () => {
          // This would trigger widget creation
          console.log('Create technical analysis widget');
        }
      });
    }

    if (intent.entities.some((e: string) => /^[A-Z]{1,5}$/.test(e))) {
      suggestions.push({
        type: 'widget',
        title: 'Create Price Chart',
        description: 'Visualize price action with candlestick chart',
        action: () => {
          console.log('Create price chart');
        }
      });
    }

    // Add follow-up questions
    const followUpQuestions = [
      "Would you like me to create a widget based on this analysis?",
      "Do you need help interpreting these results?",
      "Would you like to see a different time period or additional metrics?",
      "Can I help you export this data or create a report?"
    ];

    return {
      content: response.content || '',
      confidence: 0.8,
      suggestions: [...(response.suggestions || []), ...suggestions],
      followUpQuestions: response.followUpQuestions || followUpQuestions.slice(0, 2),
      data: response.data,
      visualizations: response.visualizations || []
    };
  }

  private storeContext(context: EnhancedAgentContext) {
    const userId = context.userId;
    if (!this.contextHistory.has(userId)) {
      this.contextHistory.set(userId, []);
    }

    const history = this.contextHistory.get(userId)!;
    history.push(context);

    // Keep only last 50 interactions
    if (history.length > 50) {
      history.shift();
    }
  }

  getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  toggleCapability(name: string, enabled: boolean) {
    if (this.capabilities.has(name)) {
      const capability = this.capabilities.get(name)!;
      this.capabilities.set(name, { ...capability, enabled });
    }
  }

  getUserLearningData(userId: string): any {
    return this.learningData.get(userId) || {};
  }

  updateUserLearningData(userId: string, data: any) {
    this.learningData.set(userId, { ...this.learningData.get(userId), ...data });
  }
}

// Export singleton instance
export const enhancedAgent = new EnhancedAgent();

// React hook for using the enhanced agent
export function useEnhancedAgent() {
  const { activeSheetId, sheets } = useWorkspaceStore();

  const context: EnhancedAgentContext = {
    userId: 'current-user',
    userName: 'User',
    currentSymbol: 'AAPL',
    currentSheet: activeSheetId,
    activeWidgets: sheets
      .find(s => s.id === activeSheetId)?.widgets
      .map(w => ({ id: w.id, type: w.type, title: w.title })) || [],
    recentActions: [],
    userPreferences: {
      experienceLevel: 'expert',
      preferredDataSources: ['alpha-vantage', 'polygon'],
      theme: 'dark'
    }
  };

  const processQuery = async (query: string): Promise<EnhancedAgentResponse> => {
    return await enhancedAgent.processQuery(query, context);
  };

  return {
    processQuery,
    capabilities: enhancedAgent.getCapabilities(),
    toggleCapability: (name: string, enabled: boolean) => enhancedAgent.toggleCapability(name, enabled)
  };
}
