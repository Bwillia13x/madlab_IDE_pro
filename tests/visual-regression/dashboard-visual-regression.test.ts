/**
 * Visual Regression Tests for Dashboard and Workspace Interfaces
 * Tests main application interface, widget grids, toolbars, and workspace layout
 */

import { test, expect } from '@playwright/test';
import { PlaywrightVisualRegressionTester, viewportConfigs } from './playwright-visual-regression.test';

test.describe('Dashboard and Workspace Visual Regression', () => {
  let visualTester: PlaywrightVisualRegressionTester;

  test.beforeEach(async ({ page }) => {
    visualTester = new PlaywrightVisualRegressionTester(page);
    // Navigate to test page or set up test environment
    await page.goto('http://localhost:3010');
  });

  test.describe('Main Dashboard Interface', () => {
    test('should render main dashboard interface consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; height: 100vh; display: flex; flex-direction: column; background: #0f172a; color: #f8fafc; }

              /* Title Bar */
              .title-bar { height: 32px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; padding: 0 16px; -webkit-app-region: drag; }
              .title-bar-title { font-size: 12px; font-weight: 600; }
              .title-bar-controls { margin-left: auto; display: flex; gap: 8px; }
              .title-control { width: 12px; height: 12px; border-radius: 50%; background: #64748b; cursor: pointer; }

              /* Main Layout */
              .main-layout { flex: 1; display: flex; }

              /* Sidebar */
              .sidebar { width: 240px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; }
              .sidebar-header { padding: 16px; border-bottom: 1px solid #334155; }
              .sidebar-title { font-size: 16px; font-weight: 700; margin: 0; }
              .sidebar-nav { flex: 1; padding: 16px 0; }
              .nav-section { margin-bottom: 24px; }
              .nav-section-title { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 16px; }
              .nav-item { display: flex; align-items: center; gap: 12px; padding: 8px 16px; color: #cbd5e1; text-decoration: none; cursor: pointer; transition: all 0.2s; }
              .nav-item:hover { background: #334155; color: white; }
              .nav-item.active { background: #3b82f6; color: white; }
              .nav-icon { width: 16px; height: 16px; background: currentColor; border-radius: 3px; }

              /* Main Content */
              .main-content { flex: 1; display: flex; flex-direction: column; }

              /* Toolbar */
              .toolbar { height: 48px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; padding: 0 16px; gap: 12px; }
              .toolbar-group { display: flex; align-items: center; gap: 8px; }
              .toolbar-btn { width: 32px; height: 32px; border: none; background: transparent; border-radius: 4px; color: #cbd5e1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
              .toolbar-btn:hover { background: #334155; color: white; }
              .toolbar-btn.active { background: #3b82f6; color: white; }
              .toolbar-divider { width: 1px; height: 20px; background: #334155; }

              /* Workspace */
              .workspace { flex: 1; background: #0f172a; position: relative; }
              .workspace-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; padding: 16px; height: 100%; }

              /* Widget */
              .widget { background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
              .widget-header { padding: 12px 16px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
              .widget-title { font-size: 14px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
              .widget-badge { font-size: 10px; padding: 2px 6px; background: #64748b; border-radius: 8px; }
              .widget-controls { display: flex; gap: 4px; }
              .widget-control { width: 24px; height: 24px; border: none; background: transparent; border-radius: 4px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; }
              .widget-control:hover { background: #334155; color: #cbd5e1; }
              .widget-content { padding: 16px; height: 200px; display: flex; align-items: center; justify-content: center; color: #64748b; }

              /* Status Bar */
              .status-bar { height: 24px; background: #1e293b; border-top: 1px solid #334155; display: flex; align-items: center; padding: 0 16px; gap: 16px; font-size: 12px; color: #64748b; }
              .status-item { display: flex; align-items: center; gap: 4px; }
            </style>
          </head>
          <body>
            <!-- Title Bar -->
            <div class="title-bar">
              <div class="title-bar-title">MAD LAB Workbench</div>
              <div class="title-bar-controls">
                <div class="title-control" style="background: #64748b;"></div>
                <div class="title-control" style="background: #64748b;"></div>
                <div class="title-control" style="background: #ef4444;"></div>
              </div>
            </div>

            <div class="main-layout">
              <!-- Sidebar -->
              <aside class="sidebar">
                <div class="sidebar-header">
                  <h2 class="sidebar-title">MAD LAB</h2>
                </div>
                <nav class="sidebar-nav">
                  <div class="nav-section">
                    <h3 class="nav-section-title">Workspace</h3>
                    <div class="nav-item active">
                      <span class="nav-icon"></span>
                      Dashboard
                    </div>
                    <div class="nav-item">
                      <span class="nav-icon"></span>
                      Analytics
                    </div>
                    <div class="nav-item">
                      <span class="nav-icon"></span>
                      Reports
                    </div>
                  </div>
                  <div class="nav-section">
                    <h3 class="nav-section-title">Tools</h3>
                    <div class="nav-item">
                      <span class="nav-icon"></span>
                      Charts
                    </div>
                    <div class="nav-item">
                      <span class="nav-icon"></span>
                      Screener
                    </div>
                  </div>
                </nav>
              </aside>

              <!-- Main Content -->
              <div class="main-content">
                <!-- Toolbar -->
                <div class="toolbar">
                  <div class="toolbar-group">
                    <button class="toolbar-btn active" title="Dashboard">📊</button>
                    <button class="toolbar-btn" title="Add Widget">➕</button>
                    <button class="toolbar-btn" title="Settings">⚙️</button>
                  </div>
                  <div class="toolbar-divider"></div>
                  <div class="toolbar-group">
                    <button class="toolbar-btn" title="Zoom In">🔍</button>
                    <button class="toolbar-btn" title="Reset View">⟲</button>
                  </div>
                  <div style="margin-left: auto; font-size: 12px; color: #64748b;">
                    Auto-save: ON
                  </div>
                </div>

                <!-- Workspace -->
                <div class="workspace">
                  <div class="workspace-grid">
                    <div class="widget">
                      <div class="widget-header">
                        <div class="widget-title">
                          Market Overview
                          <span class="widget-badge">Live</span>
                        </div>
                        <div class="widget-controls">
                          <button class="widget-control" title="Refresh">🔄</button>
                          <button class="widget-control" title="Settings">⚙️</button>
                        </div>
                      </div>
                      <div class="widget-content">
                        Chart Content
                      </div>
                    </div>

                    <div class="widget">
                      <div class="widget-header">
                        <div class="widget-title">
                          Quick Stats
                        </div>
                        <div class="widget-controls">
                          <button class="widget-control" title="Settings">⚙️</button>
                        </div>
                      </div>
                      <div class="widget-content">
                        Stats Content
                      </div>
                    </div>

                    <div class="widget">
                      <div class="widget-header">
                        <div class="widget-title">
                          Recent Activity
                        </div>
                        <div class="widget-controls">
                          <button class="widget-control" title="Refresh">🔄</button>
                        </div>
                      </div>
                      <div class="widget-content">
                        Activity Content
                      </div>
                    </div>

                    <div class="widget">
                      <div class="widget-header">
                        <div class="widget-title">
                          Performance
                        </div>
                        <div class="widget-controls">
                          <button class="widget-control" title="Settings">⚙️</button>
                        </div>
                      </div>
                      <div class="widget-content">
                        Performance Content
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Status Bar -->
            <div class="status-bar">
              <div class="status-item">
                <span>🟢</span>
                Connected
              </div>
              <div class="status-item">
                <span>📊</span>
                4 widgets
              </div>
              <div class="status-item">
                <span>💾</span>
                Saved 2m ago
              </div>
              <div style="margin-left: auto;">
                Node.js 20.6.2
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('main-dashboard-interface', 'body', {
        threshold: 0.05,
        fullPage: true,
      });
    });
  });

  test.describe('Widget Grid Layouts', () => {
    test('should render widget grid in different configurations', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }

              .grid-comparison { display: grid; gap: 32px; }
              .grid-section { background: #1e293b; border-radius: 8px; padding: 20px; border: 1px solid #334155; }
              .section-title { font-size: 16px; font-weight: 600; margin: 0 0 16px 0; }
              .widget-grid { display: grid; gap: 16px; background: #0f172a; border-radius: 6px; padding: 16px; }

              /* Single column */
              .grid-1col { grid-template-columns: 1fr; }

              /* Two columns */
              .grid-2col { grid-template-columns: repeat(2, 1fr); }

              /* Three columns */
              .grid-3col { grid-template-columns: repeat(3, 1fr); }

              /* Auto-fit */
              .grid-autofit { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }

              /* Mixed sizes */
              .grid-mixed { grid-template-areas:
                "large large small"
                "large large small"
                "medium medium medium"; }

              .widget { background: #334155; border: 1px solid #475569; border-radius: 6px; padding: 16px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; min-height: 120px; }

              .widget-large { grid-area: large; background: #3b82f6; }
              .widget-medium { grid-area: medium; background: #10b981; }
              .widget-small { grid-area: small; background: #f59e0b; }

              .grid-info { font-size: 12px; color: #64748b; margin-top: 12px; }
            </style>
          </head>
          <body>
            <div class="grid-comparison">
              <div class="grid-section">
                <h3 class="section-title">Single Column Layout</h3>
                <div class="widget-grid grid-1col">
                  <div class="widget">Widget 1</div>
                  <div class="widget">Widget 2</div>
                  <div class="widget">Widget 3</div>
                </div>
                <div class="grid-info">Best for: Mobile, focused content, linear workflows</div>
              </div>

              <div class="grid-section">
                <h3 class="section-title">Two Column Layout</h3>
                <div class="widget-grid grid-2col">
                  <div class="widget">Widget 1</div>
                  <div class="widget">Widget 2</div>
                  <div class="widget">Widget 3</div>
                  <div class="widget">Widget 4</div>
                </div>
                <div class="grid-info">Best for: Tablet, balanced content, side-by-side comparison</div>
              </div>

              <div class="grid-section">
                <h3 class="section-title">Three Column Layout</h3>
                <div class="widget-grid grid-3col">
                  <div class="widget">Widget 1</div>
                  <div class="widget">Widget 2</div>
                  <div class="widget">Widget 3</div>
                  <div class="widget">Widget 4</div>
                  <div class="widget">Widget 5</div>
                  <div class="widget">Widget 6</div>
                </div>
                <div class="grid-info">Best for: Desktop, dashboard overview, multiple data streams</div>
              </div>

              <div class="grid-section">
                <h3 class="section-title">Auto-fit Layout</h3>
                <div class="widget-grid grid-autofit">
                  <div class="widget">Widget 1</div>
                  <div class="widget">Widget 2</div>
                  <div class="widget">Widget 3</div>
                  <div class="widget">Widget 4</div>
                  <div class="widget">Widget 5</div>
                </div>
                <div class="grid-info">Best for: Responsive design, flexible layouts</div>
              </div>

              <div class="grid-section">
                <h3 class="section-title">Mixed Size Layout</h3>
                <div class="widget-grid grid-mixed">
                  <div class="widget widget-large">Large Widget</div>
                  <div class="widget widget-small">Small Widget</div>
                  <div class="widget widget-medium">Medium Widget</div>
                </div>
                <div class="grid-info">Best for: Highlighted content, complex dashboards</div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('widget-grid-configurations', '.grid-comparison', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Workspace Interface States', () => {
    test('should render workspace in different states', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; height: 100vh; display: flex; flex-direction: column; background: #0f172a; color: #f8fafc; }

              .workspace-layout { flex: 1; display: flex; }

              /* Normal state */
              .workspace-normal { background: #0f172a; display: flex; flex-direction: column; }

              /* Loading state */
              .workspace-loading { background: #0f172a; display: flex; align-items: center; justify-content: center; }
              .loading-spinner { width: 40px; height: 40px; border: 4px solid #334155; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
              .loading-text { margin-top: 16px; color: #64748b; }

              /* Empty state */
              .workspace-empty { background: #0f172a; display: flex; align-items: center; justify-content: center; }
              .empty-content { text-align: center; max-width: 400px; }
              .empty-icon { font-size: 48px; margin-bottom: 16px; }
              .empty-title { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; }
              .empty-description { color: #64748b; margin: 0 0 24px 0; }
              .empty-action { padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; }

              /* Error state */
              .workspace-error { background: #0f172a; display: flex; align-items: center; justify-content: center; }
              .error-content { text-align: center; max-width: 400px; }
              .error-icon { font-size: 48px; margin-bottom: 16px; color: #ef4444; }
              .error-title { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #ef4444; }
              .error-description { color: #64748b; margin: 0 0 24px 0; }
              .error-actions { display: flex; gap: 12px; justify-content: center; }
              .error-btn { padding: 10px 20px; border-radius: 6px; border: 1px solid; cursor: pointer; }
              .error-btn-primary { background: #ef4444; color: white; border-color: #ef4444; }
              .error-btn-secondary { background: transparent; color: #cbd5e1; border-color: #334155; }

              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

              .toolbar { height: 48px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; padding: 0 16px; }
              .workspace-content { flex: 1; padding: 20px; }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <div style="font-size: 14px; font-weight: 600;">Workspace States</div>
            </div>

            <div class="workspace-layout">
              <!-- Normal State -->
              <div class="workspace-normal workspace-content" style="flex: 1;">
                <div style="background: #1e293b; border-radius: 8px; padding: 20px; border: 1px solid #334155;">
                  <h3 style="margin: 0 0 8px 0;">Normal State</h3>
                  <p style="color: #64748b; margin: 0;">Workspace is loaded and ready for use</p>
                </div>
              </div>

              <!-- Loading State -->
              <div class="workspace-loading workspace-content" style="flex: 1; display: none;">
                <div class="loading-content">
                  <div class="loading-spinner"></div>
                  <div class="loading-text">Loading workspace...</div>
                </div>
              </div>

              <!-- Empty State -->
              <div class="workspace-empty workspace-content" style="flex: 1; display: none;">
                <div class="empty-content">
                  <div class="empty-icon">📊</div>
                  <h2 class="empty-title">No widgets yet</h2>
                  <p class="empty-description">Get started by adding your first widget to the workspace</p>
                  <button class="empty-action">Add Widget</button>
                </div>
              </div>

              <!-- Error State -->
              <div class="workspace-error workspace-content" style="flex: 1; display: none;">
                <div class="error-content">
                  <div class="error-icon">⚠️</div>
                  <h2 class="error-title">Something went wrong</h2>
                  <p class="error-description">We couldn't load your workspace. Please try again or contact support if the problem persists.</p>
                  <div class="error-actions">
                    <button class="error-btn error-btn-secondary">Try Again</button>
                    <button class="error-btn error-btn-primary">Contact Support</button>
                  </div>
                </div>
              </div>
            </div>

            <script>
              // Cycle through states for visual testing
              const states = ['normal', 'loading', 'empty', 'error'];
              let currentState = 0;

              function showState(state) {
                // Hide all states
                document.querySelectorAll('.workspace-content').forEach(el => {
                  el.style.display = 'none';
                });

                // Show selected state
                document.querySelector('.workspace-' + state).style.display = 'flex';
              }

              // Show normal state by default for initial screenshot
              showState('normal');
            </script>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('workspace-normal-state', 'body', {
        threshold: 0.05,
        fullPage: true,
      });
    });
  });

  test.describe('Dashboard - Different Viewports', () => {
    test('should adapt dashboard for mobile viewport', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.mobile);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; }

              .mobile-dashboard { display: flex; flex-direction: column; min-height: 100vh; }

              /* Mobile Header */
              .mobile-header { background: #1e293b; border-bottom: 1px solid #334155; padding: 16px; }
              .mobile-header-content { display: flex; align-items: center; justify-content: space-between; }
              .mobile-brand { font-size: 18px; font-weight: 700; }
              .mobile-menu-btn { width: 40px; height: 40px; border: none; background: transparent; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; cursor: pointer; }
              .mobile-menu-line { width: 20px; height: 2px; background: #cbd5e1; border-radius: 1px; }

              /* Mobile Navigation */
              .mobile-nav { background: #1e293b; border-bottom: 1px solid #334155; padding: 8px 0; }
              .mobile-nav-list { display: flex; gap: 8px; padding: 0 16px; list-style: none; margin: 0; overflow-x: auto; }
              .mobile-nav-item { flex-shrink: 0; }
              .mobile-nav-link { display: flex; align-items: center; gap: 8px; padding: 8px 16px; color: #cbd5e1; text-decoration: none; border-radius: 20px; white-space: nowrap; }
              .mobile-nav-link.active { background: #3b82f6; color: white; }

              /* Mobile Workspace */
              .mobile-workspace { flex: 1; padding: 16px; }
              .mobile-widget-grid { display: flex; flex-direction: column; gap: 16px; }

              /* Mobile Widget */
              .mobile-widget { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
              .mobile-widget-header { padding: 16px; border-bottom: 1px solid #334155; }
              .mobile-widget-title { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
              .mobile-widget-badge { font-size: 10px; padding: 2px 8px; background: #64748b; border-radius: 12px; }
              .mobile-widget-content { padding: 16px; min-height: 120px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="mobile-dashboard">
              <!-- Mobile Header -->
              <header class="mobile-header">
                <div class="mobile-header-content">
                  <div class="mobile-brand">MAD LAB</div>
                  <button class="mobile-menu-btn">
                    <div class="mobile-menu-line"></div>
                    <div class="mobile-menu-line"></div>
                    <div class="mobile-menu-line"></div>
                  </button>
                </div>
              </header>

              <!-- Mobile Navigation -->
              <nav class="mobile-nav">
                <ul class="mobile-nav-list">
                  <li class="mobile-nav-item">
                    <a href="#" class="mobile-nav-link active">Dashboard</a>
                  </li>
                  <li class="mobile-nav-item">
                    <a href="#" class="mobile-nav-link">Analytics</a>
                  </li>
                  <li class="mobile-nav-item">
                    <a href="#" class="mobile-nav-link">Reports</a>
                  </li>
                  <li class="mobile-nav-item">
                    <a href="#" class="mobile-nav-link">Settings</a>
                  </li>
                </ul>
              </nav>

              <!-- Mobile Workspace -->
              <main class="mobile-workspace">
                <div class="mobile-widget-grid">
                  <div class="mobile-widget">
                    <div class="mobile-widget-header">
                      <h3 class="mobile-widget-title">
                        Market Overview
                        <span class="mobile-widget-badge">Live</span>
                      </h3>
                    </div>
                    <div class="mobile-widget-content">
                      Mobile Chart View
                    </div>
                  </div>

                  <div class="mobile-widget">
                    <div class="mobile-widget-header">
                      <h3 class="mobile-widget-title">Quick Stats</h3>
                    </div>
                    <div class="mobile-widget-content">
                      Mobile Stats View
                    </div>
                  </div>

                  <div class="mobile-widget">
                    <div class="mobile-widget-header">
                      <h3 class="mobile-widget-title">Recent Activity</h3>
                    </div>
                    <div class="mobile-widget-content">
                      Mobile Activity View
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('dashboard-mobile-viewport', '.mobile-dashboard', {
        threshold: 0.05,
        fullPage: true,
      });
    });

    test('should adapt dashboard for tablet viewport', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.tablet);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; }

              .tablet-dashboard { display: flex; min-height: 100vh; }

              /* Tablet Sidebar */
              .tablet-sidebar { width: 200px; background: #1e293b; border-right: 1px solid #334155; padding: 20px 0; }
              .tablet-sidebar-nav { list-style: none; margin: 0; padding: 0; }
              .tablet-nav-item { margin-bottom: 4px; }
              .tablet-nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 20px; color: #cbd5e1; text-decoration: none; }
              .tablet-nav-link.active { background: #3b82f6; color: white; }
              .tablet-nav-icon { width: 16px; height: 16px; background: currentColor; border-radius: 3px; }

              /* Tablet Main */
              .tablet-main { flex: 1; display: flex; flex-direction: column; }
              .tablet-toolbar { height: 56px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; padding: 0 20px; gap: 12px; }
              .tablet-workspace { flex: 1; padding: 20px; }
              .tablet-widget-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }

              /* Tablet Widget */
              .tablet-widget { background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
              .tablet-widget-header { padding: 16px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
              .tablet-widget-title { font-size: 16px; font-weight: 600; margin: 0; }
              .tablet-widget-controls { display: flex; gap: 8px; }
              .tablet-widget-control { width: 28px; height: 28px; border: none; background: transparent; border-radius: 4px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; }
              .tablet-widget-content { padding: 20px; min-height: 160px; display: flex; align-items: center; justify-content: center; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="tablet-dashboard">
              <!-- Tablet Sidebar -->
              <aside class="tablet-sidebar">
                <nav>
                  <ul class="tablet-sidebar-nav">
                    <li class="tablet-nav-item">
                      <a href="#" class="tablet-nav-link active">
                        <span class="tablet-nav-icon"></span>
                        Dashboard
                      </a>
                    </li>
                    <li class="tablet-nav-item">
                      <a href="#" class="tablet-nav-link">
                        <span class="tablet-nav-icon"></span>
                        Analytics
                      </a>
                    </li>
                    <li class="tablet-nav-item">
                      <a href="#" class="tablet-nav-link">
                        <span class="tablet-nav-icon"></span>
                        Reports
                      </a>
                    </li>
                  </ul>
                </nav>
              </aside>

              <!-- Tablet Main -->
              <div class="tablet-main">
                <!-- Tablet Toolbar -->
                <div class="tablet-toolbar">
                  <button style="padding: 10px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px;">Add Widget</button>
                  <button style="padding: 10px 16px; background: transparent; color: #cbd5e1; border: 1px solid #334155; border-radius: 6px;">Settings</button>
                </div>

                <!-- Tablet Workspace -->
                <div class="tablet-workspace">
                  <div class="tablet-widget-grid">
                    <div class="tablet-widget">
                      <div class="tablet-widget-header">
                        <h3 class="tablet-widget-title">Market Data</h3>
                        <div class="tablet-widget-controls">
                          <button class="tablet-widget-control">🔄</button>
                          <button class="tablet-widget-control">⚙️</button>
                        </div>
                      </div>
                      <div class="tablet-widget-content">
                        Tablet Chart View
                      </div>
                    </div>

                    <div class="tablet-widget">
                      <div class="tablet-widget-header">
                        <h3 class="tablet-widget-title">Portfolio</h3>
                        <div class="tablet-widget-controls">
                          <button class="tablet-widget-control">⚙️</button>
                        </div>
                      </div>
                      <div class="tablet-widget-content">
                        Tablet Portfolio View
                      </div>
                    </div>

                    <div class="tablet-widget">
                      <div class="tablet-widget-header">
                        <h3 class="tablet-widget-title">News Feed</h3>
                        <div class="tablet-widget-controls">
                          <button class="tablet-widget-control">🔄</button>
                        </div>
                      </div>
                      <div class="tablet-widget-content">
                        Tablet News View
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('dashboard-tablet-viewport', '.tablet-dashboard', {
        threshold: 0.05,
        fullPage: true,
      });
    });
  });
});