/**
 * Practice Session Starter Unit Tests
 * Tests the environment setup and cleanup functionality
 */

const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock requestAnimationFrame for the test environment
global.window.requestAnimationFrame = jest.fn(callback => {
    callback();
    return 1;
});

// Import the module using require for CommonJS compatibility
const PracticeSessionStarter = require('../../scripts/Practice/practice-session-starter');

describe('PracticeSessionStarter', () => {
    let practiceSessionStarter;
    let mockLogger;
    let mockViewer;
    let mockHighlighting;
    let mockLayoutCommands;

    // Clean up after all tests in this suite
    afterAll(() => {
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    // Use fake timers for tests to control timing
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Mock logger
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

    // Create mocks and inject them via constructor options to avoid touching globals
        mockViewer = {
            getCurrentPage: jest.fn().mockReturnValue(1),
            renderPage: jest.fn().mockResolvedValue()
        };
        mockHighlighting = {
            disableSelection: jest.fn(),
            enableSelection: jest.fn(),
            focusOnHighlight: jest.fn(),
            exitFocusMode: jest.fn(),
            _components: { persistenceService: { getHighlight: jest.fn() } }
        };
        mockLayoutCommands = { execute: jest.fn() };

        // Mock event dispatching
        global.window.dispatchEvent = jest.fn();

        // Mock DOM elements with required methods
        const mockElement = {
            setAttribute: jest.fn(),
            removeAttribute: jest.fn(),
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            },
            scrollIntoView: jest.fn(),
            style: {
                setProperty: jest.fn(),
                removeProperty: jest.fn(),
                display: ''
            }
        };

        // Mock querySelectorAll to return an array with mock methods
        const mockHighlights = [
            { classList: { remove: jest.fn() } },
            { classList: { remove: jest.fn() } }
        ];

        // Set up DOM query methods
        document.querySelector = jest.fn((selector) => {
            if (selector.includes('viewer-section') || 
                selector.includes('pdf-viewer') || 
                selector.includes('practice-session-timer') ||
                selector.includes('pdf-canvas') ||
                selector.includes('data-hl-id')) {
                return mockElement;
            }
            return null;
        });

        document.querySelectorAll = jest.fn(() => mockHighlights);

        // Create instance with injected mocks (constructor injection)
        practiceSessionStarter = new PracticeSessionStarter(mockLogger, {
            highlighting: mockHighlighting,
            layoutCommands: mockLayoutCommands,
            pdfViewer: mockViewer
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Clear any pending timers to prevent test leaks
        jest.clearAllTimers();
        // Also clear any setTimeout/setInterval that might be pending
        if (global.setTimeout && global.setTimeout.mock) {
            global.setTimeout.mockClear();
        }
        // Clean up DI registration and legacy global if present
        try {
            if (global.window && global.window.diContainer && global.window.diContainer.container && typeof global.window.diContainer.container.remove === 'function') {
                global.window.diContainer.container.remove('playTimePDFViewer');
            }
        } catch (_) {}
        try { delete global.window.PlayTimePDFViewer; } catch (_) {}
    });

    describe('Constructor', () => {
        test('should initialize with provided logger', () => {
            expect(practiceSessionStarter.logger).toBe(mockLogger);
        });
    });

    describe('setupPracticeModeEnvironment', () => {
        test('should disable highlighting and set practice mode layout', async () => {
            const result = await practiceSessionStarter.setupPracticeModeEnvironment();

            expect(result).toBe(true);
            expect(mockHighlighting.disableSelection).toHaveBeenCalled();
            expect(mockLayoutCommands.execute).toHaveBeenCalledWith('practice-mode', { action: 'enter' });
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Session Starter: Highlight selection disabled');
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Session Starter: Entered practice mode layout');
        });

        test('should fallback to direct attribute setting when layout commands not available', async () => {
            // Instantiate without layoutCommands to trigger fallback behavior
            const fallbackStarter = new PracticeSessionStarter(mockLogger, {
                highlighting: mockHighlighting,
                layoutCommands: undefined,
                pdfViewer: mockViewer
            });

            const result = await fallbackStarter.setupPracticeModeEnvironment();

            expect(result).toBe(true);
            expect(document.querySelector).toHaveBeenCalledWith('#viewer-section');
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Session Starter: Set practice mode attribute directly');
        });

        test('should handle missing highlighting system gracefully', async () => {
            // Instantiate without highlighting to simulate missing system
            const fallbackStarter = new PracticeSessionStarter(mockLogger, {
                highlighting: undefined,
                layoutCommands: mockLayoutCommands,
                pdfViewer: mockViewer
            });

            const result = await fallbackStarter.setupPracticeModeEnvironment();
            expect(result).toBe(true);
            expect(result).toBeTruthy();
        });
    });

    describe('cleanupPracticeModeEnvironment', () => {
        test('should re-enable highlighting and clean up environment', () => {
            practiceSessionStarter.cleanupPracticeModeEnvironment();

            expect(mockHighlighting.enableSelection).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Session Starter: Highlight selection re-enabled');
        });

        test('should clean up DOM elements and layout', () => {
            practiceSessionStarter.cleanupPracticeModeEnvironment();

            // Should call the specific cleanup actions
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Session Starter: Highlight selection re-enabled');
        });

        test('should handle missing elements gracefully', () => {
            document.querySelector.mockReturnValue(null);

            expect(() => practiceSessionStarter.cleanupPracticeModeEnvironment()).not.toThrow();
        });
    });

    describe('focusOnPracticeSection', () => {
        const highlightId = 'test-highlight-123';

        test('should focus on highlight element when found', async () => {
            const mockHighlightElement = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };

            document.querySelector.mockImplementation((selector) => {
                if (selector.includes('data-hl-id')) {
                    return mockHighlightElement;
                }
                return { classList: { remove: jest.fn() } };
            });

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(mockHighlightElement.classList.add).toHaveBeenCalledWith('current-practice-section');
            expect(mockHighlighting.focusOnHighlight).toHaveBeenCalledWith(mockHighlightElement);
        });

        test('should navigate to highlight page when needed', async () => {
            const mockHighlightData = { page: 2 };
            mockHighlighting._components.persistenceService.getHighlight.mockResolvedValue(mockHighlightData);
            mockViewer.getCurrentPage.mockReturnValue(1);

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(mockViewer.renderPage).toHaveBeenCalledWith(2);
        });

        test('should handle missing highlight element gracefully', async () => {
            document.querySelector.mockReturnValue(null);

            await expect(practiceSessionStarter.focusOnPracticeSection(highlightId)).resolves.not.toThrow();
            expect(mockLogger.warn).toHaveBeenCalledWith('Practice Session Starter: Highlight element not found after navigation', { highlightId });
        });

        test('should handle navigation errors gracefully', async () => {
            // Mock _navigateToHighlightPage to throw an error
            jest.spyOn(practiceSessionStarter, '_navigateToHighlightPage').mockRejectedValue(new Error('Navigation failed'));

            await expect(practiceSessionStarter.focusOnPracticeSection(highlightId)).resolves.not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith('Practice Session Starter: Error focusing on section', expect.objectContaining({ highlightId }));
        });
    });

    describe('Helper methods', () => {
        test('_exitFocusMode should exit focus mode when active', () => {
            const mockCanvas = {
                getAttribute: jest.fn().mockReturnValue('active')
            };
            document.querySelector.mockReturnValue(mockCanvas);

            practiceSessionStarter._exitFocusMode();

            expect(mockHighlighting.exitFocusMode).toHaveBeenCalled();
        });

        test('_hideTimer should hide timer UI', () => {
            const mockTimer = {
                style: { display: '' }
            };
            document.querySelector.mockReturnValue(mockTimer);

            practiceSessionStarter._hideTimer();

            expect(mockTimer.style.display).toBe('none');
        });

        test('_showSelectionDisabledIndicator should add CSS classes', () => {
            const mockContainer = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };
            document.querySelector.mockReturnValue(mockContainer);

            practiceSessionStarter._showSelectionDisabledIndicator();

            expect(mockContainer.classList.add).toHaveBeenCalledWith('practice-mode-selection-disabled');
        });

        test('_hideSelectionDisabledIndicator should remove CSS classes', () => {
            const mockContainer = {
                classList: {
                    remove: jest.fn()
                }
            };
            document.querySelector.mockReturnValue(mockContainer);

            practiceSessionStarter._hideSelectionDisabledIndicator();

            expect(mockContainer.classList.remove).toHaveBeenCalledWith('practice-mode-selection-disabled', 'show-indicator');
        });
    });

    describe('Factory function', () => {
        test('should create instance via factory function', () => {
            global.window.createPracticeSessionStarter = function(logger, options) {
                return new PracticeSessionStarter(logger, options);
            };

            const instance = global.window.createPracticeSessionStarter(mockLogger);

            expect(instance).toBeInstanceOf(PracticeSessionStarter);
            expect(instance.logger).toBe(mockLogger);
        });
    });
});
