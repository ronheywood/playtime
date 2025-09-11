/** @jest-environment jsdom */
const Highlighting = require('../../../scripts/highlighting/highlighting.js');
const TestHelpers = require('../../helpers/test-helpers');

describe('Highlighting - Integration Tests', () => {
    let mockDatabase, mockPDFViewer, mockConfidence, silentLogger;

    beforeEach(() => {
        // Create silent logger to reduce test noise
        silentLogger = TestHelpers.createSilentLogger();
        
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
        
        global.PlayTimeConfidence = mockConfidence;

        // Mock constants
        global.PT_CONSTANTS = {
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
        delete global.PlayTimeConfidence;
        delete global.PT_CONSTANTS;
    });

    describe('initialization', () => {
        test('initializes successfully with default config', async () => {
            const logger = { warn: jest.fn(), debug: jest.fn() };
            
            await Highlighting.init({}, logger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
            
            expect(Highlighting._state.initialized).toBe(true);
            expect(Highlighting._state.viewer).toBeTruthy();
            expect(Highlighting._state.canvas).toBeTruthy();
        });

        test('warns when DOM elements not found', async () => {
            document.body.innerHTML = ''; // Remove required elements
            const logger = { warn: jest.fn(), debug: jest.fn() };
            
            await Highlighting.init({}, logger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
            
            expect(logger.warn).toHaveBeenCalledWith('Required DOM elements not found');
        });

        test('merges custom configuration', async () => {
            const customConfig = {
                SELECTORS: { CUSTOM: '[data-custom]' },
                TIMING: { REHYDRATION_DELAY: 100 }
            };
            
            await Highlighting.init(customConfig, silentLogger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
            
            expect(Highlighting.CONFIG.SELECTORS.CUSTOM).toBe('[data-custom]');
            expect(Highlighting.CONFIG.TIMING.REHYDRATION_DELAY).toBe(100);
        });
    });

    describe('confidence management', () => {
        beforeEach(async () => {
            await Highlighting.init({}, silentLogger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
        });

        test('sets active confidence from color', () => {
            Highlighting.setActiveConfidenceFromColor('green');
            
            expect(Highlighting._state.activeConfidence).toBe(2);
        });

        test('handles invalid color gracefully', () => {
            Highlighting.setActiveConfidenceFromColor('invalid');
            
            // The mock confidence module should return null for invalid colors
            expect(Highlighting._state.activeConfidence).toBe(null);
        });
    });

    describe('highlight management', () => {
        beforeEach(async () => {
            await Highlighting.init({}, silentLogger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
        });

        test('adds sections from database records', () => {
            const sections = [
                {
                    xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1,
                    color: 'red', confidence: 0, page: 1
                }
            ];
            
            Highlighting.addSections(sections);
            
            const highlights = Highlighting.getHighlights();
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
            
            Highlighting.addSections(sections);
            
            expect(Highlighting.getHighlights().length).toBe(1);
        });

        test('repositions all highlights', () => {
            // Add a highlight first
            const sections = [{
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1,
                color: 'red', confidence: 0, page: 1
            }];
            Highlighting.addSections(sections);
            
            const highlight = Highlighting.getHighlights()[0];
            const originalLeft = parseFloat(highlight.style.left);
            const originalTop = parseFloat(highlight.style.top);
            
            // Mock canvas getBoundingClientRect to simulate position change
            const canvas = Highlighting._state.canvas;
            const viewer = Highlighting._state.viewer;
            
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
            
            Highlighting.repositionAll();
            
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
            await Highlighting.init({}, silentLogger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
            Highlighting.setActiveConfidenceFromColor('red');
        });

        test('creates highlight on significant mouse selection', () => {
            const canvas = Highlighting._state.canvas;
            
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
            
            const highlights = Highlighting.getHighlights();
            expect(highlights.length).toBe(1);
            expect(highlights[0].getAttribute('data-color')).toBe('red');
        });

        test('ignores too small selections', () => {
            const canvas = Highlighting._state.canvas;
            
            // Simulate tiny mouse drag
            canvas.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, clientX: 100, clientY: 100
            }));
            canvas.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true, clientX: 101, clientY: 101
            }));
            
            expect(Highlighting.getHighlights().length).toBe(0);
        });

        test('warns when no confidence set', () => {
            const logger = { warn: jest.fn() };
            Highlighting._state.logger = logger;
            Highlighting._state.activeConfidence = null;
            
            const canvas = Highlighting._state.canvas;
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
            await Highlighting.init({}, silentLogger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
        });

        test('handles confidence changed events', () => {
            const event = new CustomEvent('playtime:confidence-changed', {
                detail: { color: 'green' }
            });
            
            window.dispatchEvent(event);
            
            expect(Highlighting._state.activeConfidence).toBe(2);
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
            Highlighting.addSections([
                { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1, color: 'red', confidence: 0, page: 1 },
                { xPct: 0.4, yPct: 0.5, wPct: 0.2, hPct: 0.1, color: 'green', confidence: 2, page: 2 }
            ]);
            
            const highlights = Highlighting.getHighlights();
            
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
            await Highlighting.init({}, silentLogger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
            Highlighting.setActiveConfidenceFromColor('amber');
        });

        test('persists highlights to database', async () => {
            const canvas = Highlighting._state.canvas;
            
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
            Highlighting._state.logger = logger;
            mockDatabase.addHighlight.mockRejectedValue(new Error('DB Error'));
            
            const canvas = Highlighting._state.canvas;
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
            await Highlighting.init({}, silentLogger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
        });

        test('maintains getHighlights() compatibility', () => {
            const result = Highlighting.getHighlights();
            expect(Array.isArray(result)).toBe(true);
        });

        test('maintains repositionAll() compatibility', () => {
            expect(() => Highlighting.repositionAll()).not.toThrow();
        });
    });

    describe('practice mode selection disable/enable', () => {
        beforeEach(async () => {
            await Highlighting.init({}, silentLogger, mockConfidence, PT_CONSTANTS, { database: global.window.PlayTimeDB });
        });

        test('should disable selection when disableSelection() is called', () => {
            // Get the mouse handler instance
            const mouseHandler = Highlighting._components.mouseHandler;
            expect(mouseHandler.disabled).toBe(false);

            // Disable selection
            Highlighting.disableSelection();

            // Verify selection is disabled
            expect(mouseHandler.disabled).toBe(true);
        });

        test('should re-enable selection when enableSelection() is called', () => {
            // Get the mouse handler instance
            const mouseHandler = Highlighting._components.mouseHandler;
            
            // First disable
            Highlighting.disableSelection();
            expect(mouseHandler.disabled).toBe(true);

            // Then re-enable
            Highlighting.enableSelection();
            expect(mouseHandler.disabled).toBe(false);
        });

        test('should not create highlights when selection is disabled', () => {
            const canvas = document.querySelector('[data-role="pdf-canvas"]');
            Highlighting.disableSelection();

            // Simulate mouse events that would normally create a highlight
            const mouseDownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                clientX: 100,
                clientY: 100
            });
            const mouseUpEvent = new MouseEvent('mouseup', {
                bubbles: true,
                clientX: 150,
                clientY: 150
            });

            canvas.dispatchEvent(mouseDownEvent);
            canvas.dispatchEvent(mouseUpEvent);

            // Verify no highlight was created (no database call)
            expect(mockDatabase.addHighlight).not.toHaveBeenCalled();
        });

        test('should create highlights normally when selection is re-enabled', async () => {
            const canvas = document.querySelector('[data-role="pdf-canvas"]');
            
            // Disable and then re-enable selection
            Highlighting.disableSelection();
            Highlighting.enableSelection();

            // Set a confidence level
            Highlighting.setActiveConfidenceFromColor('amber');

            // Wait for any async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Simulate mouse events to create a highlight
            const mouseDownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                clientX: 100,
                clientY: 100
            });
            canvas.dispatchEvent(mouseDownEvent);

            const mouseMoveEvent = new MouseEvent('mousemove', {
                bubbles: true,
                clientX: 150,
                clientY: 150
            });
            document.dispatchEvent(mouseMoveEvent);

            const mouseUpEvent = new MouseEvent('mouseup', {
                bubbles: true,
                clientX: 150,
                clientY: 150
            });
            document.dispatchEvent(mouseUpEvent);

            // Wait for async database operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify highlight creation was attempted
            expect(mockDatabase.addHighlight).toHaveBeenCalled();
        });
    });
});
