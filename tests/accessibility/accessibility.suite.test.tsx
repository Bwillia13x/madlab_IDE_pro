import { test, expect } from '@playwright/test';
// axe-core is injected at runtime; import types if available
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AxeResults = any;

// Accessibility testing configuration
const accessibilityConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'document-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    region: { enabled: true },
    'skip-link': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'focus-visible': { enabled: true },
    keyboard: { enabled: true },
    label: { enabled: true },
    list: { enabled: true },
    listitem: { enabled: true },
    'button-name': { enabled: true },
    'input-image-alt': { enabled: true },
    'link-name': { enabled: true },
    'img-alt': { enabled: true },
    'table-fake-caption': { enabled: true },
    'td-has-header': { enabled: true },
    'th-has-data-cells': { enabled: true },
  },
};

// Helper function to run axe-core accessibility tests
async function runAccessibilityTest(page: any, context?: string): Promise<AxeResults> {
  await page.waitForLoadState('networkidle');

  // Inject axe-core
  await page.addScriptTag({
    path: require.resolve('axe-core/axe.min.js'),
  });

  // Run accessibility test
  const results = await page.evaluate((config: unknown) => {
    // @ts-ignore - axe is injected at runtime
    return (window as any).axe.run(config);
  }, accessibilityConfig as unknown);

  return results;
}

// Helper function to check for critical accessibility violations
function checkCriticalViolations(results: AxeResults): void {
  const criticalRules = [
    'color-contrast',
    'html-has-lang',
    'landmark-one-main',
    'focus-visible',
    'keyboard',
    'label',
  ];

  const criticalViolations = results.violations.filter((violation: { id: string }) =>
    criticalRules.includes(violation.id)
  );

  if (criticalViolations.length > 0) {
    console.error('Critical accessibility violations found:', criticalViolations);
    throw new Error(`Critical accessibility violations: ${criticalViolations.length}`);
  }
}

test.describe('Accessibility Compliance Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('Main page should meet WCAG 2.1 AA standards', async ({ page }) => {
    const results = await runAccessibilityTest(page, 'Main page');

    // Check for critical violations
    checkCriticalViolations(results);

    // Ensure no violations exist
    expect(results.violations).toHaveLength(0);

    // Log results for monitoring
    console.log(`Accessibility test passed: ${results.passes.length} checks passed`);
  });

  test('Workspace should be accessible', async ({ page }) => {
    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityTest(page, 'Workspace');

    checkCriticalViolations(results);
    expect(results.violations).toHaveLength(0);
  });

  test('Widget selection should be keyboard accessible', async ({ page }) => {
    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForLoadState('networkidle');

    // Test keyboard navigation
    await page.keyboard.press('Tab');

    // Check if focus is visible
    const focusedElement = await page.evaluate(() => document.activeElement);
    expect(focusedElement).not.toBeNull();

    // Test arrow key navigation between widgets
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    // Verify focus management
    const newFocusedElement = await page.evaluate(() => document.activeElement);
    expect(newFocusedElement).not.toBe(focusedElement);
  });

  test('Theme switching should be accessible', async ({ page }) => {
    // Find theme switcher
    const themeSwitcher = page.locator('[data-testid="theme-switcher"]');
    expect(themeSwitcher).toBeVisible();

    // Test keyboard navigation to theme switcher
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Test theme switching with keyboard shortcuts
    await page.keyboard.press('Alt+1'); // Light theme
    await page.waitForTimeout(100);

    await page.keyboard.press('Alt+2'); // Dark theme
    await page.waitForTimeout(100);

    await page.keyboard.press('Alt+3'); // System theme
    await page.waitForTimeout(100);

    // Verify theme changes are applied
    const bodyClass = await page.evaluate(() => document.body.className);
    expect(bodyClass).toContain('dark');
  });

  test('Widget configuration should be accessible', async ({ page }) => {
    // Navigate to workspace and add a widget
    await page.click('[data-testid="workspace-link"]');
    await page.waitForLoadState('networkidle');

    // Add a simple widget
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');

    // Test widget configuration accessibility
    const widget = page.locator('[data-testid="widget-tile"]').first();
    await widget.click();

    // Open inspector
    await page.keyboard.press('Control+i');

    // Check if inspector is accessible
    const inspector = page.locator('[data-testid="inspector"]');
    expect(inspector).toBeVisible();

    // Test form controls accessibility
    const inputs = inspector.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const label = (await input.getAttribute('aria-label')) || (await input.getAttribute('id'));
      expect(label).toBeTruthy();
    }
  });

  test('Color contrast should meet WCAG AA standards', async ({ page }) => {
    const results = await runAccessibilityTest(page, 'Color contrast check');

    // Check specifically for color contrast violations
    const contrastViolations = results.violations.filter(
      (v: { id: string }) => v.id === 'color-contrast'
    );

    if (contrastViolations.length > 0) {
      console.error('Color contrast violations:', contrastViolations);
      // Log specific elements with contrast issues
      contrastViolations.forEach((violation: any) => {
        violation.nodes.forEach((node: any) => {
          console.error(`Contrast issue: ${node.html}`);
        });
      });
    }

    expect(contrastViolations).toHaveLength(0);
  });

  test('Screen reader compatibility', async ({ page }) => {
    // Test ARIA labels and roles
    const results = await runAccessibilityTest(page, 'Screen reader compatibility');

    // Check for proper ARIA implementation
    const ariaViolations = results.violations.filter(
      (v: { id: string }) =>
        v.id.includes('aria') || v.id.includes('label') || v.id.includes('role')
    );

    expect(ariaViolations).toHaveLength(0);

    // Test semantic HTML structure
    const mainElement = page.locator('main, [role="main"]');
    expect(mainElement).toBeVisible();

    const headingStructure = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const levels = Array.from(headings).map((h) => parseInt(h.tagName.charAt(1)));

      // Check if heading levels are properly nested
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i - 1] > 1) {
          return false; // Skip levels detected
        }
      }
      return true;
    });

    expect(headingStructure).toBe(true);
  });

  test('Mobile accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const results = await runAccessibilityTest(page, 'Mobile accessibility');

    checkCriticalViolations(results);
    expect(results.violations).toHaveLength(0);

    // Test touch target sizes
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // Ensure touch targets are at least 44x44 pixels
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('Error handling accessibility', async ({ page }) => {
    // Test error message accessibility
    const results = await runAccessibilityTest(page, 'Error handling');

    // Check for proper error message association
    const errorViolations = results.violations.filter(
      (v: { id: string }) => v.id.includes('error') || v.id.includes('alert')
    );

    expect(errorViolations).toHaveLength(0);
  });
});

// Performance accessibility testing
test.describe('Performance Accessibility', () => {
  test('Page load time should not impact accessibility', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds for accessibility
    expect(loadTime).toBeLessThan(3000);

    const results = await runAccessibilityTest(page, 'Performance accessibility');
    expect(results.violations).toHaveLength(0);
  });
});

// Cross-browser accessibility testing
test.describe('Cross-Browser Accessibility', () => {
  test('Accessibility should work across different browsers', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityTest(page, `${browserName} accessibility`);

    // All browsers should pass accessibility tests
    expect(results.violations).toHaveLength(0);

    // Log browser-specific results
    console.log(`${browserName}: ${results.passes.length} accessibility checks passed`);
  });
});
