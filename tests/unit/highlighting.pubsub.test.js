/**
 * @jest-environment jsdom
 */
/** Unit test: Highlighting subscribes to confidence change event and updates active color */

const Highlighting = require('../../scripts/highlighting');
const confidence = require('../../scripts/confidence');
const { PT_CONSTANTS } = require('../../scripts/constants');

describe('Highlighting pub/sub', () => {
  beforeEach(() => {
    // Minimal DOM
    document.body.innerHTML = `
      <div class="pdf-viewer-container" data-role="pdf-viewer">
        <canvas id="pdf-canvas" data-role="pdf-canvas"></canvas>
      </div>`;
  });

  test('updates active confidence when event is dispatched', async () => {
    // Provide a logger with debug stub to avoid noise
    const testLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    await Highlighting.init({}, testLogger, confidence, PT_CONSTANTS);
    // Initially null confidence
    expect(Highlighting._state.activeConfidence).toBe(null);

    // Dispatch event
    const ev = new CustomEvent('playtime:confidence-changed', { detail: { color: 'amber' } });
    window.dispatchEvent(ev);

  // Expect enum value for amber (1)
  expect(Highlighting._state.activeConfidence).toBe(1);
  });
});
