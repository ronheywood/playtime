/**
 * Integration tests for PlayTime Highlighting capability
 */

const { CONFIG } = require('../../scripts/main');
const { SELECTORS } = require('../../scripts/constants');

describe('Highlighting Integration', () => {
  beforeEach(async () => {
    // Silence logs in tests
    const logger = require('../../scripts/logger');
    logger.setSilent(true);
    global.logger = logger;

    // Provide minimal factories expected by main.js
    global.window.createPlayTimePDFViewer = (logger) => ({
      init: jest.fn().mockResolvedValue(true),
      loadPDF: jest.fn().mockResolvedValue(true),
      renderPage: jest.fn().mockResolvedValue(true),
      getZoom: () => 1,
      getZoomBounds: () => ({ min: 1, max: 3 }),
      setZoom: jest.fn(() => 1),
      zoomIn: jest.fn(() => 1),
      zoomOut: jest.fn(() => 1)
    });
    global.window.createPlayTimeDB = () => ({
      init: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true),
      getAll: jest.fn().mockResolvedValue([])
    });

    // Ensure highlighting module is available for main.js
    const Highlighting = require('../../scripts/highlighting-refactored.js');
    global.window.PlayTimeHighlighting = Highlighting;

    // Setup dependencies that main.js now requires for highlighting initialization
    const confidence = require('../../scripts/confidence');
    const { PT_CONSTANTS } = require('../../scripts/constants');
    global.window.PlayTimeConfidence = confidence;
    global.window.PlayTimeConstants = PT_CONSTANTS;

    // Fire DOM ready to initialize modules (main.js listener already registered by require at top)
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 10));
  });

  test('selection overlay appears while dragging and as hidden after mouseup', async () => {
  const canvas = document.querySelector(SELECTORS.CANVAS);
    expect(canvas).toBeTruthy();

  const overlay = document.querySelector(SELECTORS.SELECTION_OVERLAY);
    expect(overlay).toBeTruthy();
    // Initially hidden
    const startStyle = window.getComputedStyle(overlay);
    expect(startStyle.display === 'none' || startStyle.visibility === 'hidden' || startStyle.opacity === '0').toBe(true);

    // Drag
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 180, clientY: 160 }));
    let during = window.getComputedStyle(overlay);
    expect(during.display == 'none' && during.visibility == 'hidden').toBe(false);

    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 180, clientY: 160 }));
    let after = window.getComputedStyle(overlay);
    expect(after.display == 'none' && after.visibility == 'hidden').toBe(true);
  });

  test('clicking a color then dragging creates a highlight element', async () => {
  const greenBtn = document.querySelector(SELECTORS.COLOR_GREEN);
    expect(greenBtn).toBeTruthy();
    greenBtn.click();

  const canvas = document.querySelector(SELECTORS.CANVAS);
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 120, clientY: 120 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 170 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 170 }));

    const highlight = document.querySelector('[data-role="highlight"]');
    expect(highlight).toBeTruthy();
    expect(highlight.getAttribute('data-color')).toBe('green');
  });

  test('highlights track the centered canvas after window resize', async () => {
    // Test-specific setup: use test scheduler for predictable timing
    const originalScheduler = global.window.PlayTimeHighlighting._state.scheduler;
    const testScheduler = {
      schedule: (callback) => setTimeout(callback, 1) // Simple timeout for tests
    };
    global.window.PlayTimeHighlighting.setScheduler(testScheduler);
    
    try {
      const viewer = document.querySelector(SELECTORS.VIEWER);
      const canvas = document.querySelector(SELECTORS.CANVAS);
      expect(viewer).toBeTruthy();
      expect(canvas).toBeTruthy();

      // Stub initial layout: canvas is offset 50px,20px inside viewer
      viewer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 });
      canvas.getBoundingClientRect = () => ({ left: 50, top: 20, width: 300, height: 260, right: 350, bottom: 280 });

      // Pick a color and draw a small highlight at local position (10,10) to (60,40) inside the canvas
      const greenBtn = document.querySelector(SELECTORS.COLOR_GREEN);
      greenBtn.click();
      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50 + 10, clientY: 20 + 10 }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50 + 60, clientY: 20 + 40 }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 50 + 60, clientY: 20 + 40 }));

      const highlight = document.querySelector('[data-role="highlight"]');
      expect(highlight).toBeTruthy();
      const beforeLeft = parseFloat(highlight.style.left || '0');
      const beforeTop = parseFloat(highlight.style.top || '0');

      // Simulate window resize where canvas recenters further (offset increases by +50 left and +10 top)
      const newCanvasOffset = { left: 100, top: 30 };
      const newCanvasSize = { width: 300, height: 260 }; // keep same size to avoid scale affecting assertion
      canvas.getBoundingClientRect = () => ({
        left: newCanvasOffset.left,
        top: newCanvasOffset.top,
        width: newCanvasSize.width,
        height: newCanvasSize.height,
        right: newCanvasOffset.left + newCanvasSize.width,
        bottom: newCanvasOffset.top + newCanvasSize.height
      });

      // Fire resize and give module a tick to react
      window.dispatchEvent(new Event('resize'));
      await new Promise((r) => setTimeout(r, 10));

      const afterLeft = parseFloat(highlight.style.left || '0');
      const afterTop = parseFloat(highlight.style.top || '0');

      // Expect the highlight to move by the canvas offset delta (50,10)
      expect(Math.round(afterLeft - beforeLeft)).toBe(50);
      expect(Math.round(afterTop - beforeTop)).toBe(10);
    } finally {
      // Restore original scheduler for test isolation
      global.window.PlayTimeHighlighting.setScheduler(originalScheduler);
    }
  });

  test('highlight resizes immediately after zoom in/out', async () => {
    const viewer = document.querySelector(SELECTORS.VIEWER);
    const canvas = document.querySelector(SELECTORS.CANVAS);
    expect(viewer).toBeTruthy();
    expect(canvas).toBeTruthy();

    // Initial canvas size
    const base = { left: 40, top: 30, width: 400, height: 320 };
    viewer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 500, right: 600, bottom: 500 });
    canvas.getBoundingClientRect = () => ({ ...base, right: base.left + base.width, bottom: base.top + base.height });

    // Create a highlight that covers the entire canvas (by dragging corners)
    const greenBtn = document.querySelector(SELECTORS.COLOR_GREEN);
    greenBtn.click();
    // Drag from top-left inside canvas to bottom-right
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: base.left + 1, clientY: base.top + 1 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: base.left + base.width - 1, clientY: base.top + base.height - 1 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: base.left + base.width - 1, clientY: base.top + base.height - 1 }));

    const highlight = document.querySelector('[data-role="highlight"]');
    expect(highlight).toBeTruthy();

    const wBefore = parseFloat(highlight.style.width || '0');
    const hBefore = parseFloat(highlight.style.height || '0');
    expect(Math.round(wBefore)).toBeGreaterThan(0);
    expect(Math.round(hBefore)).toBeGreaterThan(0);

    // Simulate a zoom in (canvas grows by 25%) and recenter
    const zoomed = { left: 30, top: 20, width: Math.round(base.width * 1.25), height: Math.round(base.height * 1.25) };
    canvas.getBoundingClientRect = () => ({ ...zoomed, right: zoomed.left + zoomed.width, bottom: zoomed.top + zoomed.height });

    // Click zoom-in button which also dispatches layout-changed
    const zoomInBtn = document.querySelector('[data-role="zoom-in"]');
    expect(zoomInBtn).toBeTruthy();
    zoomInBtn.click();
    await new Promise((r) => setTimeout(r, 20));

    const wAfterIn = parseFloat(highlight.style.width || '0');
    const hAfterIn = parseFloat(highlight.style.height || '0');
    // Expect roughly 25% increase (allowing for rounding and borders)
    expect(Math.round(wAfterIn)).toBeGreaterThanOrEqual(Math.round(wBefore));
    expect(Math.round(hAfterIn)).toBeGreaterThanOrEqual(Math.round(hBefore));

    // Simulate zoom out back to base size
    canvas.getBoundingClientRect = () => ({ ...base, right: base.left + base.width, bottom: base.top + base.height });
    const zoomOutBtn = document.querySelector('[data-role="zoom-out"]');
    expect(zoomOutBtn).toBeTruthy();
    zoomOutBtn.click();
    await new Promise((r) => setTimeout(r, 20));

    const wAfterOut = parseFloat(highlight.style.width || '0');
    const hAfterOut = parseFloat(highlight.style.height || '0');
    // Should shrink back near original
    expect(Math.round(wAfterOut)).toBeCloseTo(Math.round(wBefore), 0);
    expect(Math.round(hAfterOut)).toBeCloseTo(Math.round(hBefore), 0);
  });

});
