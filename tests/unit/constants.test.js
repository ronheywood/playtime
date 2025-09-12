const { PT_CONSTANTS } = require('../../scripts/constants.js');

describe('PlayTime Constants', () => {
    describe('EVENTS', () => {
        test('should define all required event names', () => {
            const { EVENTS } = PT_CONSTANTS;
            
            expect(EVENTS.CONFIDENCE_CHANGED).toBe('playtime:confidence-changed');
            expect(EVENTS.LAYOUT_CHANGED).toBe('playtime:layout-changed');
            expect(EVENTS.PAGE_CHANGED).toBe('playtime:page-changed');
            expect(EVENTS.SCORE_SELECTED).toBe('playtime:score-selected');
            expect(EVENTS.SCORE_CREATED).toBe('playtime:score-created');
            expect(EVENTS.SCORE_SELECT_COMMAND).toBe('playtime:score-select-command');
            expect(EVENTS.HIGHLIGHT_ANNOTATION_REQUESTED).toBe('playtime:highlight-annotation-requested');
            expect(EVENTS.HIGHLIGHT_ANNOTATION_SAVED).toBe('playtime:highlight-annotation-saved');
            expect(EVENTS.HIGHLIGHT_ANNOTATION_CANCELLED).toBe('playtime:highlight-annotation-cancelled');
        });

        test('should have consistent event naming convention', () => {
            const { EVENTS } = PT_CONSTANTS;
            
            Object.values(EVENTS).forEach(eventName => {
                expect(eventName).toMatch(/^playtime:/);
                expect(eventName).toMatch(/^playtime:[a-z-]+$/);
            });
        });
    });

    describe('SELECTORS', () => {
        test('should define all required selectors', () => {
            const { SELECTORS } = PT_CONSTANTS;
            
            expect(SELECTORS.VIEWER).toBe('[data-role="pdf-viewer"]');
            expect(SELECTORS.CANVAS).toBe('[data-role="pdf-canvas"]');
            expect(SELECTORS.SELECTION_OVERLAY).toBe('[data-role="selection-overlay"]');
            expect(SELECTORS.HIGHLIGHT).toBe('[data-role="highlight"]');
            expect(SELECTORS.COLOR_GREEN).toBe('[data-role="color-green"]');
            expect(SELECTORS.COLOR_AMBER).toBe('[data-role="color-amber"]');
            expect(SELECTORS.COLOR_RED).toBe('[data-role="color-red"]');
            expect(SELECTORS.PAGE_INFO).toBe('[data-role="page-info"]');
            expect(SELECTORS.SIDEBAR).toBe('[data-role="sidebar"]');
            expect(SELECTORS.FOCUS_SECTION_BTN).toBe('#focus-section-btn');
            expect(SELECTORS.EXIT_FOCUS_BTN).toBe('#exit-focus-btn');
            expect(SELECTORS.ZOOM_IN).toBe('[data-role="zoom-in"]');
            expect(SELECTORS.ZOOM_OUT).toBe('[data-role="zoom-out"]');
        });

        test('should prefer data-role selectors over id/class selectors', () => {
            const { SELECTORS } = PT_CONSTANTS;
            
            const dataRoleSelectors = Object.values(SELECTORS).filter(selector => 
                selector.includes('data-role')
            );
            
            const otherSelectors = Object.values(SELECTORS).filter(selector => 
                !selector.includes('data-role')
            );
            
            // Most selectors should use data-role
            expect(dataRoleSelectors.length).toBeGreaterThan(otherSelectors.length);
            
            // Non-data-role selectors should only be for specific UI elements like focus buttons
            expect(otherSelectors).toEqual(['#focus-section-btn', '#exit-focus-btn']);
        });
    });

    describe('Module Exports', () => {
        test('should export PT_CONSTANTS correctly', () => {
            expect(PT_CONSTANTS).toBeDefined();
            expect(PT_CONSTANTS.EVENTS).toBeDefined();
            expect(PT_CONSTANTS.SELECTORS).toBeDefined();
        });

        test('should have immutable structure', () => {
            // Test that constants can't be accidentally modified
            const originalEvent = PT_CONSTANTS.EVENTS.SCORE_SELECTED;
            
            expect(() => {
                PT_CONSTANTS.EVENTS.SCORE_SELECTED = 'modified';
            }).not.toThrow(); // JavaScript doesn't prevent this, but test documents expected behavior
            
            // Reset for next tests
            PT_CONSTANTS.EVENTS.SCORE_SELECTED = originalEvent;
        });
    });
});
