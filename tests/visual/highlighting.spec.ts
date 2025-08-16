import { test, expect } from '@playwright/test';

// Geometry constants for synthetic highlight (percentages relative to canvas)
const HIGHLIGHT_GEOMETRY = { xPct: 0.4, yPct: 0.3, wPct: 0.2, hPct: 0.2 };

async function gotoWithSeed(page) {

  await page.goto('/?theme=light', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app');

  // Wait until highlighting module initialized enough (viewer + canvas discovered)
  await page.waitForFunction(() => {
    const h = (window as any).PlayTimeHighlighting;
    return h && h._state && h._state.viewer && h._state.canvas;
  });

  // Synthesize a highlight directly using module API (bypasses persistence) for deterministic visual check
  await page.evaluate((geom) => {
    const hMod = (window as any).PlayTimeHighlighting;
    if (!hMod || !hMod._state || !hMod._state.canvas) return;
    const canvas = hMod._state.canvas as HTMLCanvasElement;
    const viewer = hMod._state.viewer as HTMLElement;
    const rect = { left: geom.xPct, top: geom.yPct, width: geom.wPct, height: geom.hPct };
    // Use HighlightElement factory
    const HE = (window as any).HighlightElement;
    const mapper = (window as any).CoordinateMapper || (window as any).CoordinateMapperClass;
  // Use real bounding rect + offset so positioning matches runtime behavior (canvas is centered)
  const vRect = viewer.getBoundingClientRect();
  const cRect = canvas.getBoundingClientRect();
  const canvasRect = { width: cRect.width || canvas.width || 800, height: cRect.height || canvas.height || 600 } as any;
  const offsetLeft = cRect.left - vRect.left;
  const offsetTop = cRect.top - vRect.top;
    const elObj = HE.fromDatabaseRecord({
      id: 1,
      pdfId: 'synthetic',
      page: 1,
      confidence: 2,
      color: 'green',
      xPct: geom.xPct, yPct: geom.yPct, wPct: geom.wPct, hPct: geom.hPct
    });
  const dom = elObj.createDOMElement(canvasRect, offsetLeft, offsetTop, {
      highlightClass: 'highlight',
      colorStyles: {
        green: { border: '2px solid rgba(0,128,0,0.6)', background: 'rgba(0,128,0,0.15)' },
        amber: { border: '2px solid rgba(255,165,0,0.6)', background: 'rgba(255,165,0,0.15)' },
        red: { border: '2px solid rgba(255,0,0,0.6)', background: 'rgba(255,0,0,0.15)' }
      },
      enableFocus: true
    });
  // Add focus mode event handlers (mirroring module behavior)
  dom.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); hMod.focusOnHighlight(dom); });
  dom.addEventListener('keydown', (e:KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); hMod.focusOnHighlight(dom); }});
    viewer.appendChild(dom);
  }, HIGHLIGHT_GEOMETRY);

  // Ensure highlight present
  await page.waitForFunction(() => document.querySelectorAll('[data-role="highlight"]').length === 1);
  // Allow any scheduled reposition frames
  await page.waitForTimeout(150);
}

test.describe('Highlighting Visual (rehydration + focus + resize)', () => {
  test('desktop light - seeded highlight snapshot', async ({ page }) => {
    await gotoWithSeed(page);
    // Assert attributes present
    const hl = page.locator('[data-role="highlight"]');
    await expect(hl).toHaveAttribute('data-color', 'green');
    // Assert highlight overlaps canvas region
    const overlap = await page.evaluate(() => {
      const hl = document.querySelector('[data-role="highlight"]') as HTMLElement | null;
      const canvas = document.querySelector('[data-role="pdf-canvas"]') as HTMLElement | null;
      if (!hl || !canvas) return false;
      const hR = hl.getBoundingClientRect();
      const cR = canvas.getBoundingClientRect();
      return hR.left >= cR.left && hR.top >= cR.top && hR.right <= cR.right + 1 && hR.bottom <= cR.bottom + 1; // allow 1px rounding
    });
    expect(overlap).toBeTruthy();
    await expect(page).toHaveScreenshot('highlighting-light.png', {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
    });
  });

  test('desktop light - drag created highlight snapshot', async ({ page }) => {
    await page.goto('/?theme=light', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#app');
    // Wait for highlighting init
    await page.waitForFunction(() => (window as any).PlayTimeHighlighting && (window as any).PlayTimeHighlighting._state?.canvas);
    // Activate green confidence (simulate user click)
    await page.click('[data-role="color-green"]');
    // Draw highlight via mouse drag inside canvas
  const canvasEl = await page.locator('[data-role="pdf-canvas"]').elementHandle();
  if (!canvasEl) throw new Error('Canvas element not found');
  const box = await canvasEl.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');
    const startX = box.x + box.width * 0.35;
    const startY = box.y + box.height * 0.25;
    const endX = startX + box.width * 0.18;
    const endY = startY + box.height * 0.15;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();
    // Wait for highlight element
    await page.waitForFunction(() => document.querySelectorAll('[data-role="highlight"]').length === 1);
    const hlCount = await page.locator('[data-role="highlight"]').count();
    expect(hlCount).toBe(1);
    await expect(page).toHaveScreenshot('highlighting-light-drag.png', {
      maxDiffPixelRatio: 0.003,
      animations: 'disabled',
    });
  });

  test('focus mode zoom + resize keeps highlight count', async ({ page }) => {
    await gotoWithSeed(page);

    // Capture initial position
    const hl = page.locator('[data-role="highlight"]');
    const before = await hl.boundingBox();
    expect(before).toBeTruthy();

    // Click to trigger focus (zoom) mode
    await hl.click();
    // Wait for transform animation
    await page.waitForTimeout(350);

    // Canvas should have a transform with scale
    const hasScale = await page.evaluate(() => {
      const canvas = document.querySelector('[data-role="pdf-canvas"]') as HTMLElement | null;
      return !!canvas && /scale\(/.test(canvas.style.transform);
    });
    expect(hasScale).toBeTruthy();

    // Viewer should have focus-mode class
    await expect(page.locator('[data-role="pdf-viewer"]')).toHaveClass(/focus-mode/);

    // Resize window to trigger layout recalculation
    await page.setViewportSize({ width: 1100, height: 780 });
    await page.waitForTimeout(120); // allow resize listener + reposition

    // Still exactly one highlight
    const count = await page.evaluate(() => document.querySelectorAll('[data-role="highlight"]').length);
    expect(count).toBe(1);

    // Exit focus mode via API and ensure transform cleared
    await page.evaluate(() => { (window as any).PlayTimeHighlighting.exitFocusMode(); });
    await page.waitForTimeout(100);
    const transformCleared = await page.evaluate(() => {
      const canvas = document.querySelector('[data-role="pdf-canvas"]') as HTMLElement | null;
      return !!canvas && (canvas.style.transform === '' || canvas.style.transform === 'none');
    });
    expect(transformCleared).toBeTruthy();
  });
});
