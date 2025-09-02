/**
 * @jest-environment jsdom
 */

const PracticeSessionManager = require('../../scripts/practice/practice-session-manager.js');

describe('PracticeSessionManager', () => {
    let manager;
    let mockLogger;
    let mockHighlighting;
    let mockTimer;
    let mockStarter;
    let mockPersistenceService;
    let mockDatabase;

    beforeEach(() => {
        // Setup mocks
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        mockHighlighting = {
            updateHighlightConfidence: jest.fn()
        };

        mockTimer = {
            startTimer: jest.fn(),
            stop: jest.fn()
        };

        mockStarter = {
            setupPracticeModeEnvironment: jest.fn().mockResolvedValue(true),
            cleanupPracticeModeEnvironment: jest.fn(),
            focusOnPracticeSection: jest.fn().mockResolvedValue()
        };

        mockPersistenceService = {
            loadPracticePlan: jest.fn()
        };

        mockDatabase = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn()
        };

        // Setup DOM
        global.window = {
            dispatchEvent: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            PracticeSessionTimer: jest.fn().mockImplementation((config) => mockTimer)
        };

        global.document = {
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => []),
            createElement: jest.fn(),
            body: {
                appendChild: jest.fn(),
                removeChild: jest.fn()
            },
            visibilityState: 'visible',
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        global.navigator = {
            wakeLock: {
                request: jest.fn().mockResolvedValue({
                    addEventListener: jest.fn(),
                    release: jest.fn().mockResolvedValue()
                })
            }
        };

        // Create manager instance
        manager = new PracticeSessionManager(
            mockLogger,
            mockHighlighting,
            mockTimer,
            mockStarter,
            mockPersistenceService,
            mockDatabase
        );
    });

    afterEach(() => {
        // End any active session to clean up event listeners
        if (manager && manager.isSessionActive()) {
            manager.endSession();
        }
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with provided dependencies', () => {
            expect(manager.logger).toBe(mockLogger);
            expect(manager.highlighting).toBe(mockHighlighting);
            expect(manager.timer).toBe(mockTimer);
            expect(manager.practiceSessionStarter).toBe(mockStarter);
            expect(manager.practicePlanPersistenceService).toBe(mockPersistenceService);
            expect(manager.database).toBe(mockDatabase);
            expect(manager.practiceSession).toBeNull();
            expect(manager.practiceSessionTimer).toBeNull();
            expect(manager.wakeLock).toBeNull();
        });
    });

    describe('startFromPlan', () => {
        const planId = 'plan-123';
        const scoreId = 'score-456';

        test('should successfully start session from valid plan', async () => {
            const mockPlan = {
                name: 'Test Plan',
                sections: [
                    { highlightId: 'highlight-1', targetTime: 300 },
                    { highlightId: 'highlight-2', targetTime: 240 }
                ]
            };

            mockPersistenceService.loadPracticePlan.mockResolvedValue(mockPlan);

            const result = await manager.startFromPlan(planId, scoreId);

            expect(result).toBe(true);
            expect(mockPersistenceService.loadPracticePlan).toHaveBeenCalledWith(planId);
            expect(mockStarter.setupPracticeModeEnvironment).toHaveBeenCalled();
            expect(manager.practiceSession).toBeTruthy();
            expect(manager.practiceSession.config).toBe(mockPlan);
            expect(manager.practiceSession.scoreId).toBe(scoreId);
        });

        test('should fail when plan is not found', async () => {
            mockPersistenceService.loadPracticePlan.mockResolvedValue(null);

            const result = await manager.startFromPlan(planId, scoreId);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Practice Session Manager: Plan not found',
                { planId }
            );
        });

        test('should fail when plan has no sections', async () => {
            const emptyPlan = { name: 'Empty Plan', sections: [] };
            mockPersistenceService.loadPracticePlan.mockResolvedValue(emptyPlan);

            const result = await manager.startFromPlan(planId, scoreId);

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Practice Session Manager: Plan has no sections',
                { planId }
            );
        });
    });

    describe('handleTimerComplete', () => {
        beforeEach(() => {
            // Setup a practice session
            manager.practiceSession = {
                config: {
                    sections: [
                        { highlightId: 'highlight-1', targetTime: 300 },
                        { highlightId: 'highlight-2', targetTime: 240 }
                    ]
                },
                currentSectionIndex: 0,
                startTime: Date.now(),
                sectionNotes: {},
                scoreId: 'score-123'
            };
        });

        test('should show completion dialog when timer completes', async () => {
            const showDialogSpy = jest.spyOn(manager, 'showSectionCompletionDialog').mockResolvedValue();

            await manager.handleTimerComplete();

            expect(showDialogSpy).toHaveBeenCalledWith(manager.practiceSession.config.sections[0]);
        });
    });

    describe('continueToNextSection', () => {
        beforeEach(() => {
            manager.practiceSession = {
                config: {
                    sections: [
                        { highlightId: 'highlight-1', targetTime: 300 },
                        { highlightId: 'highlight-2', targetTime: 240 }
                    ]
                },
                currentSectionIndex: 0,
                startTime: Date.now(),
                sectionNotes: {},
                scoreId: 'score-123'
            };
            manager.practiceSessionTimer = mockTimer;
        });

        test('should move to next section when available', async () => {
            const updateCounterSpy = jest.spyOn(manager, 'updateSectionCounter').mockImplementation();

            await manager.continueToNextSection();

            expect(manager.practiceSession.currentSectionIndex).toBe(1);
            expect(mockTimer.startTimer).toHaveBeenCalledWith(240);
            expect(updateCounterSpy).toHaveBeenCalled();
            expect(mockStarter.focusOnPracticeSection).toHaveBeenCalledWith('highlight-2');
        });

        test('should complete session when no more sections', async () => {
            manager.practiceSession.currentSectionIndex = 1; // Last section
            const completeSpy = jest.spyOn(manager, 'handleSessionComplete').mockImplementation();

            await manager.continueToNextSection();

            expect(completeSpy).toHaveBeenCalled();
        });
    });

    describe('updateHighlightConfidence', () => {
        test('should update highlight confidence in DOM and via highlighting system', async () => {
            const highlightId = 'highlight-123';
            const newConfidence = 'green';
            
            const mockElement = {
                dataset: {},
                classList: {
                    remove: jest.fn(),
                    add: jest.fn()
                }
            };
            jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

            await manager.updateHighlightConfidence(highlightId, newConfidence);

            expect(mockElement.dataset.confidence).toBe(newConfidence);
            expect(mockElement.classList.remove).toHaveBeenCalledWith('confidence-red', 'confidence-amber', 'confidence-green');
            expect(mockElement.classList.add).toHaveBeenCalledWith('confidence-green');
            expect(mockHighlighting.updateHighlightConfidence).toHaveBeenCalledWith(highlightId, newConfidence);
        });
    });

    describe('getCurrentSectionConfidence', () => {
        test('should return confidence from DOM element', () => {
            const highlightId = 'highlight-123';
            const mockElement = {
                dataset: { confidence: 'red' }
            };
            jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

            const confidence = manager.getCurrentSectionConfidence(highlightId);

            expect(confidence).toBe('red');
            expect(document.querySelector).toHaveBeenCalledWith(`[data-role="highlight"][data-hl-id="${highlightId}"]`);
        });

        test('should return default confidence when element not found', () => {
            jest.spyOn(document, 'querySelector').mockReturnValue(null);

            const confidence = manager.getCurrentSectionConfidence('missing-highlight');

            expect(confidence).toBe('amber');
        });
    });

    describe('isSessionActive', () => {
        test('should return true when session is active', () => {
            manager.practiceSession = { config: { name: 'Test' } };
            expect(manager.isSessionActive()).toBe(true);
        });

        test('should return false when no session is active', () => {
            manager.practiceSession = null;
            expect(manager.isSessionActive()).toBe(false);
        });
    });

    describe('endSession', () => {
        test('should clean up session and timer', () => {
            manager.practiceSessionTimer = mockTimer;
            manager.practiceSession = { config: { name: 'Test' } };

            manager.endSession();

            expect(mockTimer.stop).toHaveBeenCalled();
            expect(manager.practiceSessionTimer).toBeNull();
            expect(manager.practiceSession).toBeNull();
        });
    });

    describe('Factory function', () => {
        test('should create instance via factory function', () => {
            // Set up window factory function
            global.window.createPracticeSessionManager = function(logger, highlighting, timer, starter, persistence, database, options) {
                return new PracticeSessionManager(logger, highlighting, timer, starter, persistence, database, options);
            };

            const instance = global.window.createPracticeSessionManager(
                mockLogger,
                mockHighlighting,
                mockTimer,
                mockStarter,
                mockPersistenceService,
                mockDatabase
            );

            expect(instance).toBeInstanceOf(PracticeSessionManager);
            expect(instance.logger).toBe(mockLogger);
            expect(instance.highlighting).toBe(mockHighlighting);
            expect(instance.practiceSessionStarter).toBe(mockStarter);
        });
    });
});
