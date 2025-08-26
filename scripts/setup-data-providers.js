#!/usr/bin/env node

/**
 * Data Provider Setup Script
 * Helps users configure real financial data providers
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupDataProviders() {
  console.log('🚀 MAD Lab - Data Provider Setup\n');
  console.log('This script will help you configure real financial data providers.\n');

  const providers = {
    alphaVantage: {
      name: 'Alpha Vantage',
      description: 'Free stock market data API (5 calls/minute, 500 calls/day)',
      signupUrl: 'https://www.alphavantage.co/support/#api-key',
      envKey: 'NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY',
      demoKey: 'demo'
    },
    polygon: {
      name: 'Polygon.io',
      description: 'High-quality market data (Free tier: 5 calls/minute)',
      signupUrl: 'https://polygon.io/',
      envKey: 'NEXT_PUBLIC_POLYGON_API_KEY',
      demoKey: null
    },
    alpaca: {
      name: 'Alpaca Markets',
      description: 'Commission-free trading API (Paper trading free)',
      signupUrl: 'https://alpaca.markets/',
      envKey: 'NEXT_PUBLIC_ALPACA_API_KEY',
      envSecret: 'NEXT_PUBLIC_ALPACA_SECRET_KEY',
      demoKey: null
    }
  };

  console.log('Available providers:\n');

  for (const [key, provider] of Object.entries(providers)) {
    console.log(`${key.toUpperCase()}: ${provider.name}`);
    console.log(`  ${provider.description}`);
    console.log(`  Sign up: ${provider.signupUrl}`);
    console.log('');
  }

  const choice = await question('Which provider would you like to configure? (alpha-vantage/polygon/alpaca/skip): ');
  const providerKey = choice.toLowerCase().replace('-', '');

  if (providerKey === 'skip') {
    console.log('✅ Setup skipped. You can configure providers later in the Settings panel.');
    process.exit(0);
  }

  if (!providers[providerKey]) {
    console.log('❌ Invalid choice. Run the script again.');
    process.exit(1);
  }

  const provider = providers[providerKey];

  if (providerKey === 'alpaca') {
    const apiKey = await question(`Enter your ${provider.name} API Key: `);
    const apiSecret = await question(`Enter your ${provider.name} API Secret: `);

    if (apiKey && apiSecret) {
      updateEnvFile(provider.envKey, apiKey);
      updateEnvFile(provider.envSecret, apiSecret);
      console.log(`✅ ${provider.name} configured successfully!`);
    }
  } else {
    const apiKey = await question(`Enter your ${provider.name} API Key (or 'demo' for limited access): `);

    if (apiKey) {
      updateEnvFile(provider.envKey, apiKey);
      console.log(`✅ ${provider.name} configured successfully!`);
    }
  }

  console.log('\n🎉 Configuration complete!');
  console.log('Restart your development server to apply changes.');
  console.log('You can also configure additional providers in the Settings panel.');

  rl.close();
}

function updateEnvFile(key, value) {
  const envPath = path.join(process.cwd(), '.env');

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const lines = envContent.split('\n');
  let keyFound = false;

  // Update existing key or add new one
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      keyFound = true;
      break;
    }
  }

  if (!keyFound) {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(envPath, lines.join('\n'));
}

if (require.main === module) {
  setupDataProviders().catch(console.error);
}

module.exports = { setupDataProviders };