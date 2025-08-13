// Centralized constants for selectors and events

const EVENTS = {
  CONFIDENCE_CHANGED: 'playtime:confidence-changed',
  LAYOUT_CHANGED: 'playtime:layout-changed',
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
}
