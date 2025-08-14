# MAD LAB IDE - Deployment Guide

## Overview

MAD LAB IDE can be deployed in two modes:
1. **Demo Mode**: Static web deployment with synthetic data
2. **Extension Mode**: Full functionality within VS Code with real market data

## Demo Mode Deployment

### Vercel Deployment

The static demo uses synthetic data and runs entirely in the browser.

#### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

#### Steps

1. **Prepare Build**
   ```bash
   pnpm install
   pnpm build
   ```

2. **Deploy to Vercel**
   ```bash
   # Via Vercel CLI
   npm i -g vercel
   vercel --prod

   # Or connect GitHub repo in Vercel dashboard
   ```

3. **Configuration**
   - Build Command: `pnpm build`
   - Output Directory: `out`
   - Node.js Version: 18.x

#### Environment Variables
None required for demo mode - uses mock data only. Optional overrides:

- `NEXT_PUBLIC_WS_URL`: custom WebSocket endpoint for real-time prices
- `NEXT_PUBLIC_DB_MODE`: set to `db` to enable DB-backed persistence via Prisma
- `PRISMA_PROVIDER` and `DATABASE_URL`: configure Prisma datasource

#### Demo Limitations
- ⚠️ **Synthetic data only** - No real market data
- No API key requirements
- Fully offline-capable after initial load
- Demo banner automatically displays in mock mode
- Limited to mock provider functionality

### Other Static Hosts

The build output (`/out` directory) can be deployed to:
- Netlify
- GitHub Pages  
- AWS S3 + CloudFront
- Any static file host

## Extension Mode Deployment

### VS Code Extension Installation

1. **Download VSIX**
   ```bash
   # From releases or build locally
   cd apps/extension
   pnpm build
   pnpm package
   ```

2. **Install Extension**
   ```bash
   code --install-extension madlab-workbench.vsix
   ```

3. **Configure API Keys**
   - Command Palette: `MAD LAB: Set Alpha Vantage API Key`
   - Keys stored securely in VS Code SecretStorage
   - Never exposed to webview

### Extension Configuration

#### Required API Keys
- **Alpha Vantage**: Free tier available at [alphavantage.co](https://www.alphavantage.co/support/#api-key)
  - 5 API requests per minute
  - 500 requests per day

#### Extension Commands
- `MAD LAB: Set Alpha Vantage API Key` - Configure market data access
- `MAD LAB: Open Workbench` - Launch the workbench panel
- `MAD LAB: Clear Cache` - Reset cached market data

## Security Considerations

### Content Security Policy (CSP)
- Extension webview uses strict CSP
- No inline scripts without nonce
- No external resource loading
- API keys never exposed to webview JavaScript

### Data Flow
```
Webview → Extension Bridge → VS Code SecretStorage → Market Data APIs
```

### Privacy
- API keys stored locally in VS Code SecretStorage
- No telemetry or external tracking
- Market data requests go directly to providers

## Performance Notes

### Bundle Sizes
- Main bundle: < 3MB gzipped
- Lazy-loaded widget chunks: < 500KB each
- Extension: < 1MB total

### Caching
- Extension caches market data with TTL
- Webview uses browser cache for assets
- No server-side caching required

## Troubleshooting

### Demo Mode Issues
- Clear browser cache if styles appear broken
- Check console for JavaScript errors
- Ensure demo banner is visible (indicates mock mode)

### Extension Mode Issues
- Verify extension is installed and enabled
- Check VS Code Developer Console for errors
- Ensure API keys are configured via Command Palette
- Test with `MAD LAB: Clear Cache` if data seems stale

### Build Issues
- Node.js 18+ required
- Use `pnpm` for consistent dependency resolution
- Clear `node_modules` and `pnpm-lock.yaml` if builds fail

## Support

For deployment issues:
- Check GitHub Issues: [Repository Issues](https://github.com/your-org/madlab-ide/issues)
- Review logs in VS Code Developer Console
- Verify API key quotas and limits