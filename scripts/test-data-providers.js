#!/usr/bin/env node

/**
 * Data Provider Testing Script
 * Tests real data provider functionality with market data
 */

const fs = require('fs');
const path = require('path');

class DataProviderTester {
  constructor() {
    this.testResults = [];
    this.testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    this.testRanges = ['1D', '5D', '1M', '6M'];
  }

  log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const statusEmoji = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    console.log(`${statusEmoji[status]} [${timestamp}] ${message}`);
    this.testResults.push({ timestamp, message, status });
  }

  async testAPIConnection(providerName, apiKey, testSymbol = 'AAPL') {
    this.log(`Testing ${providerName} API connection...`);

    if (!apiKey || apiKey === 'demo' || apiKey === 'your_*_key') {
      this.log(`${providerName} API key not configured, skipping real tests`, 'warning');
      return false;
    }

    try {
      let testUrl = '';

      switch (providerName) {
        case 'Alpha Vantage':
          testUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${testSymbol}&apikey=${apiKey}`;
          break;
        case 'Polygon':
          testUrl = `https://api.polygon.io/v2/aggs/ticker/${testSymbol}/prev?apiKey=${apiKey}`;
          break;
        default:
          this.log(`Unknown provider: ${providerName}`, 'error');
          return false;
      }

      const response = await fetch(testUrl);
      const data = await response.json();

      if (response.ok && !data['Error Message'] && !data['Note']) {
        this.log(`${providerName} API connection successful`, 'success');
        return true;
      } else {
        const errorMsg = data['Error Message'] || data['Note'] || `HTTP ${response.status}`;
        this.log(`${providerName} API error: ${errorMsg}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`${providerName} API connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testEnvironmentConfiguration() {
    this.log('Testing environment configuration...');

    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      this.log('.env file not found', 'error');
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const providers = [
      { name: 'Alpha Vantage', key: 'NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY' },
      { name: 'Polygon', key: 'NEXT_PUBLIC_POLYGON_API_KEY' },
      { name: 'Alpaca', key: 'NEXT_PUBLIC_ALPACA_API_KEY' },
    ];

    let configuredProviders = 0;

    for (const provider of providers) {
      const regex = new RegExp(`${provider.key}=(.+)`);
      const match = envContent.match(regex);

      if (match) {
        const apiKey = match[1].trim();
        if (apiKey && apiKey !== 'demo' && !apiKey.includes('your_')) {
          this.log(`${provider.name} API key configured`, 'success');
          const connectionTest = await this.testAPIConnection(provider.name, apiKey);
          if (connectionTest) configuredProviders++;
        } else {
          this.log(`${provider.name} has placeholder/demo key`, 'warning');
        }
      } else {
        this.log(`${provider.name} API key not found in .env`, 'warning');
      }
    }

    if (configuredProviders > 0) {
      this.log(`${configuredProviders} provider(s) configured and tested successfully`, 'success');
      return true;
    } else {
      this.log('No providers with valid API keys found', 'warning');
      return false;
    }
  }

  testDataProviderSystem() {
    this.log('Testing data provider system structure...');

    const requiredFiles = [
      'lib/data/providers.ts',
      'lib/data/hooks.ts',
      'lib/data/adapters/mock.ts',
      'lib/data/adapters/alpha-vantage.ts',
      'lib/data/cache.ts',
      'components/providers/DataProvider.tsx',
      'components/providers/DataProviderConfig.tsx',
    ];

    let allFilesExist = true;

    for (const file of requiredFiles) {
      if (fs.existsSync(path.join(process.cwd(), file))) {
        this.log(`✅ ${file} exists`, 'success');
      } else {
        this.log(`❌ ${file} missing`, 'error');
        allFilesExist = false;
      }
    }

    if (allFilesExist) {
      this.log('All required data provider files present', 'success');
    } else {
      this.log('Some data provider files are missing', 'error');
    }

    return allFilesExist;
  }

  generateTestReport() {
    const reportPath = path.join(process.cwd(), 'DATA_PROVIDER_TEST_REPORT.md');

    let report = '# Data Provider Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += '## Test Results\n\n';

    for (const result of this.testResults) {
      report += `- ${result.status.toUpperCase()}: ${result.message}\n`;
    }

    report += '\n## Configuration Status\n\n';

    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const providers = [
        'NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY',
        'NEXT_PUBLIC_POLYGON_API_KEY',
        'NEXT_PUBLIC_ALPACA_API_KEY',
      ];

      for (const provider of providers) {
        const regex = new RegExp(`${provider}=(.+)`);
        const match = envContent.match(regex);
        if (match) {
          const value = match[1].trim();
          const status =
            value && value !== 'demo' && !value.includes('your_') ? 'CONFIGURED' : 'NOT CONFIGURED';
          report += `- ${provider}: ${status}\n`;
        } else {
          report += `- ${provider}: NOT FOUND\n`;
        }
      }
    }

    report += '\n## Recommendations\n\n';

    const hasRealProviders = this.testResults.some(
      (r) =>
        r.message.includes('API connection successful') ||
        r.message.includes('provider(s) configured and tested successfully')
    );

    if (hasRealProviders) {
      report += '✅ Real data providers are configured and ready to use.\n';
      report += '✅ Your application will use live market data automatically.\n';
    } else {
      report += '⚠️  No real data providers configured. Application will use mock data.\n';
      report += '💡 To enable real data:\n';
      report += '   1. Get API keys from provider websites\n';
      report += '   2. Run: node scripts/setup-data-providers.js\n';
      report += '   3. Or manually update .env file\n';
      report += '   4. Restart your development server\n';
    }

    report += '\n## Available Providers\n\n';
    report += '- **Alpha Vantage**: Free tier (5 calls/min, 500/day)\n';
    report += '- **Polygon.io**: Free tier (5 calls/min)\n';
    report += '- **Alpaca**: Free paper trading\n';
    report += '- **Mock**: Always available (fallback)\n';

    fs.writeFileSync(reportPath, report);
    console.log(`\n📊 Test report saved to: ${reportPath}`);
  }

  async runAllTests() {
    console.log('🚀 Starting Data Provider Test Suite\n');

    try {
      // Test 1: Environment Configuration
      await this.testEnvironmentConfiguration();

      // Test 2: Data Provider System
      this.testDataProviderSystem();

      // Test 3: Generate Report
      this.generateTestReport();

      console.log('\n🎉 Test suite completed!');
      console.log('📊 Check DATA_PROVIDER_TEST_REPORT.md for detailed results.');
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DataProviderTester();
  tester.runAllTests().catch(console.error);
}

module.exports = { DataProviderTester };
