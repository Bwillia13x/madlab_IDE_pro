# MadLab IDE Pro Data Provider API Documentation

## Overview

The MadLab IDE Pro Data Provider API is a flexible, extensible system that allows developers to integrate various financial data sources into the platform. The API provides a unified interface for accessing market data, financial statements, and real-time information from multiple providers.

## Architecture

The data provider system follows a plugin architecture where each data source implements a common `Provider` interface. This allows for easy integration of new data sources while maintaining consistency across the platform.

### Core Components

- **Provider Interface**: Standard contract that all data providers must implement
- **Provider Registry**: Central registry for managing available providers
- **Data Adapters**: Concrete implementations for specific data sources
- **Data Cache**: Built-in caching layer for improved performance
- **Error Handling**: Consistent error handling across all providers

## Provider Interface

### Base Provider Contract

```typescript
export interface Provider {
  name: string;
  getPrices(symbol: string, range?: PriceRange): Promise<PricePoint[]>;
  getKpis(symbol: string): Promise<KpiData>;
  getFinancials(symbol: string): Promise<FinancialData>;
  isAvailable(): Promise<boolean>;
  getLastUpdate(symbol: string): Promise<Date | null>;
}
```

### Data Types

#### PricePoint

```typescript
export interface PricePoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

#### KpiData

```typescript
export interface KpiData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  eps?: number;
  dividend?: number;
  divYield?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  timestamp: Date;
}
```

#### FinancialData

```typescript
export interface FinancialData {
  symbol: string;
  revenue: number;
  netIncome: number;
  cashFlow: number;
  fcf: number;
  timestamp: Date;
}
```

#### PriceRange

```typescript
export type PriceRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'MAX';
```

## Built-in Providers

### 1. Mock Provider

A development and testing provider that returns simulated data.

```typescript
import { mockAdapter } from './adapters/mock';

// Mock provider is always available
const mockData = await mockAdapter.getPrices('AAPL', '1M');
```

### 2. Alpha Vantage Provider

Provides access to Alpha Vantage's financial data API.

```typescript
import { addAlphaVantageProvider, removeAlphaVantageProvider } from './providers';

// Add provider with API key
addAlphaVantageProvider('your-api-key');

// Remove provider
removeAlphaVantageProvider();
```

**Features:**

- Historical price data
- Company overview and financials
- Rate limiting (5 requests per minute)
- Automatic retry logic

### 3. Polygon.io Provider

High-frequency market data provider with real-time capabilities.

```typescript
import { addPolygonProvider, removePolygonProvider } from './providers';

// Add provider with API key
addPolygonProvider('your-api-key');

// Remove provider
removePolygonProvider();
```

**Features:**

- Real-time WebSocket streaming
- High-frequency data (tick-level)
- Options data support
- Advanced technical indicators
- WebSocket reconnection handling

### 4. Alpaca Provider

Brokerage integration provider for trading and portfolio management.

```typescript
import { addAlpacaProvider, removeAlpacaProvider } from './providers';

// Add provider with API key and secret
addAlpacaProvider('your-api-key', 'your-secret-key', true); // true for paper trading

// Remove provider
removeAlpacaProvider();
```

**Features:**

- Account and portfolio data
- Order management (market, limit, stop)
- Real-time market data
- Watchlist management
- Market calendar and clock

## Creating Custom Providers

### Step 1: Implement the Provider Interface

```typescript
import type { Provider, PricePoint, PriceRange, KpiData, FinancialData } from './provider.types';

export class CustomDataProvider implements Provider {
  name = 'custom-provider';
  
  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    // Implement price data fetching logic
    const data = await this.fetchFromCustomAPI(symbol, range);
    return this.transformToPricePoints(data);
  }
  
  async getKpis(symbol: string): Promise<KpiData> {
    // Implement KPI data fetching logic
    const data = await this.fetchKPIsFromCustomAPI(symbol);
    return this.transformToKpiData(data);
  }
  
  async getFinancials(symbol: string): Promise<FinancialData> {
    // Implement financial data fetching logic
    const data = await this.fetchFinancialsFromCustomAPI(symbol);
    return this.transformToFinancialData(data);
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if the provider is available
    return await this.checkAPIHealth();
  }
  
  async getLastUpdate(symbol: string): Promise<Date | null> {
    // Return the last update timestamp
    return await this.getLastUpdateTime(symbol);
  }
  
  // Custom methods specific to your provider
  private async fetchFromCustomAPI(symbol: string, range: PriceRange) {
    // Implementation details
  }
  
  private transformToPricePoints(data: any): PricePoint[] {
    // Transform your data format to PricePoint[]
  }
}
```

### Step 2: Register Your Provider

```typescript
import { registerProvider } from './providers';
import { CustomDataProvider } from './CustomDataProvider';

// Register your custom provider
const customProvider = new CustomDataProvider();
registerProvider('custom', customProvider);

// Now you can use it
setDataProvider('custom');
```

### Step 3: Add Provider Management Functions

```typescript
// Add to providers.ts
export function addCustomProvider(config: CustomProviderConfig): void {
  if (config.apiKey && config.apiKey !== 'demo') {
    providers['custom'] = createCustomProvider(config);
  }
}

export function removeCustomProvider(): void {
  delete providers['custom'];
}
```

## Provider Management

### Getting Provider Information

```typescript
import { getProviderInfo, getProviderCapabilities } from './providers';

// Get provider information
const info = getProviderInfo('polygon');
console.log(info); // { name: 'polygon', available: true, type: 'market-data-realtime' }

// Get provider capabilities
const capabilities = getProviderCapabilities('alpaca');
console.log(capabilities); // { realtime: true, historical: true, trading: true, options: false, crypto: true }
```

### Switching Between Providers

```typescript
import { setDataProvider, getDataProvider, getAvailableProviders } from './providers';

// List available providers
const providers = getAvailableProviders(); // ['mock', 'alpha-vantage', 'polygon', 'alpaca']

// Switch to a specific provider
await setDataProvider('polygon');

// Get current provider
const current = getDataProvider(); // 'polygon'
```

### Provider Factory Functions

```typescript
// Alpha Vantage
export function createAlphaVantageAdapter(apiKey: string): Provider

// Polygon
export function createPolygonAdapter(apiKey: string): Provider

// Alpaca
export function createAlpacaAdapter(apiKey: string, secretKey: string, paperTrading?: boolean): Provider
```

## Error Handling

### Standard Error Types

```typescript
// API errors
class APIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'APIError';
  }
}

// Rate limit errors
class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Data validation errors
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Error Handling Best Practices

```typescript
try {
  const data = await provider.getPrices('AAPL');
  // Process data
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error: ${error.message} (${error.statusCode})`);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
    // Implement retry logic
  } else if (error instanceof ValidationError) {
    console.error(`Validation error in field ${error.field}: ${error.message}`);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Caching and Performance

### Built-in Caching

The data provider system includes automatic caching to improve performance and reduce API calls.

```typescript
// Cache configuration
interface DataCache {
  prices: Map<string, { data: PricePoint[]; timestamp: number; range: PriceRange }>;
  kpis: Map<string, { data: KpiData; timestamp: number }>;
  financials: Map<string, { data: FinancialData; timestamp: number }>;
}
```

### Cache Invalidation

```typescript
// Cache is automatically invalidated based on:
// - Time-based expiration
// - Data freshness requirements
// - Manual cache clearing
```

## Real-time Data

### WebSocket Support

Providers that support real-time data (like Polygon) implement WebSocket interfaces.

```typescript
// Polygon WebSocket methods
polygonProvider.connectWebSocket();
polygonProvider.subscribeToSymbol('AAPL');
polygonProvider.onTrade((trade) => console.log('Trade:', trade));
polygonProvider.onQuote((quote) => console.log('Quote:', quote));
polygonProvider.disconnectWebSocket();
```

### Event Handling

```typescript
// Subscribe to real-time events
polygonProvider.onTrade((trade) => {
  // Handle trade updates
});

polygonProvider.onQuote((quote) => {
  // Handle quote updates
});

polygonProvider.onAggregate((agg) => {
  // Handle aggregate updates
});
```

## Testing Your Provider

### Unit Testing

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomDataProvider } from './CustomDataProvider';

describe('CustomDataProvider', () => {
  let provider: CustomDataProvider;

  beforeEach(() => {
    provider = new CustomDataProvider();
  });

  it('should implement Provider interface', () => {
    expect(provider.name).toBe('custom-provider');
    expect(typeof provider.getPrices).toBe('function');
    expect(typeof provider.getKpis).toBe('function');
    expect(typeof provider.getFinancials).toBe('function');
  });

  it('should fetch prices correctly', async () => {
    const prices = await provider.getPrices('AAPL', '1M');
    expect(Array.isArray(prices)).toBe(true);
    expect(prices.length).toBeGreaterThan(0);
  });
});
```

### Integration Testing

```typescript
describe('CustomDataProvider Integration', () => {
  it('should connect to external API', async () => {
    const provider = new CustomDataProvider();
    const isAvailable = await provider.isAvailable();
    expect(isAvailable).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    const provider = new CustomDataProvider();
    await expect(provider.getPrices('INVALID')).rejects.toThrow();
  });
});
```

## Best Practices

### 1. Error Handling

- Always implement proper error handling
- Provide meaningful error messages
- Include retry logic for transient failures
- Log errors for debugging

### 2. Rate Limiting

- Respect API rate limits
- Implement exponential backoff
- Queue requests when necessary
- Monitor usage patterns

### 3. Data Validation

- Validate all incoming data
- Transform data to expected formats
- Handle missing or malformed data gracefully
- Provide data quality indicators

### 4. Performance

- Implement efficient data fetching
- Use appropriate caching strategies
- Minimize unnecessary API calls
- Optimize data transformations

### 5. Security

- Never expose API keys in client code
- Use environment variables for configuration
- Implement proper authentication
- Validate all inputs

## Configuration

### Environment Variables

```bash
# Alpha Vantage
ALPHA_VANTAGE_API_KEY=your_key_here

# Polygon
POLYGON_API_KEY=your_key_here

# Alpaca
ALPACA_API_KEY=your_key_here
ALPACA_SECRET_KEY=your_secret_here
ALPACA_PAPER_TRADING=true

# Workspace Sync
WORKSPACE_SYNC_URL=ws://localhost:3001
WORKSPACE_SYNC_API_KEY=your_key_here
```

### Provider Configuration

```typescript
interface ProviderConfig {
  apiKey: string;
  secretKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}
```

## Troubleshooting

### Common Issues

1. **Provider Not Available**
   - Check API key configuration
   - Verify API endpoint accessibility
   - Check rate limits and quotas

2. **Data Format Issues**
   - Ensure data transformation is correct
   - Validate against expected schemas
   - Check for missing required fields

3. **Performance Problems**
   - Review caching configuration
   - Check API response times
   - Monitor memory usage

4. **WebSocket Connection Issues**
   - Verify WebSocket endpoint
   - Check network connectivity
   - Review reconnection logic

### Debug Mode

```typescript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Provider operations:', {
    provider: provider.name,
    operation: 'getPrices',
    symbol: 'AAPL',
    range: '1M'
  });
}
```

## Support and Community

### Getting Help

- **Documentation**: This guide and inline code comments
- **Issues**: GitHub issue tracker
- **Discussions**: GitHub discussions
- **Examples**: Sample implementations in the repository

### Contributing

We welcome contributions to improve the data provider system:

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests
5. Submit a pull request

### Provider Showcase

If you've built a custom provider, consider:

- Adding it to the examples directory
- Writing a blog post about your implementation
- Sharing it with the community
- Contributing it to the core system

## Conclusion

The MadLab IDE Pro Data Provider API provides a robust foundation for integrating financial data sources. By following the patterns and best practices outlined in this documentation, you can create reliable, performant, and maintainable data providers that integrate seamlessly with the platform.

For additional examples and advanced usage patterns, refer to the source code of existing providers in the `lib/data/adapters/` directory.
