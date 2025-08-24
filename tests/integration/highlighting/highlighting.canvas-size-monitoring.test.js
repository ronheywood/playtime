/**
 * @jest-environment jsdom
 */

const RefactoredHighlighting = require('../../../scripts/highlighting');

describe('Highlighting: Canvas Size Monitoring System', () => {
    let mockConfidence, mockConstants, mockDB;
    let viewer, canvas, mockLogger;

    beforeEach(async () => {
        // Setup DOM environment similar to real app
        document.body.innerHTML = `
            <div class="pdf-viewer-container" style="position: relative; width: 800px; height: 600px;">
                <canvas id="pdf-canvas" style="position: absolute; top: 0; left: 0; width: 300px; height: 150px;"></canvas>
            </div>
        `;

        viewer = document.querySelector('.pdf-viewer-container');
        canvas = document.getElementById('pdf-canvas');

        // Mock dependencies
        mockLogger = { 
            info: jest.fn(), 
            warn: jest.fn(), 
            debug: jest.fn(),
            error: jest.fn()
        };

        mockConfidence = {
            getCurrentConfidence: jest.fn(() => 2),
            confidenceToColor: jest.fn((conf) => {
                switch(conf) {
                    case 0: return 'red';
                    case 1: return 'amber'; 
                    case 2: return 'green';
                    default: return 'red';
                }
            }),
            colorToConfidence: jest.fn((color) => {
                switch(color) {
                    case 'red': return 0;
                    case 'amber': return 1;
                    case 'green': return 2;
                    default: return null;
                }
            })
        };

        mockConstants = {
            EVENTS: {
                CONFIDENCE_CHANGED: 'playtime:confidence-changed',
                SCORE_SELECTED: 'playtime:score-selected',
                PAGE_CHANGED: 'playtime:page-changed',
                LAYOUT_CHANGED: 'playtime:layout-changed'
            }
        };

        // Setup database mock
        mockDB = {
            getHighlights: jest.fn(),
            addHighlight: jest.fn().mockResolvedValue(true)
        };
        
        global.window.PlayTimeDB = mockDB;
        global.window.PlayTimePDFViewer = { getCurrentPage: jest.fn(() => 1) };

        await RefactoredHighlighting.init({}, mockLogger, mockConfidence, mockConstants);
    });

    afterEach(() => {
        if (RefactoredHighlighting) {
            RefactoredHighlighting._clearHighlights();
            // Stop any running monitors
            RefactoredHighlighting._stopCanvasSizeMonitoring();
        }
        document.body.innerHTML = '';
        global.window.PlayTimeDB = undefined;
        global.window.PlayTimePDFViewer = undefined;
        jest.clearAllTimers();
    });

    describe('canvas size monitoring after rehydration', () => {
        test('should log canvas size during repositioning', async () => {
            // Test what we can actually verify: the logging behavior
            
            const testHighlights = [{
                id: 'test-highlight-1',
                pdfId: 123,
                page: 1,
                xPct: 0.1, yPct: 0.2, wPct: 0.8, hPct: 0.6,
                confidence: 2, color: 'green'
            }];

            mockDB.getHighlights.mockResolvedValue(testHighlights);

            canvas.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 300, height: 150
            }));

            viewer.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 300, height: 150
            }));

            // Mock requestAnimationFrame to execute callbacks immediately
            global.requestAnimationFrame = jest.fn((callback) => {
                setTimeout(callback, 0);
                return 1;
            });

            // Trigger score selection 
            const scoreSelectedEvent = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 123 }
            });
            window.dispatchEvent(scoreSelectedEvent);

            // Wait for async operations and timer execution
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Wait a bit more for the RAF callbacks to execute
            await new Promise(resolve => setTimeout(resolve, 260)); // Wait for LAYOUT_SETTLE_DELAY (250ms)

            // Verify that repositioning was called and logged with canvas size
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('🔄 repositionAll called'),
                expect.objectContaining({
                    canvasSize: '300x150',
                    highlightCount: expect.any(Number)
                })
            );
        });

        test('should detect canvas size changes when repositioning with different sizes', async () => {
            // Test the size tracking behavior directly
            
            // Create a highlight element manually
            const highlight = document.createElement('div');
            highlight.setAttribute('data-role', 'highlight');
            highlight.dataset.hlXPct = '0.1';
            highlight.dataset.hlYPct = '0.2';
            highlight.dataset.hlWPct = '0.8';
            highlight.dataset.hlHPct = '0.6';
            viewer.appendChild(highlight);

            // Start with small canvas
            canvas.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 300, height: 150
            }));

            viewer.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 300, height: 150
            }));

            // Call repositionAll and verify logging
            RefactoredHighlighting.repositionAll();

            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('🔄 repositionAll called'),
                expect.objectContaining({
                    canvasSize: '300x150',
                    highlightCount: 1
                })
            );

            // Change to larger canvas
            canvas.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 800, height: 600
            }));

            viewer.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 800, height: 600
            }));

            // Clear previous calls
            mockLogger.info.mockClear();

            // Call repositionAll again
            RefactoredHighlighting.repositionAll();

            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('🔄 repositionAll called'),
                expect.objectContaining({
                    canvasSize: '800x600',
                    highlightCount: 1
                })
            );

            // Verify the last canvas size was tracked
            expect(RefactoredHighlighting._state.lastCanvasSize).toBe('800x600');
        });

        test('should handle successful highlight rehydration flow', async () => {
            // Test the complete rehydration flow with logging
            
            const testHighlights = [{
                id: 'test-highlight-1',
                pdfId: 123,
                page: 1,
                xPct: 0.1, yPct: 0.2, wPct: 0.8, hPct: 0.6,
                confidence: 2, color: 'green'
            }];

            mockDB.getHighlights.mockResolvedValue(testHighlights);

            canvas.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 400, height: 300
            }));

            viewer.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 400, height: 300
            }));

            // Trigger score selection
            const scoreSelectedEvent = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 123 }
            });
            window.dispatchEvent(scoreSelectedEvent);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify the complete flow was logged
            expect(mockLogger.info).toHaveBeenCalledWith(
                '🎯 Score selected, starting rehydration',
                { pdfId: 123 }
            );

            expect(mockLogger.info).toHaveBeenCalledWith(
                '📊 Loaded highlights from database',
                expect.objectContaining({
                    count: 1,
                    sampleData: expect.objectContaining({
                        xPct: 0.1, yPct: 0.2, wPct: 0.8, hPct: 0.6
                    })
                })
            );

            // Verify highlights were created and repositioned
            const highlights = RefactoredHighlighting.getHighlights();
            expect(highlights).toHaveLength(1);
        });
    });

    describe('canvas size tracking during repositioning', () => {
        test('should track canvas size during repositionAll calls', () => {
            // Arrange: Create a highlight element
            const highlight = document.createElement('div');
            highlight.setAttribute('data-role', 'highlight');
            highlight.dataset.hlXPct = '0.1';
            highlight.dataset.hlYPct = '0.2';
            highlight.dataset.hlWPct = '0.8';
            highlight.dataset.hlHPct = '0.6';
            viewer.appendChild(highlight);

            canvas.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 400, height: 300
            }));

            viewer.getBoundingClientRect = jest.fn(() => ({
                left: 0, top: 0, width: 400, height: 300
            }));

            // Act: Call repositionAll
            RefactoredHighlighting.repositionAll();

            // Assert: Should log canvas size and track it
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('repositionAll called'),
                expect.objectContaining({
                    canvasSize: '400x300',
                    highlightCount: 1
                })
            );

            expect(RefactoredHighlighting._state.lastCanvasSize).toBe('400x300');
        });

        test('should handle null canvas rect gracefully', () => {
            // Arrange: Canvas returns null rect
            canvas.getBoundingClientRect = jest.fn(() => null);

            // Act: Call repositionAll
            RefactoredHighlighting.repositionAll();

            // Assert: Should handle gracefully with 0x0 size
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('repositionAll called'),
                expect.objectContaining({
                    canvasSize: '0x0',
                    highlightCount: 0
                })
            );

            expect(RefactoredHighlighting._state.lastCanvasSize).toBe('0x0');
        });
    });
});
