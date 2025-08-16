import type { Provider, PricePoint, PriceRange, KpiData, FinancialData } from '../provider.types';

interface AlphaVantageConfig {
  apiKey: string;
  baseUrl?: string;
}

interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

interface AlphaVantageTimeSeries {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

interface AlphaVantageIncomeStatement {
  'symbol': string;
  'annualReports': Array<{
    'fiscalDateEnding': string;
    'totalRevenue': string;
    'netIncome': string;
    'operatingCashflow': string;
  }>;
}

export class AlphaVantageAdapter implements Provider {
  name = 'alpha-vantage';
  private apiKey: string;
  private baseUrl: string;
  private rateLimitDelay = 12000; // 12 seconds between requests (5 per minute limit)
  private lastRequestTime = 0;

  constructor(config: AlphaVantageConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://www.alphavantage.co/query';
  }

  private async makeRequest(params: Record<string, string>): Promise<any> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }

    const url = new URL(this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for API error messages
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }
      
      if (data['Note']) {
        throw new Error(`Rate limit exceeded: ${data['Note']}`);
      }

      this.lastRequestTime = Date.now();
      return data;
    } catch (error) {
      console.error('Alpha Vantage API request failed:', error);
      throw error;
    }
  }

  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    const params = {
      function: 'TIME_SERIES_DAILY',
      symbol: symbol.toUpperCase(),
      outputsize: range === '1Y' || range === '2Y' || range === '5Y' || range === 'MAX' ? 'full' : 'compact',
      apikey: this.apiKey,
    };

    const data = await this.makeRequest(params) as AlphaVantageTimeSeries;
    
    if (!data['Time Series (Daily)']) {
      throw new Error('No time series data received');
    }

    const timeSeries = data['Time Series (Daily)'];
    const dates = Object.keys(timeSeries).sort().reverse();
    
    // Limit data based on requested range
    const rangeLimits: Record<PriceRange, number> = {
      '1D': 1,
      '5D': 5,
      '1M': 22,
      '3M': 66,
      '6M': 132,
      '1Y': 252,
      '2Y': 504,
      '5Y': 1260,
      'MAX': dates.length,
    };

    const limit = rangeLimits[range] || 132;
    const limitedDates = dates.slice(0, limit);

    return limitedDates.map(date => {
      const point = timeSeries[date];
      return {
        date: new Date(date),
        open: parseFloat(point['1. open']),
        high: parseFloat(point['2. high']),
        low: parseFloat(point['3. low']),
        close: parseFloat(point['4. close']),
        volume: parseInt(point['5. volume']),
      };
    });
  }

  async getKpis(symbol: string): Promise<KpiData> {
    const params = {
      function: 'GLOBAL_QUOTE',
      symbol: symbol.toUpperCase(),
      apikey: this.apiKey,
    };

    const data = await this.makeRequest(params);
    const quote = data['Global Quote'] as AlphaVantageQuote;

    if (!quote) {
      throw new Error('No quote data received');
    }

    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Get additional company info
    const companyInfo = await this.getCompanyOverview(symbol);

    return {
      symbol: quote['01. symbol'],
      name: companyInfo?.name || quote['01. symbol'],
      price,
      change,
      changePercent,
      volume: parseInt(quote['06. volume']),
      marketCap: companyInfo?.marketCap || 0,
      peRatio: companyInfo?.peRatio,
      eps: companyInfo?.eps,
      dividend: companyInfo?.dividend,
      divYield: companyInfo?.divYield,
      beta: companyInfo?.beta,
      fiftyTwoWeekHigh: companyInfo?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: companyInfo?.fiftyTwoWeekLow,
      timestamp: new Date(),
    };
  }

  async getFinancials(symbol: string): Promise<FinancialData> {
    const params = {
      function: 'INCOME_STATEMENT',
      symbol: symbol.toUpperCase(),
      apikey: this.apiKey,
    };

    const data = await this.makeRequest(params) as AlphaVantageIncomeStatement;
    
    if (!data.annualReports || data.annualReports.length === 0) {
      throw new Error('No financial data received');
    }

    const latest = data.annualReports[0];
    
    return {
      symbol: data.symbol,
      revenue: parseFloat(latest.totalRevenue) || 0,
      netIncome: parseFloat(latest.netIncome) || 0,
      cashFlow: parseFloat(latest.operatingCashflow) || 0,
      fcf: 0, // Alpha Vantage doesn't provide FCF in basic income statement
      timestamp: new Date(),
    };
  }

  private async getCompanyOverview(symbol: string): Promise<{
    name?: string;
    marketCap?: number;
    peRatio?: number;
    eps?: number;
    dividend?: number;
    divYield?: number;
    beta?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  }> {
    try {
      const params = {
        function: 'OVERVIEW',
        symbol: symbol.toUpperCase(),
        apikey: this.apiKey,
      };

      const data = await this.makeRequest(params);
      
      return {
        name: data.Name,
        marketCap: data.MarketCapitalization ? parseFloat(data.MarketCapitalization) : undefined,
        peRatio: data.PERatio ? parseFloat(data.PERatio) : undefined,
        eps: data.EPS ? parseFloat(data.EPS) : undefined,
        dividend: data.DividendYield ? parseFloat(data.DividendYield) : undefined,
        divYield: data.DividendYield ? parseFloat(data.DividendYield) : undefined,
        beta: data.Beta ? parseFloat(data.Beta) : undefined,
        fiftyTwoWeekHigh: data['52WeekHigh'] ? parseFloat(data['52WeekHigh']) : undefined,
        fiftyTwoWeekLow: data['52WeekLow'] ? parseFloat(data['52WeekLow']) : undefined,
      };
    } catch (error) {
      console.warn(`Failed to get company overview for ${symbol}:`, error);
      return {};
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey !== 'demo';
  }

  async getLastUpdate(symbol: string): Promise<Date | null> {
    try {
      const kpis = await this.getKpis(symbol);
      return kpis.timestamp;
    } catch {
      return null;
    }
  }
}

// Factory function to create adapter
export function createAlphaVantageAdapter(apiKey: string): Provider {
  return new AlphaVantageAdapter({ apiKey });
}