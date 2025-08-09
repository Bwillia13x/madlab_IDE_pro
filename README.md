# MAD LAB - Agent-Programmable Workbench

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

## 🏗️ Project Structure

```
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

### Static Export

```bash
# Build static files
pnpm build

# Files will be in the 'out' directory
```

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