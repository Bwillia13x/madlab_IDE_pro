# MAD LAB Platform API Documentation

## Overview

The MAD LAB Platform provides a comprehensive set of APIs for building sophisticated financial analysis applications. This documentation covers all public APIs, integration patterns, and best practices.

## Core Concepts

### Widget System

The platform uses a modular widget architecture where each widget is a self-contained component with:

- **Schema-driven configuration** - Widgets define their configuration options using JSON Schema
- **Type safety** - Full TypeScript support with generated types
- **Lifecycle management** - Automatic cleanup and resource management
- **Performance monitoring** - Built-in metrics collection

### Data Flow

```
Data Providers → Aggregator → Cache → Widgets
                    ↓
Performance Monitor → Analytics → Audit Logs
```

## API Reference

### Widget Management

#### `createWidget(type: string, config: WidgetConfig): Promise<Widget>`

Creates a new widget instance.

**Parameters:**

- `type` - Widget type identifier (e.g., 'candlestick-chart')
- `config` - Widget configuration object

**Returns:** Promise resolving to the created widget

**Example:**

```typescript
const widget = await createWidget('candlestick-chart', {
  symbol: 'AAPL',
  timeframe: '1D',
  indicators: ['rsi', 'macd']
});
```

#### `updateWidget(id: string, updates: Partial<WidgetConfig>): Promise<Widget>`

Updates an existing widget's configuration.

**Parameters:**

- `id` - Widget instance ID
- `updates` - Partial configuration updates

**Returns:** Promise resolving to the updated widget

#### `deleteWidget(id: string): Promise<void>`

Removes a widget instance.

**Parameters:**

- `id` - Widget instance ID

### Data Providers

#### `registerDataProvider(provider: DataProvider): void`

Registers a new data provider.

**Parameters:**

- `provider` - Data provider implementation

**Example:**

```typescript
registerDataProvider({
  id: 'alpha-vantage',
  name: 'Alpha Vantage',
  capabilities: ['historical', 'realtime'],
  initialize: async (config) => {
    // Provider initialization
  },
  getPrices: async (symbol, timeframe) => {
    // Fetch price data
  }
});
```

#### `getDataProvider(id: string): DataProvider | null`

Retrieves a registered data provider.

**Parameters:**

- `id` - Provider ID

**Returns:** Data provider instance or null

### Real-time Data

#### `useRealtimePrices(symbols: string[], options?): RealtimeData`

React hook for subscribing to real-time price data.

**Parameters:**

- `symbols` - Array of symbols to track
- `options` - Configuration options

**Returns:** Real-time data object with prices and connection status

**Example:**

```typescript
const { prices, connectionStatus, error } = useRealtimePrices(
  ['AAPL', 'GOOGL'],
  { autoReconnect: true, updateInterval: 1000 }
);
```

#### `useEnhancedRealtimePrices(symbols: string[], options?): EnhancedRealtimeData`

Enhanced version with advanced features like confidence scoring and fallback mechanisms.

### Performance Monitoring

#### `usePerformanceMonitoring(): PerformanceData`

React hook for accessing performance metrics.

**Returns:** Current performance metrics and cache statistics

**Example:**

```typescript
const { metrics, cacheStats, recordWidgetRenderTime } = usePerformanceMonitoring();

// Record widget render time
recordWidgetRenderTime('candlestick-chart', 150);
```

### AI Agent

#### `useEnhancedAgent(): AgentInterface`

React hook for interacting with the enhanced AI agent.

**Returns:** Agent interface with query processing capabilities

**Example:**

```typescript
const { processQuery, capabilities } = useEnhancedAgent();

const response = await processQuery('analyze AAPL trends');
```

## Integration Patterns

### Basic Widget Integration

```typescript
import { useWorkspaceStore } from '@/lib/store';
import { WidgetShell } from '@/components/widgets/WidgetShell';

function MyCustomWidget({ widget, sheetId }) {
  const { updateWidget } = useWorkspaceStore();

  const handleConfigChange = (newConfig) => {
    updateWidget(sheetId, widget.id, { config: newConfig });
  };

  return (
    <WidgetShell widgetType="my-widget" widgetTitle="My Widget">
      <div>
        {/* Widget content */}
        <button onClick={() => handleConfigChange({ theme: 'dark' })}>
          Change Theme
        </button>
      </div>
    </WidgetShell>
  );
}
```

### Data Provider Implementation

```typescript
import { DataProvider } from '@/lib/data/providers';

const myProvider: DataProvider = {
  id: 'my-provider',
  name: 'My Data Provider',
  capabilities: ['historical', 'realtime'],

  async initialize(config) {
    // Initialize connection
    this.apiKey = config.apiKey;
    await this.connect();
  },

  async getPrices(symbol, timeframe) {
    const response = await fetch(`/api/prices/${symbol}?timeframe=${timeframe}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.json();
  },

  async subscribeToSymbol(symbol) {
    // Return unsubscribe function
    const ws = new WebSocket(`wss://api.my-provider.com/realtime`);
    ws.onmessage = (event) => {
      // Handle real-time updates
      this.emit('priceUpdate', JSON.parse(event.data));
    };

    return () => ws.close();
  }
};

registerDataProvider(myProvider);
```

### Error Handling

```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

function ErrorBoundaryWidget({ children }) {
  const [error, setError] = useState(null);

  const handleError = useCallback((error) => {
    console.error('Widget error:', error);
    setError(error);
    toast.error('Widget encountered an error');
  }, []);

  if (error) {
    return (
      <div className="p-4 border border-destructive/20 rounded-lg">
        <h3 className="font-medium text-destructive">Widget Error</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => setError(null)}
          className="mt-2 px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return children;
}
```

## Security Best Practices

### API Key Management

```typescript
// Store API keys securely
const keyManager = {
  async storeKey(providerId, key) {
    // Use SecretStorage in VS Code extension
    // Use secure HTTP-only cookies in web
    await chrome.storage.local.set({ [`apiKey_${providerId}`]: key });
  },

  async getKey(providerId) {
    const result = await chrome.storage.local.get(`apiKey_${providerId}`);
    return result[`apiKey_${providerId}`];
  }
};
```

### Data Validation

```typescript
import { z } from 'zod';

const WidgetConfigSchema = z.object({
  symbol: z.string().min(1).max(10),
  timeframe: z.enum(['1D', '1W', '1M']),
  indicators: z.array(z.string()).max(5)
});

function validateWidgetConfig(config) {
  try {
    return WidgetConfigSchema.parse(config);
  } catch (error) {
    throw new Error(`Invalid configuration: ${error.message}`);
  }
}
```

## Performance Optimization

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

function OptimizedWidget({ data, config }) {
  const processedData = useMemo(() => {
    // Expensive data processing
    return processData(data, config);
  }, [data, config]);

  const handleUpdate = useCallback((updates) => {
    // Memoized callback
    updateWidget(updates);
  }, []);

  return (
    <div>
      {/* Render processed data */}
    </div>
  );
}
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const HeavyWidget = lazy(() => import('./HeavyWidget'));

function WidgetContainer() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyWidget />
    </Suspense>
  );
}
```

## Testing Guidelines

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import { MyWidget } from './MyWidget';

describe('MyWidget', () => {
  it('renders correctly with default props', () => {
    render(<MyWidget />);
    expect(screen.getByText('Expected Content')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<MyWidget />);

    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByText('Toggled State')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useRealtimePrices } from '@/lib/data/useRealtimeData';

describe('Real-time Data Integration', () => {
  it('handles connection lifecycle', async () => {
    const { result } = renderHook(() => useRealtimePrices(['AAPL']));

    // Initial state
    expect(result.current.isConnected).toBe(false);

    // Start connection
    await act(async () => {
      result.current.start();
    });

    // Should be running
    expect(result.current.isRunning).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **Widget not rendering**
   - Check widget configuration schema
   - Verify all required props are provided
   - Check browser console for errors

2. **Data not loading**
   - Verify data provider is configured
   - Check API key validity
   - Check network connectivity

3. **Performance issues**
   - Use React DevTools Profiler
   - Check Performance Monitor metrics
   - Implement memoization for expensive operations

### Debug Mode

Enable debug mode for additional logging:

```typescript
// In development
localStorage.setItem('madlab_debug', 'true');

// In code
const isDebug = localStorage.getItem('madlab_debug') === 'true';
if (isDebug) {
  console.log('Debug info:', debugData);
}
```

## Migration Guide

### From v1.x to v2.x

1. **Widget Configuration**
   - Update widget schemas to use new format
   - Migrate configuration objects

2. **Data Providers**
   - Implement new provider interface
   - Update authentication methods

3. **API Changes**
   - Update API calls to use new endpoints
   - Handle new error response format

## Support

For additional support:

- Check the [GitHub Issues](https://github.com/madlab/platform/issues)
- Review the [Discussion Board](https://github.com/madlab/platform/discussions)
- Contact the development team

---

*This documentation is automatically generated and kept up-to-date with the codebase.*

