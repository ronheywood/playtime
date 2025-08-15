// Centralized constants for selectors and events

const EVENTS = {
  CONFIDENCE_CHANGED: 'playtime:confidence-changed',
  LAYOUT_CHANGED: 'playtime:layout-changed',
  PAGE_CHANGED: 'playtime:page-changed', // fired after a page is rendered (detail: { page })
  SCORE_SELECTED: 'playtime:score-selected', // unified selection event (detail: { pdfId, name, pages })
  SCORE_CREATED: 'playtime:score-created', // emitted after a PDF is saved (detail: { pdf })
  SCORE_SELECT_COMMAND: 'playtime:score-select-command', // command to select a score (detail: { pdfId })
};

// Use data-role selectors for behavior wiring
const SELECTORS = {
  VIEWER: '[data-role="pdf-viewer"]',
  CANVAS: '[data-role="pdf-canvas"]',
  SELECTION_OVERLAY: '[data-role="selection-overlay"]',
  HIGHLIGHT: '[data-role="highlight"]',
  COLOR_GREEN: '[data-role="color-green"]',
  COLOR_AMBER: '[data-role="color-amber"]',
  COLOR_RED: '[data-role="color-red"]',
  PAGE_INFO: '[data-role="page-info"]',
  SIDEBAR: '[data-role="sidebar"]',
  FOCUS_SECTION_BTN: '#focus-section-btn',
  EXIT_FOCUS_BTN: '#exit-focus-btn',
};

const PT_CONSTANTS = { EVENTS, SELECTORS };

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {SELECTORS, EVENTS, PT_CONSTANTS};
}

// Browser global
if (typeof window !== 'undefined') {
  window.PlayTimeConstants = PT_CONSTANTS;
  // Lightweight global event buffer (topic -> last detail) to allow late subscribers
  if (!window.PlayTimeEventBuffer) {
    window.PlayTimeEventBuffer = {
      _last: {},
      publish(eventName, detail) {
        try { this._last[eventName] = detail; } catch(_) {}
        try { window.__playTimeEventBuffer = window.__playTimeEventBuffer || {}; window.__playTimeEventBuffer[eventName] = detail; } catch(_) {}
        try { window.dispatchEvent(new CustomEvent(eventName, { detail })); } catch (err) {
          try { document.dispatchEvent(new CustomEvent(eventName, { detail })); } catch(_) {}
        }
      },
      getLast(eventName) { return this._last[eventName]; }
    };
  }
}
