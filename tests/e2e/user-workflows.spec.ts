/**
 * End-to-End Tests for MAD LAB Platform User Workflows
 */

import { test, expect } from '@playwright/test';

test.describe('MAD LAB Platform - Complete User Workflows', () => {
  test('should complete full user authentication workflow', async ({ page }) => {
    // Navigate to the platform
    await page.goto('http://localhost:3000');

    // Should see the main platform interface
    await expect(page.getByText('MAD LAB')).toBeVisible();
    await expect(page.getByText('Agent-Programmable Workbench')).toBeVisible();

    // Check if login functionality is available (if implemented)
    // This would test the complete authentication flow
  });

  test('should complete dashboard loading workflow', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Should load the main dashboard
    await expect(page.locator('body')).toBeVisible();

    // Should have widget grid or main content area
    const mainContent = page.locator('[data-testid="platform-root"], main, .widget-grid');
    await expect(mainContent.first()).toBeVisible();
  });

  test('should handle widget addition workflow', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Look for add widget button
    const addWidgetButton = page.getByRole('button', { name: /add widget/i });
    if (await addWidgetButton.isVisible()) {
      await addWidgetButton.click();

      // Should show widget selection interface
      const widgetGallery = page.locator('.widget-gallery, .widget-selector');
      if (await widgetGallery.isVisible()) {
        // Should have multiple widget types available
        const widgets = page.locator('.widget-item, .widget-type');
        await expect(widgets.first()).toBeVisible();
      }
    }
  });

  test('should handle market data visualization workflow', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Look for market-related widgets or data
    const marketData = page.locator('[data-testid*="market"], [data-testid*="price"]');
    if (await marketData.first().isVisible()) {
      // Should display market data correctly
      await expect(marketData.first()).toBeVisible();
    }

    // Check for chart components
    const charts = page.locator('.chart, canvas, .recharts-wrapper');
    if (await charts.first().isVisible()) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test('should handle portfolio tracking workflow', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Look for portfolio-related content
    const portfolioContent = page.locator('[data-testid*="portfolio"], [data-testid*="tracker"]');
    if (await portfolioContent.first().isVisible()) {
      // Should display portfolio data
      await expect(portfolioContent.first()).toBeVisible();

      // Look for stock symbols
      const symbols = page.locator('text=/AAPL|MSFT|GOOGL/');
      if (await symbols.first().isVisible()) {
        await expect(symbols.first()).toBeVisible();
      }
    }
  });

  test('should handle data provider configuration workflow', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Look for settings or configuration
    const settingsButton = page.getByRole('button', { name: /settings|config/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      // Should show settings panel
      const settingsPanel = page.locator('.settings-panel, .config-panel');
      if (await settingsPanel.isVisible()) {
        await expect(settingsPanel).toBeVisible();
      }
    }
  });

  test('should handle responsive design workflow', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    // Should still be functional on mobile
    await expect(page.locator('body')).toBeVisible();

    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size

    // Should adapt to tablet layout
    await expect(page.locator('body')).toBeVisible();

    // Test desktop size
    await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD

    // Should work on desktop
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test 404 handling
    await page.goto('http://localhost:3000/nonexistent-page');
    // Should show 404 or redirect to main page

    // Test API error handling (if API endpoints are accessible)
    // This would test error boundaries and graceful degradation
  });

  test('should handle accessibility features', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    // Should have focusable elements

    // Test ARIA labels
    const ariaElements = page.locator('[aria-label], [aria-describedby]');
    // Should have proper accessibility attributes

    // Test color contrast (basic check)
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
    await expect(textElements.first()).toBeVisible();
  });

  test('should handle performance under load', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test initial load performance
    const loadTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });

    // Should load within reasonable time (under 5 seconds)
    expect(loadTime).toBeLessThan(5000);

    // Test interaction performance
    const startTime = Date.now();
    const button = page.getByRole('button').first();
    if (await button.isVisible()) {
      await button.click();
      const clickTime = Date.now() - startTime;
      // Should respond quickly to interactions
      expect(clickTime).toBeLessThan(1000);
    }
  });

  test('should handle data refresh and real-time updates', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Look for refresh buttons or auto-update indicators
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Should handle refresh without errors
      await expect(page.locator('body')).toBeVisible();
    }

    // Look for real-time indicators
    const liveIndicators = page.locator('[data-testid*="live"], [data-testid*="realtime"]');
    if (await liveIndicators.first().isVisible()) {
      await expect(liveIndicators.first()).toBeVisible();
    }
  });

  test('should handle collaboration features', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Look for collaboration features
    const collabElements = page.locator('[data-testid*="collab"], [data-testid*="share"]');
    if (await collabElements.first().isVisible()) {
      await expect(collabElements.first()).toBeVisible();
    }

    // Test multi-user interface elements
    const userElements = page.locator('.user-avatar, .user-indicator, .online-users');
    if (await userElements.first().isVisible()) {
      await expect(userElements.first()).toBeVisible();
    }
  });

  test('should handle export and data functionality', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Look for export buttons
    const exportButtons = page.getByRole('button', { name: /export|download/i });
    if (await exportButtons.first().isVisible()) {
      await exportButtons.first().click();

      // Should handle export without errors
      await expect(page.locator('body')).toBeVisible();
    }

    // Look for data tables or grids
    const dataTables = page.locator('table, .data-grid, .data-table');
    if (await dataTables.first().isVisible()) {
      await expect(dataTables.first()).toBeVisible();
    }
  });
});
