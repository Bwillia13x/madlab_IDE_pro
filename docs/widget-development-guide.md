# MAD LAB IDE Widget Development Guide

## Overview

The MAD LAB IDE uses a schema-based widget system that allows developers to create financial analysis widgets with minimal boilerplate. This guide covers everything you need to know to build, test, and deploy widgets.

## Widget Architecture

### Core Components

1. **Widget Definition**: Schema-based configuration and metadata
2. **Runtime Component**: React component that renders the widget
3. **Configuration Schema**: Zod schema for validation and type safety
4. **Hooks**: Lifecycle management and cleanup

### File Structure

```
lib/widgets/
├── definitions/          # Widget definitions
├── components/           # React components
├── schemas/             # Configuration schemas
├── registry.ts          # Widget registry
└── schema.ts            # Type definitions
```

## Creating a New Widget

### Step 1: Define the Widget Schema

Create a new file in `lib/widgets/schemas/`:

```typescript
// lib/widgets/schemas/MyWidget.ts
import { z } from 'zod';

export const MyWidgetSchema = z.object({
  title: z.string().default('My Widget'),
  symbol: z.string().optional(),
  timeframe: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y']).default('1M'),
  showVolume: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
});

export type MyWidgetConfig = z.infer<typeof MyWidgetSchema>;
```

### Step 2: Create the Widget Component

Create a new file in `lib/widgets/components/`:

```typescript
// lib/widgets/components/MyWidget.tsx
import React, { useEffect, useState } from 'react';
import { WidgetProps } from '../schema';
import { MyWidgetConfig } from '../schemas/MyWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyWidgetProps extends WidgetProps<MyWidgetConfig> {
  // Additional props if needed
}

export function MyWidget({ id, config, isSelected, onConfigChange, onError }: MyWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data based on config
    const loadData = async () => {
      try {
        setLoading(true);
        // Implement data loading logic here
        const result = await fetchData(config.symbol, config.timeframe);
        setData(result);
      } catch (error) {
        onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    if (config.symbol) {
      loadData();
    }
  }, [config.symbol, config.timeframe, onError]);

  const handleConfigChange = (updates: Partial<MyWidgetConfig>) => {
    onConfigChange?.({
      ...config,
      ...updates,
    });
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`h-full ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Widget content goes here */}
        <div className="space-y-2">
          <div className="text-2xl font-bold">{config.symbol || 'No Symbol'}</div>
          <div className="text-sm text-muted-foreground">
            Timeframe: {config.timeframe}
          </div>
          {data && (
            <div className="text-sm">
              {/* Render your data here */}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 3: Register the Widget

Create a registration file:

```typescript
// lib/widgets/definitions/MyWidget.ts
import { WidgetDefinition } from '../schema';
import { MyWidget } from '../components/MyWidget';
import { MyWidgetSchema } from '../schemas/MyWidget';

export const MyWidgetDefinition: WidgetDefinition = {
  meta: {
    type: 'my-widget',
    name: 'My Custom Widget',
    description: 'A custom financial analysis widget',
    version: '1.0.0',
    category: 'custom',
    tags: ['custom', 'financial', 'analysis'],
    author: 'Your Name',
    icon: 'BarChart3',
    configSchema: MyWidgetSchema,
    defaultConfig: {
      title: 'My Widget',
      timeframe: '1M',
      showVolume: true,
      theme: 'auto',
    },
  },
  runtime: {
    component: MyWidget,
    hooks: {
      onMount: (id: string, config: any) => {
        console.log(`Widget ${id} mounted with config:`, config);
      },
      onUnmount: (id: string, config: any) => {
        console.log(`Widget ${id} unmounted`);
        // Cleanup resources
      },
      onConfigChange: (id: string, oldConfig: any, newConfig: any) => {
        console.log(`Widget ${id} config changed:`, { oldConfig, newConfig });
      },
    },
  },
};
```

### Step 4: Add to Registry

Import and register your widget in the main registry:

```typescript
// lib/widgets/index.ts
import { widgetRegistry } from './registry';
import { MyWidgetDefinition } from './definitions/MyWidget';

// Register the widget
widgetRegistry.registerWidget(MyWidgetDefinition);

export { widgetRegistry };
```

## Widget Best Practices

### 1. Performance Optimization

- Use `React.memo` for expensive components
- Implement lazy loading for data
- Debounce configuration changes
- Clean up subscriptions and timers

```typescript
export const MyWidget = React.memo(function MyWidget({ id, config, ...props }) {
  // Component implementation
});
```

### 2. Error Handling

- Always provide fallback UI for error states
- Use the `onError` callback for error reporting
- Implement retry mechanisms for failed requests

```typescript
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  const loadData = async () => {
    try {
      setError(null);
      const result = await fetchData(config.symbol);
      setData(result);
    } catch (err) {
      setError(err as Error);
      onError?.(err as Error);
    }
  };

  loadData();
}, [config.symbol, onError]);

if (error) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <div className="text-sm font-medium">Error loading data</div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs underline mt-1"
          >
            Retry
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Accessibility

- Provide proper ARIA labels
- Ensure keyboard navigation works
- Use semantic HTML elements
- Test with screen readers

```typescript
<Card
  role="region"
  aria-label={`${config.title} widget`}
  className="h-full"
>
  <CardHeader>
    <CardTitle id={`${id}-title`}>{config.title}</CardTitle>
  </CardHeader>
  <CardContent aria-labelledby={`${id}-title`}>
    {/* Content */}
  </CardContent>
</Card>
```

### 4. Responsive Design

- Use CSS Grid and Flexbox for layouts
- Implement breakpoint-specific behavior
- Test on multiple screen sizes

```typescript
const isMobile = useMediaQuery('(max-width: 768px)');

return (
  <Card className="h-full">
    <CardContent className={`p-${isMobile ? '2' : '4'}`}>
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        {/* Responsive layout */}
      </div>
    </CardContent>
  </Card>
);
```

## Testing Widgets

### Unit Tests

Create tests in `tests/widgets/`:

```typescript
// tests/widgets/MyWidget.test.tsx
import { render, screen } from '@testing-library/react';
import { MyWidget } from '@/lib/widgets/components/MyWidget';

describe('MyWidget', () => {
  const defaultProps = {
    id: 'test-widget',
    config: {
      title: 'Test Widget',
      symbol: 'AAPL',
      timeframe: '1M',
      showVolume: true,
      theme: 'auto',
    },
    isSelected: false,
    onConfigChange: jest.fn(),
    onError: jest.fn(),
  };

  it('renders with default config', () => {
    render(<MyWidget {...defaultProps} />);
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<MyWidget {...defaultProps} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

### Integration Tests

Test widget interactions:

```typescript
// tests/widgets/MyWidget.integration.test.tsx
import { test, expect } from '@playwright/test';

test('MyWidget configuration changes', async ({ page }) => {
  await page.goto('http://localhost:3000/workspace');

  // Add widget
  await page.click('[data-testid="add-widget-button"]');
  await page.click('[data-testid="widget-type-my-widget"]');

  // Configure widget
  const widget = page.locator('[data-testid="widget-tile"]').first();
  await widget.click();

  // Open inspector
  await page.keyboard.press('Control+i');

  // Change configuration
  const titleInput = page.locator('input[name="title"]');
  await titleInput.fill('New Title');

  // Verify change
  await expect(widget.locator('text=New Title')).toBeVisible();
});
```

## Widget Configuration

### Schema Validation

Use Zod for runtime validation:

```typescript
export const AdvancedWidgetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(50, 'Title too long'),
  symbol: z.string().regex(/^[A-Z]{1,5}$/, 'Invalid symbol format'),
  timeframe: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y']),
  refreshInterval: z.number().min(1000).max(300000).default(30000),
  customSettings: z
    .object({
      showGrid: z.boolean().default(true),
      showLegend: z.boolean().default(true),
      colorScheme: z.enum(['default', 'colorblind', 'monochrome']).default('default'),
    })
    .optional(),
});
```

### Configuration UI

The IDE automatically generates configuration forms from your schema:

```typescript
// Custom configuration component (optional)
export function MyWidgetConfig({ config, onChange }: {
  config: MyWidgetConfig;
  onChange: (config: MyWidgetConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Widget Title
        </label>
        <input
          id="title"
          type="text"
          value={config.title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="symbol" className="block text-sm font-medium">
          Symbol
        </label>
        <input
          id="symbol"
          type="text"
          value={config.symbol || ''}
          onChange={(e) => onChange({ ...config, symbol: e.target.value })}
          placeholder="e.g., AAPL"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="timeframe" className="block text-sm font-medium">
          Timeframe
        </label>
        <select
          id="timeframe"
          value={config.timeframe}
          onChange={(e) => onChange({ ...config, timeframe: e.target.value as any })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="1D">1 Day</option>
          <option value="1W">1 Week</option>
          <option value="1M">1 Month</option>
          <option value="3M">3 Months</option>
          <option value="6M">6 Months</option>
          <option value="1Y">1 Year</option>
        </select>
      </div>
    </div>
  );
}
```

## Data Integration

### Using Data Providers

Widgets can access data through the IDE's data provider system:

```typescript
import { useDataProvider } from '@/lib/data/hooks';

export function MyWidget({ id, config, ...props }) {
  const { getPrices, getKpis } = useDataProvider();
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (config.symbol) {
        const prices = await getPrices(config.symbol, config.timeframe);
        const kpis = await getKpis(config.symbol);
        setData({ prices, kpis });
      }
    };

    loadData();
  }, [config.symbol, config.timeframe, getPrices, getKpis]);

  // Render data...
}
```

### Real-time Updates

Implement WebSocket integration for live data:

```typescript
import { useWebSocket } from '@/lib/data/websocket';

export function LiveWidget({ id, config, ...props }) {
  const { subscribe, unsubscribe, messages } = useWebSocket('polygon');
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    if (config.symbol) {
      subscribe([config.symbol]);

      return () => {
        unsubscribe([config.symbol]);
      };
    }
  }, [config.symbol, subscribe, unsubscribe]);

  useEffect(() => {
    const handleMessage = (message) => {
      if (message.symbol === config.symbol) {
        setLiveData(message.data);
      }
    };

    messages.on('message', handleMessage);
    return () => messages.off('message', handleMessage);
  }, [config.symbol, messages]);

  // Render live data...
}
```

## Publishing Widgets

### Widget Package Structure

```
my-widget/
├── package.json
├── README.md
├── src/
│   ├── index.ts
│   ├── MyWidget.tsx
│   ├── MyWidgetSchema.ts
│   └── MyWidgetDefinition.ts
├── tests/
│   └── MyWidget.test.tsx
└── dist/
    └── index.js
```

### Package.json

```json
{
  "name": "@madlab/my-widget",
  "version": "1.0.0",
  "description": "A custom financial analysis widget for MAD LAB IDE",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/**/*.ts src/**/*.tsx"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "@madlab/core": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/react": "^18.0.0"
  }
}
```

### Distribution

1. Build your widget: `npm run build`
2. Test thoroughly: `npm test`
3. Publish to npm: `npm publish`
4. Submit to MAD LAB widget marketplace

## Troubleshooting

### Common Issues

1. **Widget not appearing**: Check registration and import
2. **Configuration validation errors**: Verify Zod schema
3. **Performance issues**: Implement memoization and lazy loading
4. **Type errors**: Ensure proper TypeScript types

### Debug Tools

- Use browser dev tools for runtime debugging
- Check console for registration messages
- Verify widget appears in registry: `console.log(widgetRegistry.getAllWidgets())`

## Resources

- [MAD LAB Widget Examples](https://github.com/madlab/madlab-widgets)
- [React Best Practices](https://react.dev/learn)
- [Zod Documentation](https://zod.dev/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Support

- Join our Discord: [MAD LAB Community](https://discord.gg/madlab)
- GitHub Issues: [Report bugs](https://github.com/madlab/madlab-ide/issues)
- Documentation: [Full API reference](https://docs.madlab.ai)
