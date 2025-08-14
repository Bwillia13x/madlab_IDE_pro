# Changelog

## Unreleased

- Market API: Added batch GET support for `prices`, `kpis`, `vol` via `symbols` CSV; normalized cache keys; strong CDN caching with `s-maxage`; `Vary: Accept-Encoding`.
- WS streaming: Added server-side backpressure with per-symbol coalescing, bounded send queue, and tick p50/p99 timers; added client outbound coalescing.
- Metrics: `/api/metrics` now includes server memory snapshot and WS gauges. UI surfaces mem in Data Provider Health and Metrics panel.
- Memory monitoring: Client samples `performance.memory.usedJSHeapSize` and raises warnings above 80MB; critical above 100MB with analytics event and toast (consent-aware).
- Widget lifecycle: Registry supports optional `onUnmount`; store calls instance cleanup on widget removal.
- Web Vitals: Integrated `web-vitals` to report LCP/CLS/INP through analytics when enabled.
- Design: Progressive disclosure sweep across chrome/panels/widgets. Primary controls remain visible; secondary controls reveal on hover/focus with 150–200ms transitions. Unified control sizes (default h-8, sm h-7, lg h-9), 8px spacing rhythm, and consistent menu paddings.
# Changelog

All notable changes to MAD LAB IDE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0-MVP] - 2024-08-11

### Added
- **Data Provider Toggle**: Runtime switching between mock and extension data sources
- **Demo Banner**: Clear indication when using synthetic data in demo mode
- **Extension Data Proxy**: Secure market data fetching via VS Code SecretStorage
- **Widget Registry System**: Pluggable, versioned widget architecture
- **Inspector Auto-Forms**: Dynamic form generation from Zod schemas
- **DCF Calculator**: Discounted Cash Flow valuation with deterministic calculations
- **VaR/ES Risk Engine**: Value at Risk and Expected Shortfall calculations
- **Workspace Import/Export**: Full workspace serialization with version migration
- **Agent Tools**: Local financial analysis tools without LLM requirements
- **Error Boundaries**: Graceful failure handling with user-friendly fallbacks
- **Performance Optimizations**: Code splitting, lazy loading, and bundle size controls
- **E2E Testing**: Comprehensive end-to-end test coverage with stable selectors
- **VS Code Extension**: Full VSIX packaging with marketplace metadata
- **Documentation**: Complete architecture and developer guides
- **CI Pipeline**: Automated testing, building, and quality gates
- **Issue Templates**: Standardized bug report and feature request forms

### Enhanced
- **CSP Hardening**: Content Security Policy with nonce-based script execution
- **Theme System**: Comprehensive dark/light mode with system preference detection
- **Keyboard Navigation**: Full accessibility with screen reader support
- **Provider Architecture**: Enhanced data provider system with Zod validation
- **Widget System**: 19+ financial widgets with real-time data integration
- **Grid Layout**: Persistent drag-and-drop workspace with collision detection

### Technical
- **Bundle Size**: Main bundle < 3MB gzipped with lazy chunk loading
- **Type Safety**: Full TypeScript coverage with strict configuration
- **Zod Validation**: Runtime data validation at all provider boundaries  
- **State Management**: Zustand-based store with persistence and migrations
- **Extension Bridge**: Secure webview-extension communication protocol

### Security
- **API Key Management**: SecretStorage integration with zero webview exposure
- **CSP Compliance**: Strict Content Security Policy preventing XSS
- **Data Validation**: Runtime validation of all external data sources
- **Permission Model**: Minimal extension permissions with audit trail

### Performance
- **Code Splitting**: Dynamic imports for heavy widgets and features
- **Caching Strategy**: In-memory TTL cache for market data requests
- **Bundle Optimization**: Tree shaking, minification, and asset optimization
- **Render Optimization**: Memoized components and optimized re-render cycles

### Developer Experience
- **Hot Reload**: Fast development with instant preview
- **Type Generation**: Automatic type inference from schemas
- **Error Handling**: Comprehensive error boundaries and logging
- **Development Tools**: Integrated debugging and inspection tools

### Documentation
- Architecture overview with Mermaid diagrams
- Data provider integration guide
- Widget development tutorial
- Quantitative finance API reference
- Agent tool development guide
- Deployment and configuration docs

### Testing
- Unit tests for core financial calculations
- Integration tests for data providers
- E2E tests for critical user workflows
- Performance tests for bundle size limits
- Accessibility tests for keyboard navigation

## [0.2.0] - Previous versions

### Added
- Initial prototype with basic grid layout
- Mock data providers and sample widgets
- Basic extension scaffold

---

## Release Notes

### v0.3.0-MVP Release Criteria

✅ **Extension mode**: Live market data rendering within ~2s  
✅ **DCF & VaR/ES**: Deterministic calculations with <100ms response  
✅ **Mock demo**: Fully offline operation with visible demo banner  
✅ **Import/Export**: Exact workspace round-trip preservation  
✅ **Bundle budgets**: All size limits respected  
✅ **CI pipeline**: Green build status required  

### Breaking Changes
- Provider API updated to async-first architecture
- Widget registration now requires version metadata
- Store state schema updated (automatic migration included)

### Migration Guide
- Workspaces from v0.2.x automatically migrate on load
- Custom widgets need version field added
- Provider implementations need async/await updates

### Known Issues
- Performance optimization verification pending (M12)
- Accessibility enhancements planned for post-MVP
- Additional provider integrations in roadmap

---

For detailed technical changes, see individual commit messages following [Conventional Commits](https://www.conventionalcommits.org/) specification.