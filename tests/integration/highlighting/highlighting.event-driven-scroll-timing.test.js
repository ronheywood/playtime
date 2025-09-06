/** @jest-environment jsdom */
const Highlighting = require('../../../scripts/highlighting/highlighting.js');

describe('Event-Driven Scroll Timing', () => {
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
        const mockConfidence = {
            ConfidenceLevel: { RED: 0, AMBER: 1, GREEN: 2 },
            confidenceToColor: (level) => {
                switch(level) {
                    case 0: return 'red';
                    case 1: return 'amber';
                    case 2: return 'green';
                    default: return 'unknown';
                }
            },
            colorToConfidence: (color) => {
                switch(color) {
                    case 'red': return 0;
                    case 'amber': return 1;
                    case 'green': return 2;
                    default: return null;
                }
            }
        };

        const mockConstants = {
            HIGHLIGHT_COLORS: {
                RED: '#ff4444',
                AMBER: '#ffaa00',
                GREEN: '#44dd44'
            },
            SELECTORS: {
                PDF_VIEWER: '[data-role="pdf-viewer"]',
                PDF_CANVAS: '[data-role="pdf-canvas"]',
                HIGHLIGHT: '[data-role="highlight"]'
            },
            EVENTS: {
                CONFIDENCE_CHANGED: 'playtime:confidence-changed',
                LAYOUT_CHANGED: 'playtime:layout-changed',
                PAGE_CHANGED: 'playtime:page-changed'
            }
        };

        await Highlighting.init(
            {},
            { info: () => {}, warn: () => {}, error: () => {} },
            mockConfidence,
            mockConstants,
            { database: global.window.PlayTimeDB }
        );

        // Spy on scrollIntoView
        scrollSpy = jest.fn();
        Element.prototype.scrollIntoView = scrollSpy;
    });

    afterEach(() => {
        jest.restoreAllMocks();
        document.body.innerHTML = '';
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

    test('_scheduleScrollAfterLayout method exists and can be called', () => {
        const highlight = createMockHighlight();
        
        // Check that the method exists
        expect(typeof Highlighting._scheduleScrollAfterLayout).toBe('function');
        
        // Call the method - it should not throw
        expect(() => {
            Highlighting._scheduleScrollAfterLayout(highlight);
        }).not.toThrow();
    });

    test('scheduled scroll executes after layout change event', async () => {
        const highlight = createMockHighlight();
        
        scrollSpy.mockClear();

        // Call the scheduling method
        Highlighting._scheduleScrollAfterLayout(highlight);
        
        // Should not scroll immediately
        expect(scrollSpy).not.toHaveBeenCalled();
        
        // Trigger layout change event on window (not document)
        window.dispatchEvent(new CustomEvent('playtime:layout-changed'));
        
        // Wait for event processing and the internal delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Should have scrolled now
        expect(scrollSpy).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    });

    test('focusOnHighlight calls _scheduleScrollAfterLayout', async () => {
        // Mock layout commands to ensure we hit the correct code path
        global.window.PlayTimeLayoutCommands = {
            changeLayout: jest.fn(),
            registerHandler: jest.fn()
        };
        global.window.PlayTimePDFViewer = {
            getCurrentPage: jest.fn().mockReturnValue(1),
            focusOnRectPercent: jest.fn().mockResolvedValue(true)
        };
        
        const highlight = createMockHighlight();
        const scheduleScrollSpy = jest.spyOn(Highlighting, '_scheduleScrollAfterLayout');
        
        // Call focusOnHighlight
        Highlighting.focusOnHighlight(highlight);
        
        // Should have called the scheduling method
        expect(scheduleScrollSpy).toHaveBeenCalledWith(highlight, {
            xPct: 25, yPct: 30, wPct: 20, hPct: 15
        });
        
        scheduleScrollSpy.mockRestore();
    });

    test('fallback timeout works when no layout event fired', async () => {
        const highlight = createMockHighlight();
        
        scrollSpy.mockClear();
        
        // Call the scheduling method
        Highlighting._scheduleScrollAfterLayout(highlight);
        
        // Should not scroll immediately
        expect(scrollSpy).not.toHaveBeenCalled();
        
        // Don't trigger layout event - let fallback timeout handle it
        await new Promise(resolve => setTimeout(resolve, 1100)); // Wait longer than 1 second fallback
        
        // Should have scrolled via fallback timeout
        expect(scrollSpy).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    });
});
