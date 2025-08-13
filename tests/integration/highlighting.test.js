/**
 * Integration tests for PlayTime Highlighting capability
 */

const { CONFIG } = require('../../scripts/main');

describe('Highlighting Integration', () => {
  beforeEach(async () => {
    // Reset DOM
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    const fs = require('fs');
    const path = require('path');
    let htmlContent = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    htmlContent = htmlContent.replace(/<script[^>]*>.*?<\/script>/gis, '');
    htmlContent = htmlContent.replace(/<script[^>]*\/>/gis, '');

    const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (headMatch) document.head.innerHTML = headMatch[1];
    if (bodyMatch) document.body.innerHTML = bodyMatch[1];

    // Minimal stubs
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

    const logger = require('../../scripts/logger');
    logger.setSilent(true);
    global.logger = logger;

  // Ensure highlighting module is available for main.js
  const Highlighting = require('../../scripts/highlighting.js');
  global.window.PlayTimeHighlighting = Highlighting;

  const mainJsPath = require('path').join(__dirname, '../../scripts/main.js');
    const mainJsContent = require('fs').readFileSync(mainJsPath, 'utf8');
    eval(mainJsContent);

    // Initialize app
    const domContentLoadedEvent = new Event('DOMContentLoaded');
    document.dispatchEvent(domContentLoadedEvent);
    await new Promise((r) => setTimeout(r, 10));
  });

  test('clicking a color then dragging creates a highlight element', async () => {
    const greenBtn = document.querySelector('[data-role="color-green"]') || document.getElementById('color-green');
    expect(greenBtn).toBeTruthy();
    greenBtn.click();

    const canvas = document.querySelector('[data-role="pdf-canvas"]') || document.getElementById('pdf-canvas');
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 120, clientY: 120 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 170 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 170 }));

    const highlight = document.querySelector('[data-role="highlight"]');
    expect(highlight).toBeTruthy();
    expect(highlight.getAttribute('data-color')).toBe('green');
  });
  test('selection overlay appears while dragging and remains visible after mouseup', async () => {
    const canvas = document.querySelector('[data-role="pdf-canvas"]') || document.getElementById('pdf-canvas');
    expect(canvas).toBeTruthy();

    const overlay = document.querySelector('[data-role="selection-overlay"]');
    expect(overlay).toBeTruthy();
    // Initially hidden
    const startStyle = window.getComputedStyle(overlay);
    expect(startStyle.display === 'none' || startStyle.visibility === 'hidden' || startStyle.opacity === '0').toBe(true);

    // Drag
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 180, clientY: 160 }));
    let during = window.getComputedStyle(overlay);
    expect(during.display !== 'none' && during.visibility !== 'hidden').toBe(true);

    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 180, clientY: 160 }));
    let after = window.getComputedStyle(overlay);
    expect(after.display !== 'none' && after.visibility !== 'hidden').toBe(true);
  });

});
