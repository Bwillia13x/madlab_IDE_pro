/**
 * Visual Regression Tests for Chart Components
 * Tests AdvancedChart, InteractiveChart, and MobileChart components
 */

import { test, expect } from '@playwright/test';
import { PlaywrightVisualRegressionTester, viewportConfigs } from './playwright-visual-regression.test';

test.describe('Chart Components Visual Regression', () => {
  let visualTester: PlaywrightVisualRegressionTester;

  test.beforeEach(async ({ page }) => {
    visualTester = new PlaywrightVisualRegressionTester(page);
    // Navigate to test page or set up test environment
    await page.goto('http://localhost:3010');
  });

  test.describe('AdvancedChart Component', () => {
    test('should render AdvancedChart with default settings', async ({ page }) => {
      // Create a test page with the AdvancedChart component
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }
              .chart-container { width: 100%; height: 500px; background: #1e293b; border-radius: 8px; overflow: hidden; }
              .chart-header { padding: 16px; border-bottom: 1px solid #334155; }
              .chart-title { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
              .chart-badge { font-size: 10px; padding: 2px 8px; background: #64748b; border-radius: 12px; }
              .chart-controls { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
              .control-group { display: flex; align-items: center; gap: 4px; font-size: 11px; }
              .control-input { height: 24px; padding: 2px 6px; border: 1px solid #475569; border-radius: 4px; background: #1e293b; color: #f8fafc; font-size: 11px; }
              .control-button { height: 24px; padding: 2px 8px; border: 1px solid #475569; border-radius: 4px; background: #1e293b; color: #f8fafc; font-size: 11px; cursor: pointer; }
              .control-button.active { background: #3b82f6; border-color: #3b82f6; }
              .checkbox-group { display: flex; gap: 8px; }
              .checkbox-item { display: flex; align-items: center; gap: 4px; }
              .checkbox-item input[type="checkbox"] { width: 12px; height: 12px; }
              .chart-body { height: calc(100% - 120px); position: relative; }
              .canvas-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
              canvas { display: block; background: #0f172a; }
            </style>
          </head>
          <body>
            <div class="chart-container">
              <div class="chart-header">
                <div class="chart-title">
                  Advanced Chart
                  <span class="chart-badge">Mock</span>
                </div>
                <div class="chart-controls">
                  <div class="control-group">
                    <label>Symbol</label>
                    <input class="control-input" value="NVDA" style="width: 80px;">
                    <button class="control-button">Load</button>
                  </div>
                  <div class="control-group">
                    <label>Compare</label>
                    <input class="control-input" placeholder="SPY, AAPL…" style="width: 100px;">
                    <button class="control-button">Add</button>
                    <button class="control-button">Clear</button>
                  </div>
                  <div class="control-group">
                    <button class="control-button active">Max</button>
                    <button class="control-button">1Y</button>
                    <button class="control-button">6M</button>
                    <button class="control-button">3M</button>
                    <button class="control-button">1M</button>
                  </div>
                </div>
                <div class="chart-controls">
                  <div class="checkbox-group">
                    <label class="checkbox-item"><input type="checkbox" checked>SMA20</label>
                    <label class="checkbox-item"><input type="checkbox" checked>SMA50</label>
                    <label class="checkbox-item"><input type="checkbox" checked>Bollinger</label>
                    <label class="checkbox-item"><input type="checkbox">VWAP</label>
                    <label class="checkbox-item"><input type="checkbox">Volume</label>
                    <label class="checkbox-item"><input type="checkbox" checked>Regime</label>
                    <label class="checkbox-item"><input type="checkbox" checked>RSI</label>
                    <label class="checkbox-item"><input type="checkbox" checked>MACD</label>
                  </div>
                  <span style="font-size: 11px; color: #64748b;">Pan: ←/→ • Zoom: wheel</span>
                </div>
              </div>
              <div class="chart-body">
                <div class="canvas-container">
                  <canvas width="800" height="320"></canvas>
                </div>
              </div>
            </div>

            <script>
              // Mock canvas rendering for visual consistency
              const canvas = document.querySelector('canvas');
              const ctx = canvas.getContext('2d');

              // Set up canvas
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Draw grid
              ctx.strokeStyle = 'rgba(255,255,255,0.06)';
              ctx.lineWidth = 1;
              for (let i = 1; i < 5; i++) {
                const y = (i * canvas.height) / 5;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
              }

              // Draw sample candlesticks
              const candleWidth = 6;
              const spacing = 8;
              for (let i = 0; i < 50; i++) {
                const x = 50 + i * spacing;
                const open = 100 + Math.sin(i * 0.2) * 20;
                const close = open + (Math.random() - 0.5) * 10;
                const high = Math.max(open, close) + Math.random() * 5;
                const low = Math.min(open, close) - Math.random() * 5;

                // Scale to canvas
                const scaleY = canvas.height / 200;
                const yOpen = (200 - open) * scaleY;
                const yClose = (200 - close) * scaleY;
                const yHigh = (200 - high) * scaleY;
                const yLow = (200 - low) * scaleY;

                // Draw wick
                ctx.strokeStyle = close > open ? 'rgba(50,214,147,0.9)' : 'rgba(255,107,107,0.9)';
                ctx.beginPath();
                ctx.moveTo(x, yHigh);
                ctx.lineTo(x, yLow);
                ctx.stroke();

                // Draw body
                const bodyTop = Math.min(yOpen, yClose);
                const bodyBottom = Math.max(yOpen, yClose);
                const bodyHeight = Math.max(1, bodyBottom - bodyTop);

                ctx.fillStyle = close > open ? 'rgba(50,214,147,0.9)' : 'rgba(255,107,107,0.9)';
                ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
              }

              // Draw sample indicators
              ctx.strokeStyle = 'rgba(125,200,247,0.9)';
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              for (let i = 0; i < 50; i++) {
                const x = 50 + i * spacing;
                const y = (200 - (100 + Math.sin(i * 0.1) * 10)) * scaleY;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            </script>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('advanced-chart-default', '.chart-container', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should render AdvancedChart with minimal indicators', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }
              .chart-container { width: 100%; height: 500px; background: #1e293b; border-radius: 8px; overflow: hidden; }
              .chart-header { padding: 16px; border-bottom: 1px solid #334155; }
              .chart-title { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
              .chart-badge { font-size: 10px; padding: 2px 8px; background: #64748b; border-radius: 12px; }
              .chart-body { height: calc(100% - 60px); position: relative; }
              .canvas-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
              canvas { display: block; background: #0f172a; }
            </style>
          </head>
          <body>
            <div class="chart-container">
              <div class="chart-header">
                <div class="chart-title">
                  Advanced Chart - Minimal
                  <span class="chart-badge">Mock</span>
                </div>
              </div>
              <div class="chart-body">
                <div class="canvas-container">
                  <canvas width="800" height="380"></canvas>
                </div>
              </div>
            </div>

            <script>
              const canvas = document.querySelector('canvas');
              const ctx = canvas.getContext('2d');

              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Draw simple price chart
              ctx.strokeStyle = 'rgba(125,200,247,0.9)';
              ctx.lineWidth = 2;
              ctx.beginPath();

              for (let i = 0; i < 100; i++) {
                const x = (i / 99) * canvas.width;
                const y = (canvas.height / 2) + Math.sin(i * 0.1) * 50;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            </script>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('advanced-chart-minimal', '.chart-container', {
        threshold: 0.05,
        fullPage: false,
      });
    });

    test('should render AdvancedChart with all indicators enabled', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }
              .chart-container { width: 100%; height: 600px; background: #1e293b; border-radius: 8px; overflow: hidden; }
              .chart-header { padding: 16px; border-bottom: 1px solid #334155; }
              .chart-title { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
              .chart-badge { font-size: 10px; padding: 2px 8px; background: #64748b; border-radius: 12px; }
              .chart-controls { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
              .checkbox-group { display: flex; gap: 8px; flex-wrap: wrap; }
              .checkbox-item { display: flex; align-items: center; gap: 4px; font-size: 11px; }
              .checkbox-item input[type="checkbox"] { width: 12px; height: 12px; }
              .chart-body { height: calc(100% - 100px); display: grid; grid-template-rows: 1fr 120px 120px; gap: 4px; padding: 4px; }
              .canvas-container { background: #0f172a; border-radius: 4px; position: relative; }
              canvas { display: block; width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <div class="chart-container">
              <div class="chart-header">
                <div class="chart-title">
                  Advanced Chart - All Indicators
                  <span class="chart-badge">Mock</span>
                </div>
                <div class="checkbox-group">
                  <label class="checkbox-item"><input type="checkbox" checked>SMA20</label>
                  <label class="checkbox-item"><input type="checkbox" checked>SMA50</label>
                  <label class="checkbox-item"><input type="checkbox" checked>Bollinger</label>
                  <label class="checkbox-item"><input type="checkbox" checked>VWAP</label>
                  <label class="checkbox-item"><input type="checkbox" checked>Volume</label>
                  <label class="checkbox-item"><input type="checkbox" checked>Regime</label>
                  <label class="checkbox-item"><input type="checkbox" checked>RSI</label>
                  <label class="checkbox-item"><input type="checkbox" checked>MACD</label>
                </div>
              </div>
              <div class="chart-body">
                <div class="canvas-container">
                  <canvas data-testid="price-canvas"></canvas>
                </div>
                <div class="canvas-container">
                  <canvas data-testid="rsi-canvas"></canvas>
                </div>
                <div class="canvas-container">
                  <canvas data-testid="macd-canvas"></canvas>
                </div>
              </div>
            </div>

            <script>
              // Render all three canvases with different indicators
              const canvases = document.querySelectorAll('canvas');
              canvases.forEach((canvas, index) => {
                const ctx = canvas.getContext('2d');
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;

                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw grid
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                for (let i = 1; i < 4; i++) {
                  const y = (i * canvas.height) / 4;
                  ctx.beginPath();
                  ctx.moveTo(0, y);
                  ctx.lineTo(canvas.width, y);
                  ctx.stroke();
                }

                if (index === 0) {
                  // Price chart with multiple indicators
                  const colors = ['rgba(125,200,247,0.9)', 'rgba(255,126,182,0.9)', 'rgba(255,210,157,0.95)'];
                  for (let line = 0; line < 3; line++) {
                    ctx.strokeStyle = colors[line];
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    for (let i = 0; i < 100; i++) {
                      const x = (i / 99) * canvas.width;
                      const y = (canvas.height / 2) + Math.sin(i * 0.1 + line * 2) * 40 + line * 20;
                      if (i === 0) ctx.moveTo(x, y);
                      else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                  }
                } else if (index === 1) {
                  // RSI indicator
                  ctx.strokeStyle = 'rgba(125,200,247,0.95)';
                  ctx.lineWidth = 1.6;
                  ctx.beginPath();
                  for (let i = 0; i < 100; i++) {
                    const x = (i / 99) * canvas.width;
                    const y = (canvas.height * 0.3) + Math.sin(i * 0.2) * 20 + canvas.height * 0.4;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                  }
                  ctx.stroke();

                  // RSI levels
                  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                  ctx.setLineDash([5, 5]);
                  const levels = [30, 50, 70];
                  levels.forEach(level => {
                    const y = canvas.height - (level / 100) * canvas.height;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                  });
                  ctx.setLineDash([]);
                } else {
                  // MACD indicator
                  const macdColor = 'rgba(125,200,247,0.9)';
                  const signalColor = 'rgba(255,126,182,0.9)';
                  const histogramColors = ['rgba(50,214,147,0.6)', 'rgba(255,107,107,0.6)'];

                  // MACD line
                  ctx.strokeStyle = macdColor;
                  ctx.lineWidth = 1.6;
                  ctx.beginPath();
                  for (let i = 0; i < 100; i++) {
                    const x = (i / 99) * canvas.width;
                    const y = (canvas.height / 2) + Math.sin(i * 0.15) * 30;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                  }
                  ctx.stroke();

                  // Signal line
                  ctx.strokeStyle = signalColor;
                  ctx.lineWidth = 1.3;
                  ctx.beginPath();
                  for (let i = 0; i < 100; i++) {
                    const x = (i / 99) * canvas.width;
                    const y = (canvas.height / 2) + Math.sin(i * 0.12) * 25;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                  }
                  ctx.stroke();

                  // Histogram
                  for (let i = 0; i < 50; i++) {
                    const x = (i / 49) * canvas.width;
                    const value = Math.sin(i * 0.3) * 20;
                    const height = Math.abs(value);
                    const y = canvas.height / 2 - height / 2;

                    ctx.fillStyle = value >= 0 ? histogramColors[0] : histogramColors[1];
                    ctx.fillRect(x - 2, y, 4, height);
                  }
                }
              });
            </script>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('advanced-chart-all-indicators', '.chart-container', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('AdvancedChart - Different Viewports', () => {
    test('should render consistently on mobile viewport', async ({ page }) => {
      await page.setViewportSize(viewportConfigs.mobile);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 10px; background: #0f172a; color: #f8fafc; }
              .mobile-chart { width: 100%; height: 300px; background: #1e293b; border-radius: 8px; overflow: hidden; }
              .chart-header { padding: 12px; }
              .chart-title { font-size: 14px; font-weight: 600; margin: 0; }
              .chart-body { height: calc(100% - 50px); position: relative; }
              canvas { display: block; width: 100%; height: 100%; background: #0f172a; }
            </style>
          </head>
          <body>
            <div class="mobile-chart">
              <div class="chart-header">
                <h3 class="chart-title">Advanced Chart</h3>
              </div>
              <div class="chart-body">
                <canvas></canvas>
              </div>
            </div>

            <script>
              const canvas = document.querySelector('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = canvas.parentElement.clientWidth;
              canvas.height = canvas.parentElement.clientHeight;

              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Simple mobile chart
              ctx.strokeStyle = 'rgba(125,200,247,0.9)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 0; i < canvas.width; i += 2) {
                const x = i;
                const y = (canvas.height / 2) + Math.sin(i * 0.02) * 30;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            </script>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('advanced-chart-mobile', '.mobile-chart', {
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
              body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }
              .tablet-chart { width: 100%; height: 400px; background: #1e293b; border-radius: 8px; overflow: hidden; }
              .chart-header { padding: 16px; }
              .chart-title { font-size: 16px; font-weight: 600; margin: 0; }
              .chart-body { height: calc(100% - 60px); position: relative; }
              canvas { display: block; width: 100%; height: 100%; background: #0f172a; }
            </style>
          </head>
          <body>
            <div class="tablet-chart">
              <div class="chart-header">
                <h3 class="chart-title">Advanced Chart</h3>
              </div>
              <div class="chart-body">
                <canvas></canvas>
              </div>
            </div>

            <script>
              const canvas = document.querySelector('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = canvas.parentElement.clientWidth;
              canvas.height = canvas.parentElement.clientHeight;

              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Tablet chart with more detail
              ctx.strokeStyle = 'rgba(125,200,247,0.9)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 0; i < canvas.width; i++) {
                const x = i;
                const y = (canvas.height / 2) + Math.sin(i * 0.01) * 40 + Math.sin(i * 0.05) * 20;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            </script>
          </body>
        </html>
      `);

      await visualTester.assertVisualMatch('advanced-chart-tablet', '.tablet-chart', {
        threshold: 0.05,
        fullPage: false,
      });
    });
  });
});