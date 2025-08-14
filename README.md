# MAD LAB - Agent-Programmable Workbench

[![CI](https://github.com/your-repo/mad-lab-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/your-repo/mad-lab-workbench/actions/workflows/ci.yml)

A production-ready VS Code-inspired financial analysis workbench with agent integration capabilities, built with Next.js 14, TypeScript, and modern web technologies.

![MAD LAB Screenshot](https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=800)

## 🚀 Features

### Core Functionality

- **VS Code-Inspired Interface**: Pixel-perfect recreation of VS Code's layout and styling
- **Sheet Management System**: Create, manage, and switch between multiple analysis sheets
- **5 Financial Analysis Presets**:
  - 🏦 **Valuation Workbench**: KPI cards, DCF models, peer analysis, sensitivity testing
  - 📊 **Charting & Graphing**: Price charts, bar graphs, heatmaps, volume analysis
  - ⚠️ **Risk Analysis**: VaR/ES calculations, stress testing, correlation analysis
  - 📈 **Options Wizard**: Greeks analysis, volatility cones, strategy building, P&L profiles
  - 📝 **Blank Sheet**: Start from scratch with customizable widgets

### Advanced Capabilities

- **Draggable/Resizable Grid System**: Powered by react-grid-layout for intuitive widget management
- **State Persistence**: Full workspace state saved to localStorage with automatic hydration
- **Agent Chat Integration**: Built-in AI assistant for financial analysis guidance
- **Responsive Design**: Optimized for desktop, tablet, and mobile viewing
- **Theme System**: Light/dark mode with system preference detection
- **Professional Testing Suite**: Unit tests with Vitest + E2E tests with Playwright

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand with persistence middleware
- **Grid Layout**: react-grid-layout for widget positioning
- **Charts**: Recharts for data visualization
- **Testing**: Vitest + @testing-library/react + Playwright
- **Code Quality**: ESLint + Prettier with custom rules
- **Package Manager**: pnpm for fast, efficient dependency management

## 📦 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mad-lab-workbench

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript compiler check

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Run tests in watch mode
pnpm e2e              # Run end-to-end tests
```

### Streaming Modes

The workbench supports SSE → WS → Polling fallback with user-controllable preferences.

- Environment: set `NEXT_PUBLIC_WS_URL` to override the default `ws(s)://<host>/api/stream/ws`.
- Settings: open the Settings panel to choose `streamMode` (`auto`, `websocket`, `polling`) and `pollingIntervalMs`.

### Database (Prisma)

Persistent storage for templates, workspaces, and preferences can be enabled.

1. Install Prisma client:
   - `pnpm add -D prisma`
   - `pnpm add @prisma/client`
2. Configure environment:
   - `PRISMA_PROVIDER=postgresql` or `sqlite`
   - `DATABASE_URL=postgresql://user:pass@host:5432/db` (or `file:./dev.db` for SQLite)
   - `NEXT_PUBLIC_DB_MODE=db` to enable DB-backed APIs
3. Migrate:
   - `npx prisma migrate dev --name init`

APIs:
- `GET/POST/DELETE /api/templates`
- `GET/POST/PUT/DELETE /api/workspaces`

Healthcheck includes DB status at `/api/health`.

### Metrics & Observability

- `/api/metrics` returns timers (p50/p90/p99), counters, and error stats.
- Minimal OpenTelemetry hooks instrument server handlers via `lib/otel/instrumentation.ts` when `@opentelemetry/api` is present.

### Load Tests

Artillery scripts in `tests/load/`:
- `ws.artillery.yml`: WebSocket gateway
- `market.artillery.yml`: Market API
- `db.artillery.yml`: DB APIs

Run locally (optional): `pnpm dlx artillery run tests/load/ws.artillery.yml`

## 🏗️ Project Structure

```text
├── app/                    # Next.js app directory
│   ├── (routes)/          # Route groups
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── chrome/           # VS Code-like chrome components
│   │   ├── ActivityBar.tsx
│   │   ├── Explorer.tsx
│   │   ├── StatusBar.tsx
│   │   └── TitleBar.tsx
│   ├── editor/           # Editor and sheet components
│   │   ├── Editor.tsx
│   │   ├── GridCanvas.tsx
│   │   ├── SheetTabs.tsx
│   │   └── WidgetTile.tsx
│   ├── panels/           # Side and bottom panels
│   │   ├── AgentChat.tsx
│   │   └── BottomPanel.tsx
│   ├── widgets/          # Financial analysis widgets
│   │   ├── KpiCard.tsx
│   │   ├── DcfBasic.tsx
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── Heatmap.tsx
│   │   ├── VarEs.tsx
│   │   ├── StressScenarios.tsx
│   │   ├── FactorExposures.tsx
│   │   ├── CorrelationMatrix.tsx
│   │   ├── GreeksSurface.tsx
│   │   ├── VolCone.tsx
│   │   ├── StrategyBuilder.tsx
│   │   ├── PnLProfile.tsx
│   │   └── BlankTile.tsx
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilities and configuration
│   ├── store.ts          # Zustand state management
│   ├── presets.ts        # Sheet preset definitions
│   └── utils.ts          # Utility functions
├── tests/                # Test files
│   ├── e2e/             # Playwright E2E tests
│   ├── setup.ts         # Test setup
│   └── store.test.ts    # Unit tests
└── styles/              # Additional styles
```

## 🎯 Usage Guide

### Creating Your First Analysis

1. **Start with a Preset**: Click the "+" button in the sheet tabs to open the preset picker
2. **Choose Your Analysis Type**: Select from Valuation, Charting, Risk, Options, or Blank
3. **Customize Your Layout**: Drag and resize widgets to fit your workflow
4. **Add More Widgets**: Use the widget action buttons to expand your analysis
5. **Save Automatically**: Your workspace state is automatically persisted

### Working with Widgets

Each widget provides specialized financial analysis capabilities:

- **KPI Cards**: Key performance indicators with trend analysis
- **DCF Models**: Discounted cash flow valuation with sensitivity analysis
- **Charts**: Interactive visualizations for price, volume, and market data
- **Risk Metrics**: VaR, Expected Shortfall, and stress testing
- **Options Analysis**: Greeks, volatility analysis, and strategy building

### Agent Integration

The built-in AI agent assists with:

- Data interpretation and insights
- Model validation and recommendations
- Query processing for complex analysis
- Code generation for custom calculations

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for custom configuration:

```env
# Optional: Custom API endpoints
NEXT_PUBLIC_API_URL=https://your-api.com
NEXT_PUBLIC_AGENT_API_URL=https://your-agent-api.com
```

### Performance Ops Quickstart

- Web Workers
  - VaR bootstrap runs off main thread via `/public/workers/varWorker.js`. Widget terminates worker on unmount.

- Request Deduplication
  - Client hooks dedupe concurrent loads for prices, financials, vol surface, correlation.
  - Server `app/api/market` dedupes inflight GETs; `POST` supports batch symbols.
  - REST provider (`FetchRESTProvider`) dedupes inflight by endpoint+query.

- Memory Budget
  - Central cache (`lib/data/cache.ts`) enforces entry and byte caps with LRU-like eviction.
  - Env vars: `NEXT_PUBLIC_DATA_CACHE_MAX_BYTES`, `NEXT_PUBLIC_DATA_CACHE_MAX_ENTRIES`, `NEXT_PUBLIC_DATA_CACHE_TTL_MS`.

- Streaming
  - SSE endpoint has backpressure guard and server metrics; client throttles/batches and tracks update events.
  - WebSocket route coalesces outbound ticks per symbol with a bounded send queue. Client coalesces outbound control messages and pings.

- Monitoring
  - Core Web Vitals and custom performance telemetry initialized on app load. Client samples JS heap usage to warn at >80MB; critical at >100MB (respecting consent/DNT via analytics).
  - `/api/metrics` includes server memory and explicit WS gauges; `market:GET` p50/p90/p99 available in timers.

#### Batch GET API

`GET /api/market?type=prices&symbols=AAPL,MSFT&range=6M`

- Supports `type=prices|kpis|vol` with `symbols` CSV. Returns a map `{ SYMBOL: ... }`.
- Cache keys normalized (sorted uppercase symbols + params). Inflight dedup ensures concurrent identical requests coalesce.
- Cache-Control: `public, s-maxage=300, max-age=60, stale-while-revalidate=60`; `Vary: Accept-Encoding`.

For correlation, continue to use `type=correlation&symbols=...&period=...` which returns a matrix.

#### Streaming backpressure

- WS coalesces per-symbol updates and rate-limits dispatch; queue depth capped per flush. SSE retains guarded ticks. Configure endpoint with `NEXT_PUBLIC_WS_URL`.

#### Memory budgets (client)

Env overrides (bytes/ms/entries):

```
NEXT_PUBLIC_DATA_CACHE_MAX_BYTES=52428800
NEXT_PUBLIC_DATA_CACHE_MAX_ENTRIES=100
NEXT_PUBLIC_DATA_CACHE_TTL_MS=300000
```

#### Web Vitals

- Reported via analytics using PerformanceObserver and basic web-vitals style events. Respect DNT/consent.

For an in-depth overview of the VS Code extension architecture and routing, see [docs/extension-architecture.md](docs/extension-architecture.md).

### Theme Customization

Modify `app/globals.css` to customize the VS Code theme:

```css
.dark {
  --background: 222 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  /* Add your custom colors */
}
```

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test -- --coverage
```

### End-to-End Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
pnpm e2e

# Run E2E tests in UI mode
pnpm e2e -- --ui

# Collect full traces on all tests for flake triage
TRACE_ALL=1 pnpm e2e

# Or use the convenience script
pnpm e2e:trace
```

### Testing in VS Code

1. Build the webview assets: `pnpm build:webview`.
2. Open the MAD LAB VS Code extension and run “MAD LAB: Open Workbench”.
3. Open Webview DevTools (Command Palette: “Developer: Open Webview Developer Tools”).
4. In the webview console, exercise the bridge routes:
   - Show a notification:
     ```ts
     window.madlabBridge?.post?.('notification:show', { message: 'Hello from webview', type: 'info' });
     ```
   - Request theme and observe push events:
     ```ts
     window.madlabBridge?.request?.('theme:get', {});
     // Then toggle VS Code theme (light/dark/high contrast) and observe `theme:data` messages.
     ```

## ⌨️ Keyboard Shortcuts

The MAD LAB workbench supports extensive keyboard navigation and shortcuts for efficient financial analysis workflows:

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Create new blank sheet |
| `Ctrl/Cmd + W` | Close current sheet (if multiple sheets exist) |
| `Ctrl/Cmd + T` | Open command palette/preset picker |
| `Ctrl/Cmd + I` | Toggle Inspector panel |
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + 1-9` | Switch to sheet by index |
| `Alt + 1` | Toggle Explorer panel |
| `Alt + 3` | Toggle Agent Chat panel |
| `Tab` | Navigate to next sheet |
| `Shift + Tab` | Navigate to previous sheet |
| `Escape` | Deselect widget / Close dialogs |

### Widget Operations

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + D` | Duplicate selected widget |
| `Delete` | Remove selected widget |
| `Enter` | Configure selected widget (open Inspector) |

### Accessibility Features

- **Screen Reader Support**: All interactive elements include proper ARIA labels and roles
- **Focus Management**: Logical tab order through all UI components
- **Keyboard Navigation**: Full functionality available without mouse
- **Focus Indicators**: Clear visual focus rings for keyboard users
- **Skip Links**: Quick navigation to main content for screen readers

### Navigation Tips

- Use `Tab` and `Shift+Tab` to navigate between sheets efficiently
- `Escape` key universally closes modals and deselects elements
- All panel toggles use consistent Alt+Number patterns
- Widget operations follow standard desktop application conventions

## 🔐 Extension Keys & Provider Switching

You can switch between Mock (synthetic) data and live Extension-backed data.

1. Install and open the MAD LAB VS Code extension.
2. Build webview assets in this repo so the extension can load them:

   ```bash
   pnpm build:webview
   ```

3. In VS Code, set your data API key(s):
   - Command Palette: “MAD LAB: Set Alpha Vantage API Key”
   - Optional: “MAD LAB: Set OpenAI API Key” (for agent features)

4. Launch the MAD LAB Workbench (Command Palette: “MAD LAB: Open Workbench”).
5. In the web app, use the status bar toggle to switch providers:
   - Click the button labeled “Mock”/“Extension” at the right side of the status bar (`data-testid="provider-toggle"`).
   - The selection persists and restores on reload.
   - In Mock mode, a banner is shown: “Demo mode: synthetic data. Connect to extension for live data.”

Troubleshooting:
- If switching to Extension does nothing, ensure the webview is open and the `madlabBridge` is available (the extension provides it).
- If live data calls fail, verify your API key is configured and you have network access.

### Webview bridge snippets

From widgets or pages, you can use the extension bridge when running inside VS Code:

```ts
// Show a notification in VS Code UI
window.madlabBridge?.post?.('notification:show', { message: 'Export complete', type: 'info' });

// Request the current host theme
const theme = await window.madlabBridge?.request?.('theme:get', {});
console.log('Host theme:', theme);
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build Docker image
docker build -t mad-lab-workbench .

# Run container
docker run -p 3000:3000 mad-lab-workbench
```

### Static Export (Demo Mode)

```bash
# Build static files (Next.js static export)
pnpm build

# Files will be in the 'out' directory
```

When running the static demo, the app operates in mock data mode and displays a banner: "Demo mode: synthetic data". Real API keys are never exposed in the browser. For live data in development, use the VS Code extension (webview) and set your keys in the extension's SecretStorage.

## 🛣️ Roadmap

### Phase 1: Core Enhancement

- [ ] Real financial data integration (Alpha Vantage, Yahoo Finance)
- [ ] Advanced widget configuration system
- [ ] Custom widget builder
- [ ] Data export/import capabilities

### Phase 2: AI Integration

- [ ] Enhanced agent capabilities with financial domain knowledge
- [ ] Natural language query processing
- [ ] Automated insight generation
- [ ] Code generation for custom models

### Phase 3: Collaboration

- [ ] Multi-user workspaces
- [ ] Real-time collaboration
- [ ] Shared templates and presets
- [ ] Version control for analysis

### Phase 4: Enterprise Features

- [ ] SSO integration
- [ ] Advanced security and compliance
- [ ] Custom branding and themes
- [ ] API gateway for enterprise data sources

## 📝 TODO: Production Readiness Checklist

### Data Integration

- [ ] Connect to real financial data APIs (Alpha Vantage, Bloomberg, etc.)
- [ ] Implement data caching and refresh mechanisms
- [ ] Add data validation and error handling
- [ ] Support for multiple data formats (CSV, JSON, Parquet)

### Widget Enhancement

- [ ] Real-time data streaming for charts
- [ ] Interactive controls for all widgets
- [ ] Custom calculation engine
- [ ] Widget marketplace and plugin system

### Security & Performance

- [ ] API key management system
- [ ] Rate limiting and usage monitoring
- [ ] Lazy loading for large datasets
- [ ] Progressive web app (PWA) support

### User Experience

- [ ] Onboarding flow and tutorials
- [ ] Keyboard shortcuts and accessibility
- [ ] Mobile-optimized interface
- [ ] Offline mode capabilities

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the established TypeScript and React patterns
- Maintain comprehensive test coverage
- Update documentation for new features
- Ensure accessibility compliance (WCAG 2.1 AA)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **VS Code Team** for the exceptional developer experience that inspired this interface
- **shadcn/ui** for the beautiful, accessible component library
- **Zustand** for the elegant state management solution
- **Recharts** for the powerful charting capabilities
- **Next.js Team** for the outstanding full-stack React framework

---

**Built with ❤️ for the financial analysis community**

For questions, suggestions, or support, please [open an issue](https://github.com/your-repo/mad-lab-workbench/issues) or reach out to our team.
