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
    const Highlighting = require('../../scripts/highlighting.js');
    global.window.PlayTimeHighlighting = Highlighting;

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

});
