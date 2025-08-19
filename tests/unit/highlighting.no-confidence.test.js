/** @jest-environment jsdom */
// Unit test: ensure no highlight created if confidence not chosen
const Highlighting = require('../../scripts/highlighting.js');
const confidence = require('../../scripts/confidence');
const { PT_CONSTANTS } = require('../../scripts/constants');

describe('Highlighting - no confidence selection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-role="pdf-viewer" style="position:relative;width:400px;height:400px;">
        <canvas id="pdf-canvas" data-role="pdf-canvas" width="400" height="400"></canvas>
      </div>`;
  });

  test('does not create highlight without activeConfidence', async () => {
    const logger = { warn: jest.fn(), debug: jest.fn() };
    await Highlighting.init({}, logger, confidence, PT_CONSTANTS);
    const canvas = document.querySelector('#pdf-canvas');
    const md = new MouseEvent('mousedown', { bubbles:true, clientX:50, clientY:50 });
    const mm = new MouseEvent('mousemove', { bubbles:true, clientX:150, clientY:120 });
    const mu = new MouseEvent('mouseup', { bubbles:true, clientX:150, clientY:120 });
    canvas.dispatchEvent(md);
    canvas.dispatchEvent(mm);
    canvas.dispatchEvent(mu);
    const hl = document.querySelector('[data-role="highlight"]');
    expect(hl).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No active confidence'));
  });
});
