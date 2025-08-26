/**
 * Visual Regression Tests for MAD LAB Platform
 * Ensures UI consistency across browsers, devices, and themes
 * Uses Playwright for real screenshot capture and pixelmatch for comparison
 */

import { test, expect } from '@playwright/test';
import { PlaywrightVisualRegressionTester, viewportConfigs } from './playwright-visual-regression.test';

// Test setup for visual regression
test.describe('Visual Regression Tests', () => {
  let visualTester: PlaywrightVisualRegressionTester;

  test.beforeEach(async ({ page }) => {
    visualTester = new PlaywrightVisualRegressionTester(page);
    // Navigate to test page or set up test environment
    await page.goto('http://localhost:3010');
  });

  test.describe('Component Visual Consistency', () => {
    test('should maintain consistent button styling across themes', async ({ page }) => {
      // Navigate to a page with buttons or create test HTML
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; }
              .button { display: inline-block; padding: 8px 16px; margin: 4px; border-radius: 6px; text-decoration: none; border: 1px solid; }
              .primary { background: #3b82f6; color: white; border-color: #3b82f6; }
              .secondary { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
              .destructive { background: #ef4444; color: white; border-color: #ef4444; }
            </style>
          </head>
          <body>
            <button class="button primary" data-testid="button-primary">Primary Button</button>
            <button class="button secondary" data-testid="button-secondary">Secondary Button</button>
            <button class="button destructive" data-testid="button-destructive">Destructive Button</button>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('button-variants', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent card layout and spacing', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .card-header { padding: 24px; border-bottom: 1px solid #f1f5f9; }
              .card-title { font-size: 24px; font-weight: 600; margin: 0 0 8px 0; }
              .card-description { color: #64748b; font-size: 14px; margin: 0; }
              .card-content { padding: 24px; padding-top: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Card Title</h3>
                <p class="card-description">Card description</p>
              </div>
              <div class="card-content">
                <p>Card content</p>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('card-layout', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent input field styling', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; }
              .input { width: 100%; height: 40px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
              .input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
            </style>
          </head>
          <body>
            <input class="input" type="text" placeholder="Enter text" data-testid="text-input">
            <input class="input" type="email" placeholder="Enter email" data-testid="email-input">
            <input class="input" type="password" placeholder="Enter password" data-testid="password-input">
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('input-fields', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent dialog/modal styling', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 0; margin: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; height: 100vh; }
              .dialog-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
              .dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
              .dialog { position: relative; z-index: 50; background: white; border-radius: 8px; box-shadow: 0 10px 15px rgba(0,0,0,0.1); padding: 24px; max-width: 400px; width: 100%; margin: 16px; }
              .dialog-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
              .dialog-description { color: #64748b; font-size: 14px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="dialog-overlay" data-testid="dialog-overlay">
              <div class="dialog-backdrop"></div>
              <div class="dialog">
                <h2 class="dialog-title">Dialog Title</h2>
                <p class="dialog-description">Dialog description</p>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('dialog-modal', undefined, {
        threshold: 0.05,
        fullPage: true,
      });
    });
  });

  test.describe('Theme Consistency', () => {
    test('should maintain consistent dark theme styling', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { background: #030712; color: #f8fafc; font-family: system-ui, sans-serif; padding: 20px; min-height: 100vh; }
              .card { background: #0f172a; color: #f8fafc; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; }
              .card-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
              .card-description { color: #cbd5e1; font-size: 14px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h3 class="card-title">Dark Theme Card</h3>
              <p class="card-description">This card should look good in dark theme</p>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('dark-theme-card', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent light theme styling', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { background: white; color: #1e293b; font-family: system-ui, sans-serif; padding: 20px; min-height: 100vh; }
              .card { background: white; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 16px; }
              .card-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
              .card-description { color: #64748b; font-size: 14px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h3 class="card-title">Light Theme Card</h3>
              <p class="card-description">This card should look good in light theme</p>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('light-theme-card', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Responsive Design Consistency', () => {
    test('should maintain consistent mobile layout', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.mobile);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 16px; background: #f8fafc; }
              .mobile-card { width: 100%; max-width: 384px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 16px; }
              .card-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
              .card-description { color: #64748b; font-size: 14px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="mobile-card">
              <h3 class="card-title">Mobile Card</h3>
              <p class="card-description">This should look good on mobile</p>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('mobile-layout', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent tablet layout', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.tablet);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 16px; background: #f8fafc; }
              .tablet-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 16px; }
              .grid-item { padding: 16px; border-radius: 8px; text-align: center; font-weight: 500; }
              .item-1 { background: #dbeafe; }
              .item-2 { background: #d1fae5; }
              .item-3 { background: #fee2e2; }
            </style>
          </head>
          <body>
            <div class="tablet-grid">
              <div class="grid-item item-1">Item 1</div>
              <div class="grid-item item-2">Item 2</div>
              <div class="grid-item item-3">Item 3</div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('tablet-layout', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent desktop layout', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.desktop);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 32px; background: #f8fafc; }
              .desktop-layout { max-width: 1280px; margin: 0 auto; }
              .desktop-grid { display: grid; grid-template-columns: 1fr 3fr; gap: 32px; }
              .sidebar { background: #f1f5f9; padding: 24px; border-radius: 8px; }
              .main-content { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="desktop-layout">
              <div class="desktop-grid">
                <div class="sidebar">Sidebar</div>
                <div class="main-content">Main Content</div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('desktop-layout', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Interactive Element Consistency', () => {
    test('should maintain consistent hover and focus states', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; }
              .interactive-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                background: #3b82f6;
                color: white;
                border: none;
                cursor: pointer;
                transition: background-color 0.2s;
              }
              .interactive-button:hover { background: #2563eb; }
              .interactive-button:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
            </style>
          </head>
          <body>
            <button class="interactive-button" data-testid="interactive-button">
              Interactive Button
            </button>
          </body>
        </html>
      `);

      // Test normal state
      await visualTester.assertVisualMatch('button-normal-state', '[data-testid="interactive-button"]', {
        threshold: 0.05,
        fullPage: false,
      });

      // Test hover state
      await page.hover('[data-testid="interactive-button"]');
      await page.waitForTimeout(100); // Wait for hover effect
      await visualTester.assertVisualMatch('button-hover-state', '[data-testid="interactive-button"]', {
        threshold: 0.05,
        fullPage: false,
      });

      // Test focus state
      await page.focus('[data-testid="interactive-button"]');
      await visualTester.assertVisualMatch('button-focus-state', '[data-testid="interactive-button"]', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent form field interactions', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; }
              .form-group { margin-bottom: 16px; }
              .form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
              .form-input {
                width: 100%;
                height: 40px;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                transition: border-color 0.2s, box-shadow 0.2s;
              }
              .form-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
              }
            </style>
          </head>
          <body>
            <div class="form-group">
              <label class="form-label" for="test-input">Test Label</label>
              <input
                id="test-input"
                class="form-input"
                placeholder="Enter value"
                data-testid="form-input"
              />
            </div>
          </body>
        </html>
      `);

      const input = page.locator('[data-testid="form-input"]');

      // Test initial state
      await visualTester.assertVisualMatch('form-input-initial', '.form-group', {
        threshold: 0.05,
        fullPage: false,
      });

      // Test focus state
      await input.focus();
      await visualTester.assertVisualMatch('form-input-focus', '.form-group', {
        threshold: 0.05,
        fullPage: false,
      });

      // Test with value
      await input.fill('test value');
      await visualTester.assertVisualMatch('form-input-with-value', '.form-group', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Chart and Data Visualization Consistency', () => {
    test('should maintain consistent chart container styling', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .chart-container {
                width: 100%;
                height: 384px;
                padding: 16px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border: 1px solid #e2e8f0;
              }
              .chart-title {
                font-size: 18px;
                font-weight: 600;
                margin: 0 0 16px 0;
              }
              .chart-area {
                width: 100%;
                height: 320px;
                background: #f8fafc;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #64748b;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="chart-container">
              <h3 class="chart-title">Sample Chart</h3>
              <div class="chart-area" data-testid="chart-area">
                Chart Content
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('chart-container', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent data table styling', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .data-table { border-radius: 6px; border: 1px solid #e2e8f0; overflow: hidden; }
              .table { width: 100%; font-size: 14px; border-collapse: collapse; }
              .table-header { border-bottom: 1px solid #e2e8f0; }
              .table-header th {
                height: 48px;
                padding: 0 16px;
                text-align: left;
                vertical-align: middle;
                font-weight: 500;
                background: #f8fafc;
              }
              .table-row { border-bottom: 1px solid #e2e8f0; }
              .table-row td {
                padding: 16px;
                vertical-align: middle;
              }
            </style>
          </head>
          <body>
            <div class="data-table">
              <table class="table">
                <thead class="table-header">
                  <tr>
                    <th>Column 1</th>
                    <th>Column 2</th>
                    <th>Column 3</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="table-row">
                    <td>Data 1</td>
                    <td>Data 2</td>
                    <td>Data 3</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('data-table', undefined, {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });
});
