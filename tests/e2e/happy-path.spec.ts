import { test, expect } from '@playwright/test';

test.describe('Happy Path: Provider + Chart Render', () => {
  test('opens settings, sees providers, renders chart on Charting sheet', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // allow initial React paint

    // Open Settings from Activity Bar
    await page.getByLabel('Settings').click();

    // Verify Data Provider Configuration UI shows Alpha Vantage option
    await expect(page.getByText('Data Provider Configuration')).toBeVisible();

    // Open the provider select and check options
    const selectTrigger = page.locator('div:has-text("Select Data Provider")').locator('..').locator('[role="combobox"]');
    await selectTrigger.click();
    await expect(page.getByRole('option')).toContainText(['Mock Data', 'Alpha Vantage']);

    // Close Settings via Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Switch to the Charting sheet
    await page.getByText('Charting & Graphing', { exact: true }).click();

    // Wait for a Recharts line chart path to appear
    const linePath = page.locator('svg .recharts-line-curve').first();
    await expect(linePath).toBeVisible({ timeout: 15000 });

    // Sanity-check the path data attribute has content
    const dAttr = await linePath.getAttribute('d');
    expect(dAttr && dAttr.length).toBeGreaterThan(20);
  });
});

