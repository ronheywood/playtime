/** @jest-environment jsdom */
// Integration: re-selecting a score should re-show its highlights
const { SELECTORS } = require('../../scripts/constants');

describe('Highlighting re-select score', () => {
  beforeEach(async () => {
    const logger = require('../../scripts/logger');
    logger.setSilent(false);
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
    const confidence = require('../../scripts/confidence');
    const { PT_CONSTANTS } = require('../../scripts/constants');
    global.window.PlayTimeConfidence = confidence;
    global.window.PlayTimeConstants = PT_CONSTANTS;
    
    require('../../scripts/highlighting.js');
    require('../../scripts/main');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r=>setTimeout(r,120)); // allow auto-select + rehydrate
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
