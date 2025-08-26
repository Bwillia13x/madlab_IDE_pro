#!/bin/bash

# Quality Gates Setup Script
# This script sets up the complete quality gates infrastructure

set -e

echo "🚀 Setting up Quality Gates for MAD LAB Platform"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in GitHub repository
if [ -z "$GITHUB_REPOSITORY" ]; then
    print_warning "Not running in GitHub environment. Some features may not work correctly."
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p .github/workflows
mkdir -p .github/scripts
mkdir -p quality-reports
mkdir -p deployment-history

# Function to backup existing file
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        print_status "Backed up $file to $backup"
    fi
}

# Setup GitHub Branch Protection Rules
setup_branch_protection() {
    print_status "Setting up GitHub Branch Protection Rules..."

    if [ -z "$GITHUB_TOKEN" ]; then
        print_warning "GITHUB_TOKEN not set. Skipping automatic branch protection setup."
        print_warning "Please run the following command manually after setting GITHUB_TOKEN:"
        echo "  node .github/setup-branch-protection.js $GITHUB_REPOSITORY YOUR_TOKEN_HERE"
        return
    fi

    if [ -f ".github/setup-branch-protection.js" ]; then
        node .github/setup-branch-protection.js "$GITHUB_REPOSITORY" "$GITHUB_TOKEN"
    else
        print_error "Branch protection setup script not found!"
    fi
}

# Configure workflows
setup_workflows() {
    print_status "Configuring GitHub Actions workflows..."

    # Backup existing workflows
    backup_file ".github/workflows/test-pipeline.yml"
    backup_file ".github/workflows/ci-cd.yml"
    backup_file ".github/workflows/ci.yml"

    print_success "Workflow files are ready for use"
}

# Setup quality gate configuration
setup_quality_config() {
    print_status "Setting up quality gate configuration..."

    if [ ! -f ".github/quality-gates-config.json" ]; then
        print_error "Quality gates configuration file not found!"
        return
    fi

    print_success "Quality gates configuration is ready"
}

# Setup notification webhooks
setup_notifications() {
    print_status "Setting up notification webhooks..."

    echo "Please configure the following secrets in your GitHub repository:"
    echo ""
    echo "Slack Notifications:"
    echo "  SLACK_WEBHOOK_URL - Your Slack webhook URL"
    echo ""
    echo "Discord Notifications:"
    echo "  DISCORD_WEBHOOK_URL - Your Discord webhook URL"
    echo "  DISCORD_QUALITY_GATES_WEBHOOK - Specific webhook for quality gates"
    echo "  DISCORD_DEPLOYMENTS_WEBHOOK - Specific webhook for deployments"
    echo ""
    echo "Security and External Services:"
    echo "  SNYK_TOKEN - For Snyk security scanning"
    echo "  PACT_BROKER_URL - For contract testing"
    echo "  PACT_BROKER_TOKEN - For contract testing"
    echo ""
    echo "Deployment Secrets:"
    echo "  VERCEL_TOKEN - For Vercel deployments"
    echo "  VERCEL_ORG_ID - Vercel organization ID"
    echo "  VERCEL_PROJECT_ID - Vercel project ID"
    echo ""

    print_warning "Notification setup requires manual configuration of secrets"
}

# Setup quality reports
setup_quality_reports() {
    print_status "Setting up quality reports..."

    if [ ! -f ".github/scripts/generate-quality-report.js" ]; then
        print_error "Quality report generator not found!"
        return
    fi

    chmod +x .github/scripts/generate-quality-report.js
    print_success "Quality report generator is ready"
}

# Setup deployment tracking
setup_deployment_tracking() {
    print_status "Setting up deployment tracking..."

    cat > deployment-history/README.md << 'EOF'
# Deployment History

This directory contains historical records of all deployments made through the quality gates system.

## Files

- `{deployment-id}.json` - Individual deployment records
- `rollback-history.json` - History of rollback operations
- `deployment-metrics.json` - Aggregated deployment metrics

## Deployment Record Format

```json
{
  "deployment_id": "123456789",
  "environment": "production",
  "commit": "abc123...",
  "timestamp": "2024-01-01T12:00:00Z",
  "quality_gates": {
    "coverage": 85.5,
    "test_results": 98.2,
    "security_issues": 0,
    "lint_errors": 0,
    "type_errors": 0
  },
  "status": "success|failed",
  "rollback_available": true,
  "previous_deployment": "987654321"
}
```

## Usage

Deployment records are automatically created and managed by the quality gates workflow.
EOF

    print_success "Deployment tracking is ready"
}

# Create setup summary
create_setup_summary() {
    print_status "Creating setup summary..."

    cat > .github/QUALITY_GATES_README.md << 'EOF'
# Quality Gates Setup

This document outlines the quality gates system that has been configured for this repository.

## 🚀 What Was Set Up

### 1. Quality Gates Workflow
- **File:** `.github/workflows/quality-gates.yml`
- **Purpose:** Comprehensive quality assessment and deployment blocking
- **Triggers:** Push to main/develop, Pull Requests, Manual dispatch

### 2. Deployment Approval Workflow
- **File:** `.github/workflows/deployment-approval.yml`
- **Purpose:** Manual approval process for production deployments
- **Features:** Environment-specific approvals, rollback support

### 3. Quality Configuration
- **File:** `.github/quality-gates-config.json`
- **Purpose:** Centralized configuration for quality thresholds and rules

### 4. Branch Protection Setup
- **File:** `.github/setup-branch-protection.js`
- **Purpose:** Automated setup of GitHub branch protection rules

### 5. Quality Reports
- **File:** `.github/scripts/generate-quality-report.js`
- **Purpose:** Generate detailed quality reports for PRs and deployments

## 🎯 Quality Gates

### Environment-Specific Thresholds

#### Development
- Code Coverage: 60%
- Test Pass Rate: 70%
- Security Issues: Max 5 high/critical
- Lint Errors: Max 5 errors, 50 warnings
- Manual Approval: Not required

#### Staging
- Code Coverage: 75%
- Test Pass Rate: 85%
- Security Issues: Max 2 high/critical
- Lint Errors: 0 errors, 20 warnings
- Manual Approval: Not required

#### Production
- Code Coverage: 80%
- Test Pass Rate: 95%
- Security Issues: 0 high/critical
- Lint Errors: 0 errors, 10 warnings
- Manual Approval: Required

## 🔒 Branch Protection Rules

The following branch protection rules are recommended:

### Main Branch
- Require status checks: Quality Gates, Test Pipeline
- Required reviews: 2 approvals
- Require up-to-date branches
- Restrict pushes that create matching branches
- Require linear history
- No force pushes

### Develop Branch
- Require status checks: Quality Gates, Test Pipeline
- Required reviews: 1 approval
- Require up-to-date branches

## 📊 Quality Checks Performed

### Code Quality
- Linting (ESLint)
- Type checking (TypeScript)
- Code formatting (Prettier)

### Testing
- Unit tests (Vitest)
- Integration tests (Vitest)
- End-to-end tests (Playwright)
- Visual regression tests (Playwright)
- Contract tests (Pact)

### Security
- Snyk security scanning
- Dependency vulnerability checks
- Security unit tests

### Performance
- Lighthouse CI performance tests
- Performance regression detection
- Bundle size monitoring

### Accessibility
- Accessibility tests (axe-core)
- WCAG compliance checking

## 🚨 Notifications

### Slack Notifications
- Quality gate failures
- Deployment status updates
- Rollback alerts

### Discord Notifications
- Quality gate results
- Deployment notifications

### GitHub Issues
- Automatic issue creation for quality gate failures
- Deployment approval requests

## 🔄 Deployment Process

1. **Code Push** → Triggers quality gates workflow
2. **Quality Assessment** → Runs all quality checks
3. **Gate Evaluation** → Determines if deployment can proceed
4. **Environment-Specific Checks** → Applies appropriate thresholds
5. **Approval (if required)** → Manual approval for production
6. **Deployment** → Automated deployment to target environment
7. **Monitoring** → Post-deployment health checks

## 🛠️ Manual Setup Required

### 1. GitHub Secrets
Set the following secrets in your repository settings:

```bash
# Slack Integration
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Discord Integration
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# Security Scanning
SNYK_TOKEN=your_snyk_token

# Contract Testing
PACT_BROKER_URL=your_pact_broker_url
PACT_BROKER_TOKEN=your_pact_broker_token

# Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

### 2. Team Setup
- Create `platform-team` and `qa-team` teams
- Add appropriate members to each team
- Configure team permissions

### 3. Environment Setup
- Configure deployment environments in GitHub
- Set up environment-specific secrets
- Configure environment protection rules

### 4. Branch Protection
Run the branch protection setup script:

```bash
node .github/setup-branch-protection.js your-org/your-repo YOUR_GITHUB_TOKEN
```

## 📈 Monitoring and Reporting

### Quality Metrics
- Quality scores over time
- Deployment success rates
- Rollback frequency
- Mean time to deployment

### Reports
- PR quality reports
- Deployment history
- Quality gate failure analysis
- Performance trends

## 🆘 Troubleshooting

### Common Issues

1. **Quality Gates Always Fail**
   - Check test configurations
   - Verify threshold settings
   - Review test result parsing

2. **Branch Protection Not Working**
   - Verify team permissions
   - Check branch protection rule syntax
   - Ensure required status checks are configured

3. **Notifications Not Working**
   - Verify webhook URLs
   - Check secret configuration
   - Review webhook permissions

### Support
- Check workflow logs for detailed error messages
- Review quality gate reports for specific failures
- Verify all required secrets are configured

## 📝 Next Steps

1. Configure required GitHub secrets
2. Set up team permissions and environments
3. Run branch protection setup script
4. Test the quality gates with a sample PR
5. Configure monitoring and alerting
6. Customize thresholds as needed

---

*This setup was created by the Quality Gates Setup Script*
EOF

    print_success "Setup summary created at .github/QUALITY_GATES_README.md"
}

# Run setup steps
main() {
    print_status "Starting Quality Gates setup..."

    setup_quality_config
    setup_workflows
    setup_quality_reports
    setup_deployment_tracking
    setup_notifications
    setup_branch_protection
    create_setup_summary

    print_success ""
    print_success "🎉 Quality Gates setup completed!"
    print_success ""
    print_warning "⚠️  Manual configuration required:"
    echo "  1. Set up GitHub secrets (see .github/QUALITY_GATES_README.md)"
    echo "  2. Configure teams and permissions"
    echo "  3. Run branch protection setup script"
    echo "  4. Test the quality gates workflow"
    print_success ""
    print_success "📖 See .github/QUALITY_GATES_README.md for detailed instructions"
}

# Run main setup
main