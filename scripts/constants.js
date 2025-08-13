// Centralized constants for selectors and events

const EVENTS = {
  CONFIDENCE_CHANGED: 'playtime:confidence-changed',
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
};

const PT_CONSTANTS = { EVENTS, SELECTORS };

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PT_CONSTANTS;
}

// Browser global
if (typeof window !== 'undefined') {
  window.PlayTimeConstants = PT_CONSTANTS;
}
