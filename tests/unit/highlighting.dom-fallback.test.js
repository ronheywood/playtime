/** @jest-environment jsdom */
const Highlighting = require('../../scripts/highlighting/highlighting.js');
const confidence = require('../../scripts/confidence');
const { PT_CONSTANTS } = require('../../scripts/constants');

describe('Highlighting - DOM fallback for pre-selected confidence', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div>
        <button id="color-green" data-role="color-green" data-color="green" aria-pressed="true" class="selected">●</button>
        <div data-role="pdf-viewer" style="position:relative;width:400px;height:400px;">
          <canvas id="pdf-canvas" data-role="pdf-canvas" width="400" height="400"></canvas>
        </div>
      </div>`;
    global.window.PlayTimeDB = {
      addHighlight: jest.fn().mockResolvedValue(1),
      getHighlights: jest.fn().mockResolvedValue([])
    };
  });

  test('sets activeConfidence from pre-selected button and creates highlight', async () => {
    const logger = { warn: jest.fn(), debug: jest.fn() };
  await Highlighting.init({}, logger, confidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
    expect(Highlighting._state.activeConfidence).not.toBeNull();
    const canvas = document.getElementById('pdf-canvas');
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, clientX:50, clientY:50 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, clientX:120, clientY:100 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles:true, clientX:120, clientY:100 }));
    const highlight = document.querySelector('[data-role="highlight"]');
    expect(highlight).toBeTruthy();
    expect(highlight.getAttribute('data-color')).toBe('green');
  });

  afterEach(() => {
    delete global.window.PlayTimeDB;
    document.body.innerHTML = '';
  });
});
