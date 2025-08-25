/**
 * Manages confidence level mappings and color conversions
 * Provides robust fallbacks for different module loading scenarios
 */
class ConfidenceMapper {
    constructor(confidenceModule = null) {
        this.confidenceModule = confidenceModule;
        this.fallbackLevels = { RED: 0, AMBER: 1, GREEN: 2 };
    }

    /**
     * Convert confidence level to color string with robust fallbacks
     */
    confidenceToColor(level) {
        // Try using the injected confidence module first
        if (this.confidenceModule?.confidenceToColor) {
            try {
                const mapped = this.confidenceModule.confidenceToColor(level);
                // Validate that mapping actually distinguishes colors
                if (this._isValidColorMapping(level, mapped)) {
                    return mapped;
                }
            } catch (_) {
                // Fall through to fallback mapping
            }
        }

        // Fallback to numeric/enum mapping
        return this._numericLevelToColor(level);
    }

    /**
     * Convert color string to confidence level with robust fallbacks
     */
    colorToConfidence(color) {
        // Try using the injected confidence module first
        if (this.confidenceModule?.colorToConfidence) {
            try {
                const level = this.confidenceModule.colorToConfidence(color);
                if (Number.isFinite(level)) {
                    return level;
                }
                // If null was returned, continue to fallback
            } catch (_) {
                // Fall through to fallback mapping
            }
        }

        // Fallback string-based mapping
        const result = this._colorStringToLevel(color);
        return result;
    }

    /**
     * Get confidence levels enum with fallbacks
     */
    getConfidenceLevels() {
        return this.confidenceModule?.ConfidenceLevel || this.fallbackLevels;
    }

    /**
     * Validate that a confidence level is valid
     */
    isValidConfidenceLevel(level) {
        const levels = this.getConfidenceLevels();
        return Object.values(levels).includes(level);
    }

    /**
     * Get all supported color names
     */
    getSupportedColors() {
        return ['red', 'amber', 'green'];
    }

    // Private methods

        _isValidColorMapping(level, color) {
        // Level 0 should be red
        if (level === 0) {
            return color === 'red';
        }
        // Level 1 should not be red (can be amber/yellow)
        if (level === 1) {
            return color !== 'red';
        }
        // Level 2 should be green
        if (level === 2) {
            return color === 'green';
        }
        return false;
    }

        _numericLevelToColor(level) {
        switch (level) {
            case 0: return 'red';
            case 1: return 'amber';
            case 2: return 'green';
            default: return 'red';
        }
    }

    _colorStringToLevel(color) {
        if (!color || typeof color !== 'string') return null;

        const levels = this.getConfidenceLevels();
        const colorLower = color.toLowerCase();

        switch (colorLower) {
            case 'green': return levels.GREEN;
            case 'amber': return levels.AMBER;
            case 'red': return levels.RED;
            default: return null;
        }
    }
}

// Dual-mode export for Node.js and browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfidenceMapper;
}
if (typeof window !== 'undefined') {
    window.ConfidenceMapper = ConfidenceMapper;
}
