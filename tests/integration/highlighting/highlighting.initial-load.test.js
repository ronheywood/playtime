/** @jest-environment jsdom */
// Integration test: after refresh, first score auto-selected triggers highlight rehydration
const { PT_CONSTANTS } = require('../../../scripts/constants.js');
const TestHelpers = require('../../helpers/test-helpers.js');

describe('Highlighting initial load rehydration', () => {
  beforeEach(async () => {
    const logger = require('../../../scripts/logger.js');
    logger.setSilent(true);

    // Minimal DB with persistence across reload simulation (in-memory variable)
    if (!global.__dbStore) global.__dbStore = { pdfs: [], sections: [] };
    const store = global.__dbStore;

    global.window.createPlayTimeDB = () => ({
      init: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockImplementation(async (file) => {
        const id = store.pdfs.length + 1;
        store.pdfs.push({ id, name: file.name, data: new Uint8Array([1,2,3]) });
        return id;
      }),
      getAll: jest.fn().mockResolvedValue(store.pdfs),
      get: jest.fn().mockImplementation(async (id) => store.pdfs.find(p => p.id === id || String(p.id) === String(id)) ),
      addHighlight: jest.fn().mockImplementation(async (sec) => { store.sections.push({ id: store.sections.length+1, ...sec }); }),
      getHighlights: jest.fn().mockImplementation(async (pdfId) => store.sections.filter(s => s.pdfId === pdfId || String(s.pdfId) === String(pdfId)))
    });
    
    const Highlighting = require('../../../scripts/highlighting/highlighting.js');
    global.window.PlayTimeHighlighting = Highlighting;

    // Setup dependencies that main.js now requires for highlighting initialization
    const confidence = require('../../../scripts/confidence.js');
    const { PT_CONSTANTS } = require('../../../scripts/constants.js');
    global.PlayTimeConfidence = confidence;
    global.window.PlayTimeConstants = PT_CONSTANTS;

    // Bootstrap the application using test harness
    const { triggerDOMContentLoaded } = require('../../helpers/integration-bootstrap');
    await triggerDOMContentLoaded();
    await new Promise(r => setTimeout(r, 25));

    // Pre-populate database with a PDF and highlight (simulating previous session)
    store.pdfs.push({ id: 1, name: 'test-score.pdf', data: new Uint8Array([1,2,3]) });
    store.sections.push({ 
      id: 1, 
      pdfId: 1, 
      page: 1, 
      confidence: 2, 
      xPct: 0.1, 
      yPct: 0.1, 
      wPct: 0.2, 
      hPct: 0.2,
      color: 'green'
    });

    // Simulate page refresh: clear DOM but keep store, then recreate minimal required DOM structure
    document.body.innerHTML = `
      <main>
        <section id="upload-section"><input type="file" id="pdf-upload" accept="application/pdf"></section>
        <section><div id="scores-list"></div></section>
        <section>
          <div data-role="current-score-title"></div>
          <div class="pdf-viewer-container" data-role="pdf-viewer">
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
    // Recreate globals (DB & viewer) using same factories referencing preserved store
    global.window.createPlayTimeDB = () => ({
      init: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockImplementation(async (file) => {
        const id = store.pdfs.length + 1;
        store.pdfs.push({ id, name: file.name, data: new Uint8Array([1,2,3]) });
        return id;
      }),
      getAll: jest.fn().mockResolvedValue(store.pdfs),
      get: jest.fn().mockImplementation(async (id) => store.pdfs.find(p => p.id === id || String(p.id) === String(id)) ),
      addHighlight: jest.fn().mockImplementation(async (sec) => { store.sections.push({ id: store.sections.length+1, ...sec }); }),
      getHighlights: jest.fn().mockImplementation(async (pdfId) => store.sections.filter(s => s.pdfId === pdfId || String(s.pdfId) === String(pdfId)))
    });
    
    const Highlighting2 = require('../../../scripts/highlighting/highlighting.js');
    global.window.PlayTimeHighlighting = Highlighting2;
    
    // Bootstrap the application using test harness
    await triggerDOMContentLoaded();
    await new Promise(r => setTimeout(r, 50));
  });

  test('first score auto-selected and highlight rehydrated on load', async () => {
    let found = 0;
    for (let i=0;i<40;i++) { // up to ~400ms
      const hs = document.querySelectorAll('[data-role="highlight"]');
      if (hs.length >= 1) { found = hs.length; break; }
      await new Promise(r => setTimeout(r,10));
    }
    
    expect(found).toBeGreaterThanOrEqual(1);
  });
});
