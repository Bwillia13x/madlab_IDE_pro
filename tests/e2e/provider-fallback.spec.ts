import { test, expect } from '@playwright/test';

test.describe('Provider switch with mock fallback', () => {
  test('switches to Alpha Vantage with fake key and falls back to mock', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open Settings from Activity Bar
    await page.getByLabel('Settings').click();
    await expect(page.getByText('Data Provider Configuration')).toBeVisible();

    // Open provider select and choose Alpha Vantage
    const selectTrigger = page.locator('div:has-text("Select Data Provider")').locator('..').locator('[role="combobox"]');
    await selectTrigger.click();
    await page.getByRole('option', { name: 'Alpha Vantage' }).click();

    // Enter a fake API key and save
    await page.getByPlaceholder('Enter your API key').fill('fake-key-for-tests');
    await page.getByRole('button', { name: 'Save Configuration' }).click();

    // Success toast from settings action
    await expect(page.getByText('Switched to alpha-vantage')).toBeVisible({ timeout: 5000 });

    // Intercept Alpha Vantage calls to force invalid key error shape
    await page.route('**alphavantage.co/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 'Error Message': 'Invalid API key. (demo for tests)' }),
      });
    });

    // Reload so the new provider is used for initial data fetches
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate to the Charting sheet to trigger price fetches
    await page.getByText('Charting & Graphing', { exact: true }).click();

    // Expect a fallback toast due to auth issue
    await expect(page.getByText('Using mock data due to provider authentication issue.')).toBeVisible({ timeout: 15000 });

    // And the line chart should still render (from mock data)
    const linePath = page.locator('svg .recharts-line-curve').first();
    await expect(linePath).toBeVisible({ timeout: 15000 });
    const dAttr = await linePath.getAttribute('d');
    expect(dAttr && dAttr.length).toBeGreaterThan(20);
  });
});

