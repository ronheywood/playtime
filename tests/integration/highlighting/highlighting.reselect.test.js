/** @jest-environment jsdom */
// Integration: re-selecting a score should re-show its highlights
const { SELECTORS } = require('../../../scripts/constants.js');

describe('Highlighting re-select score', () => {
  beforeEach(async () => {
    // Setup silent logger to reduce test noise
    const testLogger = require('../../../scripts/logger.js');
    testLogger.setSilent(true);
    global.logger = testLogger;
    global.window.logger = testLogger;
    
    global.window.createPlayTimeDB = () => ({
      init: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(1),
      getAll: jest.fn().mockResolvedValue([{ id:1, name:'h.pdf', data:new Uint8Array([1]), pages:2 }]),
      get: jest.fn().mockResolvedValue({ id:1, name:'h.pdf', data:new Uint8Array([1]), pages:2 }),
      addHighlight: jest.fn().mockResolvedValue(true),
      getHighlights: jest.fn().mockResolvedValue([{ pdfId:1, page:1, confidence:2, xPct:0, yPct:0, wPct:0.2, hPct:0.2 }])
    });
    global.window.createPlayTimePDFViewer = () => ({
      init: jest.fn().mockResolvedValue(true),
      loadPDF: jest.fn().mockResolvedValue(true),
      renderPage: jest.fn().mockImplementation(async () => {
        // simulate page change event
        const EV = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS) || {};
        const evName = EV.PAGE_CHANGED || 'playtime:page-changed';
        window.dispatchEvent(new CustomEvent(evName,{ detail:{ page:1 } }));
      }),
      getCurrentPage: () => 1,
      getTotalPages: () => 2
    });
  // Register test factory into DI if present; fallback to legacy global instance
  try {
    if (typeof global.window.createPlayTimePDFViewer === 'function') {
      try { if (global.window.diContainer && global.window.diContainer.container && typeof global.window.diContainer.container.singleton === 'function') {
        global.window.diContainer.container.singleton('playTimePDFViewer', (logger) => global.window.createPlayTimePDFViewer(logger));
      } } catch(_) {}
      if (!global.window.PlayTimePDFViewer) { try { global.window.PlayTimePDFViewer = global.window.createPlayTimePDFViewer(); } catch(_) {} }
    }
  } catch(_) {}
    document.body.innerHTML = `
      <main>
        <section id="upload-section"><input type="file" id="pdf-upload" accept="application/pdf"></section>
        <section><div id="scores-list"></div></section>
        <section>
          <div data-role="current-score-title"></div>
          <div data-role="pdf-viewer" class="pdf-viewer-container">
            <canvas id="pdf-canvas" data-role="pdf-canvas" width="300" height="300"></canvas>
            <div data-role="selection-overlay" style="display:none;"></div>
          </div>
          <div class="highlight-controls">
            <button id="color-green" data-role="color-green" data-color="green">●</button>
            <button id="color-amber" data-role="color-amber" data-color="amber">●</button>
            <button id="color-red" data-role="color-red" data-color="red">●</button>
          </div>
        </section>
      </main>`;
    jest.resetModules();
    
    // Setup dependencies that main.js now requires for highlighting initialization
    const confidence = require('../../../scripts/confidence.js');
    const { PT_CONSTANTS } = require('../../../scripts/constants.js');
    global.window.PlayTimeConfidence = confidence;
    global.window.PlayTimeConstants = PT_CONSTANTS;

    require('../../../scripts/highlighting/highlighting.js');
    require('../../../scripts/main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r=>setTimeout(r,120)); // allow auto-select + rehydrate
  });

  afterEach(() => {
    // Reset logger to non-silent mode
    if (global.logger && typeof global.logger.setSilent === 'function') {
      global.logger.setSilent(false);
    }
  });

  test('re-select shows highlight again', async () => {
    // Wait (poll) for initial rehydrate instead of assuming fixed delay
    const waitForHighlight = async () => {
      const start = Date.now();
      while (Date.now() - start < 800) { // up to 800ms across retry / RAF passes
        if (document.querySelectorAll('[data-role="highlight"]').length === 1) return true;
        await new Promise(r=>setTimeout(r,25));
      }
      return false;
    };
    const appeared = await waitForHighlight();
    expect(appeared).toBe(true);
    // Simulate user clicking score item again (re-select)
    const item = document.querySelector('.score-item');
    if (item) item.click();
    // Re-select should not create duplicates; still exactly one
    await new Promise(r=>setTimeout(r,60));
    const after = document.querySelectorAll('[data-role="highlight"]').length;
    expect(after).toBe(1);
  });
});
