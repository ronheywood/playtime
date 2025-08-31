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
    focusOnHighlight: jest.fn()
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
        global.window.PlayTimeHighlighting.focusOnHighlight.mockClear();

        // Mock event dispatching
        global.window.dispatchEvent = jest.fn();

        // Create instance
        practiceSessionStarter = new PracticeSessionStarter(
            mockLogger,
            mockDatabase,
            mockPracticePlanPersistenceService
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

    describe('startSession', () => {
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
            const result = await practiceSessionStarter.startSession(sessionConfig, scoreId);

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
            await practiceSessionStarter.startSession(sessionConfig, scoreId);

            expect(global.window.PracticeSessionTimer).toHaveBeenCalledWith({
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

            await practiceSessionStarter.startSession(sessionConfig, scoreId);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Practice Session Starter: Timer component not available'
            );

            // Restore timer for other tests
            global.window.PracticeSessionTimer = originalTimer;
        });

        test('should dispatch practice session configured event', async () => {
            await practiceSessionStarter.startSession(sessionConfig, scoreId);

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

            const result = await practiceSessionStarter.startSession(emptyConfig, scoreId);

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

            const result = await practiceSessionStarter.startSession(sessionConfig, scoreId);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Practice Session Starter: Error starting session',
                { error: expect.any(Error) }
            );
        });
    });

    describe('focusOnPracticeSection', () => {
        const highlightId = 'test-highlight-id';

        test('should focus on highlight using PlayTimeHighlighting when available', () => {
            const mockElement = { scrollIntoView: jest.fn() };
            document.querySelector = jest.fn().mockReturnValue(mockElement);

            practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(document.querySelector).toHaveBeenCalledWith(`[data-highlight-id="${highlightId}"]`);
            expect(global.window.PlayTimeHighlighting.focusOnHighlight).toHaveBeenCalledWith(mockElement);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Focusing on section',
                { highlightId }
            );
        });

        test('should fallback to scrollIntoView when PlayTimeHighlighting is not available', () => {
            const originalHighlighting = global.window.PlayTimeHighlighting;
            global.window.PlayTimeHighlighting = undefined;
            const mockElement = { scrollIntoView: jest.fn() };
            document.querySelector = jest.fn().mockReturnValue(mockElement);

            practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'center'
            });

            // Restore for other tests
            global.window.PlayTimeHighlighting = originalHighlighting;
        });

        test('should warn when highlight element is not found', () => {
            document.querySelector = jest.fn().mockReturnValue(null);

            practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Practice Session Starter: Highlight element not found',
                { highlightId }
            );
        });

        test('should handle errors gracefully', () => {
            document.querySelector = jest.fn().mockImplementation(() => {
                throw new Error('Query failed');
            });

            practiceSessionStarter.focusOnPracticeSection(highlightId);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Practice Session Starter: Error focusing on section',
                { highlightId, error: expect.any(Error) }
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

            practiceSessionStarter.handleTimerComplete();

            expect(practiceSessionStarter.practiceSession.currentSectionIndex).toBe(1);
            expect(mockTimer.startTimer).toHaveBeenCalledWith(240);
            expect(focusSpy).toHaveBeenCalledWith('highlight-2');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Starter: Moving to next section',
                { sectionIndex: 1, targetTime: 240 }
            );

            focusSpy.mockRestore();
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
        });
    });
});
