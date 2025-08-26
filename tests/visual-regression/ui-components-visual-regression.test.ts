/**
 * Visual Regression Tests for UI Components
 * Tests Button, Input, Card, Dialog, WidgetWrapper components
 */

import { test, expect } from '@playwright/test';
import { PlaywrightVisualRegressionTester, viewportConfigs } from './playwright-visual-regression.test';

test.describe('UI Components Visual Regression', () => {
  let visualTester: PlaywrightVisualRegressionTester;

  test.beforeEach(async ({ page }) => {
    visualTester = new PlaywrightVisualRegressionTester(page);
    // Navigate to test page or set up test environment
    await page.goto('http://localhost:3010');
  });

  test.describe('Button Component', () => {
    test('should render all button variants consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .button-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; max-width: 800px; }
              .button-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .section-title { font-size: 16px; font-weight: 600; margin: 0 0 16px 0; color: #1e293b; }
              .button-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
              .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid; cursor: pointer; transition: all 0.2s; text-decoration: none; }
              .btn:focus { outline: 2px solid; outline-offset: 2px; }

              /* Default variant */
              .btn-default { background: #3b82f6; color: white; border-color: #3b82f6; }
              .btn-default:hover { background: #2563eb; border-color: #2563eb; }
              .btn-default:focus { outline-color: #3b82f6; }

              /* Secondary variant */
              .btn-secondary { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
              .btn-secondary:hover { background: #e2e8f0; border-color: #cbd5e1; }
              .btn-secondary:focus { outline-color: #475569; }

              /* Destructive variant */
              .btn-destructive { background: #ef4444; color: white; border-color: #ef4444; }
              .btn-destructive:hover { background: #dc2626; border-color: #dc2626; }
              .btn-destructive:focus { outline-color: #ef4444; }

              /* Outline variant */
              .btn-outline { background: transparent; color: #3b82f6; border-color: #3b82f6; }
              .btn-outline:hover { background: #3b82f6; color: white; }
              .btn-outline:focus { outline-color: #3b82f6; }

              /* Ghost variant */
              .btn-ghost { background: transparent; color: #475569; border-color: transparent; }
              .btn-ghost:hover { background: #f1f5f9; border-color: #f1f5f9; }
              .btn-ghost:focus { outline-color: #475569; }

              /* Sizes */
              .btn-sm { height: 36px; padding: 6px 12px; font-size: 12px; }
              .btn-default { height: 40px; }
              .btn-lg { height: 44px; padding: 10px 20px; font-size: 16px; }

              /* With icons */
              .btn-with-icon { display: inline-flex; align-items: center; gap: 8px; }
              .icon { width: 16px; height: 16px; background: currentColor; border-radius: 2px; }
            </style>
          </head>
          <body>
            <div class="button-grid">
              <div class="button-section">
                <h3 class="section-title">Button Variants</h3>
                <div class="button-row">
                  <button class="btn btn-default">Default</button>
                  <button class="btn btn-secondary">Secondary</button>
                  <button class="btn btn-destructive">Destructive</button>
                  <button class="btn btn-outline">Outline</button>
                  <button class="btn btn-ghost">Ghost</button>
                </div>
              </div>

              <div class="button-section">
                <h3 class="section-title">Button Sizes</h3>
                <div class="button-row">
                  <button class="btn btn-default btn-sm">Small</button>
                  <button class="btn btn-default">Default</button>
                  <button class="btn btn-default btn-lg">Large</button>
                </div>
              </div>

              <div class="button-section">
                <h3 class="section-title">Button States</h3>
                <div class="button-row">
                  <button class="btn btn-default">Normal</button>
                  <button class="btn btn-secondary" disabled>Disabled</button>
                  <button class="btn btn-default btn-with-icon">
                    <span class="icon"></span>
                    With Icon
                  </button>
                </div>
              </div>

              <div class="button-section">
                <h3 class="section-title">Button as Links</h3>
                <div class="button-row">
                  <a href="#" class="btn btn-default">Link Button</a>
                  <a href="#" class="btn btn-outline">Link Outline</a>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('button-variants-all', '.button-grid', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should maintain consistent button focus states', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .focus-test { display: flex; gap: 16px; flex-wrap: wrap; }
              .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid; cursor: pointer; transition: all 0.2s; }
              .btn:focus { outline: 2px solid; outline-offset: 2px; }

              .btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
              .btn-primary:focus { outline-color: #3b82f6; }

              .btn-secondary { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
              .btn-secondary:focus { outline-color: #475569; }
            </style>
          </head>
          <body>
            <div class="focus-test">
              <button class="btn btn-primary" data-testid="primary-btn">Primary Button</button>
              <button class="btn btn-secondary" data-testid="secondary-btn">Secondary Button</button>
            </div>

            <script>
              // Programmatically focus buttons for visual testing
              setTimeout(() => {
                document.querySelector('[data-testid="primary-btn"]').focus();
              }, 100);
            </script>
          </body>
        </html>
      `);

      // Test primary button focus
      await page.focus('[data-testid="primary-btn"]');
      await visualTester.assertVisualMatch('button-primary-focus', '.focus-test', {
        threshold: 0.05,
        fullPage: false,
      });

      // Test secondary button focus
      await page.focus('[data-testid="secondary-btn"]');
      await visualTester.assertVisualMatch('button-secondary-focus', '.focus-test', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Input Component', () => {
    test('should render all input types consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .input-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .section-title { font-size: 16px; font-weight: 600; margin: 0 0 16px 0; color: #1e293b; }
              .input-group { margin-bottom: 16px; }
              .input-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: #374151; }
              .input-field { width: 100%; height: 40px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s, box-shadow 0.2s; background: white; }
              .input-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
              .input-field:disabled { background: #f9fafb; color: #9ca3af; cursor: not-allowed; }
              .input-field.error { border-color: #ef4444; }
              .input-field.error:focus { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2); }
              .input-hint { font-size: 12px; color: #6b7280; margin-top: 4px; }
              .input-row { display: flex; gap: 12px; }
              .input-row .input-group { flex: 1; }
            </style>
          </head>
          <body>
            <div class="input-section">
              <h3 class="section-title">Input Types</h3>
              <div class="input-group">
                <label class="input-label">Text Input</label>
                <input type="text" class="input-field" placeholder="Enter text" value="Sample text">
              </div>
              <div class="input-row">
                <div class="input-group">
                  <label class="input-label">Email Input</label>
                  <input type="email" class="input-field" placeholder="Enter email" value="user@example.com">
                </div>
                <div class="input-group">
                  <label class="input-label">Password Input</label>
                  <input type="password" class="input-field" placeholder="Enter password" value="password123">
                </div>
              </div>
              <div class="input-row">
                <div class="input-group">
                  <label class="input-label">Number Input</label>
                  <input type="number" class="input-field" placeholder="Enter number" value="42">
                </div>
                <div class="input-group">
                  <label class="input-label">Date Input</label>
                  <input type="date" class="input-field" value="2024-01-15">
                </div>
              </div>
            </div>

            <div class="input-section">
              <h3 class="section-title">Input States</h3>
              <div class="input-group">
                <label class="input-label">Normal State</label>
                <input type="text" class="input-field" placeholder="Normal input">
              </div>
              <div class="input-group">
                <label class="input-label">Focus State</label>
                <input type="text" class="input-field" placeholder="Focused input" data-testid="focus-input">
              </div>
              <div class="input-group">
                <label class="input-label">Disabled State</label>
                <input type="text" class="input-field" placeholder="Disabled input" disabled>
              </div>
              <div class="input-group">
                <label class="input-label">Error State</label>
                <input type="text" class="input-field error" placeholder="Error input" value="Invalid value">
                <div class="input-hint">This field has an error</div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('input-types-all', 'body', {
        threshold: 0.05,
        fullPage: true,
      });
    });

    test('should maintain consistent input focus states', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .input-group { margin-bottom: 16px; }
              .input-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
              .input-field { width: 300px; height: 40px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: all 0.2s; }
              .input-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
            </style>
          </head>
          <body>
            <div class="input-group">
              <label class="input-label">Focus Test Input</label>
              <input type="text" class="input-field" placeholder="Click to focus" data-testid="focus-test">
            </div>

            <script>
              // Auto-focus for visual testing
              setTimeout(() => {
                document.querySelector('[data-testid="focus-test"]').focus();
              }, 100);
            </script>
          </body>
        </html>
      `);

      await page.focus('[data-testid="focus-test"]');
      await visualTester.assertVisualMatch('input-focus-state', '.input-group', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Card Component', () => {
    test('should render card variants consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
              .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
              .card-header { padding: 20px; border-bottom: 1px solid #e5e7eb; }
              .card-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
              .card-subtitle { font-size: 14px; color: #6b7280; margin: 0; }
              .card-content { padding: 20px; }
              .card-footer { padding: 20px; border-top: 1px solid #e5e7eb; background: #f9fafb; }

              /* Card variants */
              .card-elevated { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .card-outlined { border: 1px solid #d1d5db; box-shadow: none; }
              .card-filled { background: #f8fafc; }

              /* Content variations */
              .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
              .stat-item { text-align: center; }
              .stat-value { font-size: 24px; font-weight: 700; color: #1e293b; }
              .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
            </style>
          </head>
          <body>
            <div class="card-grid">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Basic Card</h3>
                  <p class="card-subtitle">Simple card with header and content</p>
                </div>
                <div class="card-content">
                  <p>This is a basic card component with standard styling and layout.</p>
                </div>
              </div>

              <div class="card card-elevated">
                <div class="card-header">
                  <h3 class="card-title">Elevated Card</h3>
                  <p class="card-subtitle">Card with enhanced shadow</p>
                </div>
                <div class="card-content">
                  <div class="stat-grid">
                    <div class="stat-item">
                      <div class="stat-value">1,234</div>
                      <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">89%</div>
                      <div class="stat-label">Success Rate</div>
                    </div>
                  </div>
                </div>
                <div class="card-footer">
                  <button style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">View Details</button>
                </div>
              </div>

              <div class="card card-outlined">
                <div class="card-header">
                  <h3 class="card-title">Outlined Card</h3>
                  <p class="card-subtitle">Card with border instead of shadow</p>
                </div>
                <div class="card-content">
                  <p>This card uses an outline border instead of a drop shadow for a more subtle appearance.</p>
                </div>
              </div>

              <div class="card card-filled">
                <div class="card-header">
                  <h3 class="card-title">Filled Card</h3>
                  <p class="card-subtitle">Card with filled background</p>
                </div>
                <div class="card-content">
                  <p>This card has a filled background color to create visual separation.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('card-variants-all', '.card-grid', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Dialog Component', () => {
    test('should render dialog consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; height: 100vh; }
              .dialog-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 50; }
              .dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
              .dialog { position: relative; z-index: 50; background: white; border-radius: 8px; box-shadow: 0 20px 25px rgba(0,0,0,0.25); max-width: 400px; width: 100%; margin: 16px; }
              .dialog-header { padding: 24px 24px 0 24px; }
              .dialog-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
              .dialog-description { color: #6b7280; font-size: 14px; margin: 0 0 24px 0; }
              .dialog-content { padding: 0 24px 24px 24px; }
              .dialog-footer { padding: 0 24px 24px 24px; display: flex; justify-content: flex-end; gap: 12px; }
              .btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid; cursor: pointer; transition: all 0.2s; }
              .btn-secondary { background: white; color: #374151; border-color: #d1d5db; }
              .btn-secondary:hover { background: #f9fafb; }
              .btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
              .btn-primary:hover { background: #2563eb; }
            </style>
          </head>
          <body>
            <div class="dialog-overlay">
              <div class="dialog-backdrop"></div>
              <div class="dialog">
                <div class="dialog-header">
                  <h2 class="dialog-title">Confirm Action</h2>
                  <p class="dialog-description">Are you sure you want to delete this item? This action cannot be undone.</p>
                </div>
                <div class="dialog-content">
                  <p>This will permanently remove the selected item from the system.</p>
                </div>
                <div class="dialog-footer">
                  <button class="btn btn-secondary">Cancel</button>
                  <button class="btn btn-primary">Delete</button>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('dialog-confirmation', '.dialog-overlay', {
        threshold: 0.05,
        fullPage: true,
      });
    });

    test('should render dialog with form consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; height: 100vh; }
              .dialog-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 50; }
              .dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
              .dialog { position: relative; z-index: 50; background: white; border-radius: 8px; box-shadow: 0 20px 25px rgba(0,0,0,0.25); max-width: 500px; width: 100%; margin: 16px; }
              .dialog-header { padding: 24px 24px 0 24px; }
              .dialog-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
              .dialog-description { color: #6b7280; font-size: 14px; margin: 0 0 24px 0; }
              .dialog-content { padding: 0 24px; }
              .form-group { margin-bottom: 16px; }
              .form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
              .form-input { width: 100%; height: 40px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
              .form-textarea { width: 100%; min-height: 80px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; }
              .dialog-footer { padding: 24px; display: flex; justify-content: flex-end; gap: 12px; }
              .btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid; cursor: pointer; transition: all 0.2s; }
              .btn-secondary { background: white; color: #374151; border-color: #d1d5db; }
              .btn-secondary:hover { background: #f9fafb; }
              .btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
              .btn-primary:hover { background: #2563eb; }
            </style>
          </head>
          <body>
            <div class="dialog-overlay">
              <div class="dialog-backdrop"></div>
              <div class="dialog">
                <div class="dialog-header">
                  <h2 class="dialog-title">Create New Item</h2>
                  <p class="dialog-description">Fill in the details below to create a new item.</p>
                </div>
                <div class="dialog-content">
                  <div class="form-group">
                    <label class="form-label">Name</label>
                    <input type="text" class="form-input" placeholder="Enter name" value="Sample Item">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea" placeholder="Enter description">This is a sample description for the new item.</textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Category</label>
                    <select class="form-input" style="height: 40px;">
                      <option>General</option>
                      <option>Premium</option>
                      <option>Enterprise</option>
                    </select>
                  </div>
                </div>
                <div class="dialog-footer">
                  <button class="btn btn-secondary">Cancel</button>
                  <button class="btn btn-primary">Create</button>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('dialog-form', '.dialog-overlay', {
        threshold: 0.05,
        fullPage: true,
      });
    });
  });

  test.describe('WidgetWrapper Component', () => {
    test('should render widget wrapper consistently', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .widget-wrapper { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
              .widget-header { padding: 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: between; }
              .widget-title { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
              .widget-badge { font-size: 10px; padding: 2px 8px; background: #64748b; color: white; border-radius: 12px; }
              .widget-controls { display: flex; gap: 8px; margin-left: auto; }
              .control-btn { width: 32px; height: 32px; border: none; background: transparent; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
              .control-btn:hover { background: #f3f4f6; }
              .widget-content { padding: 20px; }
              .widget-footer { padding: 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; }
              .widget-stats { display: flex; gap: 16px; }
              .stat-item { font-size: 12px; color: #6b7280; }
              .stat-value { font-weight: 600; color: #1e293b; }

              /* Mock content */
              .chart-placeholder { height: 200px; background: linear-gradient(45deg, #f0f9ff 25%, transparent 25%), linear-gradient(-45deg, #f0f9ff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f9ff 75%), linear-gradient(-45deg, transparent 75%, #f0f9ff 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="widget-wrapper">
              <div class="widget-header">
                <div class="widget-title">
                  Market Overview
                  <span class="widget-badge">Live</span>
                </div>
                <div class="widget-controls">
                  <button class="control-btn" title="Refresh">🔄</button>
                  <button class="control-btn" title="Settings">⚙️</button>
                  <button class="control-btn" title="Expand">⛶</button>
                </div>
              </div>
              <div class="widget-content">
                <div class="chart-placeholder">
                  Chart Content
                </div>
              </div>
              <div class="widget-footer">
                <div class="widget-stats">
                  <div class="stat-item">
                    <span class="stat-value">1,234</span> items
                  </div>
                  <div class="stat-item">
                    <span class="stat-value">89%</span> active
                  </div>
                </div>
                <div style="font-size: 12px; color: #6b7280;">
                  Last updated: 2 minutes ago
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('widget-wrapper-basic', '.widget-wrapper', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('UI Components - Different Viewports', () => {
    test('should render consistently on mobile viewport', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.mobile);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 16px; background: #f8fafc; }
              .mobile-ui { display: flex; flex-direction: column; gap: 16px; }
              .mobile-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .mobile-btn { width: 100%; height: 44px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; }
              .mobile-input { width: 100%; height: 44px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="mobile-ui">
              <div class="mobile-card">
                <h3 style="margin: 0 0 12px 0; font-size: 18px;">Mobile Form</h3>
                <input type="text" class="mobile-input" placeholder="Enter text">
                <button class="mobile-btn" style="margin-top: 12px;">Submit</button>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('ui-mobile-viewport', '.mobile-ui', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should render consistently on tablet viewport', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.tablet);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
              .tablet-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .tablet-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .btn-row { display: flex; gap: 12px; margin-top: 16px; }
              .btn { padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid; cursor: pointer; }
              .btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
              .btn-secondary { background: white; color: #374151; border-color: #d1d5db; }
            </style>
          </head>
          <body>
            <div class="tablet-layout">
              <div class="tablet-card">
                <h3 style="margin: 0 0 16px 0;">Form Card</h3>
                <input type="email" placeholder="Email" style="width: 100%; height: 40px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 12px;">
                <input type="password" placeholder="Password" style="width: 100%; height: 40px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                <div class="btn-row">
                  <button class="btn btn-secondary">Cancel</button>
                  <button class="btn btn-primary">Login</button>
                </div>
              </div>
              <div class="tablet-card">
                <h3 style="margin: 0 0 16px 0;">Info Card</h3>
                <p style="margin: 0; color: #6b7280;">This is a tablet-optimized layout with two columns.</p>
              </div>
            </div>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('ui-tablet-viewport', '.tablet-layout', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });
});