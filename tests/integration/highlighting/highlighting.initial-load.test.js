/** @jest-environment jsdom */
// Integration test: after refresh, first score auto-selected triggers highlight rehydration
const { PT_CONSTANTS } = require('../../../scripts/constants.js');

describe('Highlighting initial load rehydration', () => {
  beforeEach(async () => {
    const logger = require('../../../scripts/logger.js');
    logger.setSilent(true);
    global.logger = logger;
    // Ensure window.logger is also set for main.js
    global.window.logger = logger;

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

    // PDF viewer stub with page tracking
    global.window.createPlayTimePDFViewer = () => ({
      init: jest.fn().mockResolvedValue(true),
      loadPDF: jest.fn().mockResolvedValue(true),
      renderPage: jest.fn().mockResolvedValue(true),
      getCurrentPage: () => 1,
      getTotalPages: () => 2
    });

    const Highlighting = require('../../../scripts/highlighting/highlighting.js');
    global.window.PlayTimeHighlighting = Highlighting;

    // Setup dependencies that main.js now requires for highlighting initialization
    const confidence = require('../../../scripts/confidence.js');
    const { PT_CONSTANTS } = require('../../../scripts/constants.js');
    global.window.PlayTimeConfidence = confidence;
    global.window.PlayTimeConstants = PT_CONSTANTS;

    // First app load
    require('../../../scripts/main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 25));

    // Upload a PDF
    const fileInput = document.querySelector('input[type="file"]') || document.getElementById('pdf-upload');
    const mockFile = new File(['pdf'], 'my-score.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput, 'files', { value: [mockFile], configurable: true });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    // Wait until the file save assigns a current score id so highlight persistence has pdfId
    for (let i=0;i<40;i++) { // up to ~400ms
      if (window.PlayTimeCurrentScoreId != null) break;
      await new Promise(r => setTimeout(r,10));
    }

    // Activate highlighting first
    const highlightToggle = document.querySelector('#highlighting-toggle');
    expect(highlightToggle).toBeTruthy();
    highlightToggle.click();

    // Select confidence & draw highlight
    const greenBtn = document.querySelector(PT_CONSTANTS.SELECTORS.COLOR_GREEN) || document.getElementById('color-green');
    greenBtn && greenBtn.click();
    const canvas = document.querySelector(PT_CONSTANTS.SELECTORS.CANVAS) || document.getElementById('pdf-canvas');
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, clientX:50, clientY:50 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, clientX:150, clientY:150 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles:true, clientX:150, clientY:150 }));
    expect(document.querySelectorAll(PT_CONSTANTS.SELECTORS.HIGHLIGHT).length).toBe(1);
    // Wait for persistence (addHighlight async) to ensure section stored before refresh
    for (let i=0;i<20;i++) { // up to ~200ms
      if (store.sections.length > 0) break;
      await new Promise(r => setTimeout(r,10));
    }

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
    global.window.createPlayTimePDFViewer = () => ({
      init: jest.fn().mockResolvedValue(true),
      loadPDF: jest.fn().mockResolvedValue(true),
      renderPage: jest.fn().mockResolvedValue(true),
      getCurrentPage: () => 1,
      getTotalPages: () => 2
    });
    const Highlighting2 = require('../../../scripts/highlighting/highlighting.js');
    global.window.PlayTimeHighlighting = Highlighting2;
    require('../../../scripts/main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 50));
  });

  test('first score auto-selected and highlight rehydrated on load', async () => {
    let found = 0;
  for (let i=0;i<40;i++) { // up to ~400ms
      const hs = document.querySelectorAll('[data-role="highlight"]');
      if (hs.length === 1) { found = hs.length; break; }
      await new Promise(r => setTimeout(r,10));
    }
    expect(found).toBe(1);
  });
});
