/**
 * Integration test: highlights are associated with a page and hidden when navigating away.
 */

const { PT_CONSTANTS } = require('../../../scripts/constants.js');

describe('Highlighting Page Visibility Integration', () => {
  beforeEach(async () => {
    // Silence logs
    const logger = require('../../../scripts/logger.js');
    logger.setSilent(true);
    global.logger = logger;
    // Ensure window.logger is also set for main.js
    global.window.logger = logger;

    // Provide PDF viewer stub with paging + events
    global.window.createPlayTimePDFViewer = (logger) => {
      let currentPage = 1;
      const totalPages = 3;
      const dispatchPageChanged = () => {
        try {
          const evName = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS && window.PlayTimeConstants.EVENTS.PAGE_CHANGED) || 'playtime:page-changed';
          const ev = new CustomEvent(evName, { detail: { page: currentPage } });
          window.dispatchEvent(ev);
        } catch (_) { /* noop */ }
      };
      return {
        init: jest.fn().mockResolvedValue(true),
        loadPDF: jest.fn().mockResolvedValue(true),
        renderPage: jest.fn().mockImplementation(async (p) => { currentPage = p; dispatchPageChanged(); }),
        getZoom: () => 1,
        getZoomBounds: () => ({ min: 1, max: 3 }),
        setZoom: jest.fn(() => 1),
        zoomIn: jest.fn(() => 1),
        zoomOut: jest.fn(() => 1),
        getCurrentPage: () => currentPage,
        getTotalPages: () => totalPages,
        nextPage: async function() { if (currentPage < totalPages) { currentPage += 1; dispatchPageChanged(); } },
        prevPage: async function() { if (currentPage > 1) { currentPage -= 1; dispatchPageChanged(); } },
        attachUIControls: () => {}
      };
    };
  // Register test factory into DI if present and keep legacy global fallback
  try {
    if (typeof global.window.createPlayTimePDFViewer === 'function') {
      try { if (global.window.diContainer && global.window.diContainer.container && typeof global.window.diContainer.container.singleton === 'function') {
        global.window.diContainer.container.singleton('playTimePDFViewer', (logger) => global.window.createPlayTimePDFViewer(logger));
      } } catch(_) {}
      if (!global.window.PlayTimePDFViewer) { try { global.window.PlayTimePDFViewer = global.window.createPlayTimePDFViewer(global.logger || console); } catch(_) {} }
    }
  } catch(_) {}

    // In-memory DB stub (minimal)
    global.window.createPlayTimeDB = () => ({ init: jest.fn().mockResolvedValue(true), save: jest.fn().mockResolvedValue(true), getAll: jest.fn().mockResolvedValue([]) });

    // Real highlighting module
    const Highlighting = require('../../../scripts/highlighting/highlighting.js');
    global.window.PlayTimeHighlighting = Highlighting;

    // Setup dependencies that main.js now requires for highlighting initialization
    const confidence = require('../../../scripts/confidence.js');
    global.window.PlayTimeConfidence = confidence;
          // Register test factory into DI if present and keep legacy global fallback
          try {
            if (typeof global.window.createPlayTimePDFViewer === 'function') {
              try { if (global.window.diContainer && global.window.diContainer.container && typeof global.window.diContainer.container.singleton === 'function') {
                global.window.diContainer.container.singleton('playTimePDFViewer', (logger) => global.window.createPlayTimePDFViewer(logger));
              } } catch(_) {}
              if (!global.window.PlayTimePDFViewer) { try { global.window.PlayTimePDFViewer = global.window.createPlayTimePDFViewer(global.logger || console); } catch(_) {} }
            }
          } catch(_) {}
    global.window.PlayTimeConstants = PT_CONSTANTS;

    // Bootstrap the application using test harness
    const { triggerDOMContentLoaded } = require('../../helpers/integration-bootstrap');
    await triggerDOMContentLoaded();
    await new Promise(r => setTimeout(r, 15));
  });

  test('highlight visibility toggles across page navigation', async () => {
    const canvas = document.querySelector(PT_CONSTANTS.SELECTORS.CANVAS);
    expect(canvas).toBeTruthy();

    // Activate highlighting first
    const highlightToggle = document.querySelector('#highlighting-toggle');
    expect(highlightToggle).toBeTruthy();
    highlightToggle.click();

    const greenBtn = document.querySelector(PT_CONSTANTS.SELECTORS.COLOR_GREEN);
    expect(greenBtn).toBeTruthy();
    greenBtn.click();

    // Draw highlight on page 1
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, clientX:120, clientY:120 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, clientX:180, clientY:170 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles:true, clientX:180, clientY:170 }));

    const highlights = () => Array.from(document.querySelectorAll(PT_CONSTANTS.SELECTORS.HIGHLIGHT));
    expect(highlights().length).toBe(1);
    const h1 = highlights()[0];
    expect(h1.dataset.page).toBe('1');
    // Initially visible (display not forced to none)
    expect(h1.style.display).not.toBe('none');

  // Go to page 2 (resolve viewer via DI if available)
  const _viewerNext = (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer')) ? window.diContainer.get('playTimePDFViewer') : window.PlayTimePDFViewer;
  await (_viewerNext && typeof _viewerNext.nextPage === 'function' ? _viewerNext.nextPage() : Promise.resolve());
    await new Promise(r => setTimeout(r, 5));
    expect(h1.style.display).toBe('none');

    // Draw highlight on page 2
    const amberBtn = document.querySelector(PT_CONSTANTS.SELECTORS.COLOR_AMBER);
    amberBtn.click();
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, clientX:140, clientY:140 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, clientX:200, clientY:200 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles:true, clientX:200, clientY:200 }));
    expect(highlights().length).toBe(2);
    const h2 = highlights().find(h => h !== h1);
    expect(h2.dataset.page).toBe('2');
    expect(h2.style.display).not.toBe('none');
    // First still hidden
    expect(h1.style.display).toBe('none');

  // Navigate back to page 1 (resolve via DI if available)
  const _viewerPrev = (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer')) ? window.diContainer.get('playTimePDFViewer') : window.PlayTimePDFViewer;
  await (_viewerPrev && typeof _viewerPrev.prevPage === 'function' ? _viewerPrev.prevPage() : Promise.resolve());
    await new Promise(r => setTimeout(r, 5));
    expect(h1.style.display).not.toBe('none');
    expect(h2.style.display).toBe('none');
  });
});
