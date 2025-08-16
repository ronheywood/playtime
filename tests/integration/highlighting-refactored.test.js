/** @jest-environment jsdom */
const RefactoredHighlighting = require('../../scripts/highlighting-refactored');

describe('RefactoredHighlighting - Integration Tests', () => {
    let mockDatabase, mockPDFViewer, mockConfidence;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div data-role="pdf-viewer" style="position: relative; width: 500px; height: 300px;">
                <canvas data-role="pdf-canvas" width="400" height="200" style="position: absolute; left: 50px; top: 25px;"></canvas>
            </div>
        `;

        // Mock dependencies
        mockDatabase = {
            addHighlight: jest.fn().mockResolvedValue(true),
            getHighlights: jest.fn().mockResolvedValue([])
        };

        mockPDFViewer = {
            getCurrentPage: jest.fn().mockReturnValue(1)
        };

        // Setup globals
        global.window.PlayTimeDB = mockDatabase;
        global.window.PlayTimePDFViewer = mockPDFViewer;
        global.window.PlayTimeCurrentScoreId = 'test-pdf-123';

        // Mock confidence module
        mockConfidence = {
            ConfidenceLevel: { RED: 0, AMBER: 1, GREEN: 2 },
            confidenceToColor: (level) => {
                switch(level) {
                    case 0: return 'red';
                    case 1: return 'amber';
                    case 2: return 'green';
                    default: return 'red';
                }
            },
            colorToConfidence: (color) => {
                switch(color) {
                    case 'red': return 0;
                    case 'amber': return 1;
                    case 'green': return 2;
                    default: return null; // Return null for invalid colors
                }
            }
        };
        
        global.window.PlayTimeConfidence = mockConfidence;
        global.PlayTimeConfidence = mockConfidence; // Also set on global directly

        // Mock constants
        global.window.PlayTimeConstants = {
            EVENTS: {
                CONFIDENCE_CHANGED: 'playtime:confidence-changed',
                SCORE_SELECTED: 'playtime:score-selected',
                PAGE_CHANGED: 'playtime:page-changed',
                LAYOUT_CHANGED: 'playtime:layout-changed'
            },
            SELECTORS: {}
        };
    });

    afterEach(() => {
        // Cleanup
        delete global.window.PlayTimeDB;
        delete global.window.PlayTimePDFViewer;
        delete global.window.PlayTimeCurrentScoreId;
        delete global.window.PlayTimeConfidence;
        delete global.window.PlayTimeConstants;
    });

    describe('initialization', () => {
        test('initializes successfully with default config', async () => {
            const logger = { warn: jest.fn(), debug: jest.fn() };
            
            await RefactoredHighlighting.init({}, logger, mockConfidence, global.window.PlayTimeConstants);
            
            expect(RefactoredHighlighting._state.initialized).toBe(true);
            expect(RefactoredHighlighting._state.viewer).toBeTruthy();
            expect(RefactoredHighlighting._state.canvas).toBeTruthy();
        });

        test('warns when DOM elements not found', async () => {
            document.body.innerHTML = ''; // Remove required elements
            const logger = { warn: jest.fn(), debug: jest.fn() };
            
            await RefactoredHighlighting.init({}, logger, mockConfidence, global.window.PlayTimeConstants);
            
            expect(logger.warn).toHaveBeenCalledWith('Required DOM elements not found');
        });

        test('merges custom configuration', async () => {
            const customConfig = {
                SELECTORS: { CUSTOM: '[data-custom]' },
                TIMING: { REHYDRATION_DELAY: 100 }
            };
            
            await RefactoredHighlighting.init(customConfig, console, mockConfidence, global.window.PlayTimeConstants);
            
            expect(RefactoredHighlighting.CONFIG.SELECTORS.CUSTOM).toBe('[data-custom]');
            expect(RefactoredHighlighting.CONFIG.TIMING.REHYDRATION_DELAY).toBe(100);
        });
    });

    describe('confidence management', () => {
        beforeEach(async () => {
            await RefactoredHighlighting.init({}, console, mockConfidence, global.window.PlayTimeConstants);
        });

        test('sets active confidence from color', () => {
            RefactoredHighlighting.setActiveConfidenceFromColor('green');
            
            expect(RefactoredHighlighting._state.activeConfidence).toBe(2);
        });

        test('handles invalid color gracefully', () => {
            RefactoredHighlighting.setActiveConfidenceFromColor('invalid');
            
            // The mock confidence module should return null for invalid colors
            expect(RefactoredHighlighting._state.activeConfidence).toBe(null);
        });
    });

    describe('highlight management', () => {
        beforeEach(async () => {
            await RefactoredHighlighting.init({}, console, mockConfidence, global.window.PlayTimeConstants);
        });

        test('adds sections from database records', () => {
            const sections = [
                {
                    xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1,
                    color: 'red', confidence: 0, page: 1
                }
            ];
            
            RefactoredHighlighting.addSections(sections);
            
            const highlights = RefactoredHighlighting.getHighlights();
            expect(highlights.length).toBe(1);
            expect(highlights[0].getAttribute('data-color')).toBe('red');
        });

        test('filters invalid sections', () => {
            const sections = [
                { invalid: 'section' },
                {
                    xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1,
                    color: 'red', confidence: 0, page: 1
                }
            ];
            
            RefactoredHighlighting.addSections(sections);
            
            expect(RefactoredHighlighting.getHighlights().length).toBe(1);
        });

        test('repositions all highlights', () => {
            // Add a highlight first
            const sections = [{
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1,
                color: 'red', confidence: 0, page: 1
            }];
            RefactoredHighlighting.addSections(sections);
            
            const highlight = RefactoredHighlighting.getHighlights()[0];
            const originalLeft = parseFloat(highlight.style.left);
            const originalTop = parseFloat(highlight.style.top);
            
            // Mock canvas getBoundingClientRect to simulate position change
            const canvas = RefactoredHighlighting._state.canvas;
            const viewer = RefactoredHighlighting._state.viewer;
            
            const originalCanvasRect = canvas.getBoundingClientRect;
            const originalViewerRect = viewer.getBoundingClientRect;
            
            canvas.getBoundingClientRect = jest.fn(() => ({
                left: 200, // Changed from ~100
                top: 75,   // Changed from ~50
                width: 400,
                height: 200
            }));
            
            viewer.getBoundingClientRect = jest.fn(() => ({
                left: 150, // Changed position
                top: 50,
                width: 500,
                height: 300
            }));
            
            RefactoredHighlighting.repositionAll();
            
            const newLeft = parseFloat(highlight.style.left);
            const newTop = parseFloat(highlight.style.top);
            
            // Position should be updated
            expect(newLeft).not.toBe(originalLeft);
            expect(newTop).not.toBe(originalTop);
            
            // Restore original methods
            canvas.getBoundingClientRect = originalCanvasRect;
            viewer.getBoundingClientRect = originalViewerRect;
        });
    });

    describe('mouse selection', () => {
        beforeEach(async () => {
            await RefactoredHighlighting.init({}, console, mockConfidence, global.window.PlayTimeConstants);
            RefactoredHighlighting.setActiveConfidenceFromColor('red');
        });

        test('creates highlight on significant mouse selection', () => {
            const canvas = RefactoredHighlighting._state.canvas;
            
            // Simulate mouse drag
            canvas.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, clientX: 100, clientY: 100
            }));
            canvas.dispatchEvent(new MouseEvent('mousemove', {
                bubbles: true, clientX: 150, clientY: 130
            }));
            canvas.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true, clientX: 150, clientY: 130
            }));
            
            const highlights = RefactoredHighlighting.getHighlights();
            expect(highlights.length).toBe(1);
            expect(highlights[0].getAttribute('data-color')).toBe('red');
        });

        test('ignores too small selections', () => {
            const canvas = RefactoredHighlighting._state.canvas;
            
            // Simulate tiny mouse drag
            canvas.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, clientX: 100, clientY: 100
            }));
            canvas.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true, clientX: 101, clientY: 101
            }));
            
            expect(RefactoredHighlighting.getHighlights().length).toBe(0);
        });

        test('warns when no confidence set', () => {
            const logger = { warn: jest.fn() };
            RefactoredHighlighting._state.logger = logger;
            RefactoredHighlighting._state.activeConfidence = null;
            
            const canvas = RefactoredHighlighting._state.canvas;
            canvas.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, clientX: 100, clientY: 100
            }));
            canvas.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true, clientX: 150, clientY: 130
            }));
            
            expect(logger.warn).toHaveBeenCalledWith('No active confidence set for highlighting');
        });
    });

    describe('event handling', () => {
        beforeEach(async () => {
            await RefactoredHighlighting.init({}, console, mockConfidence, global.window.PlayTimeConstants);
        });

        test('handles confidence changed events', () => {
            const event = new CustomEvent('playtime:confidence-changed', {
                detail: { color: 'green' }
            });
            
            window.dispatchEvent(event);
            
            expect(RefactoredHighlighting._state.activeConfidence).toBe(2);
        });

        test('handles score selected events', async () => {
            mockDatabase.getHighlights.mockResolvedValue([
                {
                    xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1,
                    color: 'amber', confidence: 1, page: 1
                }
            ]);
            
            const event = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'new-pdf-456' }
            });
            
            window.dispatchEvent(event);
            
            // Wait for async handling
            await new Promise(resolve => setTimeout(resolve, 20));
            
            expect(mockDatabase.getHighlights).toHaveBeenCalledWith('new-pdf-456');
        });

        test('handles page changed events', () => {
            // Add highlights for different pages
            RefactoredHighlighting.addSections([
                { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1, color: 'red', confidence: 0, page: 1 },
                { xPct: 0.4, yPct: 0.5, wPct: 0.2, hPct: 0.1, color: 'green', confidence: 2, page: 2 }
            ]);
            
            const highlights = RefactoredHighlighting.getHighlights();
            
            // Switch to page 2
            const event = new CustomEvent('playtime:page-changed', {
                detail: { page: 2 }
            });
            window.dispatchEvent(event);
            
            expect(highlights[0].style.display).toBe('none'); // page 1 highlight hidden
            expect(highlights[1].style.display).toBe('block'); // page 2 highlight shown
        });
    });

    describe('persistence', () => {
        beforeEach(async () => {
            await RefactoredHighlighting.init({}, console, mockConfidence, global.window.PlayTimeConstants);
            RefactoredHighlighting.setActiveConfidenceFromColor('amber');
        });

        test('persists highlights to database', async () => {
            const canvas = RefactoredHighlighting._state.canvas;
            
            // Create highlight via mouse
            canvas.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, clientX: 100, clientY: 100
            }));
            canvas.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true, clientX: 150, clientY: 130
            }));
            
            // Wait for persistence
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockDatabase.addHighlight).toHaveBeenCalledWith(
                expect.objectContaining({
                    pdfId: 'test-pdf-123',
                    confidence: 1,
                    color: 'amber'
                })
            );
        });

        test('handles persistence errors gracefully', async () => {
            const logger = { warn: jest.fn() };
            RefactoredHighlighting._state.logger = logger;
            mockDatabase.addHighlight.mockRejectedValue(new Error('DB Error'));
            
            const canvas = RefactoredHighlighting._state.canvas;
            canvas.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, clientX: 100, clientY: 100
            }));
            canvas.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true, clientX: 150, clientY: 130
            }));
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(logger.warn).toHaveBeenCalledWith(
                'Failed to persist highlight:', 
                expect.any(Error)
            );
        });
    });

    describe('legacy API compatibility', () => {
        beforeEach(async () => {
            await RefactoredHighlighting.init({}, console, mockConfidence, global.window.PlayTimeConstants);
        });

        test('maintains getHighlights() compatibility', () => {
            const result = RefactoredHighlighting.getHighlights();
            expect(Array.isArray(result)).toBe(true);
        });

        test('maintains repositionAll() compatibility', () => {
            expect(() => RefactoredHighlighting.repositionAll()).not.toThrow();
        });

        test('maintains focusOnSection() compatibility', async () => {
            const result = await RefactoredHighlighting.focusOnSection();
            expect(result).toBeUndefined();
        });

        test('maintains enable/disableSelection() compatibility', () => {
            expect(() => RefactoredHighlighting.enableSelection()).not.toThrow();
            expect(() => RefactoredHighlighting.disableSelection()).not.toThrow();
        });
    });
});
