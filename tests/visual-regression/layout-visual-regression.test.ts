/**
 * Visual Regression Tests for Layout and Responsive Design
 * Tests grid systems, navigation, responsive breakpoints, and layout patterns
 */

import { test, expect } from '@playwright/test';
import { PlaywrightVisualRegressionTester, viewportConfigs } from './playwright-visual-regression.test';

test.describe('Layout and Responsive Design Visual Regression', () => {
  let visualTester: PlaywrightVisualRegressionTester;

  test.beforeEach(async ({ page }) => {
    visualTester = new PlaywrightVisualRegressionTester(page);
    // Navigate to test page or set up test environment
    await page.goto('http://localhost:3010');
  });

  test.describe('Grid Systems', () => {
    test('should render 12-column grid consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
              .grid-container { max-width: 1200px; margin: 0 auto; }
              .grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; margin-bottom: 32px; }
              .grid-item { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; text-align: center; font-size: 14px; font-weight: 500; }

              /* Different column spans */
              .col-12 { grid-column: span 12; }
              .col-6 { grid-column: span 6; }
              .col-4 { grid-column: span 4; }
              .col-3 { grid-column: span 3; }
              .col-2 { grid-column: span 2; }
              .col-1 { grid-column: span 1; }

              /* Color coding for visual distinction */
              .col-12 { background: #fef2f2; border-color: #fecaca; }
              .col-6 { background: #fefce8; border-color: #fde68a; }
              .col-4 { background: #f0fdf4; border-color: #bbf7d0; }
              .col-3 { background: #eff6ff; border-color: #bfdbfe; }
              .col-2 { background: #fdf4ff; border-color: #e9d5ff; }
              .col-1 { background: #fef7ff; border-color: #f3e8ff; }
            </style>
          </head>
          <body>
            <div class="grid-container">
              <div class="grid-12">
                <div class="grid-item col-12">Full Width (12)</div>
              </div>

              <div class="grid-12">
                <div class="grid-item col-6">Half (6)</div>
                <div class="grid-item col-6">Half (6)</div>
              </div>

              <div class="grid-12">
                <div class="grid-item col-4">Third (4)</div>
                <div class="grid-item col-4">Third (4)</div>
                <div class="grid-item col-4">Third (4)</div>
              </div>

              <div class="grid-12">
                <div class="grid-item col-3">Quarter (3)</div>
                <div class="grid-item col-3">Quarter (3)</div>
                <div class="grid-item col-3">Quarter (3)</div>
                <div class="grid-item col-3">Quarter (3)</div>
              </div>

              <div class="grid-12">
                <div class="grid-item col-2">Sixth (2)</div>
                <div class="grid-item col-2">Sixth (2)</div>
                <div class="grid-item col-2">Sixth (2)</div>
                <div class="grid-item col-2">Sixth (2)</div>
                <div class="grid-item col-2">Sixth (2)</div>
                <div class="grid-item col-2">Sixth (2)</div>
              </div>

              <div class="grid-12">
                <div class="grid-item col-1">1</div>
                <div class="grid-item col-1">2</div>
                <div class="grid-item col-1">3</div>
                <div class="grid-item col-1">4</div>
                <div class="grid-item col-1">5</div>
                <div class="grid-item col-1">6</div>
                <div class="grid-item col-1">7</div>
                <div class="grid-item col-1">8</div>
                <div class="grid-item col-1">9</div>
                <div class="grid-item col-1">10</div>
                <div class="grid-item col-1">11</div>
                <div class="grid-item col-1">12</div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('grid-12-column-system', '.grid-container', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should render responsive grid layouts consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
              .responsive-grid {
                display: grid;
                gap: 16px;
                grid-template-columns: 1fr;
              }

              /* Tablet breakpoint */
              @media (min-width: 768px) {
                .responsive-grid { grid-template-columns: repeat(2, 1fr); }
              }

              /* Desktop breakpoint */
              @media (min-width: 1024px) {
                .responsive-grid { grid-template-columns: repeat(3, 1fr); }
              }

              .grid-card {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
              }

              .card-title { font-size: 16px; font-weight: 600; margin: 0 0 8px 0; }
              .card-content { color: #64748b; font-size: 14px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="responsive-grid">
              <div class="grid-card">
                <h3 class="card-title">Card 1</h3>
                <p class="card-content">Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols</p>
              </div>
              <div class="grid-card">
                <h3 class="card-title">Card 2</h3>
                <p class="card-content">This layout adapts to screen size</p>
              </div>
              <div class="grid-card">
                <h3 class="card-title">Card 3</h3>
                <p class="card-content">Responsive design patterns</p>
              </div>
              <div class="grid-card">
                <h3 class="card-title">Card 4</h3>
                <p class="card-content">Flexible grid system</p>
              </div>
              <div class="grid-card">
                <h3 class="card-title">Card 5</h3>
                <p class="card-content">Breakpoint management</p>
              </div>
              <div class="grid-card">
                <h3 class="card-title">Card 6</h3>
                <p class="card-content">Consistent spacing</p>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('responsive-grid-layout', '.responsive-grid', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Navigation Patterns', () => {
    test('should render horizontal navigation consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; }
              .navbar { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 20px; }
              .nav-container { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px; }
              .nav-brand { font-size: 18px; font-weight: 700; color: #1e293b; }
              .nav-menu { display: flex; gap: 24px; list-style: none; margin: 0; padding: 0; }
              .nav-item { position: relative; }
              .nav-link { color: #64748b; text-decoration: none; font-weight: 500; padding: 8px 0; transition: color 0.2s; }
              .nav-link:hover { color: #1e293b; }
              .nav-link.active { color: #3b82f6; }
              .nav-dropdown { position: relative; }
              .nav-dropdown-toggle { cursor: pointer; display: flex; align-items: center; gap: 4px; }
              .nav-dropdown-menu { position: absolute; top: 100%; left: 0; background: white; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 160px; z-index: 1000; }
              .dropdown-item { display: block; padding: 8px 16px; color: #374151; text-decoration: none; }
              .dropdown-item:hover { background: #f9fafb; }
              .nav-actions { display: flex; gap: 12px; }
              .nav-btn { padding: 8px 16px; border-radius: 6px; font-weight: 500; border: 1px solid #d1d5db; background: white; cursor: pointer; }
              .nav-btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
            </style>
          </head>
          <body>
            <nav class="navbar">
              <div class="nav-container">
                <div class="nav-brand">MAD LAB</div>
                <ul class="nav-menu">
                  <li class="nav-item"><a href="#" class="nav-link active">Dashboard</a></li>
                  <li class="nav-item"><a href="#" class="nav-link">Analytics</a></li>
                  <li class="nav-item"><a href="#" class="nav-link">Reports</a></li>
                  <li class="nav-dropdown">
                    <span class="nav-link nav-dropdown-toggle">Tools ▼</span>
                    <div class="nav-dropdown-menu" style="display: block;">
                      <a href="#" class="dropdown-item">Calculator</a>
                      <a href="#" class="dropdown-item">Converter</a>
                      <a href="#" class="dropdown-item">Settings</a>
                    </div>
                  </li>
                </ul>
                <div class="nav-actions">
                  <button class="nav-btn">Sign In</button>
                  <button class="nav-btn nav-btn-primary">Get Started</button>
                </div>
              </div>
            </nav>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('horizontal-navigation', 'nav', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should render sidebar navigation consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; display: flex; height: 100vh; }
              .sidebar { width: 240px; background: #1e293b; color: white; padding: 20px 0; }
              .sidebar-header { padding: 0 20px 20px; border-bottom: 1px solid #334155; }
              .sidebar-title { font-size: 18px; font-weight: 700; margin: 0; }
              .sidebar-nav { list-style: none; margin: 20px 0 0; padding: 0; }
              .sidebar-nav-item { margin-bottom: 4px; }
              .sidebar-nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 20px; color: #cbd5e1; text-decoration: none; transition: all 0.2s; }
              .sidebar-nav-link:hover { background: #334155; color: white; }
              .sidebar-nav-link.active { background: #3b82f6; color: white; }
              .sidebar-nav-icon { width: 20px; height: 20px; background: currentColor; border-radius: 4px; }
              .main-content { flex: 1; background: #f8fafc; padding: 20px; }
              .content-header { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .content-title { font-size: 24px; font-weight: 700; margin: 0 0 8px 0; }
              .content-subtitle { color: #64748b; margin: 0; }
            </style>
          </head>
          <body>
            <aside class="sidebar">
              <div class="sidebar-header">
                <h2 class="sidebar-title">MAD LAB</h2>
              </div>
              <nav>
                <ul class="sidebar-nav">
                  <li class="sidebar-nav-item">
                    <a href="#" class="sidebar-nav-link active">
                      <span class="sidebar-nav-icon"></span>
                      Dashboard
                    </a>
                  </li>
                  <li class="sidebar-nav-item">
                    <a href="#" class="sidebar-nav-link">
                      <span class="sidebar-nav-icon"></span>
                      Analytics
                    </a>
                  </li>
                  <li class="sidebar-nav-item">
                    <a href="#" class="sidebar-nav-link">
                      <span class="sidebar-nav-icon"></span>
                      Reports
                    </a>
                  </li>
                  <li class="sidebar-nav-item">
                    <a href="#" class="sidebar-nav-link">
                      <span class="sidebar-nav-icon"></span>
                      Settings
                    </a>
                  </li>
                </ul>
              </nav>
            </aside>
            <main class="main-content">
              <header class="content-header">
                <h1 class="content-title">Dashboard</h1>
                <p class="content-subtitle">Welcome to your workspace</p>
              </header>
            </main>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('sidebar-navigation', 'body', {
        threshold: 0.05,
        fullPage: true,
      });
    });

    test('should render mobile navigation consistently', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.mobile);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; }
              .mobile-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px; display: flex; align-items: center; justify-content: space-between; }
              .mobile-brand { font-size: 18px; font-weight: 700; color: #1e293b; }
              .mobile-menu-btn { width: 40px; height: 40px; border: none; background: transparent; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; cursor: pointer; }
              .mobile-menu-line { width: 20px; height: 2px; background: #374151; border-radius: 1px; }
              .mobile-nav { background: white; border-top: 1px solid #e2e8f0; padding: 16px; }
              .mobile-nav-list { list-style: none; margin: 0; padding: 0; }
              .mobile-nav-item { margin-bottom: 8px; }
              .mobile-nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: #374151; text-decoration: none; border-radius: 8px; transition: background 0.2s; }
              .mobile-nav-link:hover { background: #f9fafb; }
              .mobile-nav-link.active { background: #eff6ff; color: #3b82f6; }
              .mobile-nav-icon { width: 20px; height: 20px; background: #e2e8f0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <header class="mobile-header">
              <div class="mobile-brand">MAD LAB</div>
              <button class="mobile-menu-btn">
                <div class="mobile-menu-line"></div>
                <div class="mobile-menu-line"></div>
                <div class="mobile-menu-line"></div>
              </button>
            </header>
            <nav class="mobile-nav">
              <ul class="mobile-nav-list">
                <li class="mobile-nav-item">
                  <a href="#" class="mobile-nav-link active">
                    <span class="mobile-nav-icon"></span>
                    Dashboard
                  </a>
                </li>
                <li class="mobile-nav-item">
                  <a href="#" class="mobile-nav-link">
                    <span class="mobile-nav-icon"></span>
                    Analytics
                  </a>
                </li>
                <li class="mobile-nav-item">
                  <a href="#" class="mobile-nav-link">
                    <span class="mobile-nav-icon"></span>
                    Reports
                  </a>
                </li>
                <li class="mobile-nav-item">
                  <a href="#" class="mobile-nav-link">
                    <span class="mobile-nav-icon"></span>
                    Settings
                  </a>
                </li>
              </ul>
            </nav>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('mobile-navigation', 'body', {
        threshold: 0.05,
        fullPage: true,
      });
    });
  });

  test.describe('Responsive Breakpoints', () => {
    test('should handle mobile-first responsive design', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #f8fafc; }

              /* Mobile-first approach */
              .responsive-container { width: 100%; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .responsive-header { font-size: 20px; font-weight: 700; margin: 0 0 16px 0; }
              .responsive-content { font-size: 16px; line-height: 1.5; margin: 0 0 16px 0; }
              .responsive-actions { display: flex; flex-direction: column; gap: 12px; }

              /* Tablet styles */
              @media (min-width: 768px) {
                body { padding: 24px; }
                .responsive-container { padding: 24px; }
                .responsive-header { font-size: 24px; }
                .responsive-actions { flex-direction: row; }
              }

              /* Desktop styles */
              @media (min-width: 1024px) {
                body { padding: 32px; }
                .responsive-container { max-width: 800px; margin: 0 auto; padding: 32px; }
                .responsive-header { font-size: 28px; }
              }

              .action-btn { padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; }
              .btn-primary { background: #3b82f6; color: white; }
              .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
            </style>
          </head>
          <body>
            <div class="responsive-container">
              <h1 class="responsive-header">Responsive Design Test</h1>
              <p class="responsive-content">
                This content adapts to different screen sizes using mobile-first responsive design principles.
                On mobile, buttons stack vertically. On tablet and desktop, they align horizontally.
              </p>
              <div class="responsive-actions">
                <button class="action-btn btn-secondary">Secondary Action</button>
                <button class="action-btn btn-primary">Primary Action</button>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('mobile-first-responsive', '.responsive-container', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should handle desktop-first responsive design', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 32px; background: #f8fafc; }

              /* Desktop-first approach */
              .desktop-first-layout { display: grid; grid-template-columns: 1fr 300px; gap: 32px; max-width: 1200px; margin: 0 auto; }
              .main-content { background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .sidebar { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .content-title { font-size: 28px; font-weight: 700; margin: 0 0 16px 0; }
              .content-text { font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; }
              .sidebar-title { font-size: 20px; font-weight: 600; margin: 0 0 16px 0; }
              .sidebar-item { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
              .sidebar-item:last-child { border-bottom: none; }

              /* Tablet breakpoint */
              @media (max-width: 1024px) {
                body { padding: 24px; }
                .desktop-first-layout { grid-template-columns: 1fr 250px; gap: 24px; }
                .main-content { padding: 24px; }
                .sidebar { padding: 20px; }
                .content-title { font-size: 24px; }
                .sidebar-title { font-size: 18px; }
              }

              /* Mobile breakpoint */
              @media (max-width: 768px) {
                body { padding: 16px; }
                .desktop-first-layout { grid-template-columns: 1fr; gap: 16px; }
                .main-content { padding: 20px; }
                .sidebar { padding: 20px; }
                .content-title { font-size: 20px; }
                .sidebar-title { font-size: 16px; }
              }
            </style>
          </head>
          <body>
            <div class="desktop-first-layout">
              <main class="main-content">
                <h1 class="content-title">Desktop-First Layout</h1>
                <p class="content-text">
                  This layout starts with desktop styling and progressively adapts to smaller screens.
                  The grid collapses to single column on mobile devices.
                </p>
                <p class="content-text">
                  Desktop-first approach is useful when the primary audience uses desktop computers
                  and mobile is considered a secondary experience.
                </p>
              </main>
              <aside class="sidebar">
                <h2 class="sidebar-title">Related Content</h2>
                <div class="sidebar-item">
                  <h3 style="font-size: 16px; margin: 0 0 8px 0;">Article 1</h3>
                  <p style="font-size: 14px; color: #64748b; margin: 0;">Short description of article one</p>
                </div>
                <div class="sidebar-item">
                  <h3 style="font-size: 16px; margin: 0 0 8px 0;">Article 2</h3>
                  <p style="font-size: 14px; color: #64748b; margin: 0;">Short description of article two</p>
                </div>
              </aside>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('desktop-first-responsive', '.desktop-first-layout', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Layout Patterns', () => {
    test('should render card-based layout consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
              .dashboard-layout { max-width: 1200px; margin: 0 auto; }
              .dashboard-header { background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .header-title { font-size: 24px; font-weight: 700; margin: 0 0 8px 0; }
              .header-subtitle { color: #64748b; margin: 0; }
              .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px; }
              .stat-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .stat-value { font-size: 28px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
              .stat-label { font-size: 14px; color: #64748b; margin: 0; }
              .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
              .main-content { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .sidebar { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .section-title { font-size: 18px; font-weight: 600; margin: 0 0 16px 0; }
            </style>
          </head>
          <body>
            <div class="dashboard-layout">
              <header class="dashboard-header">
                <h1 class="header-title">Dashboard</h1>
                <p class="header-subtitle">Welcome to your workspace overview</p>
              </header>

              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">1,234</div>
                  <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">89%</div>
                  <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">$12,345</div>
                  <div class="stat-label">Revenue</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">567</div>
                  <div class="stat-label">Active Sessions</div>
                </div>
              </div>

              <div class="content-grid">
                <section class="main-content">
                  <h2 class="section-title">Main Content</h2>
                  <p style="margin: 0; color: #64748b;">This is the primary content area with detailed information and charts.</p>
                </section>

                <aside class="sidebar">
                  <h2 class="section-title">Quick Actions</h2>
                  <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button style="padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Create New</button>
                    <button style="padding: 12px; background: white; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;">View Reports</button>
                  </div>
                </aside>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('card-based-layout', '.dashboard-layout', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should render form layout consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
              .form-layout { max-width: 600px; margin: 0 auto; }
              .form-card { background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .form-header { text-align: center; margin-bottom: 32px; }
              .form-title { font-size: 24px; font-weight: 700; margin: 0 0 8px 0; }
              .form-subtitle { color: #64748b; margin: 0; }
              .form-group { margin-bottom: 20px; }
              .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
              .form-row .form-group { margin-bottom: 0; }
              .form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: #374151; }
              .form-input { width: 100%; height: 40px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
              .form-textarea { width: 100%; min-height: 100px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; }
              .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 32px; }
              .form-btn { padding: 10px 20px; border-radius: 6px; font-weight: 500; border: 1px solid; cursor: pointer; }
              .btn-secondary { background: white; color: #374151; border-color: #d1d5db; }
              .btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
            </style>
          </head>
          <body>
            <div class="form-layout">
              <div class="form-card">
                <div class="form-header">
                  <h1 class="form-title">Contact Us</h1>
                  <p class="form-subtitle">Send us a message and we'll get back to you</p>
                </div>

                <form>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">First Name</label>
                      <input type="text" class="form-input" placeholder="Enter first name">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Last Name</label>
                      <input type="text" class="form-input" placeholder="Enter last name">
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" class="form-input" placeholder="Enter email address">
                  </div>

                  <div class="form-group">
                    <label class="form-label">Subject</label>
                    <input type="text" class="form-input" placeholder="What's this about?">
                  </div>

                  <div class="form-group">
                    <label class="form-label">Message</label>
                    <textarea class="form-textarea" placeholder="Tell us more..."></textarea>
                  </div>

                  <div class="form-actions">
                    <button type="button" class="form-btn btn-secondary">Cancel</button>
                    <button type="submit" class="form-btn btn-primary">Send Message</button>
                  </div>
                </form>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('form-layout', '.form-layout', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Layout - Different Viewports', () => {
    test('should adapt layout for mobile viewport', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.mobile);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #f8fafc; }
              .mobile-layout { display: flex; flex-direction: column; gap: 16px; }
              .mobile-header { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .mobile-content { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .mobile-actions { display: flex; flex-direction: column; gap: 12px; }
              .mobile-btn { width: 100%; height: 48px; border-radius: 12px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; }
              .btn-primary { background: #3b82f6; color: white; }
              .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
            </style>
          </head>
          <body>
            <div class="mobile-layout">
              <header class="mobile-header">
                <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Mobile Layout</h1>
                <p style="color: #64748b; margin: 0; font-size: 16px;">Optimized for mobile devices</p>
              </header>

              <main class="mobile-content">
                <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Content Area</h2>
                <p style="margin: 0 0 20px 0; color: #64748b; line-height: 1.5;">
                  This layout is optimized for mobile devices with larger touch targets,
                  stacked content, and appropriate spacing.
                </p>

                <div class="mobile-actions">
                  <button class="mobile-btn btn-secondary">Secondary Action</button>
                  <button class="mobile-btn btn-primary">Primary Action</button>
                </div>
              </main>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('layout-mobile-viewport', '.mobile-layout', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should adapt layout for tablet viewport', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.tablet);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f8fafc; }
              .tablet-layout { display: grid; grid-template-columns: 1fr 300px; gap: 24px; max-width: 1000px; margin: 0 auto; }
              .tablet-main { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .tablet-sidebar { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .section-title { font-size: 20px; font-weight: 600; margin: 0 0 16px 0; }
              .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
              .content-card { background: #f8fafc; border-radius: 6px; padding: 16px; }
              .sidebar-nav { display: flex; flex-direction: column; gap: 8px; }
              .nav-item { padding: 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
              .nav-item:hover { background: #f1f5f9; }
              .nav-item.active { background: #eff6ff; color: #3b82f6; }
            </style>
          </head>
          <body>
            <div class="tablet-layout">
              <main class="tablet-main">
                <h1 class="section-title">Tablet Layout</h1>
                <p style="color: #64748b; margin: 0 0 20px 0; line-height: 1.6;">
                  This layout uses a two-column grid optimized for tablet devices.
                  Content is organized for comfortable reading and interaction.
                </p>

                <div class="content-grid">
                  <div class="content-card">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Feature 1</h3>
                    <p style="font-size: 14px; color: #64748b; margin: 0;">Description of first feature</p>
                  </div>
                  <div class="content-card">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Feature 2</h3>
                    <p style="font-size: 14px; color: #64748b; margin: 0;">Description of second feature</p>
                  </div>
                </div>
              </main>

              <aside class="tablet-sidebar">
                <h2 class="section-title">Navigation</h2>
                <nav class="sidebar-nav">
                  <div class="nav-item active">Dashboard</div>
                  <div class="nav-item">Analytics</div>
                  <div class="nav-item">Reports</div>
                  <div class="nav-item">Settings</div>
                </nav>
              </aside>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('layout-tablet-viewport', '.tablet-layout', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });
});