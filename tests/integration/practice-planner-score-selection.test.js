/**
 * Integration tests for Practice Planner score selection functionality
 * Tests the specific UAT bug where wrong score highlights were shown
 */

describe('Practice Planner Score Selection', () => {
    let practicePlanner;
    let mockLogger;
    let mockDatabase;
    let mockHighlightPersistenceService;
    let originalWindow;

    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <div data-role="setup-practice-plan">Setup Practice Plan</div>
            <div data-role="exit-practice-planning">Exit Practice</div>
            <div data-role="practice-planner" class="d-none">
                <div data-role="practice-plan-content"></div>
                <div data-role="no-highlights-message" class="d-none">No highlights</div>
            </div>
        `;

        // Mock logger
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        // Mock database
        mockDatabase = {
            getAll: jest.fn(),
            get: jest.fn()
        };

        // Mock highlight persistence service
        mockHighlightPersistenceService = {
            loadHighlights: jest.fn()
        };

        // Store original window properties
        originalWindow = {
            PlayTimeCurrentScoreId: window.PlayTimeCurrentScoreId,
            addEventListener: window.addEventListener,
            dispatchEvent: window.dispatchEvent
        };

        // Reset global state
        window.PlayTimeCurrentScoreId = null;

        // Mock global templates
        global.PracticePlannerTemplates = {
            getSectionTemplate: () => '<div class="practice-section">{{content}}</div>',
            getHighlightItemTemplate: () => '<div class="highlight-item">{{highlight}}</div>'
        };

        // Import and create practice planner
        const { PracticePlanner } = require('../../scripts/practice-planner.js');
        practicePlanner = new PracticePlanner(mockLogger, mockDatabase, mockHighlightPersistenceService);
    });

    afterEach(() => {
        // Restore window properties
        Object.assign(window, originalWindow);
        
        // Clean up DOM
        document.body.innerHTML = '';
    });

    describe('Score Selection Event Handling', () => {
        test('should update currentScoreId when playtime:score-selected event is fired', async () => {
            // Initialize practice planner
            await practicePlanner.init();

            // Verify initial state
            expect(practicePlanner.currentScoreId).toBeNull();

            // Simulate score selection event
            const scoreSelectedEvent = new CustomEvent('playtime:score-selected', {
                detail: {
                    pdfId: 'score-123',
                    name: 'Test Score.pdf'
                }
            });

            window.dispatchEvent(scoreSelectedEvent);

            // Verify score was updated
            expect(practicePlanner.currentScoreId).toBe('score-123');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Planner: Score context updated from score-selected event',
                expect.objectContaining({
                    scoreId: 'score-123'
                })
            );
        });

        test('should use global PlayTimeCurrentScoreId when available', async () => {
            // Set global current score
            window.PlayTimeCurrentScoreId = 'global-score-456';

            // Initialize practice planner
            await practicePlanner.init();

            // Mock highlights for the global score
            mockHighlightPersistenceService.loadHighlights.mockResolvedValue([
                { id: 'h1', page: 1, confidence: 'green' },
                { id: 'h2', page: 1, confidence: 'amber' }
            ]);

            // Setup practice
            await practicePlanner.handleSetupPractice();

            // Verify correct score was used
            expect(practicePlanner.currentScoreId).toBe('global-score-456');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Planner: Using global current score ID',
                expect.objectContaining({
                    scoreId: 'global-score-456'
                })
            );
            expect(mockHighlightPersistenceService.loadHighlights).toHaveBeenCalledWith('global-score-456');
        });
    });

    describe('UAT Bug Fix: Wrong Score Highlights', () => {
        test('should show highlights for currently selected score, not most recent', async () => {
            // Initialize practice planner
            await practicePlanner.init();

            // Set up database with multiple scores
            mockDatabase.getAll.mockResolvedValue([
                { id: 'score-1', name: 'Score 1.pdf', created: new Date('2025-01-01') },
                { id: 'score-2', name: 'Score 2.pdf', created: new Date('2025-01-02') } // Most recent
            ]);

            // Set currently selected score to score-1 (not the most recent)
            window.PlayTimeCurrentScoreId = 'score-1';

            // Mock highlights for each score
            mockHighlightPersistenceService.loadHighlights.mockImplementation((scoreId) => {
                if (scoreId === 'score-1') {
                    return Promise.resolve([
                        { id: 'h1', page: 1, confidence: 'green' },
                        { id: 'h2', page: 1, confidence: 'amber' }
                    ]);
                } else if (scoreId === 'score-2') {
                    return Promise.resolve([
                        { id: 'h3', page: 2, confidence: 'red' }
                    ]);
                }
                return Promise.resolve([]);
            });

            // Setup practice
            await practicePlanner.handleSetupPractice();

            // Verify correct score was used (score-1, not score-2)
            expect(practicePlanner.currentScoreId).toBe('score-1');
            expect(mockHighlightPersistenceService.loadHighlights).toHaveBeenCalledWith('score-1');
            expect(mockHighlightPersistenceService.loadHighlights).not.toHaveBeenCalledWith('score-2');

            // Verify correct logging
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Planner: Using global current score ID',
                expect.objectContaining({
                    scoreId: 'score-1'
                })
            );
        });

        test('should fall back to most recent score only when no current score is set', async () => {
            // Initialize practice planner
            await practicePlanner.init();

            // Ensure no current score is set
            window.PlayTimeCurrentScoreId = null;
            practicePlanner.currentScoreId = null;

            // Set up database with multiple scores
            mockDatabase.getAll.mockResolvedValue([
                { id: 'score-1', name: 'Score 1.pdf', created: new Date('2025-01-01') },
                { id: 'score-2', name: 'Score 2.pdf', created: new Date('2025-01-02') } // Most recent
            ]);

            // Mock highlights
            mockHighlightPersistenceService.loadHighlights.mockResolvedValue([
                { id: 'h3', page: 2, confidence: 'red' }
            ]);

            // Setup practice
            await practicePlanner.handleSetupPractice();

            // Verify fallback to most recent score
            expect(practicePlanner.currentScoreId).toBe('score-2');
            expect(mockHighlightPersistenceService.loadHighlights).toHaveBeenCalledWith('score-2');

            // Verify warning was logged
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Practice Planner: Using most recent score as fallback',
                expect.objectContaining({
                    scoreId: 'score-2'
                })
            );
        });
    });

    describe('Event Priority', () => {
        test('should prioritize score-selected event over global state', async () => {
            // Set initial global state
            window.PlayTimeCurrentScoreId = 'old-score-789';

            // Initialize practice planner
            await practicePlanner.init();

            // Verify initial state from global
            expect(practicePlanner.currentScoreId).toBeNull();

            // Fire score selection event for different score
            const scoreSelectedEvent = new CustomEvent('playtime:score-selected', {
                detail: {
                    pdfId: 'new-score-123',
                    name: 'New Score.pdf'
                }
            });

            window.dispatchEvent(scoreSelectedEvent);

            // Verify event takes precedence
            expect(practicePlanner.currentScoreId).toBe('new-score-123');

            // Mock highlights
            mockHighlightPersistenceService.loadHighlights.mockResolvedValue([
                { id: 'h1', page: 1, confidence: 'green' }
            ]);

            // Setup practice
            await practicePlanner.handleSetupPractice();

            // Verify event-based score is used, not global
            expect(mockHighlightPersistenceService.loadHighlights).toHaveBeenCalledWith('new-score-123');
        });
    });
});
