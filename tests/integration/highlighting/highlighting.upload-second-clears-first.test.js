/** @jest-environment jsdom */
// Upload score1, create highlight page1, upload score2 -> score1 highlight should not remain visible.

const { PT_CONSTANTS } = require('../../../scripts/constants.js');
const TestHelpers = require('../../helpers/test-helpers.js');

describe('Second upload clears first score highlights', () => {
  beforeEach(async () => {
    // Setup silent logger to reduce test noise
    const testLogger = require('../../../scripts/logger.js');
    testLogger.setSilent(true);
    
    global.window.createPlayTimeDB = () => ({
      init: jest.fn().mockResolvedValue(true),
      _pdfs: [],
      _sections: [],
      save: jest.fn().mockImplementation(function(file, meta){
        const id = this._pdfs.length + 1;
        this._pdfs.push({ id, name:file.name, data:new Uint8Array([1]), pages: meta.pages||2 });
        return Promise.resolve(id);
      }),
      getAll: jest.fn().mockImplementation(function(){ return Promise.resolve(this._pdfs.slice()); }),
      get: jest.fn().mockImplementation(function(id){ return Promise.resolve(this._pdfs.find(p=>p.id===id)); }),
      addHighlight: jest.fn().mockImplementation(function(sec){ sec.id = this._sections.length+1; this._sections.push(sec); return Promise.resolve(sec.id); }),
      getHighlights: jest.fn().mockImplementation(function(pdfId){ return Promise.resolve(this._sections.filter(s=>s.pdfId===pdfId)); })
    });
    
    const helpers = require('../../helpers/test-helpers.js');
    //TODO - use the helper to create this DOM
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
          
          <!-- Highlighting Toggle -->
          <div class="flex items-center justify-center mb-2">
            <button data-role="toggle-highlighting" id="highlighting-toggle" class="btn btn-outline w-full text-xs" aria-pressed="false">
              <i data-lucide="pen-tool" class="w-4 h-4 mr-1"></i>
              <span>Highlight Sections</span>
            </button>
          </div>
          
          <!-- Confidence Panel (hidden by default) -->
          <div id="confidence-panel" class="p-4 border-b border-border" style="display: none;">
            <div class="text-sm font-medium mb-3 text-foreground">Mark Section Confidence:</div>
            <div class="flex flex-col gap-2" id="confidence-controls">
              <button id="color-green" data-role="color-green" data-color="green" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Confident</span>
              </button>
              <button id="color-amber" data-role="color-amber" data-color="amber" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Unsure</span>
              </button>
              <button id="color-red" data-role="color-red" data-color="red" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Needs Work</span>
              </button>
            </div>
          </div>
          
          <div class="highlight-controls" style="display: none;">
            <!-- Legacy confidence buttons for backward compatibility -->
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
    
    // Bootstrap the application using test harness
    const { triggerDOMContentLoaded } = require('../../helpers/integration-bootstrap');
    await triggerDOMContentLoaded();
    await new Promise(r=>setTimeout(r,60));
  });

  afterEach(() => {
    // Reset logger to non-silent mode
    if (global.logger && typeof global.logger.setSilent === 'function') {
      global.logger.setSilent(false);
    }
  });

  test('uploading second score removes visible first score highlight', async () => {
    const fileInput = document.querySelector(PT_CONSTANTS.SELECTORS.FILE_INPUT) || document.getElementById('pdf-upload');
    // Upload score 1
    const file1 = new File(['pdf1'], 'score1.pdf', { type:'application/pdf' });
    Object.defineProperty(fileInput,'files',{ value:[file1], configurable:true });
    fileInput.dispatchEvent(new Event('change', { bubbles:true }));
    // Wait for current score id
    for(let i=0;i<40;i++){ if(window.PlayTimeCurrentScoreId===1) break; await new Promise(r=>setTimeout(r,10)); }
    
    // Activate highlighting first
    const highlightToggle = document.querySelector('#highlighting-toggle');
    expect(highlightToggle).toBeTruthy();
    highlightToggle.click();
    
    // Select color & create highlight on page1
    const greenBtn = document.querySelector(PT_CONSTANTS.SELECTORS.COLOR_GREEN); greenBtn && greenBtn.click();
    const canvas = document.querySelector(PT_CONSTANTS.SELECTORS.CANVAS);
    canvas.dispatchEvent(new MouseEvent('mousedown',{ bubbles:true, clientX:30, clientY:30 }));
    canvas.dispatchEvent(new MouseEvent('mousemove',{ bubbles:true, clientX:120, clientY:120 }));
    canvas.dispatchEvent(new MouseEvent('mouseup',{ bubbles:true, clientX:120, clientY:120 }));
    // Ensure highlight persisted
    let hCount=0; for(let i=0;i<30;i++){ hCount=document.querySelectorAll(PT_CONSTANTS.SELECTORS.HIGHLIGHT).length; if(hCount===1) break; await new Promise(r=>setTimeout(r,10)); }
    expect(hCount).toBe(1);

    // Upload score 2
    const file2 = new File(['pdf2'], 'score2.pdf', { type:'application/pdf' });
    Object.defineProperty(fileInput,'files',{ value:[file2], configurable:true });
    fileInput.dispatchEvent(new Event('change', { bubbles:true }));
    for(let i=0;i<40;i++){ if(window.PlayTimeCurrentScoreId===2) break; await new Promise(r=>setTimeout(r,10)); }
    await new Promise(r=>setTimeout(r,80));

    // Check visible highlights (display != none)
    const visible = Array.from(document.querySelectorAll(PT_CONSTANTS.SELECTORS.HIGHLIGHT)).filter(h=>h.style.display!=="none").length;
    expect(visible).toBe(0);
  });
});
