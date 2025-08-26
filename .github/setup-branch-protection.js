#!/usr/bin/env node

/**
 * GitHub Branch Protection Rules Setup Script
 * This script helps configure branch protection rules for quality gates
 *
 * Usage: node setup-branch-protection.js <repository> <token>
 */

const https = require('https');
const { URL } = require('url');

class GitHubBranchProtectionSetup {
  constructor(repository, token) {
    this.repository = repository; // format: "owner/repo"
    this.token = token;
    this.apiBase = 'api.github.com';
  }

  makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`https://${this.apiBase}${path}`);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: method,
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Quality-Gates-Setup-Script'
        }
      };

      if (data) {
        options.headers['Content-Type'] = 'application/json';
      }

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = body ? JSON.parse(body) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${response.message || body}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async setupBranchProtection(branch = 'main') {
    const protectionRules = {
      required_status_checks: {
        strict: true,
        checks: [
          {
            context: 'Quality Gates',
            app_id: null
          },
          {
            context: 'Test Pipeline',
            app_id: null
          },
          {
            context: 'Security Scan',
            app_id: null
          },
          {
            context: 'Code Coverage',
            app_id: null
          }
        ]
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: true,
        required_approving_review_count: 2,
        require_last_push_approval: true,
        bypass_pull_request_allowances: {
          users: [],
          teams: ['platform-team']
        }
      },
      restrictions: {
        users: [],
        teams: ['platform-team', 'qa-team'],
        apps: []
      },
      required_linear_history: true,
      allow_force_pushes: false,
      allow_deletions: false,
      block_creations: false,
      required_conversation_resolution: true,
      lock_branch: false,
      allow_fork_syncing: true
    };

    try {
      const result = await this.makeRequest(
        `/repos/${this.repository}/branches/${branch}/protection`,
        'PUT',
        protectionRules
      );
      console.log(`✅ Branch protection rules set up for ${branch}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to set up branch protection for ${branch}:`, error.message);
      throw error;
    }
  }

  async setupDevelopBranchProtection() {
    const developRules = {
      required_status_checks: {
        strict: false,
        checks: [
          {
            context: 'Quality Gates',
            app_id: null
          },
          {
            context: 'Test Pipeline',
            app_id: null
          }
        ]
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 1,
        require_last_push_approval: false,
        bypass_pull_request_allowances: {
          users: [],
          teams: ['platform-team', 'developers']
        }
      },
      restrictions: null,
      required_linear_history: false,
      allow_force_pushes: false,
      allow_deletions: false,
      block_creations: false,
      required_conversation_resolution: false,
      lock_branch: false,
      allow_fork_syncing: true
    };

    try {
      const result = await this.makeRequest(
        `/repos/${this.repository}/branches/develop/protection`,
        'PUT',
        developRules
      );
      console.log(`✅ Branch protection rules set up for develop`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to set up branch protection for develop:`, error.message);
      throw error;
    }
  }

  async createEnvironment(environment) {
    const environmentConfig = {
      wait_timer: 0,
      reviewers: [],
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true
      }
    };

    // Add specific configuration for production
    if (environment === 'production') {
      environmentConfig.wait_timer = 10; // 10 minutes
      environmentConfig.reviewers = [
        {
          type: 'Team',
          id: 1, // Replace with actual team ID for platform-team
          name: 'platform-team'
        },
        {
          type: 'Team',
          id: 2, // Replace with actual team ID for qa-team
          name: 'qa-team'
        }
      ];
      environmentConfig.deployment_branch_policy = {
        protected_branches: true,
        custom_branch_policies: false
      };
    }

    try {
      const result = await this.makeRequest(
        `/repos/${this.repository}/environments/${environment}`,
        'PUT',
        environmentConfig
      );
      console.log(`✅ Environment '${environment}' created`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to create environment '${environment}':`, error.message);
      throw error;
    }
  }

  async setupEnvironments() {
    const environments = ['development', 'staging', 'production'];

    for (const env of environments) {
      try {
        await this.createEnvironment(env);
      } catch (error) {
        // Environment might already exist, try to update it
        console.log(`Environment '${env}' might already exist, skipping creation`);
      }
    }
  }

  async createRequiredLabels() {
    const labels = [
      { name: 'quality-gates', color: 'd73a49', description: 'Related to quality gate failures' },
      { name: 'quality-gate-failed', color: 'b60205', description: 'Quality gates failed for this PR' },
      { name: 'quality-gate-passed', color: '0e8a16', description: 'Quality gates passed for this PR' },
      { name: 'deployment-blocked', color: 'd93f0b', description: 'Deployment blocked by quality gates' },
      { name: 'rollback', color: 'fbca04', description: 'Related to rollback operations' },
      { name: 'security-issue', color: 'd73a49', description: 'Security vulnerability found' },
      { name: 'performance-regression', color: 'fbca04', description: 'Performance regression detected' }
    ];

    for (const label of labels) {
      try {
        await this.makeRequest(
          `/repos/${this.repository}/labels`,
          'POST',
          label
        );
        console.log(`✅ Label '${label.name}' created`);
      } catch (error) {
        console.log(`Label '${label.name}' might already exist, skipping`);
      }
    }
  }

  async run() {
    try {
      console.log('🚀 Setting up GitHub Branch Protection Rules...\n');

      // Create required labels
      console.log('📝 Creating required labels...');
      await this.createRequiredLabels();

      // Setup environments
      console.log('\n🏭 Setting up environments...');
      await this.setupEnvironments();

      // Setup branch protection for main
      console.log('\n🔒 Setting up branch protection for main branch...');
      await this.setupBranchProtection('main');

      // Setup branch protection for develop
      console.log('\n🔒 Setting up branch protection for develop branch...');
      await this.setupDevelopBranchProtection();

      console.log('\n✅ GitHub Branch Protection Rules setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Update team IDs in the environment configuration');
      console.log('2. Review and adjust protection rules as needed');
      console.log('3. Test the quality gates workflow');
      console.log('4. Configure Slack/Discord webhooks for notifications');

    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node setup-branch-protection.js <repository> <token>');
    console.error('Example: node setup-branch-protection.js "myorg/myrepo" "ghp_..."');
    process.exit(1);
  }

  const [repository, token] = args;
  const setup = new GitHubBranchProtectionSetup(repository, token);
  setup.run();
}

module.exports = GitHubBranchProtectionSetup;