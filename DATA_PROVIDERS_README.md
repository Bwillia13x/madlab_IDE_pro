# Real Data Providers Setup Guide

This guide explains how to enable real financial market data in MAD Lab by configuring data providers.

## Quick Start

### Option 1: Use Demo Keys (Immediate)
The system is pre-configured with demo settings. Simply:

1. Open the application
2. Go to Settings → Data Provider Configuration
3. Select "Alpha Vantage" from the dropdown
4. Click "Save & Switch"

This will enable limited real data access using demo keys.

### Option 2: Setup Your Own API Keys

#### Alpha Vantage (Recommended - Free)
1. Visit [Alpha Vantage API Key](https://www.alphavantage.co/support/#api-key)
2. Sign up for a free account
3. Get your API key
4. Run the setup script:
   ```bash
   node scripts/setup-data-providers.js
   ```
5. Or manually add to `.env`:
   ```
   NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_actual_api_key_here
   ```

#### Polygon.io (Alternative)
1. Visit [Polygon.io](https://polygon.io/)
2. Sign up for a free account (5 calls/minute limit)
3. Get your API key
4. Add to `.env`:
   ```
   NEXT_PUBLIC_POLYGON_API_KEY=your_polygon_api_key
   ```

#### Alpaca Markets (Trading)
1. Visit [Alpaca Markets](https://alpaca.markets/)
2. Sign up for a paper trading account (free)
3. Get API credentials
4. Add to `.env`:
   ```
   NEXT_PUBLIC_ALPACA_API_KEY=your_alpaca_key
   NEXT_PUBLIC_ALPACA_SECRET_KEY=your_alpaca_secret
   ```

## Data Provider Features

### Alpha Vantage
- ✅ **Stock Prices**: Historical and real-time quotes
- ✅ **Company Financials**: Income statements, balance sheets
- ✅ **Technical Indicators**: RSI, MACD, moving averages
- ✅ **Free Tier**: 5 calls/minute, 500 calls/day
- ⚠️ **Rate Limited**: 12-second delay between requests

### Polygon.io
- ✅ **Real-time Quotes**: Low-latency market data
- ✅ **Historical Data**: Comprehensive price history
- ✅ **News Integration**: Financial news and press releases
- ✅ **Free Tier**: 5 calls/minute
- ⚠️ **Paid for Production**: Higher limits require subscription

### Alpaca Markets
- ✅ **Paper Trading**: Risk-free trading simulation
- ✅ **Real-time Data**: Live market quotes
- ✅ **Trading API**: Full order execution capabilities
- ✅ **Free Paper Trading**: Unlimited practice trading
- ⚠️ **Live Trading**: Requires funded account

## How It Works

### Automatic Fallback System
The system uses an intelligent fallback mechanism:

1. **Primary**: Attempts to use configured real data providers
2. **Fallback**: If real providers fail, automatically switches to mock data
3. **Graceful Degradation**: Shows appropriate notifications to users

### Smart Caching
- **5-minute cache** for all data requests
- **Automatic cache invalidation** when switching providers
- **Background refresh** for stale data

### Error Handling
- **Rate limit detection** with automatic retry
- **Network error recovery** with exponential backoff
- **API key validation** with helpful error messages
- **Service health monitoring** with status indicators

## Testing Real Data

After configuring a provider:

1. **Check Provider Health**:
   - Settings → Data Provider Configuration
   - Look for green "Ready" status indicators

2. **Test Connection**:
   - Use the "Test Connection" button in provider settings
   - Verify successful API communication

3. **Monitor Data**:
   - All financial widgets will automatically use real data
   - Check browser console for provider status messages
   - Look for "Using mock data" notifications if fallback occurs

## Troubleshooting

### Common Issues

**"Rate limit exceeded"**
- Alpha Vantage allows 5 calls/minute
- Wait 12 seconds between requests
- Consider upgrading to paid tier for higher limits

**"Invalid API key"**
- Verify your API key in `.env` file
- Check for extra spaces or special characters
- Test the key directly with the provider's API

**"Network error"**
- Check your internet connection
- Verify provider service status
- Try again in a few minutes

### Debug Mode
Enable debug logging by adding to `.env`:
```
DEBUG_DATA_PROVIDERS=true
```

This will show detailed provider initialization and API request logs in the browser console.

## Provider Status

Current system status:
- ✅ Mock Provider: Always available (fallback)
- ✅ Alpha Vantage: Ready for demo/limited use
- ⏳ Polygon: Requires API key configuration
- ⏳ Alpaca: Requires account setup

## API Limits & Costs

| Provider | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| Alpha Vantage | 500 calls/day | $20-200/month | General market data |
| Polygon.io | 5 calls/minute | $20-200/month | Real-time data |
| Alpaca | Unlimited paper | $0 (paper only) | Trading simulation |

## Next Steps

1. **Start with Alpha Vantage** for immediate real data access
2. **Test thoroughly** with different symbols and timeframes
3. **Monitor usage** to understand your data needs
4. **Consider paid plans** if you need higher rate limits

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your API keys are correct
3. Test the provider's API directly
4. Check the provider's status page

The system is designed to be resilient and will automatically fallback to mock data if real providers are unavailable.