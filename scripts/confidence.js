// Confidence enum & mapping utilities
// No deprecated fallbacks: single source of truth

const ConfidenceLevel = Object.freeze({
  RED: 0,
  AMBER: 1,
  GREEN: 2
});

const COLOR_BY_CONFIDENCE = {
  [ConfidenceLevel.RED]: 'red',
  [ConfidenceLevel.AMBER]: 'amber',
  [ConfidenceLevel.GREEN]: 'green'
};

const CONFIDENCE_BY_COLOR = {
  red: ConfidenceLevel.RED,
  amber: ConfidenceLevel.AMBER,
  green: ConfidenceLevel.GREEN
};

function confidenceToColor(level) {
  return COLOR_BY_CONFIDENCE[level] || 'red';
}

function colorToConfidence(color) {
  return CONFIDENCE_BY_COLOR[(color || '').toLowerCase()] ?? ConfidenceLevel.RED;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConfidenceLevel, confidenceToColor, colorToConfidence };
}
// Browser global (optional convenience)
if (typeof window !== 'undefined') {
  window.PlayTimeConfidence = { ConfidenceLevel, confidenceToColor, colorToConfidence };
}
