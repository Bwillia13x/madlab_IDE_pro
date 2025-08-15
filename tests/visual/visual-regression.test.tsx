import { test, expect } from '@playwright/test';

// Visual regression testing configuration
const visualConfig = {
  threshold: 0.1, // 10% difference threshold
  maxDiffPixels: 100, // Maximum allowed pixel differences
  maxDiffRatio: 0.1, // Maximum allowed difference ratio
};

// Test scenarios for visual regression testing
const testScenarios = [
  {
    name: 'Main Dashboard',
    path: '/',
    viewport: { width: 1920, height: 1080 },
    waitFor: '[data-testid="workspace-root"]',
  },
  {
    name: 'Workspace View',
    path: '/workspace',
    viewport: { width: 1920, height: 1080 },
    waitFor: '[data-testid="grid-canvas"]',
  },
  {
    name: 'Mobile Dashboard',
    path: '/',
    viewport: { width: 375, height: 667 },
    waitFor: '[data-testid="workspace-root"]',
  },
  {
    name: 'Tablet Dashboard',
    path: '/',
    viewport: { width: 768, height: 1024 },
    waitFor: '[data-testid="workspace-root"]',
  },
];

// Theme variations for testing
const themes = ['light', 'dark'] as const;

test.describe('Visual Regression Testing', () => {
  for (const scenario of testScenarios) {
    for (const theme of themes) {
      test(`${scenario.name} - ${theme} theme`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize(scenario.viewport);

        // Navigate to page
        await page.goto(`http://localhost:3000${scenario.path}`);

        // Wait for content to load
        await page.waitForSelector(scenario.waitFor);

        // Set theme
        await page.evaluate((themeName) => {
          document.documentElement.setAttribute('data-theme', themeName);
          document.documentElement.className = themeName;
        }, theme);

        // Wait for theme to apply
        await page.waitForTimeout(500);

        // Take screenshot
        const screenshot = await page.screenshot({
          fullPage: true,
          animations: 'disabled',
        });

        // Compare with baseline
        await expect(screenshot).toMatchSnapshot(
          `${scenario.name.toLowerCase().replace(/\s+/g, '-')}-${theme}-${scenario.viewport.width}x${scenario.viewport.height}.png`
        );
      });
    }
  }
});

test.describe('Component Visual Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="workspace-root"]');
  });

  test('Widget tiles should render consistently', async ({ page }) => {
    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Add a widget
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');

    // Wait for widget to render
    await page.waitForSelector('[data-testid="widget-tile"]');

    // Take screenshot of widget area
    const widgetArea = page.locator('[data-testid="grid-canvas"]');
    const screenshot = await widgetArea.screenshot();

    await expect(screenshot).toMatchSnapshot('widget-tiles-default.png');
  });

  test('Theme switching should maintain visual consistency', async ({ page }) => {
    // Test light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.className = 'light';
    });
    await page.waitForTimeout(500);

    const lightScreenshot = await page.screenshot({ fullPage: true });
    await expect(lightScreenshot).toMatchSnapshot('theme-light.png');

    // Test dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.className = 'dark';
    });
    await page.waitForTimeout(500);

    const darkScreenshot = await page.screenshot({ fullPage: true });
    await expect(darkScreenshot).toMatchSnapshot('theme-dark.png');
  });

  test('Widget selection states should be visually distinct', async ({ page }) => {
    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Add a widget
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');

    // Wait for widget to render
    await page.waitForSelector('[data-testid="widget-tile"]');

    // Take screenshot of unselected state
    const widgetArea = page.locator('[data-testid="grid-canvas"]');
    const unselectedScreenshot = await widgetArea.screenshot();
    await expect(unselectedScreenshot).toMatchSnapshot('widget-unselected.png');

    // Select widget
    await page.click('[data-testid="widget-tile"]');
    await page.waitForTimeout(100);

    // Take screenshot of selected state
    const selectedScreenshot = await widgetArea.screenshot();
    await expect(selectedScreenshot).toMatchSnapshot('widget-selected.png');
  });

  test('Responsive design should work across breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1366, height: 768, name: 'laptop' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' },
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize(breakpoint);
      await page.waitForTimeout(500);

      const screenshot = await page.screenshot({ fullPage: true });
      await expect(screenshot).toMatchSnapshot(`responsive-${breakpoint.name}.png`);
    }
  });
});

test.describe('Interactive Element Testing', () => {
  test('Button states should be visually distinct', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Find buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);

      // Default state
      const defaultScreenshot = await button.screenshot();
      await expect(defaultScreenshot).toMatchSnapshot(`button-${i}-default.png`);

      // Hover state
      await button.hover();
      await page.waitForTimeout(100);
      const hoverScreenshot = await button.screenshot();
      await expect(hoverScreenshot).toMatchSnapshot(`button-${i}-hover.png`);

      // Focus state
      await button.focus();
      await page.waitForTimeout(100);
      const focusScreenshot = await button.screenshot();
      await expect(focusScreenshot).toMatchSnapshot(`button-${i}-focus.png`);
    }
  });

  test('Form inputs should have consistent styling', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Navigate to workspace to find form inputs
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Add a widget to trigger configuration
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');

    // Wait for widget and click to open inspector
    await page.waitForSelector('[data-testid="widget-tile"]');
    await page.click('[data-testid="widget-tile"]');
    await page.keyboard.press('Control+i');

    // Wait for inspector
    await page.waitForSelector('[data-testid="inspector"]');

    // Test input styling
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = inputs.nth(i);

      // Default state
      const defaultScreenshot = await input.screenshot();
      await expect(defaultScreenshot).toMatchSnapshot(`input-${i}-default.png`);

      // Focus state
      await input.focus();
      await page.waitForTimeout(100);
      const focusScreenshot = await input.screenshot();
      await expect(focusScreenshot).toMatchSnapshot(`input-${i}-focus.png`);
    }
  });
});

test.describe('Animation and Transition Testing', () => {
  test('Widget animations should be smooth', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Add widget
    await page.click('[data-testid="add-widget-button"]');
    await page.click('[data-testid="widget-type-line-chart"]');

    // Wait for animation to complete
    await page.waitForTimeout(1000);

    // Verify final state
    const widget = page.locator('[data-testid="widget-tile"]');
    expect(widget).toBeVisible();
  });

  test('Theme transitions should be smooth', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Switch themes rapidly
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Alt+1'); // Light
      await page.waitForTimeout(200);
      await page.keyboard.press('Alt+2'); // Dark
      await page.waitForTimeout(200);
    }

    await page.waitForTimeout(500);

    // Verify final theme
    const bodyClass = await page.evaluate(() => document.body.className);
    expect(bodyClass).toContain('dark');
  });
});

// Performance visual testing
test.describe('Performance Visual Testing', () => {
  test('Large datasets should render without visual degradation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"]');
    await page.waitForSelector('[data-testid="grid-canvas"]');

    // Add multiple widgets to test performance
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="add-widget-button"]');
      await page.click('[data-testid="widget-type-line-chart"]');
      await page.waitForTimeout(200);
    }

    // Wait for all widgets to render
    await page.waitForTimeout(1000);

    // Take screenshot and verify quality
    const screenshot = await page.screenshot({ fullPage: true });
    await expect(screenshot).toMatchSnapshot('multiple-widgets-performance.png');

    // Verify all widgets are visible
    const widgets = page.locator('[data-testid="widget-tile"]');
    const widgetCount = await widgets.count();
    expect(widgetCount).toBeGreaterThanOrEqual(5);
  });
});
