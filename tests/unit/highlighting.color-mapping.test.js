/** @jest-environment jsdom */
// Verifies highlights get correct data-color for each confidence via _safeConfidenceToColor
const Highlighting = require('../../scripts/highlighting/highlighting.js');
const confidence = require('../../scripts/confidence');
const { PT_CONSTANTS } = require('../../scripts/constants');

describe('Highlighting - safe confidence to color mapping', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div>
        <div data-role="pdf-viewer" style="position:relative;width:300px;height:300px;">
          <canvas id="pdf-canvas" data-role="pdf-canvas" width="300" height="300"></canvas>
        </div>
      </div>`;
    // Provide a lightweight mock database for constructor-injected persistence
    global.window.PlayTimeDB = {
      addHighlight: jest.fn().mockResolvedValue(1),
      getHighlights: jest.fn().mockResolvedValue([]),
      getHighlight: jest.fn().mockResolvedValue(null),
      updateHighlight: jest.fn().mockResolvedValue(true)
    };
  });

  afterEach(() => {
    delete global.window.PlayTimeDB;
    document.body.innerHTML = '';
  });

  test('creates red, amber, green highlights for confidence 0,1,2', async () => {
    const logger = { debug: jest.fn(), warn: jest.fn() };
  await Highlighting.init({}, logger, confidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
    const canvas = document.getElementById('pdf-canvas');

    function drag(x1,y1,x2,y2) {
      canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:x1,clientY:y1}));
      canvas.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:x2,clientY:y2}));
      canvas.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:x2,clientY:y2}));
    }

    // Force each confidence manually (simulate event state) and draw
    Highlighting._state.activeConfidence = 0; drag(10,10,80,60);
    Highlighting._state.activeConfidence = 1; drag(20,80,120,140);
    Highlighting._state.activeConfidence = 2; drag(30,150,160,210);

    const reds = Array.from(document.querySelectorAll('[data-role="highlight"][data-color="red"]'));
    const ambers = Array.from(document.querySelectorAll('[data-role="highlight"][data-color="amber"]'));
    const greens = Array.from(document.querySelectorAll('[data-role="highlight"][data-color="green"]'));

    expect(reds.length).toBeGreaterThanOrEqual(1);
    expect(ambers.length).toBeGreaterThanOrEqual(1);
    expect(greens.length).toBeGreaterThanOrEqual(1);
  });
});
