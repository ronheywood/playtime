import { test, expect } from '@playwright/test';

// Geometry constants for synthetic highlight (percentages relative to canvas)
const HIGHLIGHT_GEOMETRY = { xPct: 0.4, yPct: 0.3, wPct: 0.2, hPct: 0.2 };

async function gotoWithSeed(page) {

  await page.goto('/?theme=light', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app');

  // First, wait for dependencies to be loaded
  await page.waitForFunction(() => {
    return (window as any).PlayTimeConfidence && 
           (window as any).PlayTimeConstants && 
           (window as any).HighlightElement;
  }, { timeout: 5000 });

  // Wait until highlighting module initialized enough (viewer + canvas discovered)
  await page.waitForFunction(() => {
    const h = (window as any).PlayTimeHighlighting;
    const isReady = h && h._state && h._state.viewer && h._state.canvas && h._state.initialized;
    if (!isReady) {
      console.log('Waiting for highlighting module:', {
        hasModule: !!h,
        hasState: h && !!h._state,
        hasViewer: h && h._state && !!h._state.viewer,
        hasCanvas: h && h._state && !!h._state.canvas,
        isInitialized: h && h._state && !!h._state.initialized
      });
    }
    return isReady;
  }, { timeout: 10000 });

  // Wait for full highlighting module initialization including layout command handler registration
  try {
    await page.waitForFunction(() => {
      const h = (window as any).PlayTimeHighlighting;
      const lc = (window as any).PlayTimeLayoutCommands;
      const isReady = h && h._state && h._state.initialized && lc && typeof lc.changeLayout === 'function';
      if (!isReady) {
        console.log('Waiting for layout commands:', {
          hasHighlighting: !!h,
          highlightingInitialized: h && h._state && !!h._state.initialized,
          hasLayoutCommands: !!lc,
          hasChangeLayout: lc && typeof lc.changeLayout === 'function'
        });
      }
      return isReady;
    }, { timeout: 5000 });
  } catch (e) {
    // If timeout, check what's available and proceed anyway
    const debugInfo = await page.evaluate(() => {
      const h = (window as any).PlayTimeHighlighting;
      const lc = (window as any).PlayTimeLayoutCommands;
      return {
        highlighting: !!h,
        initialized: h && h._state ? h._state.initialized : false,
        layoutCommands: !!lc,
        changeLayout: lc && typeof lc.changeLayout === 'function'
      };
    });
    console.warn('Module initialization timeout:', debugInfo);
  }

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
      maxDiffPixelRatio: 0.02, // Increased tolerance for CI rendering differences
      animations: 'disabled',
    });
  });

  test('desktop light - drag created highlight snapshot', async ({ page }) => {
    await page.goto('/?theme=light', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#app');
    // Wait for highlighting init
    await page.waitForFunction(() => (window as any).PlayTimeHighlighting && (window as any).PlayTimeHighlighting._state?.canvas);
    
    // Activate highlighting mode first
    await page.click('#highlighting-toggle');
    await page.waitForSelector('#confidence-panel', { state: 'visible' });
    
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
      maxDiffPixelRatio: 0.02, // Increased tolerance for CI rendering differences  
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
    // Wait for focus mode to complete
    await page.waitForTimeout(350);

    // Verify focus mode is active (modern behavior uses PDF viewer zoom, not CSS transforms)
    const focusModeStatus = await page.evaluate(() => {
      const canvas = document.querySelector('[data-role="pdf-canvas"]') as HTMLElement | null;
      const viewer = document.querySelector('[data-role="pdf-viewer"]') as HTMLElement | null;
      const pdfViewer = (window as any).PlayTimePDFViewer;
      
      return {
        canvasHasFocusAttribute: canvas?.getAttribute('data-focus-mode') === 'active',
        viewerHasFocusClass: viewer?.classList.contains('focus-mode') === true,
        zoomLevel: pdfViewer ? pdfViewer.getZoom() : null,
        zoomGreaterThan1: pdfViewer ? pdfViewer.getZoom() > 1 : false
      };
    });
    
    // Modern behavior: Canvas should have data-focus-mode="active" attribute (not CSS transform)
    expect(focusModeStatus.canvasHasFocusAttribute).toBeTruthy();
    
    // Viewer should have focus-mode class
    expect(focusModeStatus.viewerHasFocusClass).toBeTruthy();

    // Viewer should have focus-mode class
    await expect(page.locator('[data-role="pdf-viewer"]')).toHaveClass(/focus-mode/);

    // Resize window to trigger layout recalculation
    await page.setViewportSize({ width: 1100, height: 780 });
    await page.waitForTimeout(120); // allow resize listener + reposition

    // Still exactly one highlight
    const count = await page.evaluate(() => document.querySelectorAll('[data-role="highlight"]').length);
    expect(count).toBe(1);

    // Exit focus mode via API and ensure focus mode is cleared
    await page.evaluate(() => { (window as any).PlayTimeHighlighting.exitFocusMode(); });
    await page.waitForTimeout(100);
    const focusModeExited = await page.evaluate(() => {
      const canvas = document.querySelector('[data-role="pdf-canvas"]') as HTMLElement | null;
      const viewer = document.querySelector('[data-role="pdf-viewer"]') as HTMLElement | null;
      return {
        canvasNoFocusAttribute: canvas?.getAttribute('data-focus-mode') !== 'active',
        viewerNoFocusClass: !viewer?.classList.contains('focus-mode')
      };
    });
    expect(focusModeExited.canvasNoFocusAttribute).toBeTruthy();
    expect(focusModeExited.viewerNoFocusClass).toBeTruthy();
  });
});
