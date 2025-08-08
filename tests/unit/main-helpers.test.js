// Unit tests for helpers in scripts/main.js

// Provide a minimal global document to satisfy setup.js and main.js when required in Node env
if (typeof global.document === 'undefined') {
  const doc = {
    body: { innerHTML: '' },
    addEventListener: () => {},
    querySelector: () => null,
    getElementById: () => null
  };
  global.document = doc;
}

// Provide window.logger to avoid undefined logger in browser paths
global.window = global.window || {};
if (!global.window.logger) {
  global.window.logger = require('../../scripts/logger');
  global.window.logger.setSilent(true);
}

const { CONFIG, isValidPDFFile, updatePDFViewerStatus, initializePageNavigation } = require('../../scripts/main');

describe('Main helpers', () => {
  function createMockContainer() {
    const container = {
      children: [],
      querySelector: (sel) => {
        if (sel === '.status-message') {
          return container.children.find(c => c.className === 'status-message') || null;
        }
        return null;
      },
      appendChild: (el) => container.children.push(el)
    };
    return container;
  }

  function createMockElement(initial = {}) {
    return Object.assign({
      className: '',
      textContent: '',
      attributes: {},
      setAttribute: function(k, v) { this.attributes[k] = String(v); },
      getAttribute: function(k) { return this.attributes[k]; }
    }, initial);
  }

  test('isValidPDFFile returns true only for application/pdf', () => {
    expect(isValidPDFFile({ type: 'application/pdf' })).toBe(true);
    expect(isValidPDFFile({ type: 'text/plain' })).toBe(false);
    expect(isValidPDFFile(null)).toBe(false);
    expect(isValidPDFFile(undefined)).toBe(false);
  });

  test('updatePDFViewerStatus creates and updates status element', () => {
    const viewer = createMockContainer();
    // monkey-patch document.createElement for this test
    const realCreate = global.document.createElement;
    global.document.createElement = (tag) => createMockElement();

    updatePDFViewerStatus(viewer, CONFIG.MESSAGES.SUCCESS_FILE_SELECTED + 'test.pdf', false);
    const el = viewer.querySelector('.status-message');
    expect(el).toBeTruthy();
    expect(el.textContent).toBe(CONFIG.MESSAGES.SUCCESS_FILE_SELECTED + 'test.pdf');
    expect(el.getAttribute('data-status')).toBe('success');

    updatePDFViewerStatus(viewer, 'Error: bad file', true);
    expect(el.textContent).toBe('Error: bad file');
    expect(el.getAttribute('data-status')).toBe('error');

    // restore
    global.document.createElement = realCreate;
  });

  test('initializePageNavigation wires prev/next to viewer methods', async () => {
    // stub buttons that record click handlers
    const makeBtn = () => {
      const btn = { _handler: null, addEventListener: (ev, fn) => { if (ev === 'click') btn._handler = fn; } };
      btn.click = () => btn._handler && btn._handler();
      return btn;
    };
    const prevBtn = makeBtn();
    const nextBtn = makeBtn();

    // stub document.querySelector to return our buttons
    const realQS = global.document.querySelector;
    global.document.querySelector = (sel) => {
      if (sel === '#prev-page-btn') return prevBtn;
      if (sel === '#next-page-btn') return nextBtn;
      return null;
    };

    const pdfViewer = {
      prevPage: jest.fn().mockResolvedValue(),
      nextPage: jest.fn().mockResolvedValue()
    };

    initializePageNavigation(pdfViewer);

    prevBtn.click();
    nextBtn.click();

    await Promise.resolve();

    expect(pdfViewer.prevPage).toHaveBeenCalled();
    expect(pdfViewer.nextPage).toHaveBeenCalled();

    global.document.querySelector = realQS;
  });
});
