/**
 * Unit tests for confidence enum & mapping utilities
 * TDD: this test drives creation of scripts/confidence.js
 */

describe('confidence enum & mappings', () => {
    let confidence;
    beforeAll(() => {
        try {
            confidence = require('../../scripts/confidence');
        } catch (e) {
            // Module may not exist yet in RED phase; leave undefined so first test fails meaningfully
        }
    });

    test('exports ConfidenceLevel enum with RED, AMBER, GREEN numeric values', () => {
        expect(confidence).toBeDefined();
        expect(confidence.ConfidenceLevel).toBeDefined();
        expect(confidence.ConfidenceLevel.RED).toBe(0);
        expect(confidence.ConfidenceLevel.AMBER).toBe(1);
        expect(confidence.ConfidenceLevel.GREEN).toBe(2);
        // Enum should be frozen (no mutation)
        expect(Object.isFrozen(confidence.ConfidenceLevel)).toBe(true);
    });

    test('confidenceToColor maps enum to legacy color strings', () => {
        const { ConfidenceLevel, confidenceToColor } = confidence;
        expect(confidenceToColor(ConfidenceLevel.RED)).toBe('red');
        expect(confidenceToColor(ConfidenceLevel.AMBER)).toBe('amber');
        expect(confidenceToColor(ConfidenceLevel.GREEN)).toBe('green');
    });

    test('colorToConfidence maps legacy color to enum', () => {
        const { ConfidenceLevel, colorToConfidence } = confidence;
        expect(colorToConfidence('red')).toBe(ConfidenceLevel.RED);
        expect(colorToConfidence('amber')).toBe(ConfidenceLevel.AMBER);
        expect(colorToConfidence('green')).toBe(ConfidenceLevel.GREEN);
    });
});
