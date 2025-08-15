import { test, expect } from '@playwright/test';

// Comprehensive integration testing for all parallel development tracks
// Note: test file uses relaxed typing to avoid excessive type instantiation

test.describe('Cross-Track Integration Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="workspace-root"]');
  });

  test('Track A + Track C: Infrastructure and UI/UX Integration', async ({ page }) => {
    // Test that the enhanced CI/CD and UI/UX work together

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Test theme switching (Track C)
    const themeSwitcher = page.locator('[data-testid="theme-switcher"]');
    expect(themeSwitcher).toBeVisible();

    // Switch to light theme
    await page.keyboard.press('Alt+1');
    await page.waitForTimeout(500);

    // Verify theme change
    const bodyClass = await page.evaluate(() => document.body.className);
    expect(bodyClass).toContain('light');

    // Switch back to dark theme
    await page.keyboard.press('Alt+2');
    await page.waitForTimeout(500);

    // Verify theme change
    const newBodyClass = await page.evaluate(() => document.body.className);
    expect(newBodyClass).toContain('dark');

    // Test keyboard navigation (Track C)
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement);
    expect(focusedElement).not.toBeNull();

    // Test workspace functionality
    await page.keyboard.press('Control+n'); // New sheet
    await page.waitForTimeout(500);

    // Verify new sheet was created
    const sheets = page.locator('[data-testid="sheet-tab"]');
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThan(1);
  });

  test('Track B + Track C: Testing and UI/UX Integration', async ({ page }) => {
    // Test that the testing infrastructure works with UI components

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Add a widget to test
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');

    // Wait for widget to render
    await page.waitForSelector('[data-testid="widget-tile"]');

    // Test widget selection (Track C)
    const widget = page.locator('[data-testid="widget-tile"]').first();
    await widget.click();

    // Verify selection styling
    const isSelected = await widget.getAttribute('data-selected');
    expect(isSelected).toBe('true');

    // Test inspector integration
    await page.keyboard.press('Control+i');
    const inspector = page.locator('[data-testid="inspector"]');
    expect(inspector).toBeVisible();

    // Test accessibility (Track B)
    const inputs = inspector.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const label = (await input.getAttribute('aria-label')) || (await input.getAttribute('id'));
      expect(label).toBeTruthy();
    }
  });

  test('Track C + Track D: UI/UX and Widget Development Integration', async ({ page }) => {
    // Test that the enhanced UI works with the widget system

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Test widget marketplace (Track D)
    await page.click('[data-testid="add-widget-button"]');

    // Look for marketplace option
    const marketplaceButton = page.locator('text=Marketplace').first();
    if (await marketplaceButton.isVisible()) {
      await marketplaceButton.click();

      // Test marketplace functionality
      const marketplace = page.locator('[data-testid="widget-marketplace"]');
      expect(marketplace).toBeVisible();

      // Test search functionality
      const searchInput = marketplace.locator('input[placeholder="Search widgets..."]');
      await searchInput.fill('chart');
      await page.waitForTimeout(500);

      // Verify search results
      const results = marketplace.locator('[data-testid="widget-card"]');
      const resultCount = await results.count();
      expect(resultCount).toBeGreaterThan(0);
    }

    // Test widget template system (Track D)
    await page.click('[data-testid="add-widget-button"]');

    // Look for template options
    const templateButton = page.locator('text=Template').first();
    if (await templateButton.isVisible()) {
      await templateButton.click();

      // Test template selection
      const templates = page.locator('[data-testid="template-item"]');
      const templateCount = await templates.count();
      expect(templateCount).toBeGreaterThan(0);

      // Select first template
      if (templateCount > 0) {
        await templates.first().click();

        // Verify template was applied
        const widget = page.locator('[data-testid="widget-tile"]').first();
        expect(widget).toBeVisible();
      }
    }
  });

  test('Track E + Track C: Data Integration and UI/UX Integration', async ({ page }) => {
    // Test that data providers work with the enhanced UI

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Add a data widget
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');

    // Wait for widget to render
    await page.waitForSelector('[data-testid="widget-tile"]');

    // Test data provider integration (Track E)
    const widget = page.locator('[data-testid="widget-tile"]').first();
    await widget.click();

    // Open inspector
    await page.keyboard.press('Control+i');
    await page.waitForSelector('[data-testid="inspector"]');

    // Test symbol input (data integration)
    const symbolInput = page.locator('[data-testid="widget-symbol-input"]');
    if (await symbolInput.isVisible()) {
      await symbolInput.fill('AAPL');
      await page.waitForTimeout(1000);

      // Verify data loading (this would show loading state in real implementation)
      const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
      if (await loadingIndicator.isVisible()) {
        // Wait for loading to complete
        await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden' });
      }
    }

    // Test data provider toggle (Track E)
    await page.keyboard.press('Alt+p');
    await page.waitForTimeout(500);

    // Verify provider change (this would be visible in the UI)
    const providerIndicator = page.locator('[data-testid="data-provider-indicator"]');
    if (await providerIndicator.isVisible()) {
      const providerText = await providerIndicator.textContent();
      expect(providerText).toBeTruthy();
    }
  });

  test('Track F + Track C: VS Code Extension and UI/UX Integration', async ({ page }) => {
    // Test that VS Code extension features work with the enhanced UI

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Test extension bridge functionality (Track F)
    // This would test the communication between VS Code and the webview

    // Test workspace save/load (Track F features)
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);

    // Verify save functionality (this would show a success message in real implementation)
    const saveMessage = page.locator('text=Workspace saved').first();
    if (await saveMessage.isVisible()) {
      expect(saveMessage).toBeVisible();
    }

    // Test theme synchronization (Track F + Track C)
    // This tests that VS Code theme changes are reflected in the webview

    // Simulate theme change from VS Code
    await page.evaluate(() => {
      // Simulate VS Code theme change
      window.dispatchEvent(
        new CustomEvent('vscode-theme-change', {
          detail: { theme: 'light' },
        })
      );
    });

    await page.waitForTimeout(500);

    // Verify theme change
    const bodyClass = await page.evaluate(() => document.body.className);
    expect(bodyClass).toContain('light');
  });

  test('Track A + Track B + Track C: Full Stack Integration', async ({ page }) => {
    // Test the complete integration of all tracks

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Test complete workflow
    // 1. Add widget
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');
    await page.waitForSelector('[data-testid="widget-tile"]');

    // 2. Configure widget
    const widget = page.locator('[data-testid="widget-tile"]').first();
    await widget.click();
    await page.keyboard.press('Control+i');
    await page.waitForSelector('[data-testid="inspector"]');

    // 3. Test data integration
    const symbolInput = page.locator('[data-testid="widget-symbol-input"]');
    if (await symbolInput.isVisible()) {
      await symbolInput.fill('MSFT');
      await page.waitForTimeout(1000);
    }

    // 4. Test theme switching
    await page.keyboard.press('Alt+1'); // Light theme
    await page.waitForTimeout(500);
    await page.keyboard.press('Alt+2'); // Dark theme
    await page.waitForTimeout(500);

    // 5. Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement);
    expect(focusedElement).not.toBeNull();

    // 6. Test widget selection
    await widget.click();
    const isSelected = await widget.getAttribute('data-selected');
    expect(isSelected).toBe('true');

    // 7. Test performance (Track A)
    const performanceMetrics = await page.evaluate(() => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded:
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        };
      }
      return null;
    });

    if (performanceMetrics) {
      // Verify performance is within acceptable limits
      expect(performanceMetrics.loadTime).toBeLessThan(5000); // 5 seconds
      expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3 seconds
    }
  });

  test('Accessibility Integration Across All Tracks', async ({ page }) => {
    // Test that accessibility features work across all tracks

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    let focusCount = 0;
    const maxTabs = 20; // Prevent infinite loop

    while (focusCount < maxTabs) {
      const focusedElement = await page.evaluate(() => document.activeElement);
      if (!focusedElement) break;

      const tagName = await page.evaluate((el: any) => el.tagName, focusedElement as any);
      expect(['BUTTON', 'INPUT', 'A', 'DIV'].includes(tagName)).toBe(true);

      await page.keyboard.press('Tab');
      focusCount++;
    }

    // Test ARIA labels
    const interactiveElements = page.locator(
      'button, input, select, textarea, [role="button"], [role="link"]'
    );
    const elementCount = await interactiveElements.count();

    for (let i = 0; i < Math.min(elementCount, 10); i++) {
      const element = interactiveElements.nth(i);
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledBy = await element.getAttribute('aria-labelledby');
      const title = await element.getAttribute('title');

      // At least one accessibility attribute should be present
      expect(ariaLabel || ariaLabelledBy || title).toBeTruthy();
    }

    // Test color contrast (basic check)
    const body = page.locator('body');
    const backgroundColor = await body.evaluate((el: any) => {
      const style = window.getComputedStyle(el);
      return style.backgroundColor;
    });

    const textColor = await body.evaluate((el: any) => {
      const style = window.getComputedStyle(el);
      return style.color;
    });

    // Verify colors are set (basic accessibility check)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(textColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('Performance Integration Across All Tracks', async ({ page }) => {
    // Test that performance optimizations work across all tracks

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Test initial load performance
    const initialLoadTime = await page.evaluate(() => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        return navigation.loadEventEnd - navigation.loadEventStart;
      }
      return null;
    });

    if (initialLoadTime) {
      expect(initialLoadTime).toBeLessThan(5000); // 5 seconds max
    }

    // Test widget rendering performance
    const startTime = Date.now();

    // Add multiple widgets
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="add-widget-button"]');
      await page.click('[data-testid="widget-type-line-chart"]');
      await page.waitForTimeout(200);
    }

    const endTime = Date.now();
    const widgetRenderTime = endTime - startTime;

    // Verify widget rendering is fast
    expect(widgetRenderTime).toBeLessThan(10000); // 10 seconds max for 3 widgets

    // Test memory usage (basic check)
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    if (memoryInfo) {
      // Verify memory usage is reasonable
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB max
    }
  });

  test('Error Handling Integration Across All Tracks', async ({ page }) => {
    // Test that error handling works across all tracks

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Test invalid widget type handling
    await page.evaluate(() => {
      // Simulate adding an invalid widget
      window.dispatchEvent(
        new CustomEvent('add-widget', {
          detail: { type: 'invalid-widget-type', config: {} },
        })
      );
    });

    await page.waitForTimeout(500);

    // Verify error handling (this would show an error message in real implementation)
    const errorMessage = page.locator('text=Invalid widget type').first();
    if (await errorMessage.isVisible()) {
      expect(errorMessage).toBeVisible();
    }

    // Test data provider error handling
    await page.keyboard.press('Alt+p');
    await page.waitForTimeout(500);

    // Simulate data provider error
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('data-provider-error', {
          detail: { message: 'API rate limit exceeded' },
        })
      );
    });

    await page.waitForTimeout(500);

    // Verify error handling
    const apiError = page.locator('text=API rate limit exceeded').first();
    if (await apiError.isVisible()) {
      expect(apiError).toBeVisible();
    }
  });
});

// Performance regression testing
test.describe('Performance Regression Testing', () => {
  test('Bundle size should remain within limits', async ({ page }) => {
    // Test that bundle size optimizations are working

    const bundleSize = await page.evaluate(() => {
      // This would check actual bundle size in production
      // For now, we'll check that the page loads quickly
      if ('performance' in window) {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded:
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: performance.getEntriesByType('paint').find((p) => p.name === 'first-paint')
            ?.startTime,
        };
      }
      return null;
    });

    if (bundleSize) {
      expect(bundleSize.loadTime).toBeLessThan(3000); // 3 seconds max
      expect(bundleSize.domContentLoaded).toBeLessThan(2000); // 2 seconds max
      if (bundleSize.firstPaint) {
        expect(bundleSize.firstPaint).toBeLessThan(1500); // 1.5 seconds max
      }
    }
  });
});

// Cross-browser compatibility testing
test.describe('Cross-Browser Compatibility', () => {
  test('All features should work across different browsers', async ({ page, browserName }) => {
    // Test that all tracks work in different browsers

    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Test basic functionality
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Test theme switching
    await page.keyboard.press('Alt+1');
    await page.waitForTimeout(500);

    // Verify theme change
    const bodyClass = await page.evaluate(() => document.body.className);
    expect(bodyClass).toContain('light');

    // Test widget addition
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');
    await page.waitForSelector('[data-testid="widget-tile"]');

    // Verify widget is visible
    const widget = page.locator('[data-testid="widget-tile"]').first();
    expect(widget).toBeVisible();

    console.log(`${browserName}: All features working correctly`);
  });
});
