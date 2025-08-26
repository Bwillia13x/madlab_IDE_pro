#!/usr/bin/env node

/**
 * Quality Report Generator
 * Generates detailed quality reports for PRs and deployments
 *
 * Usage: node generate-quality-report.js [options]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class QualityReportGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './quality-reports';
    this.format = options.format || 'markdown'; // markdown, json, html
    this.includeArtifacts = options.includeArtifacts !== false;
    this.githubContext = this.getGitHubContext();
  }

  getGitHubContext() {
    // Get GitHub context from environment variables
    return {
      repository: process.env.GITHUB_REPOSITORY || 'unknown/repo',
      runId: process.env.GITHUB_RUN_ID || 'local',
      sha: process.env.GITHUB_SHA || this.getCurrentCommit(),
      ref: process.env.GITHUB_REF || 'local',
      actor: process.env.GITHUB_ACTOR || 'local-user',
      eventName: process.env.GITHUB_EVENT_NAME || 'local',
      runNumber: process.env.GITHUB_RUN_NUMBER || '1'
    };
  }

  getCurrentCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown-commit';
    }
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  loadTestResults() {
    const results = {};

    // Load test results from various sources
    const testResultFiles = [
      'test-results/results.json',
      'coverage/coverage-summary.json',
      'lint-results.json',
      'security-results.json',
      'performance-results.json'
    ];

    testResultFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          results[path.basename(file, '.json')] = JSON.parse(content);
        }
      } catch (error) {
        console.warn(`Could not load ${file}:`, error.message);
      }
    });

    return results;
  }

  calculateQualityScore(results) {
    let score = 100;
    const deductions = [];

    // Coverage deduction
    if (results['coverage-summary']) {
      const coverage = results['coverage-summary'].total.lines.pct;
      if (coverage < 80) {
        const deduction = Math.max(0, (80 - coverage) * 0.5);
        score -= deduction;
        deductions.push(`Coverage ${coverage}% (-${deduction.toFixed(1)}pts)`);
      }
    }

    // Test results deduction
    if (results['results']) {
      const totalTests = results.results.numTotalTests || 0;
      const failedTests = results.results.numFailedTests || 0;
      if (totalTests > 0) {
        const passRate = ((totalTests - failedTests) / totalTests) * 100;
        if (passRate < 95) {
          const deduction = Math.max(0, (95 - passRate) * 0.3);
          score -= deduction;
          deductions.push(`Test pass rate ${passRate.toFixed(1)}% (-${deduction.toFixed(1)}pts)`);
        }
      }
    }

    // Security issues deduction
    if (results['security-results']) {
      const securityIssues = results['security-results'].numFailedTests || 0;
      if (securityIssues > 0) {
        const deduction = securityIssues * 5;
        score -= deduction;
        deductions.push(`Security issues: ${securityIssues} (-${deduction}pts)`);
      }
    }

    // Lint errors deduction
    if (results['lint-results']) {
      const lintErrors = results['lint-results'].errorCount || 0;
      if (lintErrors > 0) {
        const deduction = lintErrors * 2;
        score -= deduction;
        deductions.push(`Lint errors: ${lintErrors} (-${deduction}pts)`);
      }
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      deductions
    };
  }

  generateMarkdownReport(results, qualityScore) {
    const context = this.githubContext;
    const timestamp = new Date().toISOString();

    let report = `# 🎯 Quality Gate Report

**Generated:** ${timestamp}
**Repository:** ${context.repository}
**Commit:** ${context.sha}
**Branch:** ${context.ref}
**Workflow Run:** #${context.runId}
**Triggered by:** ${context.actor}

## 📊 Quality Score

**Overall Score: ${qualityScore.score.toFixed(1)}/100**

### Score Breakdown
${qualityScore.deductions.map(d => `- ❌ ${d}`).join('\n')}

${qualityScore.deductions.length === 0 ? '✅ No quality issues found!' : ''}

## 📈 Detailed Results

`;

    // Test Results
    if (results['results']) {
      const testResults = results['results'];
      report += `### 🧪 Test Results
- **Total Tests:** ${testResults.numTotalTests || 0}
- **Passed:** ${testResults.numPassedTests || 0}
- **Failed:** ${testResults.numFailedTests || 0}
- **Pass Rate:** ${testResults.numTotalTests ?
        (((testResults.numTotalTests - (testResults.numFailedTests || 0)) / testResults.numTotalTests) * 100).toFixed(1) + '%' :
        'N/A'}
`;
    }

    // Coverage Results
    if (results['coverage-summary']) {
      const coverage = results['coverage-summary'].total;
      report += `
### 📊 Code Coverage
- **Statements:** ${coverage.lines.pct}%
- **Branches:** ${coverage.branches?.pct || 'N/A'}%
- **Functions:** ${coverage.functions?.pct || 'N/A'}%
- **Lines:** ${coverage.lines.pct}%
`;
    }

    // Security Results
    if (results['security-results']) {
      const security = results['security-results'];
      report += `
### 🔒 Security Scan
- **Tests Run:** ${security.numTotalTests || 0}
- **Issues Found:** ${security.numFailedTests || 0}
- **Status:** ${security.numFailedTests > 0 ? '❌ Issues Detected' : '✅ Clean'}
`;
    }

    // Lint Results
    if (results['lint-results']) {
      const lint = results['lint-results'];
      report += `
### 🔍 Code Quality (Linting)
- **Errors:** ${lint.errorCount || 0}
- **Warnings:** ${lint.warningCount || 0}
- **Status:** ${lint.errorCount > 0 ? '❌ Issues Found' : '✅ Clean'}
`;
    }

    // Performance Results
    if (results['performance-results']) {
      const perf = results['performance-results'];
      report += `
### ⚡ Performance Tests
- **Tests Run:** ${perf.numTotalTests || 0}
- **Passed:** ${perf.numPassedTests || 0}
- **Failed:** ${perf.numFailedTests || 0}
- **Status:** ${perf.numFailedTests > 0 ? '❌ Performance Issues' : '✅ Good'}
`;
    }

    // Quality Gate Status
    report += `
## 🎯 Quality Gate Status

${qualityScore.score >= 80 ? '### ✅ PASSED' : '### ❌ FAILED'}

**Threshold:** 80/100 (Minimum required score)
**Actual:** ${qualityScore.score.toFixed(1)}/100

`;

    if (qualityScore.score < 80) {
      report += `### 🚨 Action Required

The following issues must be resolved before deployment:

${qualityScore.deductions.map(d => `- ${d}`).join('\n')}

### 🔧 Recommended Actions

1. **Fix test failures** - All tests must pass
2. **Improve code coverage** - Target 80%+ coverage
3. **Address security issues** - No security vulnerabilities allowed
4. **Fix linting errors** - Code must pass all linting rules
5. **Optimize performance** - Performance tests must pass
`;
    } else {
      report += `### 🎉 Ready for Deployment

All quality gates have passed! The code is ready for deployment.

**Next Steps:**
1. Review the changes in the pull request
2. Approve the deployment (if required)
3. Monitor the deployment process
4. Verify the deployment in the target environment
`;
    }

    report += `
---

*Report generated automatically by Quality Gate workflow*
*View workflow run: [${context.runId}](https://github.com/${context.repository}/actions/runs/${context.runId})*
`;

    return report;
  }

  generateJSONReport(results, qualityScore) {
    const context = this.githubContext;

    return {
      metadata: {
        generated_at: new Date().toISOString(),
        repository: context.repository,
        commit: context.sha,
        branch: context.ref,
        workflow_run: context.runId,
        triggered_by: context.actor,
        event: context.eventName
      },
      quality_score: {
        overall: qualityScore.score,
        breakdown: qualityScore.deductions,
        passed: qualityScore.score >= 80
      },
      results: results,
      thresholds: {
        coverage_minimum: 80,
        test_pass_rate_minimum: 95,
        security_issues_maximum: 0,
        lint_errors_maximum: 0,
        performance_regression_maximum: 5
      }
    };
  }

  generateHTMLReport(results, qualityScore) {
    const markdown = this.generateMarkdownReport(results, qualityScore);

    // Simple markdown to HTML conversion
    let html = markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^(- .+)$/gm, '<li>$1</li>')
      .replace(/^(```)([\s\S]*?)(```)$/gm, '<pre><code>$2</code></pre>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap in HTML structure
    html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quality Gate Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .score { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <p>${html}</p>
</body>
</html>`;

    return html;
  }

  generateReport() {
    console.log('📊 Generating quality report...');

    this.ensureOutputDir();
    const results = this.loadTestResults();
    const qualityScore = this.calculateQualityScore(results);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `quality-report-${timestamp}`;

    let reportContent;
    let fileExtension;

    switch (this.format.toLowerCase()) {
      case 'json':
        reportContent = JSON.stringify(this.generateJSONReport(results, qualityScore), null, 2);
        fileExtension = 'json';
        break;
      case 'html':
        reportContent = this.generateHTMLReport(results, qualityScore);
        fileExtension = 'html';
        break;
      default: // markdown
        reportContent = this.generateMarkdownReport(results, qualityScore);
        fileExtension = 'md';
    }

    const filename = `${baseFilename}.${fileExtension}`;
    const filepath = path.join(this.outputDir, filename);

    fs.writeFileSync(filepath, reportContent, 'utf8');

    console.log(`✅ Quality report generated: ${filepath}`);
    console.log(`📊 Quality Score: ${qualityScore.score.toFixed(1)}/100`);
    console.log(`🎯 Status: ${qualityScore.score >= 80 ? 'PASSED' : 'FAILED'}`);

    if (qualityScore.deductions.length > 0) {
      console.log('\n❌ Issues found:');
      qualityScore.deductions.forEach(deduction => {
        console.log(`  - ${deduction}`);
      });
    }

    // Also generate a summary for GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
      const summary = this.generateMarkdownReport(results, qualityScore);
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    }

    return {
      filepath,
      qualityScore,
      passed: qualityScore.score >= 80
    };
  }

  // CLI interface
  static runFromCLI() {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--format':
        case '-f':
          options.format = args[i + 1];
          i++;
          break;
        case '--output':
        case '-o':
          options.outputDir = args[i + 1];
          i++;
          break;
        case '--no-artifacts':
          options.includeArtifacts = false;
          break;
        case '--help':
        case '-h':
          console.log(`
Quality Report Generator

Usage: node generate-quality-report.js [options]

Options:
  --format, -f <format>    Output format: markdown, json, html (default: markdown)
  --output, -o <dir>       Output directory (default: ./quality-reports)
  --no-artifacts          Don't include test artifacts in report
  --help, -h              Show this help message

Examples:
  node generate-quality-report.js
  node generate-quality-report.js --format json --output ./reports
  node generate-quality-report.js -f html -o ./docs
`);
          process.exit(0);
          break;
      }
    }

    const generator = new QualityReportGenerator(options);
    const result = generator.generateReport();

    // Exit with appropriate code for CI/CD
    process.exit(result.passed ? 0 : 1);
  }
}

// Run from CLI if this script is executed directly
if (require.main === module) {
  QualityReportGenerator.runFromCLI();
}

module.exports = QualityReportGenerator;