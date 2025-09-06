// Integration Test: Event-Driven Scroll Timing
// Verifies that scrolling happens after layout change events

/** @jest-environment jsdom */
const Highlighting = require('../../../scripts/highlighting/highlighting.js');
const TestHelpers = require('../../helpers/test-helpers');

// Provide commonly used mocks
const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };
const mockConfidence = TestHelpers.createMockConfidenceModule();
const mockConstants = TestHelpers.createMockConstantsModule();

describe('Event-Driven Scroll Timing', () => {
    let layoutEventSpy;
    let scrollSpy;

    beforeEach(async () => {
        // Setup minimal DOM
        document.body.innerHTML = `
            <div data-role="pdf-viewer" style="position: relative; width: 500px; height: 300px;">
                <canvas data-role="pdf-canvas" width="400" height="200"></canvas>
            </div>
        `;

        // Setup globals for highlighting
        global.window.PlayTimeDB = {
            addHighlight: jest.fn().mockResolvedValue(true),
            getHighlights: jest.fn().mockResolvedValue([])
        };
        global.window.PlayTimeCurrentScoreId = 'test-pdf-123';
        global.window.PlayTimePDFViewer = {
            getCurrentPage: jest.fn().mockReturnValue(1)
        };

            // Initialize highlighting module
            await Highlighting.init(
                {},
                mockLogger,
                mockConfidence,
                mockConstants,
                { database: global.window.PlayTimeDB }
            );

        // Setup spies
        layoutEventSpy = jest.fn();
        const layoutEventName = 'playtime:layout-changed';
        window.addEventListener(layoutEventName, layoutEventSpy);

        // Spy on scrollIntoView
        scrollSpy = jest.fn();
        Element.prototype.scrollIntoView = scrollSpy;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function createMockHighlight() {
        const highlight = document.createElement('div');
        highlight.setAttribute('data-role', 'highlight');
        highlight.dataset.hlXPct = '25';
        highlight.dataset.hlYPct = '30';
        highlight.dataset.hlWPct = '20';
        highlight.dataset.hlHPct = '15';
        highlight.dataset.confidence = 'green';
        highlight.getBoundingClientRect = jest.fn().mockReturnValue({
            top: 100, left: 100, width: 200, height: 150,
            bottom: 250, right: 300
        });
        document.body.appendChild(highlight);
        return highlight;
    }

    function waitFor(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    describe('Event-Based Scroll Scheduling', () => {
        test('should schedule scroll after layout event', async () => {
            const highlight = createMockHighlight();
            
            scrollSpy.mockClear();

            // Call the internal scheduling method directly
            Highlighting._scheduleScrollAfterLayout(highlight, {
                xPct: 25, yPct: 30, wPct: 20, hPct: 15
            });
            
            // Should not scroll immediately
            expect(scrollSpy).not.toHaveBeenCalled();
            
            // Trigger layout change event
            window.dispatchEvent(new CustomEvent('playtime:layout-changed'));
            
            // Wait for the scheduled scroll
            await waitFor(100);
            
            // Should have scrolled after event
            expect(scrollSpy).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        });

        test('should fallback to timeout if no layout event', async () => {
            const highlight = createMockHighlight();
            
            scrollSpy.mockClear();

            // Schedule scroll but don't fire layout event
            Highlighting._scheduleScrollAfterLayout(highlight, {
                xPct: 25, yPct: 30, wPct: 20, hPct: 15
            });
            
            // Should not scroll immediately
            expect(scrollSpy).not.toHaveBeenCalled();
            
            // Wait less than fallback timeout
            await waitFor(500);
            expect(scrollSpy).not.toHaveBeenCalled();
            
            // Wait for fallback timeout (1000ms)
            await waitFor(600);
            
            // Should have scrolled via timeout fallback
            expect(scrollSpy).toHaveBeenCalled();
        });

        test('should handle multiple rapid schedule calls', async () => {
            const highlight = createMockHighlight();
            
            scrollSpy.mockClear();

            // Multiple rapid calls
            Highlighting._scheduleScrollAfterLayout(highlight, { xPct: 25, yPct: 30, wPct: 20, hPct: 15 });
            Highlighting._scheduleScrollAfterLayout(highlight, { xPct: 50, yPct: 60, wPct: 20, hPct: 15 });
            Highlighting._scheduleScrollAfterLayout(highlight, { xPct: 75, yPct: 90, wPct: 20, hPct: 15 });
            
            // Trigger layout event
            window.dispatchEvent(new CustomEvent('playtime:layout-changed'));
            
            await waitFor(100);
            
            // Should have handled without errors
            expect(scrollSpy).toHaveBeenCalled();
        });

        test('should clean up event listeners after scroll', async () => {
            const highlight = createMockHighlight();
            
            // Get reference to addEventListener to spy on it
            const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
            const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
            
            addEventListenerSpy.mockClear();
            removeEventListenerSpy.mockClear();

            // Schedule scroll
            Highlighting._scheduleScrollAfterLayout(highlight, {
                xPct: 25, yPct: 30, wPct: 20, hPct: 15
            });
            
            // Should have added event listener
            expect(addEventListenerSpy).toHaveBeenCalledWith('playtime:layout-changed', expect.any(Function));
            
            // Trigger layout event
            window.dispatchEvent(new CustomEvent('playtime:layout-changed'));
            
            await waitFor(100);
            
            // Should have removed event listener
            expect(removeEventListenerSpy).toHaveBeenCalledWith('playtime:layout-changed', expect.any(Function));
        });
    });

    describe('Focus Integration', () => {
        test('should use scheduled scroll in focusOnHighlight when layout commands available', () => {
            const highlight = createMockHighlight();
            
            // Mock layout commands to trigger our new path
            global.window.PlayTimeLayoutCommands = {
                changeLayout: jest.fn()
            };
            global.window.PlayTimePDFViewer = {
                getCurrentPage: jest.fn().mockReturnValue(1),
                focusOnRectPercent: jest.fn().mockResolvedValue()
            };
            
            // Spy on our scheduling method
            const scheduleScrollSpy = jest.spyOn(Highlighting, '_scheduleScrollAfterLayout');
            
            // Call focus
            Highlighting.focusOnHighlight(highlight);
            
            // Should have called our scheduling method
            expect(scheduleScrollSpy).toHaveBeenCalledWith(
                highlight,
                { xPct: 25, yPct: 30, wPct: 20, hPct: 15 }
            );
            
            // Clean up
            delete global.window.PlayTimeLayoutCommands;
        });
    });
});
