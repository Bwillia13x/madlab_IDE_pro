import { test, expect } from '@playwright/test';

test.describe('MAD LAB Workbench', () => {
  test('should render the main interface', async ({ page }) => {
    await page.goto('/');
    
    // Check that the title bar is present
    await expect(page.locator('text=MAD LAB - Agent-Programmable Workbench')).toBeVisible();
    
    // Check that the activity bar is present
    await expect(page.locator('[data-testid="activity-bar"]')).toBeVisible();
    
    // Check that the explorer panel is present
    await expect(page.locator('text=EXPLORER')).toBeVisible();
    
    // Check that the welcome message is shown when no sheets are open
    await expect(page.locator('text=Welcome to MAD LAB')).toBeVisible();
  });

  test('layout persists after dragging a tile', async ({ page }) => {
    await page.goto('/');

    // Add "Valuation Workbench" sheet via "+"
    await page.click('[data-testid="add-sheet-button"]');
    await page.getByText('Valuation Workbench').click();

    // Expect 4 tiles
    const items = page.locator('.react-grid-item');
    await expect(items).toHaveCount(4);

    // Pick first tile and read its initial transform
    const firstItem = items.first();
    const readTransform = async () =>
      await firstItem.evaluate((el) => (el as HTMLElement).style.transform || '');

    const before = await readTransform();

    // Drag using the header drag handle
    const handle = firstItem.locator('.drag-handle');
    const box = await handle.boundingBox();
    if (!box) throw new Error('Drag handle bounding box not found');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 0, { steps: 10 });
    await page.mouse.up();

    // Wait for transform to change
    await expect.poll(readTransform).not.toBe(before);

    // Reload and verify persisted layout
    await page.reload();
    const itemsAfter = page.locator('.react-grid-item').first();
    const afterReload = await itemsAfter.evaluate(
      (el) => (el as HTMLElement).style.transform || ''
    );
    expect(afterReload).not.toBe(before);
  });
  test('should create a new sheet from preset', async ({ page }) => {
    await page.goto('/');
    
    // Click the "+" button to open preset picker
    await page.click('[data-testid="add-sheet-button"]');
    
    // Click on the "Valuation Workbench" preset
    await page.click('text=Valuation Workbench');
    
    // Check that a new sheet tab was created
    await expect(page.locator('text=Valuation Workbench')).toBeVisible();
    
    // Check that widgets were added to the sheet
    await expect(page.locator('text=KPI')).toBeVisible();
    await expect(page.locator('text=DCF (Basic)')).toBeVisible();
    await expect(page.locator('text=Peer Multiples')).toBeVisible();
    await expect(page.locator('text=Sensitivity (WACC x g)')).toBeVisible();
  });

  test('should open and interact with agent chat', async ({ page }) => {
    await page.goto('/');
    
    // Check that the agent chat panel is visible by default
    await expect(page.locator('text=AGENT CHAT')).toBeVisible();
    
    // Type a message in the chat input
    await page.fill('input[placeholder="Ask me about your analysis..."]', 'Hello, agent!');
    
    // Send the message
    await page.click('button[aria-label="Send message"]');
    
    // Check that the user message appears
    await expect(page.locator('text=Hello, agent!')).toBeVisible();
  });

  test('should toggle explorer panel', async ({ page }) => {
    await page.goto('/');
    
    // Check that explorer is visible initially
    await expect(page.locator('text=EXPLORER')).toBeVisible();
    
    // Click the explorer button in the activity bar to toggle it
    await page.click('[aria-label="Explorer"]');
    
    // Check that explorer is now hidden
    await expect(page.locator('text=EXPLORER')).not.toBeVisible();
    
    // Click again to show it
    await page.click('[aria-label="Explorer"]');
    
    // Check that explorer is visible again
    await expect(page.locator('text=EXPLORER')).toBeVisible();
  });

  test('should interact with bottom panel tabs', async ({ page }) => {
    await page.goto('/');
    
    // Check that the Output tab is active by default
    await expect(page.locator('[data-state="active"]:text("Output")')).toBeVisible();
    
    // Click on the Problems tab
    await page.click('text=Problems');
    
    // Check that Problems tab is now active
    await expect(page.locator('[data-state="active"]:text("Problems")')).toBeVisible();
    
    // Click on the Terminal tab
    await page.click('text=Terminal');
    
    // Check that Terminal tab is now active
    await expect(page.locator('[data-state="active"]:text("Terminal")')).toBeVisible();
  });
});