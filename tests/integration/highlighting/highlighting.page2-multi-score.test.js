/** @jest-environment jsdom */
// Scenario: Two scores. First has highlight on page 2. After navigating to page 2 highlight scales, after switching scores and back it still appears on page 2.

const { PT_CONSTANTS, SELECTORS } = require('../../../scripts/constants.js');

describe('Highlighting multi score page 2 reselect', () => {
  beforeEach(async () => {
    // Setup silent logger to reduce test noise
    const testLogger = require('../../../scripts/logger.js');
    testLogger.setSilent(true);

    // Shared store to mimic persistence
    if (!global.__storeMulti) global.__storeMulti = { pdfs: [], sections: [] };
    const store = global.__storeMulti;

    // Provide two PDFs
    if (store.pdfs.length === 0) {
      store.pdfs.push({ id:1, name:'score1.pdf', data:new Uint8Array([1]), pages:3 });
      store.pdfs.push({ id:2, name:'score2.pdf', data:new Uint8Array([2]), pages:3 });
    }
    // One highlight on page 2 for score1
    if (!store.sections.find(s=>s.pdfId===1)) {
      store.sections.push({ id:1, pdfId:1, page:2, confidence:2, xPct:0.1, yPct:0.1, wPct:0.3, hPct:0.2 });
    }

    global.window.createPlayTimeDB = () => ({
      init: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockImplementation(async (file) => { const id = store.pdfs.length+1; store.pdfs.push({ id, name:file.name, data:new Uint8Array([1]) }); return id;}),
      getAll: jest.fn().mockResolvedValue(store.pdfs),
      get: jest.fn().mockImplementation(async (id) => store.pdfs.find(p=>p.id===id || String(p.id)===String(id))),
      addHighlight: jest.fn().mockImplementation(async (sec) => { store.sections.push({ id: store.sections.length+1, ...sec }); }),
      getHighlights: jest.fn().mockImplementation(async (pdfId) => store.sections.filter(s=>s.pdfId===pdfId || String(s.pdfId)===String(pdfId)))
    });

    // Base DOM
    document.body.innerHTML = `
      <main>
        <section id="upload-section"><input type="file" id="pdf-upload" accept="application/pdf"></section>
        <section><div id="scores-list"></div></section>
        <section>
          <div data-role="current-score-title"></div>
          <div data-role="pdf-viewer" class="pdf-viewer-container">
            <canvas id="pdf-canvas" data-role="pdf-canvas" width="400" height="400"></canvas>
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
    global.PlayTimeConfidence = confidence;
    global.window.PlayTimeConstants = PT_CONSTANTS;
    
    require('../../../scripts/highlighting/highlighting.js');
    
    // Bootstrap the application using test harness
    const { triggerDOMContentLoaded } = require('../../helpers/integration-bootstrap');
    await triggerDOMContentLoaded();
    await new Promise(r=>setTimeout(r,120)); // allow auto-select first score and rehydrate (page 1 only visible)
  });

  afterEach(() => {
    // Reset logger to non-silent mode
    if (global.logger && typeof global.logger.setSilent === 'function') {
      global.logger.setSilent(false);
    }
  });

  test('page2 highlight survives score switch and back', async () => {
    // Navigate to page 2 (simulate page change)
    const viewer = (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer'))
      ? window.diContainer.get('playTimePDFViewer')
      : window.PlayTimePDFViewer;
    await viewer.renderPage(2);
    await new Promise(r=>setTimeout(r,50));

    // Poll for page 2 highlight visibility (resilient to async rehydrate + reposition)
    const waitForOne = async () => {
      const start = Date.now();
      while (Date.now() - start < 800) {
        const cnt = document.querySelectorAll('[data-role="highlight"]').length;
        if (cnt === 1) return true;
        await new Promise(r=>setTimeout(r,25));
      }
      return false;
    };
    const appeared = await waitForOne();
    expect(appeared).toBe(true);

    // Click second score (simulate user selection)
    const second = Array.from(document.querySelectorAll('.score-item')).find(el=>/score2/i.test(el.textContent));
    second && second.click();
    // simulate first page render for score2
  // resolve viewer from DI or fallback to legacy global
  (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer') ? window.diContainer.get('playTimePDFViewer') : window.PlayTimePDFViewer).renderPage(1);
    await new Promise(r=>setTimeout(r,80));

    // No highlights for score2 (cleared list)
    const afterSecondVisible = Array.from(document.querySelectorAll('[data-role="highlight"]')).filter(h=>h.style.display!=="none").length;
    expect(afterSecondVisible).toBe(0);

    // Switch back to score1
    const first = Array.from(document.querySelectorAll('.score-item')).find(el=>/score1/i.test(el.textContent));
    first && first.click();
    await new Promise(r=>setTimeout(r,60));

    // Navigate to page2 again
  (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer') ? window.diContainer.get('playTimePDFViewer') : window.PlayTimePDFViewer).renderPage(2);
  // Poll again after returning
  const backAppeared = await waitForOne();
  expect(backAppeared).toBe(true);
  });
});
