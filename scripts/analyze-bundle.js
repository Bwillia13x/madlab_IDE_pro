#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Analyze package.json dependencies vs actual usage
function analyzeDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const sourceDir = './';
  const unusedDependencies = [];
  const heavyDependencies = [];
  
  // Patterns that indicate heavy libraries
  const heavyPatterns = {
    'd3': 'Heavy data visualization library',
    'react-grid-layout': 'Grid layout with dependencies',
    'recharts': 'Chart library with heavy dependencies',
    'embla-carousel': 'Carousel library',
    'date-fns': 'Date utility library',
    '@radix-ui': 'UI component libraries (many packages)',
    'playwright': 'Testing framework',
    'vitest': 'Testing framework',
    'eslint': 'Linting framework',
    'typescript': 'TypeScript compiler'
  };

  // Check for potentially unused dependencies
  Object.keys(dependencies).forEach(dep => {
    // Skip obvious dev dependencies
    if (dep.includes('eslint') || dep.includes('typescript') || 
        dep.includes('@types/') || dep.includes('prettier') ||
        dep.includes('vitest') || dep.includes('playwright')) {
      return;
    }

    // Check if dependency appears in source files
    let found = false;
    try {
      const result = require('child_process').execSync(
        `grep -r "from.*${dep}\\|import.*${dep}\\|require.*${dep}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null || true`,
        { encoding: 'utf8' }
      );
      
      if (result.trim()) {
        found = true;
      }
    } catch (e) {
      // grep failed, assume it's used
      found = true;
    }

    if (!found) {
      unusedDependencies.push(dep);
    }

    // Check for heavy dependencies
    Object.keys(heavyPatterns).forEach(pattern => {
      if (dep.includes(pattern)) {
        heavyDependencies.push({
          name: dep,
          reason: heavyPatterns[pattern]
        });
      }
    });
  });

  console.log('🔍 Bundle Analysis Report\n');
  
  console.log('📦 Heavy Dependencies (consider optimization):');
  heavyDependencies.forEach(dep => {
    console.log(`  - ${dep.name}: ${dep.reason}`);
  });
  
  console.log('\n⚠️  Potentially Unused Dependencies:');
  if (unusedDependencies.length === 0) {
    console.log('  None found (basic analysis)');
  } else {
    unusedDependencies.forEach(dep => {
      console.log(`  - ${dep}`);
    });
  }

  console.log('\n💡 Optimization Recommendations:');
  console.log('  1. Consider tree-shaking for unused exports');
  console.log('  2. Use dynamic imports for heavy widgets');
  console.log('  3. Split vendor chunks in webpack config');
  console.log('  4. Consider lighter alternatives for heavy deps');
  console.log('  5. Use package analysis tools like webpack-bundle-analyzer');

  // Suggestions for specific optimizations
  console.log('\n🎯 Specific Optimizations:');
  
  if (dependencies['d3']) {
    console.log('  - D3: Import only needed modules (d3-scale, d3-selection) instead of full d3');
  }
  
  if (dependencies['recharts']) {
    console.log('  - Recharts: Consider lightweight charting library for simple charts');
  }
  
  if (Object.keys(dependencies).filter(d => d.includes('@radix-ui')).length > 10) {
    console.log('  - Radix UI: Using many components, ensure tree-shaking is working');
  }
  
  console.log('  - Enable Next.js bundle analyzer with ANALYZE=true');
  console.log('  - Consider using import() for non-critical widgets');
  console.log('  - Implement service worker caching for static assets');
}

analyzeDependencies();