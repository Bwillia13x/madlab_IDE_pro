#!/usr/bin/env node

/**
 * CI/CD Performance Check Script
 * Validates that the platform meets performance budgets before deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Performance budgets from expert analysis
const PERFORMANCE_BUDGETS = {
  bundleSize: 3 * 1024 * 1024,     // 3MB max bundle size
  buildTime: 60 * 1000,            // 60s max build time
  testTime: 120 * 1000,            // 2 min max test time
  lintTime: 30 * 1000,             // 30s max lint time
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function checkBundleSize() {
  console.log('📦 Checking bundle size...');
  
  const nextDir = path.join(__dirname, '../.next');
  if (!fs.existsSync(nextDir)) {
    console.log('⚠️  Build directory not found. Running build first...');
    execSync('pnpm build', { stdio: 'inherit' });
  }
  
  // Check main bundle sizes
  const staticDir = path.join(nextDir, 'static');
  let totalSize = 0;
  
  if (fs.existsSync(staticDir)) {
    const calculateDirectorySize = (dir) => {
      let size = 0;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          size += calculateDirectorySize(filePath);
        } else {
          const stats = fs.statSync(filePath);
          size += stats.size;
        }
      }
      return size;
    };
    
    totalSize = calculateDirectorySize(staticDir);
  }
  
  const passed = totalSize <= PERFORMANCE_BUDGETS.bundleSize;
  const status = passed ? '✅' : '❌';
  
  console.log(`${status} Bundle size: ${formatBytes(totalSize)} (budget: ${formatBytes(PERFORMANCE_BUDGETS.bundleSize)})`);
  
  if (!passed) {
    console.error(`🚨 Bundle size exceeds budget by ${formatBytes(totalSize - PERFORMANCE_BUDGETS.bundleSize)}`);
    return false;
  }
  
  return true;
}

function checkBuildPerformance() {
  console.log('🔨 Checking build performance...');
  
  const startTime = Date.now();
  
  try {
    execSync('pnpm build', { stdio: 'pipe' });
    const buildTime = Date.now() - startTime;
    const passed = buildTime <= PERFORMANCE_BUDGETS.buildTime;
    const status = passed ? '✅' : '❌';
    
    console.log(`${status} Build time: ${formatDuration(buildTime)} (budget: ${formatDuration(PERFORMANCE_BUDGETS.buildTime)})`);
    
    if (!passed) {
      console.error(`🚨 Build time exceeds budget by ${formatDuration(buildTime - PERFORMANCE_BUDGETS.buildTime)}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

function checkTestPerformance() {
  console.log('🧪 Checking test performance...');
  
  const startTime = Date.now();
  
  try {
    execSync('pnpm test', { stdio: 'pipe' });
    const testTime = Date.now() - startTime;
    const passed = testTime <= PERFORMANCE_BUDGETS.testTime;
    const status = passed ? '✅' : '❌';
    
    console.log(`${status} Test time: ${formatDuration(testTime)} (budget: ${formatDuration(PERFORMANCE_BUDGETS.testTime)})`);
    
    if (!passed) {
      console.error(`🚨 Test time exceeds budget by ${formatDuration(testTime - PERFORMANCE_BUDGETS.testTime)}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Tests failed:', error.message);
    return false;
  }
}

function checkLintPerformance() {
  console.log('🔍 Checking lint performance...');
  
  const startTime = Date.now();
  
  try {
    execSync('pnpm lint', { stdio: 'pipe' });
    const lintTime = Date.now() - startTime;
    const passed = lintTime <= PERFORMANCE_BUDGETS.lintTime;
    const status = passed ? '✅' : '❌';
    
    console.log(`${status} Lint time: ${formatDuration(lintTime)} (budget: ${formatDuration(PERFORMANCE_BUDGETS.lintTime)})`);
    
    if (!passed) {
      console.error(`🚨 Lint time exceeds budget by ${formatDuration(lintTime - PERFORMANCE_BUDGETS.lintTime)}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Lint failed:', error.message);
    return false;
  }
}

function generatePerformanceReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    overall: results.every(r => r),
    checks: {
      bundleSize: results[0],
      buildTime: results[1],
      testTime: results[2],
      lintTime: results[3],
    },
    budgets: PERFORMANCE_BUDGETS,
  };
  
  const reportPath = path.join(__dirname, '../performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📊 Performance report saved to: ${reportPath}`);
  return report;
}

function main() {
  console.log('🚀 MAD LAB Performance Check\n');
  console.log('Validating platform performance against expert analysis budgets...\n');
  
  const results = [];
  
  // Run all performance checks
  results.push(checkBundleSize());
  results.push(checkBuildPerformance());
  results.push(checkTestPerformance());
  results.push(checkLintPerformance());
  
  // Generate report
  const report = generatePerformanceReport(results);
  
  console.log('\n=== Performance Check Summary ===');
  
  if (report.overall) {
    console.log('🎉 All performance checks passed!');
    console.log('✅ Platform meets production readiness standards');
    console.log('✅ Ready for deployment');
    process.exit(0);
  } else {
    console.log('❌ Performance budget violations detected');
    console.log('⚠️  Platform needs optimization before deployment');
    
    const failedChecks = Object.entries(report.checks)
      .filter(([_, passed]) => !passed)
      .map(([check, _]) => check);
    
    console.log(`\nFailed checks: ${failedChecks.join(', ')}`);
    console.log('\n📋 Recommended actions:');
    
    if (!report.checks.bundleSize) {
      console.log('  • Optimize bundle size using code splitting and tree shaking');
      console.log('  • Remove unused dependencies');
      console.log('  • Use dynamic imports for large libraries');
    }
    
    if (!report.checks.buildTime) {
      console.log('  • Optimize build configuration');
      console.log('  • Use incremental builds');
      console.log('  • Reduce TypeScript compilation overhead');
    }
    
    if (!report.checks.testTime) {
      console.log('  • Optimize test performance');
      console.log('  • Use test parallelization');
      console.log('  • Reduce test timeout values');
    }
    
    if (!report.checks.lintTime) {
      console.log('  • Optimize ESLint configuration');
      console.log('  • Use lint caching');
      console.log('  • Reduce linted file scope');
    }
    
    process.exit(1);
  }
}

// Run performance check if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkBundleSize,
  checkBuildPerformance,
  checkTestPerformance,
  checkLintPerformance,
  generatePerformanceReport,
  PERFORMANCE_BUDGETS,
};