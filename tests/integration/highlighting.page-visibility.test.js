/**
 * Integration test: highlights are associated with a page and hidden when navigating away.
 */

const { SELECTORS } = require('../../scripts/constants');

describe('Highlighting Page Visibility Integration', () => {
  beforeEach(async () => {
    // Silence logs
    const logger = require('../../scripts/logger');
    logger.setSilent(true);
    global.logger = logger;

    // Provide PDF viewer stub with paging + events
    global.window.createPlayTimePDFViewer = (logger) => {
      let currentPage = 1;
      const totalPages = 3;
      const dispatchPageChanged = () => {
        try {
          const evName = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS.PAGE_CHANGED) || 'playtime:page-changed';
            const ev = new CustomEvent(evName, { detail: { page: currentPage } });
            window.dispatchEvent(ev);
        } catch(_) { /* noop */ }
      };
      return {
        init: jest.fn().mockResolvedValue(true),
        loadPDF: jest.fn().mockResolvedValue(true),
        renderPage: jest.fn().mockImplementation(async (p) => { currentPage = p; dispatchPageChanged(); }),
        getZoom: () => 1,
        getZoomBounds: () => ({ min:1, max:3 }),
        setZoom: jest.fn(() => 1),
        zoomIn: jest.fn(() => 1),
        zoomOut: jest.fn(() => 1),
        getCurrentPage: () => currentPage,
        getTotalPages: () => totalPages,
        nextPage: async function() { if (currentPage < totalPages) { currentPage += 1; dispatchPageChanged(); } },
        prevPage: async function() { if (currentPage > 1) { currentPage -= 1; dispatchPageChanged(); } }
      };
    };

    // In-memory DB stub (minimal)
    global.window.createPlayTimeDB = () => ({ init: jest.fn().mockResolvedValue(true), save: jest.fn().mockResolvedValue(true), getAll: jest.fn().mockResolvedValue([]) });

    // Real highlighting module
    const Highlighting = require('../../scripts/highlighting-refactored.js');
    global.window.PlayTimeHighlighting = Highlighting;

    // Setup dependencies that main.js now requires for highlighting initialization
    const confidence = require('../../scripts/confidence');
    const { PT_CONSTANTS } = require('../../scripts/constants');
    global.window.PlayTimeConfidence = confidence;
    global.window.PlayTimeConstants = PT_CONSTANTS;

    // Trigger app init (main registers DOMContentLoaded listener on require)
    require('../../scripts/main');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 15));
  });

  test('highlight visibility toggles across page navigation', async () => {
    const canvas = document.querySelector(SELECTORS.CANVAS);
    expect(canvas).toBeTruthy();

    const greenBtn = document.querySelector(SELECTORS.COLOR_GREEN);
    expect(greenBtn).toBeTruthy();
    greenBtn.click();

    // Draw highlight on page 1
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, clientX:120, clientY:120 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, clientX:180, clientY:170 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles:true, clientX:180, clientY:170 }));

    const highlights = () => Array.from(document.querySelectorAll('[data-role="highlight"]'));
    expect(highlights().length).toBe(1);
    const h1 = highlights()[0];
    expect(h1.dataset.page).toBe('1');
    // Initially visible (display not forced to none)
    expect(h1.style.display).not.toBe('none');

    // Go to page 2
    await window.PlayTimePDFViewer.nextPage();
    await new Promise(r => setTimeout(r, 5));
    expect(h1.style.display).toBe('none');

    // Draw highlight on page 2
    const amberBtn = document.querySelector(SELECTORS.COLOR_AMBER);
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

    // Navigate back to page 1
    await window.PlayTimePDFViewer.prevPage();
    await new Promise(r => setTimeout(r, 5));
    expect(h1.style.display).not.toBe('none');
    expect(h2.style.display).toBe('none');
  });
});
