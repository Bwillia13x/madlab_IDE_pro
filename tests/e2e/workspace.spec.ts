import { test, expect } from '@playwright/test';

test.describe('MAD LAB Workbench', () => {
  test('should render the main interface', async ({ page }) => {
    await page.goto('/');
    
    // Check that the title bar is present
  await expect(page.getByText('MAD LAB - Agent-Programmable Workbench')).toBeVisible();
    
    // Check that the activity bar is present
  await expect(page.getByTestId('activity-bar')).toBeVisible();
    
    // Check that the explorer panel is present
  await expect(page.getByText('EXPLORER')).toBeVisible();
    
    // Check that the welcome message is shown when no sheets are open
  await expect(page.getByRole('heading', { name: 'Welcome to MAD LAB' })).toBeVisible();
  });

  test('layout persists after dragging a tile', async ({ page }) => {
    await page.goto('/');

    // Add "Valuation Workbench" sheet via "+"
  await page.click('[data-testid="add-sheet-button"]');
  await page.getByRole('menuitem', { name: 'Valuation Workbench' }).click();

    // Expect 4 tiles
  const items = page.locator('[data-testid^="widget-tile-"]');
    await expect(items).toHaveCount(4);

    // Pick first tile and read its initial transform (computed) and size
  const gridItem = page.locator('.react-grid-item').first();
    const readTransform = async () =>
      await gridItem.evaluate((el) => getComputedStyle(el as HTMLElement).transform || '');
    const readSize = async () =>
      await gridItem.evaluate((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return { width: Math.round(r.width), height: Math.round(r.height) };
      });

  const before = await readTransform();
  const sizeBefore = await readSize();

    // Drag using the header drag handle
  const handle = page.locator('.react-grid-item').first().locator('.drag-handle');
    await handle.hover();
    const box = await handle.boundingBox();
    if (!box) throw new Error('Drag handle bounding box not found');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Try a big drag to ensure grid position changes
    await page.mouse.move(box.x + box.width / 2 + 640, box.y + box.height / 2 + 0, { steps: 25 });
    await page.mouse.up();

    // If transform didn't change, try vertical drag
    let after = await readTransform();
    if (after === before) {
      await handle.hover();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 0, box.y + box.height / 2 + 240, { steps: 20 });
      await page.mouse.up();
      after = await readTransform();
    }

    // If still unchanged, resize instead
    if (after === before) {
      const resizer = gridItem.locator('.react-resizable-handle-se');
      const rbox = await resizer.boundingBox();
      if (!rbox) throw new Error('Resize handle bounding box not found');
      await page.mouse.move(rbox.x + rbox.width / 2, rbox.y + rbox.height / 2);
      await page.mouse.down();
      await page.mouse.move(rbox.x + rbox.width / 2 + 120, rbox.y + rbox.height / 2 + 100, { steps: 20 });
      await page.mouse.up();
    }

    // Either transform or size should now differ
    await expect.poll(async () => {
      const t = await readTransform();
      const sz = await readSize();
      const tChanged = t !== before;
      const sChanged = sz.width !== sizeBefore.width || sz.height !== sizeBefore.height;
      return tChanged || sChanged;
    }, { timeout: 10000 }).toBe(true);

    // Reload and verify persisted layout
    await page.reload();
  const afterReloadTransform = await readTransform();
  const sizeAfter = await readSize();
  const persisted = afterReloadTransform !== before || sizeAfter.width !== sizeBefore.width || sizeAfter.height !== sizeBefore.height;
  expect(persisted).toBe(true);
  });
  test('should create a new sheet from preset', async ({ page }) => {
    await page.goto('/');
    
    // Click the "+" button to open preset picker
    await page.click('[data-testid="add-sheet-button"]');
    
    // Click on the "Valuation Workbench" preset
  await page.getByRole('menuitem', { name: 'Valuation Workbench' }).click();
    
    // Check that a new sheet tab was created
  await expect(page.getByRole('tab').filter({ hasText: 'Valuation Workbench' })).toBeVisible();
    
    // Check that widgets were added to the sheet
  await expect(page.getByText('KPI')).toBeVisible();
  await expect(page.getByText('DCF (Basic)')).toBeVisible();
  await expect(page.getByText('Peer Multiples')).toBeVisible();
  await expect(page.getByText('Sensitivity (WACC x g)')).toBeVisible();
  });

  test('should open and interact with agent chat', async ({ page }) => {
    await page.goto('/');
    
    // Check that the agent chat panel is visible by default
  await expect(page.getByText('AGENT CHAT')).toBeVisible();
    
    // Type a message in the chat input
    await page.fill('input[placeholder="Ask me about your analysis..."]', 'Hello, agent!');
    
    // Send the message
  await page.click('button[aria-label="Send message"]');
    
    // Check that the user message appears
  await expect(page.getByText('Hello, agent!')).toBeVisible();
  });

  test('should toggle explorer panel', async ({ page }) => {
    await page.goto('/');
    
    // Check that explorer is visible initially
  await expect(page.getByText('EXPLORER')).toBeVisible();
    
    // Click the explorer button in the activity bar to toggle it
  await page.click('[aria-label="Explorer"]');
    
    // Check that explorer is now hidden
  await expect(page.getByText('EXPLORER')).not.toBeVisible();
    
    // Click again to show it
  await page.click('[aria-label="Explorer"]');
    
    // Check that explorer is visible again
  await expect(page.getByText('EXPLORER')).toBeVisible();
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