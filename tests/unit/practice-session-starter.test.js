/**
 * Practice Session Starter Unit Tests
 * Tests the practice session starter module in isolation
 */

const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock window.PracticeSessionTimer before requiring the module
const mockTimerConstructor = jest.fn();
global.window.PracticeSessionTimer = mockTimerConstructor;
global.window.PlayTimeHighlighting = {
    focusOnHighlight: jest.fn(),
    exitFocusMode: jest.fn()
};

// Import the module using require for CommonJS compatibility
const PracticeSessionStarter = require('../../scripts/practice/practice-session-starter');

describe('PracticeSessionStarter', () => {
    let practiceSessionStarter;
    let mockLogger;
    let mockDatabase;
    let mockPracticePlanPersistenceService;
    let mockTimer;

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

        // Mock database
        mockDatabase = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn()
        };

        // Mock practice plan persistence service
        mockPracticePlanPersistenceService = {
            loadPracticePlan: jest.fn(),
            savePracticePlan: jest.fn()
        };

        // Mock timer instance
        mockTimer = {
            startTimer: jest.fn(),
            stop: jest.fn(),
            pause: jest.fn(),
            resume: jest.fn()
        };

        // Reset timer constructor mock
        mockTimerConstructor.mockImplementation(() => mockTimer);
        
        // Set up PlayTimeHighlighting mock with all needed methods
        global.window.PlayTimeHighlighting = {
            focusOnHighlight: jest.fn(),
            exitFocusMode: jest.fn()
        };

        // Mock event dispatching
        global.window.dispatchEvent = jest.fn();

        // Create instance
        practiceSessionStarter = new PracticeSessionStarter(
            mockLogger,
            mockDatabase,
            mockPracticePlanPersistenceService,
            {
                // Use zero timeouts for fast tests
                pageRenderTimeout: 0,
                elementCheckInterval: 0
            }
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with provided dependencies', () => {
            expect(practiceSessionStarter.logger).toBe(mockLogger);
            expect(practiceSessionStarter.database).toBe(mockDatabase);
            expect(practiceSessionStarter.practicePlanPersistenceService).toBe(mockPracticePlanPersistenceService);
            expect(practiceSessionStarter.practiceSession).toBeNull();
            expect(practiceSessionStarter.practiceSessionTimer).toBeNull();
        });

        test('should use default timeouts when no options provided', () => {
            const defaultInstance = new PracticeSessionStarter(mockLogger, mockDatabase, mockPracticePlanPersistenceService);
            expect(defaultInstance.pageRenderTimeout).toBe(500);
            expect(defaultInstance.elementCheckInterval).toBe(100);
        });

        test('should use custom timeouts when options provided', () => {
            const customInstance = new PracticeSessionStarter(
                mockLogger, 
                mockDatabase, 
                mockPracticePlanPersistenceService,
                { pageRenderTimeout: 1000, elementCheckInterval: 50 }
            );
            expect(customInstance.pageRenderTimeout).toBe(1000);
            expect(customInstance.elementCheckInterval).toBe(50);
        });
    });

    describe('startFromPlan', () => {
        const planId = 'test-plan-id';
        const scoreId = 'test-score-id';
        const mockPlan = {
            name: 'Test Practice Plan',
            sections: [
                { highlightId: 'highlight-1', targetTime: 300 },
                { highlightId: 'highlight-2', targetTime: 240 }
            ]
        };

        test('should successfully start session from valid plan', async () => {
            mockPracticePlanPersistenceService.loadPracticePlan.mockResolvedValue(mockPlan);

            const result = await practiceSessionStarter.startFromPlan(planId, scoreId);

            expect(result).toBe(true);
            expect(mockPracticePlanPersistenceService.loadPracticePlan).toHaveBeenCalledWith(planId);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Starting session from plan',
                { planId, scoreId }
            );
        });

        test('should fail when plan is not found', async () => {
            mockPracticePlanPersistenceService.loadPracticePlan.mockResolvedValue(null);

            const result = await practiceSessionStarter.startFromPlan(planId, scoreId);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Practice Session Starter: Plan not found',
                { planId }
            );
        });

        test('should fail when plan has no sections', async () => {
            const emptyPlan = { name: 'Empty Plan', sections: [] };
            mockPracticePlanPersistenceService.loadPracticePlan.mockResolvedValue(emptyPlan);

            const result = await practiceSessionStarter.startFromPlan(planId, scoreId);

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Practice Session Starter: Plan has no sections',
                { planId }
            );
        });

        test('should handle errors gracefully', async () => {
            const error = new Error('Load failed');
            mockPracticePlanPersistenceService.loadPracticePlan.mockRejectedValue(error);

            const result = await practiceSessionStarter.startFromPlan(planId, scoreId);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Practice Session Starter: Error starting from plan',
                { planId, scoreId, error }
            );
        });
    });

    describe('startSession (internal method)', () => {
        const scoreId = 'test-score-id';
        const sessionConfig = {
            name: 'Test Session',
            sections: [
                { highlightId: 'highlight-1', targetTime: 300 },
                { highlightId: 'highlight-2', targetTime: 240 }
            ]
        };

        let dateSpy;

        beforeEach(() => {
            // Mock Date.now() for consistent timing
            dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1000000);
        });

        afterEach(() => {
            dateSpy.mockRestore();
        });

        test('should successfully start a valid session', async () => {
            const result = await practiceSessionStarter._startSession(sessionConfig, scoreId);

            expect(result).toBe(true);
            expect(practiceSessionStarter.practiceSession).toEqual({
                config: sessionConfig,
                currentSectionIndex: 0,
                startTime: 1000000,
                sectionNotes: {},
                scoreId: scoreId
            });
        });

        test('should initialize timer when PracticeSessionTimer is available', async () => {
            await practiceSessionStarter._startSession(sessionConfig, scoreId);

            expect(mockTimerConstructor).toHaveBeenCalledWith({
                logger: mockLogger,
                onTimerComplete: expect.any(Function),
                onTimerTick: expect.any(Function),
                onPauseToggle: expect.any(Function),
                onManualNext: expect.any(Function),
                onExit: expect.any(Function)
            });
            expect(mockTimer.startTimer).toHaveBeenCalledWith(300);
        });

        test('should warn when timer component is not available', async () => {
            const originalTimer = global.window.PracticeSessionTimer;
            global.window.PracticeSessionTimer = undefined;

            await practiceSessionStarter._startSession(sessionConfig, scoreId);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Practice Session Starter: Timer component not available'
            );

            // Restore timer for other tests
            global.window.PracticeSessionTimer = originalTimer;
        });

        test('should dispatch practice session configured event', async () => {
            await practiceSessionStarter._startSession(sessionConfig, scoreId);

            expect(global.window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'playtime:practice-session-configured',
                    detail: {
                        scoreId: scoreId,
                        sessionConfig: sessionConfig
                    }
                })
            );
        });

        test('should fail when session has no sections', async () => {
            const emptyConfig = { name: 'Empty Session', sections: [] };

            const result = await practiceSessionStarter._startSession(emptyConfig, scoreId);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Practice Session Starter: No practice sections available'
            );
        });

        test('should handle errors gracefully', async () => {
            // Force an error by making dispatchEvent throw
            global.window.dispatchEvent.mockImplementation(() => {
                throw new Error('Event dispatch failed');
            });

            const result = await practiceSessionStarter._startSession(sessionConfig, scoreId);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Practice Session Starter: Error starting session',
                { error: expect.any(Error) }
            );
        });
    });

    describe('focusOnPracticeSection', () => {
        const highlightId = 'test-highlight-id';

        test('should focus on highlight using PlayTimeHighlighting when available', async () => {
            const mockElement = { scrollIntoView: jest.fn() };
            document.querySelector = jest.fn().mockReturnValue(mockElement);

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(document.querySelector).toHaveBeenCalledWith(`[data-role="highlight"][data-hl-id="${highlightId}"]`);
            expect(global.window.PlayTimeHighlighting.focusOnHighlight).toHaveBeenCalledWith(mockElement);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Triggering focus action on highlight',
                { highlightId }
            );
        });

        test('should fallback to scrollIntoView when PlayTimeHighlighting is not available', async () => {
            const originalHighlighting = global.window.PlayTimeHighlighting;
            global.window.PlayTimeHighlighting = undefined;
            const mockElement = { scrollIntoView: jest.fn() };
            document.querySelector = jest.fn().mockReturnValue(mockElement);

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'center'
            });

            // Restore for other tests
            global.window.PlayTimeHighlighting = originalHighlighting;
        });

        test('should warn when highlight element is not found', async () => {
            document.querySelector = jest.fn().mockReturnValue(null);

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Practice Session Starter: Could not determine highlight page or PDF viewer not available',
                { 
                    highlightId,
                    hasHighlightData: false,
                    hasPageInfo: false,
                    hasPDFViewer: false
                }
            );
        });

        test('should handle errors gracefully', async () => {
            document.querySelector = jest.fn().mockImplementation(() => {
                throw new Error('Query failed');
            });

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Practice Session Starter: Error focusing on section',
                { highlightId, error: expect.any(Error) }
            );
        });

        test('should navigate to correct page when highlight is on different page', async () => {
            // Mock the highlight data with page information
            const mockHighlightData = { id: highlightId, page: 2, xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4 };
            const mockPersistenceService = {
                getHighlight: jest.fn().mockResolvedValue(mockHighlightData)
            };
            const mockPDFViewer = {
                getCurrentPage: jest.fn().mockReturnValue(1),
                renderPage: jest.fn().mockResolvedValue()
            };

            // Set up mocks
            global.window.PlayTimeHighlighting = {
                _components: {
                    persistenceService: mockPersistenceService
                },
                focusOnHighlight: jest.fn()
            };
            global.window.PlayTimePDFViewer = mockPDFViewer;

            // Mock querySelector to return null first (not found), then return element after "page navigation"
            let callCount = 0;
            const mockElement = { scrollIntoView: jest.fn() };
            document.querySelector = jest.fn().mockImplementation(() => {
                callCount++;
                return callCount > 1 ? mockElement : null; // Return null first time, element after navigation
            });

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            // Verify navigation was attempted
            expect(mockPersistenceService.getHighlight).toHaveBeenCalledWith(highlightId);
            expect(mockPDFViewer.getCurrentPage).toHaveBeenCalled();
            expect(mockPDFViewer.renderPage).toHaveBeenCalledWith(2);
            expect(global.window.PlayTimeHighlighting.focusOnHighlight).toHaveBeenCalledWith(mockElement);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Navigating to highlight page',
                { highlightId, currentPage: 1, targetPage: 2 }
            );
        });

        test('should not navigate when highlight is already on current page', async () => {
            // Mock the highlight data to indicate it's on the current page
            const mockHighlightData = { id: highlightId, page: 1, xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4 };
            const mockPersistenceService = {
                getHighlight: jest.fn().mockResolvedValue(mockHighlightData)
            };
            const mockPDFViewer = {
                getCurrentPage: jest.fn().mockReturnValue(1),
                renderPage: jest.fn().mockResolvedValue()
            };

            // Set up mocks
            global.window.PlayTimeHighlighting = {
                _components: {
                    persistenceService: mockPersistenceService
                },
                focusOnHighlight: jest.fn()
            };
            global.window.PlayTimePDFViewer = mockPDFViewer;

            const mockElement = { scrollIntoView: jest.fn() };
            document.querySelector = jest.fn().mockReturnValue(mockElement);

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            // Should check page but not navigate since we're already on the correct page
            expect(mockPersistenceService.getHighlight).toHaveBeenCalledWith(highlightId);
            expect(mockPDFViewer.getCurrentPage).toHaveBeenCalled();
            expect(mockPDFViewer.renderPage).not.toHaveBeenCalled(); // Should not navigate
            expect(global.window.PlayTimeHighlighting.focusOnHighlight).toHaveBeenCalledWith(mockElement);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Highlight already on current page',
                { highlightId, currentPage: 1 }
            );
        });

        test('should navigate to correct page even when highlight element exists in DOM on different page', async () => {
            // This test covers the scenario where highlight elements from multiple pages exist in DOM
            // but we need to navigate to the correct page before focusing
            const mockHighlightData = { id: highlightId, page: 3, xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4 };
            const mockPersistenceService = {
                getHighlight: jest.fn().mockResolvedValue(mockHighlightData)
            };
            const mockPDFViewer = {
                getCurrentPage: jest.fn().mockReturnValue(1),
                renderPage: jest.fn().mockResolvedValue()
            };

            // Set up mocks
            global.window.PlayTimeHighlighting = {
                _components: {
                    persistenceService: mockPersistenceService
                },
                focusOnHighlight: jest.fn()
            };
            global.window.PlayTimePDFViewer = mockPDFViewer;

            // Mock querySelector to always return an element (simulating element exists in DOM but on wrong page)
            const mockElement = { scrollIntoView: jest.fn() };
            document.querySelector = jest.fn().mockReturnValue(mockElement);

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            // Should navigate even though element exists in DOM
            expect(mockPersistenceService.getHighlight).toHaveBeenCalledWith(highlightId);
            expect(mockPDFViewer.getCurrentPage).toHaveBeenCalled();
            expect(mockPDFViewer.renderPage).toHaveBeenCalledWith(3); // Should navigate to page 3
            expect(global.window.PlayTimeHighlighting.focusOnHighlight).toHaveBeenCalledWith(mockElement);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Navigating to highlight page',
                { highlightId, currentPage: 1, targetPage: 3 }
            );
        });

        test('should skip navigation when highlight is already on current page', async () => {
            // Mock the highlight data with same page as current
            const mockHighlightData = { id: highlightId, page: 1, xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4 };
            const mockPersistenceService = {
                getHighlight: jest.fn().mockResolvedValue(mockHighlightData)
            };
            const mockPDFViewer = {
                getCurrentPage: jest.fn().mockReturnValue(1),
                renderPage: jest.fn().mockResolvedValue()
            };

            // Set up mocks
            global.window.PlayTimeHighlighting = {
                _components: {
                    persistenceService: mockPersistenceService
                },
                focusOnHighlight: jest.fn()
            };
            global.window.PlayTimePDFViewer = mockPDFViewer;

            // Mock querySelector to return null first (not found), then element after waiting
            let callCount = 0;
            const mockElement = { scrollIntoView: jest.fn() };
            document.querySelector = jest.fn().mockImplementation(() => {
                callCount++;
                return callCount > 1 ? mockElement : null;
            });

            await practiceSessionStarter.focusOnPracticeSection(highlightId);

            // Verify navigation was considered but not needed
            expect(mockPersistenceService.getHighlight).toHaveBeenCalledWith(highlightId);
            expect(mockPDFViewer.getCurrentPage).toHaveBeenCalled();
            expect(mockPDFViewer.renderPage).not.toHaveBeenCalled(); // Should not navigate

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Highlight already on current page',
                { highlightId, currentPage: 1 }
            );
        });
    });

    describe('handleTimerComplete', () => {
        beforeEach(() => {
            // Set up a practice session
            practiceSessionStarter.practiceSession = {
                config: {
                    sections: [
                        { highlightId: 'highlight-1', targetTime: 300 },
                        { highlightId: 'highlight-2', targetTime: 240 }
                    ]
                },
                currentSectionIndex: 0,
                startTime: 1000000,
                sectionNotes: {},
                scoreId: 'test-score'
            };
            practiceSessionStarter.practiceSessionTimer = mockTimer;
        });

        test('should move to next section when available', () => {
            const focusSpy = jest.spyOn(practiceSessionStarter, 'focusOnPracticeSection').mockImplementation();
            const updateSectionCounterSpy = jest.spyOn(practiceSessionStarter, 'updateSectionCounter').mockImplementation();

            practiceSessionStarter.handleTimerComplete();

            expect(practiceSessionStarter.practiceSession.currentSectionIndex).toBe(1);
            expect(mockTimer.startTimer).toHaveBeenCalledWith(240);
            expect(updateSectionCounterSpy).toHaveBeenCalled();
            expect(focusSpy).toHaveBeenCalledWith('highlight-2');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Moving to next section',
                { sectionIndex: 1, targetTime: 240 }
            );

            focusSpy.mockRestore();
            updateSectionCounterSpy.mockRestore();
        });

        test('should complete session when no more sections', () => {
            practiceSessionStarter.practiceSession.currentSectionIndex = 1; // Last section
            const completeSpy = jest.spyOn(practiceSessionStarter, 'handleSessionComplete').mockImplementation();

            practiceSessionStarter.handleTimerComplete();

            expect(completeSpy).toHaveBeenCalled();
            completeSpy.mockRestore();
        });

        test('should do nothing when no active session', () => {
            practiceSessionStarter.practiceSession = null;

            practiceSessionStarter.handleTimerComplete();

            expect(mockTimer.startTimer).not.toHaveBeenCalled();
        });
    });

    describe('handleSessionComplete', () => {
        let dateSpy;

        beforeEach(() => {
            dateSpy = jest.spyOn(Date, 'now').mockReturnValue(2000000);
            practiceSessionStarter.practiceSession = {
                config: { name: 'Test Session' },
                startTime: 1000000,
                sectionNotes: { section1: 'Note 1' },
                scoreId: 'test-score'
            };
            practiceSessionStarter.practiceSessionTimer = mockTimer;
        });

        afterEach(() => {
            dateSpy.mockRestore();
        });

        test('should dispatch session complete event and clean up', () => {
            practiceSessionStarter.handleSessionComplete();

            expect(global.window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'playtime:practice-session-complete',
                    detail: {
                        scoreId: 'test-score',
                        sessionConfig: { name: 'Test Session' },
                        duration: 1000000, // 2000000 - 1000000
                        sectionNotes: { section1: 'Note 1' }
                    }
                })
            );

            expect(practiceSessionStarter.practiceSession).toBeNull();
            expect(practiceSessionStarter.practiceSessionTimer).toBeNull();
        });

        test('should exit focus mode when session completes and focus mode is active', () => {
            const mockCanvas = { getAttribute: jest.fn().mockReturnValue('active') };
            document.querySelector = jest.fn().mockReturnValue(mockCanvas);
            global.window.PlayTimeHighlighting = { exitFocusMode: jest.fn() };

            practiceSessionStarter.handleSessionComplete();

            expect(document.querySelector).toHaveBeenCalledWith('[data-role="pdf-canvas"]');
            expect(mockCanvas.getAttribute).toHaveBeenCalledWith('data-focus-mode');
            expect(global.window.PlayTimeHighlighting.exitFocusMode).toHaveBeenCalled();
        });

        test('should not exit focus mode when focus mode is not active', () => {
            const mockCanvas = { getAttribute: jest.fn().mockReturnValue('inactive') };
            document.querySelector = jest.fn().mockReturnValue(mockCanvas);
            global.window.PlayTimeHighlighting = { exitFocusMode: jest.fn() };

            practiceSessionStarter.handleSessionComplete();

            expect(global.window.PlayTimeHighlighting.exitFocusMode).not.toHaveBeenCalled();
        });

        test('should handle missing canvas element gracefully', () => {
            document.querySelector = jest.fn().mockReturnValue(null);
            global.window.PlayTimeHighlighting = { exitFocusMode: jest.fn() };

            expect(() => practiceSessionStarter.handleSessionComplete()).not.toThrow();
            expect(global.window.PlayTimeHighlighting.exitFocusMode).not.toHaveBeenCalled();
        });

        test('should hide timer UI when session completes', () => {
            const mockTimerContainer = { style: { display: 'block' } };
            document.querySelector = jest.fn((selector) => {
                if (selector === '#practice-session-timer') return mockTimerContainer;
                return null;
            });

            practiceSessionStarter.handleSessionComplete();

            expect(mockTimerContainer.style.display).toBe('none');
        });

        test('should handle missing timer container gracefully', () => {
            document.querySelector = jest.fn().mockReturnValue(null);

            expect(() => practiceSessionStarter.handleSessionComplete()).not.toThrow();
        });
    });

    describe('handleTimerTick', () => {
        test('should log debug message when debug method exists', () => {
            practiceSessionStarter.handleTimerTick(120);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Practice Session Starter: Timer tick',
                { timeLeft: 120 }
            );
        });
    });

    describe('handlePauseToggle', () => {
        test('should log pause state change', () => {
            practiceSessionStarter.handlePauseToggle(true);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Timer pause toggled',
                { isPaused: true }
            );
        });
    });

    describe('handleManualNext', () => {
        test('should trigger timer complete handler', () => {
            const completeSpy = jest.spyOn(practiceSessionStarter, 'handleTimerComplete').mockImplementation();

            practiceSessionStarter.handleManualNext();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Manual next triggered'
            );
            expect(completeSpy).toHaveBeenCalled();

            completeSpy.mockRestore();
        });
    });

    describe('handleTimerExit', () => {
        beforeEach(() => {
            practiceSessionStarter.practiceSession = {
                scoreId: 'test-score'
            };
            practiceSessionStarter.practiceSessionTimer = mockTimer;
        });

        test('should dispatch exit event and clean up', () => {
            practiceSessionStarter.handleTimerExit();

            expect(global.window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'playtime:practice-session-exit',
                    detail: {
                        scoreId: 'test-score'
                    }
                })
            );

            expect(practiceSessionStarter.practiceSession).toBeNull();
            expect(practiceSessionStarter.practiceSessionTimer).toBeNull();
        });

        test('should exit focus mode when timer exits and focus mode is active', () => {
            const mockCanvas = { getAttribute: jest.fn().mockReturnValue('active') };
            document.querySelector = jest.fn().mockReturnValue(mockCanvas);
            global.window.PlayTimeHighlighting = { exitFocusMode: jest.fn() };

            practiceSessionStarter.handleTimerExit();

            expect(document.querySelector).toHaveBeenCalledWith('[data-role="pdf-canvas"]');
            expect(mockCanvas.getAttribute).toHaveBeenCalledWith('data-focus-mode');
            expect(global.window.PlayTimeHighlighting.exitFocusMode).toHaveBeenCalled();
        });

        test('should not exit focus mode on timer exit when focus mode is not active', () => {
            const mockCanvas = { getAttribute: jest.fn().mockReturnValue('inactive') };
            document.querySelector = jest.fn().mockReturnValue(mockCanvas);
            global.window.PlayTimeHighlighting = { exitFocusMode: jest.fn() };

            practiceSessionStarter.handleTimerExit();

            expect(global.window.PlayTimeHighlighting.exitFocusMode).not.toHaveBeenCalled();
        });

        test('should hide timer UI when timer exits', () => {
            const mockTimerContainer = { style: { display: 'block' } };
            document.querySelector = jest.fn((selector) => {
                if (selector === '#practice-session-timer') return mockTimerContainer;
                return null;
            });

            practiceSessionStarter.handleTimerExit();

            expect(mockTimerContainer.style.display).toBe('none');
        });

        test('should handle missing timer container on exit gracefully', () => {
            document.querySelector = jest.fn().mockReturnValue(null);

            expect(() => practiceSessionStarter.handleTimerExit()).not.toThrow();
        });
    });

    describe('updateSectionCounter', () => {
        beforeEach(() => {
            practiceSessionStarter.practiceSession = {
                config: {
                    sections: [
                        { highlightId: 'highlight-1', targetTime: 300 },
                        { highlightId: 'highlight-2', targetTime: 240 },
                        { highlightId: 'highlight-3', targetTime: 180 }
                    ]
                },
                currentSectionIndex: 1, // Second section (1-indexed display should show "Section 2 of 3")
                startTime: 1000000,
                sectionNotes: {},
                scoreId: 'test-score'
            };
        });

        test('should update section counter display correctly', () => {
            const mockSectionCounterElement = { textContent: '' };
            document.querySelector = jest.fn().mockReturnValue(mockSectionCounterElement);

            practiceSessionStarter.updateSectionCounter();

            expect(document.querySelector).toHaveBeenCalledWith('[data-role="section-counter"]');
            expect(mockSectionCounterElement.textContent).toBe('Section 2 of 3');
        });

        test('should handle missing section counter element', () => {
            document.querySelector = jest.fn().mockReturnValue(null);

            // Should not throw error
            expect(() => practiceSessionStarter.updateSectionCounter()).not.toThrow();
        });

        test('should do nothing when no active session', () => {
            practiceSessionStarter.practiceSession = null;
            document.querySelector = jest.fn();

            practiceSessionStarter.updateSectionCounter();

            expect(document.querySelector).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentSession', () => {
        test('should return current practice session', () => {
            const session = { config: { name: 'Test' } };
            practiceSessionStarter.practiceSession = session;

            expect(practiceSessionStarter.getCurrentSession()).toBe(session);
        });

        test('should return null when no active session', () => {
            expect(practiceSessionStarter.getCurrentSession()).toBeNull();
        });
    });

    describe('endSession', () => {
        beforeEach(() => {
            practiceSessionStarter.practiceSession = { config: { name: 'Test' } };
            practiceSessionStarter.practiceSessionTimer = mockTimer;
        });

        test('should stop timer and clean up session', () => {
            practiceSessionStarter.endSession();

            expect(mockTimer.stop).toHaveBeenCalled();
            expect(practiceSessionStarter.practiceSessionTimer).toBeNull();
            expect(practiceSessionStarter.practiceSession).toBeNull();
        });

        test('should handle case when no timer exists', () => {
            practiceSessionStarter.practiceSessionTimer = null;

            practiceSessionStarter.endSession();

            expect(practiceSessionStarter.practiceSession).toBeNull();
        });
    });

    describe('isSessionActive', () => {
        test('should return true when session is active', () => {
            practiceSessionStarter.practiceSession = { config: { name: 'Test' } };

            expect(practiceSessionStarter.isSessionActive()).toBe(true);
        });

        test('should return false when no session is active', () => {
            practiceSessionStarter.practiceSession = null;

            expect(practiceSessionStarter.isSessionActive()).toBe(false);
        });
    });

    describe('Factory function', () => {
        test('should create instance via factory function', () => {
            // Load the factory function
            require('../../scripts/practice/practice-session-starter');

            const instance = global.window.createPracticeSessionStarter(
                mockLogger,
                mockDatabase,
                mockPracticePlanPersistenceService
            );

            expect(instance).toBeInstanceOf(PracticeSessionStarter);
            expect(instance.logger).toBe(mockLogger);
            expect(instance.database).toBe(mockDatabase);
            expect(instance.practicePlanPersistenceService).toBe(mockPracticePlanPersistenceService);
            expect(instance.pageRenderTimeout).toBe(500); // default
            expect(instance.elementCheckInterval).toBe(100); // default
        });

        test('should create instance with custom options via factory function', () => {
            // Load the factory function
            require('../../scripts/practice/practice-session-starter');

            const options = { pageRenderTimeout: 200, elementCheckInterval: 25 };
            const instance = global.window.createPracticeSessionStarter(
                mockLogger,
                mockDatabase,
                mockPracticePlanPersistenceService,
                options
            );

            expect(instance).toBeInstanceOf(PracticeSessionStarter);
            expect(instance.pageRenderTimeout).toBe(200);
            expect(instance.elementCheckInterval).toBe(25);
        });
    });
});
