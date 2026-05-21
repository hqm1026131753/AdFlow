const { chromium } = require('/Users/edy/.npm-global/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const OUT = '/Users/edy/Desktop/agent/Claude/AI画布';

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Hide minimap to prevent click interception
  await page.addStyleTag({ content: '.react-flow__minimap { display: none !important; }' });

  // Find Ad Scout in the node library (left panel)
  const scoutText = page.locator('text=Ad Scout').first();
  if (!(await scoutText.isVisible())) {
    console.log('Ad Scout not visible, taking generic screenshot');
    await page.screenshot({ path: `${OUT}/08-current-state.png` });
    await browser.close();
    process.exit(0);
  }

  const box = await scoutText.boundingBox();
  // Drag from node library to canvas center
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(1500);

  // Click the node to open config panel
  const node = page.locator('.react-flow__node').first();
  if (await node.isVisible()) {
    await node.click();
    await page.waitForTimeout(600);
  }

  // Fill keywords
  const textarea = page.locator('textarea[placeholder*="关键词"]');
  if (await textarea.isVisible()) {
    await textarea.fill('beauty skincare product');
    await page.waitForTimeout(300);
  }

  // Click Scout (force through minimap overlay)
  const scoutBtn = page.locator('button:has-text("Scout")');
  if (await scoutBtn.isVisible()) {
    await scoutBtn.click({ force: true });
    console.log('Searching... waiting for results');
  }

  // Wait for API response and node generation
  await page.waitForTimeout(18000);

  // Take screenshot
  await page.screenshot({ path: `${OUT}/08-ad-scout-stock-results.png` });
  console.log('Saved: 08-ad-scout-stock-results.png');

  await browser.close();
})();
