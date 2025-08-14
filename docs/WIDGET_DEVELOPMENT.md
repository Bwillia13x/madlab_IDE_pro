# MAD LAB Widget Development Guide

Welcome to the MAD LAB Widget SDK! This guide will help you create custom financial widgets for the MAD LAB platform.

## Quick Start

### 1. Basic Widget Structure

```typescript
import React from 'react';
import { WidgetTemplate, FinancialData, createConfigSchema } from '@/lib/sdk/widget-sdk';
import type { WidgetProps } from '@/lib/widgets/schema';

// Define your widget configuration
const MyWidgetConfig = createConfigSchema({
  symbol: {
    type: 'string',
    default: 'AAPL',
    label: 'Stock Symbol',
    description: 'The stock symbol to analyze'
  },
  period: {
    type: 'number',
    default: 20,
    label: 'Analysis Period',
    min: 5,
    max: 200,
    step: 5
  }
});

// Create your widget component
function MyCustomWidget({ config, onConfigChange }: WidgetProps) {
  const { symbol, period } = config as any;

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">
        Custom Analysis: {symbol}
      </h3>
      
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">
          Analyzing {symbol} with {period} day period
        </p>
      </div>
      
      {/* Your widget content here */}
    </div>
  );
}

// Register your widget
export const MyWidgetDefinition = new WidgetTemplate('my-custom-widget', 'My Custom Widget')
  .withDescription('A custom financial analysis widget')
  .withCategory('analysis')
  .withTags(['custom', 'analysis'])
  .withConfig(MyWidgetConfig)
  .withComponent(MyCustomWidget)
  .build();
```

### 2. Data Fetching

```typescript
import { useWidgetData, DataFetcher } from '@/lib/sdk/widget-sdk';

function DataDrivenWidget({ config }: WidgetProps) {
  const { symbol } = config as { symbol: string };
  
  // Use the built-in data hook
  const { data, loading, error } = useWidgetData<PriceData>(
    'stock-price',
    { symbol },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      onError: (err) => console.error('Failed to fetch price:', err)
    }
  );

  if (loading) return <div>Loading {symbol} data...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="p-4">
      <h3>{symbol}</h3>
      <div className="text-2xl font-bold">
        {FinancialData.formatCurrency(data.price)}
      </div>
      <div className={data.change >= 0 ? 'text-green-600' : 'text-red-600'}>
        {FinancialData.formatPercent(data.changePercent)}
      </div>
    </div>
  );
}
```

### 3. Financial Calculations

```typescript
import { FinancialData } from '@/lib/sdk/widget-sdk';

function TechnicalAnalysisWidget({ config }: WidgetProps) {
  const { symbol, period } = config as { symbol: string; period: number };
  
  // Fetch historical prices
  const { data: prices } = useWidgetData<ChartPoint[]>('historical-prices', { symbol });
  
  if (!prices || prices.length === 0) {
    return <div>Loading price data...</div>;
  }

  // Calculate technical indicators
  const priceValues = prices.map(p => p.value);
  const sma = FinancialData.calculateSMA(priceValues, period);
  const ema = FinancialData.calculateEMA(priceValues, period);
  const rsi = FinancialData.calculateRSI(priceValues);

  const currentPrice = priceValues[priceValues.length - 1];
  const currentSMA = sma[sma.length - 1];
  const currentRSI = rsi[rsi.length - 1];

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">Technical Analysis: {symbol}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground">Current Price</label>
          <div className="text-lg font-medium">
            {FinancialData.formatCurrency(currentPrice)}
          </div>
        </div>
        
        <div>
          <label className="text-sm text-muted-foreground">SMA ({period})</label>
          <div className="text-lg font-medium">
            {FinancialData.formatCurrency(currentSMA)}
          </div>
        </div>
        
        <div>
          <label className="text-sm text-muted-foreground">RSI</label>
          <div className={`text-lg font-medium ${
            currentRSI > 70 ? 'text-red-600' : 
            currentRSI < 30 ? 'text-green-600' : 
            'text-blue-600'
          }`}>
            {currentRSI.toFixed(1)}
          </div>
        </div>
        
        <div>
          <label className="text-sm text-muted-foreground">Signal</label>
          <div className="text-lg font-medium">
            {currentPrice > currentSMA ? '📈 Bullish' : '📉 Bearish'}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Advanced Features

### Configuration Schema

MAD LAB uses Zod schemas for widget configuration. The `createConfigSchema` helper makes it easy to define type-safe configurations:

```typescript
const AdvancedConfig = createConfigSchema({
  symbols: {
    type: 'multiselect',
    default: ['AAPL', 'GOOGL'],
    label: 'Stock Symbols',
    options: [
      { value: 'AAPL', label: 'Apple Inc.' },
      { value: 'GOOGL', label: 'Alphabet Inc.' },
      { value: 'MSFT', label: 'Microsoft Corp.' },
      { value: 'TSLA', label: 'Tesla Inc.' }
    ]
  },
  analysisType: {
    type: 'select',
    default: 'technical',
    label: 'Analysis Type',
    options: [
      { value: 'technical', label: 'Technical Analysis' },
      { value: 'fundamental', label: 'Fundamental Analysis' },
      { value: 'sentiment', label: 'Sentiment Analysis' }
    ]
  },
  threshold: {
    type: 'number',
    default: 0.05,
    label: 'Alert Threshold (%)',
    min: 0.01,
    max: 0.5,
    step: 0.01
  },
  enableAlerts: {
    type: 'boolean',
    default: true,
    label: 'Enable Price Alerts'
  }
});
```

### Data Provider Integration

Integrate with MAD LAB's data provider system:

```typescript
import { useDataProvider } from '@/lib/data/hooks';

function MultitSourceWidget({ config }: WidgetProps) {
  const { symbol } = config as { symbol: string };
  
  // Use multiple data sources
  const priceData = useDataProvider('alpha-vantage', { symbol, type: 'quote' });
  const newsData = useDataProvider('news-api', { symbol, limit: 5 });
  const fundamentals = useDataProvider('financials', { symbol });

  return (
    <div className="p-4 space-y-4">
      {/* Price section */}
      {priceData.data && (
        <div className="border-b pb-4">
          <h4 className="font-medium">Price Data</h4>
          <div className="text-2xl font-bold">
            {FinancialData.formatCurrency(priceData.data.price)}
          </div>
        </div>
      )}

      {/* Fundamentals section */}
      {fundamentals.data && (
        <div className="border-b pb-4">
          <h4 className="font-medium">Key Metrics</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>P/E: {fundamentals.data.pe?.toFixed(2) || 'N/A'}</div>
            <div>EPS: {FinancialData.formatCurrency(fundamentals.data.eps || 0)}</div>
          </div>
        </div>
      )}

      {/* News section */}
      {newsData.data && (
        <div>
          <h4 className="font-medium mb-2">Recent News</h4>
          {newsData.data.slice(0, 3).map((article: any, idx: number) => (
            <div key={idx} className="text-sm text-muted-foreground mb-1">
              {article.headline}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Chart Integration

Use MAD LAB's chart components:

```typescript
import { ChartContainer } from '@/components/ui/ChartContainer';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

function ChartWidget({ config }: WidgetProps) {
  const { symbol } = config as { symbol: string };
  const { data } = useWidgetData<ChartPoint[]>('price-history', { symbol });

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="font-semibold mb-4">Price Chart: {symbol}</h3>
      
      <div className="flex-1">
        <ChartContainer minHeight={200}>
          <LineChart data={data || []}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number) => [FinancialData.formatCurrency(value), 'Price']}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
```

## Widget Categories

Organize your widgets by category:

- **`analysis`** - Technical and fundamental analysis tools
- **`charting`** - Price charts and visualizations  
- **`risk`** - Risk management and VaR calculations
- **`portfolio`** - Portfolio analytics and optimization
- **`news`** - News and sentiment analysis
- **`derivatives`** - Options and derivatives pricing
- **`custom`** - Custom business-specific widgets

## Best Practices

### 1. Performance

- Use `React.memo()` for expensive components
- Implement proper loading states
- Cache data when appropriate
- Use virtual scrolling for large datasets

```typescript
const OptimizedWidget = React.memo(function MyWidget({ config }: WidgetProps) {
  // Widget implementation
}, (prevProps, nextProps) => {
  // Custom comparison logic
  return prevProps.config.symbol === nextProps.config.symbol;
});
```

### 2. Error Handling

```typescript
function RobustWidget({ config }: WidgetProps) {
  const [error, setError] = React.useState<string | null>(null);

  const handleError = React.useCallback((err: Error) => {
    setError(err.message);
    console.error('Widget error:', err);
    
    // Track errors for analytics
    SDK.trackEvent('widget_error', {
      widgetType: 'my-widget',
      error: err.message
    });
  }, []);

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-2">⚠️ Error</div>
        <div className="text-sm text-muted-foreground">{error}</div>
        <button 
          onClick={() => setError(null)}
          className="mt-2 text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Widget content...
}
```

### 3. Accessibility

```typescript
function AccessibleWidget({ config }: WidgetProps) {
  const { symbol } = config as { symbol: string };
  
  return (
    <div 
      className="p-4"
      role="region"
      aria-label={`Financial data for ${symbol}`}
    >
      <h3 
        id="widget-title"
        className="font-semibold mb-4"
      >
        {symbol} Analysis
      </h3>
      
      <div aria-describedby="widget-title">
        {/* Widget content with proper ARIA labels */}
        <div role="status" aria-live="polite">
          {/* Live updating content */}
        </div>
      </div>
    </div>
  );
}
```

### 4. Responsive Design

```typescript
function ResponsiveWidget({ config }: WidgetProps) {
  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Widget Title</h3>
        <div className="hidden sm:block">
          {/* Desktop-only controls */}
        </div>
      </div>
      
      {/* Content - responsive grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Responsive content */}
      </div>
      
      {/* Mobile controls */}
      <div className="sm:hidden mt-4">
        {/* Mobile-only controls */}
      </div>
    </div>
  );
}
```

## Testing Your Widgets

### Unit Testing

```typescript
import { render, screen } from '@testing-library/react';
import { MyCustomWidget } from './MyCustomWidget';

describe('MyCustomWidget', () => {
  const defaultProps = {
    config: { symbol: 'AAPL', period: 20 },
    onConfigChange: jest.fn(),
  };

  test('renders widget title', () => {
    render(<MyCustomWidget {...defaultProps} />);
    expect(screen.getByText('Custom Analysis: AAPL')).toBeInTheDocument();
  });

  test('handles configuration changes', () => {
    const onConfigChange = jest.fn();
    render(<MyCustomWidget {...defaultProps} onConfigChange={onConfigChange} />);
    
    // Test configuration changes
    // ...
  });
});
```

### Integration Testing

```typescript
import { renderWidget } from '@/tests/utils/renderWidget';

test('widget integrates with data providers', async () => {
  const { getByText, findByText } = renderWidget('my-custom-widget', {
    symbol: 'AAPL'
  });

  // Wait for data to load
  await findByText('Loading...');
  await findByText(/AAPL/);
  
  // Assert widget behavior
});
```

## Publishing Your Widget

1. **Test thoroughly** with real financial data
2. **Document configuration options** and use cases
3. **Add proper TypeScript types** for all interfaces
4. **Include usage examples** and screenshots
5. **Submit for review** through the MAD LAB marketplace

## Example Widgets

Check out these example widgets in the repository:

- **`examples/rsi-widget.tsx`** - RSI technical indicator
- **`examples/earnings-calendar.tsx`** - Upcoming earnings events
- **`examples/sector-rotation.tsx`** - Sector performance comparison
- **`examples/options-chain.tsx`** - Options pricing and Greeks

## Support

- **Documentation**: https://docs.madlab.dev/widgets
- **GitHub Issues**: https://github.com/madlab/platform/issues
- **Discord Community**: https://discord.gg/madlab
- **Email Support**: widgets@madlab.dev

Happy coding! 🚀