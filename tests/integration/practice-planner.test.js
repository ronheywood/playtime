/**
 * Practice Planner Integration Tests
 * Tests the practice planner functionality in isolation
 */

// Use the same setup approach as other tests
require('../setup');

describe('Practice Planner Integration Tests', () => {
    let practicePlanner;
    let mockLogger, mockDatabase, mockHighlightPersistenceService;

    beforeEach(() => {
        // Mock dependencies
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        mockDatabase = {
            getAll: jest.fn(),
            save: jest.fn(),
            delete: jest.fn()
        };

        mockHighlightPersistenceService = {
            loadHighlights: jest.fn()
        };

        // Mock templates globally 
        global.window.PracticePlannerTemplates = {
            practiceSection: jest.fn((highlight, index) => {
                const hasAnnotation = highlight.title || highlight.notes;
                const annotationSection = hasAnnotation ? `
                    <div class="annotation-info">
                        <i data-lucide="sticky-note" class="annotation-icon"></i>
                        ${highlight.title ? `<div class="annotation-title">${highlight.title}</div>` : ''}
                        ${highlight.notes ? `<div class="annotation-notes">${highlight.notes}</div>` : ''}
                    </div>
                ` : '';
                
                return `
                    <div class="practice-section" data-highlight-id="${highlight.id}" data-section-index="${index}">
                        <div class="practice-section-content">
                            <h5>Section ${index + 1} - Page ${highlight.page}</h5>
                            <div class="confidence-badge confidence-${highlight.confidence}">
                                ${highlight.confidence.toUpperCase()}
                            </div>
                            ${annotationSection}
                            <select class="practice-method">
                                <option value="slow-practice">Slow Practice</option>
                                <option value="hands-separate">Hands Separate</option>
                                <option value="metronome">With Metronome</option>
                            </select>
                            <input type="number" class="target-time" value="5" min="1" max="30" />
                            <button class="remove-section">Remove</button>
                        </div>
                    </div>
                `;
            })
        };

        // Load the practice planner module
        const { PracticePlanner } = require('../../scripts/practice-planner');
        practicePlanner = new PracticePlanner(mockLogger, mockDatabase, mockHighlightPersistenceService);
    });

    describe('Initialization', () => {
        test('should initialize successfully with valid DOM', () => {
            const result = practicePlanner.init();
            
            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith('Initializing Practice Planner');
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Planner initialized successfully');
        });

        test('should fail initialization with missing DOM elements', () => {
            // Remove required elements
            const setupButton = document.querySelector('[data-role="setup-practice-plan"]');
            if (setupButton) setupButton.remove();
            
            const result = practicePlanner.init();
            
            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith('Practice Planner: Required DOM elements not found');
        });

        test('should attach event listeners on successful init', () => {
            practicePlanner.init();
            
            const setupButton = document.querySelector('[data-role="setup-practice-plan"]');
            const exitButton = document.querySelector('[data-role="exit-practice-planning"]');
            
            // Verify buttons exist and are accessible
            expect(setupButton).toBeTruthy();
            expect(exitButton).toBeTruthy();
        });
    });

    describe('Score Context Management', () => {
        beforeEach(() => {
            practicePlanner.init();
        });

        test('should update current score ID when score selected event is dispatched', () => {
            const pdfId = 'test-score-123';
            const event = new window.CustomEvent('playtime:score-selected', {
                detail: { pdfId }
            });
            
            window.dispatchEvent(event);
            
            expect(practicePlanner.currentScoreId).toBe(pdfId);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Planner: Score context updated from score-selected event', 
                expect.objectContaining({ scoreId: pdfId })
            );
        });

        test('should handle score selected event without score ID', () => {
            const event = new window.CustomEvent('playtime:score-selected', {
                detail: {}
            });
            
            window.dispatchEvent(event);
            
            expect(practicePlanner.currentScoreId).toBeNull();
        });
    });

    describe('Highlight Retrieval', () => {
        beforeEach(() => {
            practicePlanner.init();
        });

        test('should retrieve highlights using persistence service', async () => {
            const scoreId = 'test-score-123';
            const mockHighlights = [
                { id: 'h1', page: 1, confidence: 'red', xPct: 0.1, yPct: 0.2 },
                { id: 'h2', page: 2, confidence: 'green', xPct: 0.3, yPct: 0.4 }
            ];
            
            mockHighlightPersistenceService.loadHighlights.mockResolvedValue(mockHighlights);
            
            const result = await practicePlanner.getHighlightsForScore(scoreId);
            
            expect(result).toEqual(mockHighlights);
            expect(mockHighlightPersistenceService.loadHighlights).toHaveBeenCalledWith(scoreId);
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Planner: Loaded highlights from persistence service', {
                scoreId,
                highlightsCount: 2,
                highlights: mockHighlights
            });
        });

        test('should return empty array when persistence service is not available', async () => {
            practicePlanner.highlightPersistenceService = null;
            
            const result = await practicePlanner.getHighlightsForScore('test-score');
            
            expect(result).toEqual([]);
            expect(mockLogger.warn).toHaveBeenCalledWith('Practice Planner: Highlight persistence service not available', {
                scoreId: 'test-score',
                highlightPersistenceService: null
            });
        });

        test('should handle errors gracefully', async () => {
            const scoreId = 'test-score-123';
            const error = new Error('Database error');
            
            mockHighlightPersistenceService.loadHighlights.mockRejectedValue(error);
            
            const result = await practicePlanner.getHighlightsForScore(scoreId);
            
            expect(result).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith('Practice Planner: Error getting highlights', {
                scoreId,
                error: 'Database error',
                stack: error.stack
            });
        });
    });

    describe('Practice Interface Management', () => {
        beforeEach(() => {
            practicePlanner.init();
        });

        test('should show no highlights message when no highlights available', () => {
            practicePlanner.showPracticeInterface([]);
            
            const practiceInterface = document.querySelector('[data-role="practice-planner"]');
            const noHighlightsMessage = document.querySelector('[data-role="no-highlights-message"]');
            const practiceContent = document.querySelector('[data-role="practice-plan-content"]');
            
            expect(practiceInterface.style.display).toBe('block');
            expect(noHighlightsMessage.style.display).toBe('block');
            expect(practiceContent.style.display).toBe('none');
            expect(practicePlanner.isActive).toBe(true);
        });

        test('should show practice content when highlights are available', () => {
            const highlights = [
                { id: 'h1', page: 1, confidence: 'red', xPct: 0.1, yPct: 0.2 }
            ];
            
            practicePlanner.showPracticeInterface(highlights);
            
            const practiceInterface = document.querySelector('[data-role="practice-planner"]');
            const noHighlightsMessage = document.querySelector('[data-role="no-highlights-message"]');
            const practiceContent = document.querySelector('[data-role="practice-plan-content"]');
            
            expect(practiceInterface.style.display).toBe('block');
            expect(noHighlightsMessage.style.display).toBe('none');
            expect(practiceContent.style.display).toBe('block');
            expect(practicePlanner.isActive).toBe(true);
        });

        test('should hide practice interface', () => {
            practicePlanner.showPracticeInterface([]);
            practicePlanner.hidePracticeInterface();
            
            const practiceInterface = document.querySelector('[data-role="practice-planner"]');
            
            expect(practiceInterface.style.display).toBe('none');
            expect(practicePlanner.isActive).toBe(false);
        });
    });

    describe('Practice Sections Population', () => {
        beforeEach(() => {
            practicePlanner.init();
        });

        test('should populate practice sections with sorted highlights', () => {
            const highlights = [
                { id: 'h1', page: 2, confidence: 'red', xPct: 0.1, yPct: 0.3 },
                { id: 'h2', page: 1, confidence: 'green', xPct: 0.2, yPct: 0.1 },
                { id: 'h3', page: 1, confidence: 'amber', xPct: 0.1, yPct: 0.5 }
            ];
            
            practicePlanner.populatePracticeSections(highlights);
            
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            const sectionCount = document.querySelector('[data-role="section-count"]');
            
            expect(sectionsList.innerHTML).toContain('data-highlight-id="h2"'); // Page 1, yPct 0.1
            expect(sectionsList.innerHTML).toContain('data-highlight-id="h3"'); // Page 1, yPct 0.5
            expect(sectionsList.innerHTML).toContain('data-highlight-id="h1"'); // Page 2, yPct 0.3
            expect(sectionCount.textContent).toBe('3 sections');
            
            // Verify template was called for each highlight
            expect(global.window.PracticePlannerTemplates.practiceSection).toHaveBeenCalledTimes(3);
        });

        test('should display annotation data when available', () => {
            const highlights = [
                { 
                    id: 'h1', 
                    page: 1, 
                    confidence: 'red', 
                    xPct: 0.1, 
                    yPct: 0.3,
                    title: 'Focus Point',
                    notes: 'Work on finger positioning'
                },
                { 
                    id: 'h2', 
                    page: 1, 
                    confidence: 'green', 
                    xPct: 0.2, 
                    yPct: 0.1,
                    notes: 'Good technique here' // Only notes, no title
                },
                { 
                    id: 'h3', 
                    page: 2, 
                    confidence: 'amber', 
                    xPct: 0.1, 
                    yPct: 0.5
                    // No annotation data
                }
            ];
            
            practicePlanner.populatePracticeSections(highlights);
            
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            
            // Check that annotations are displayed when present
            expect(sectionsList.innerHTML).toContain('Focus Point');
            expect(sectionsList.innerHTML).toContain('Work on finger positioning');
            expect(sectionsList.innerHTML).toContain('Good technique here');
            expect(sectionsList.innerHTML).toContain('annotation-info');
            
            // Verify template was called with all highlights (they get sorted by page/position)
            expect(global.window.PracticePlannerTemplates.practiceSection).toHaveBeenCalledTimes(3);
            
            // Check that h2 was called first (page 1, yPct 0.1)
            expect(global.window.PracticePlannerTemplates.practiceSection).toHaveBeenNthCalledWith(1,
                expect.objectContaining({ 
                    id: 'h2',
                    notes: 'Good technique here'
                }), 0
            );
            
            // Check that h1 was called second (page 1, yPct 0.3)
            expect(global.window.PracticePlannerTemplates.practiceSection).toHaveBeenNthCalledWith(2,
                expect.objectContaining({ 
                    id: 'h1',
                    title: 'Focus Point',
                    notes: 'Work on finger positioning'
                }), 1
            );
        });

        test('should handle empty highlights array', () => {
            practicePlanner.populatePracticeSections([]);
            
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            const sectionCount = document.querySelector('[data-role="section-count"]');
            
            expect(sectionsList.innerHTML).toBe('');
            expect(sectionCount.textContent).toBe('0 sections');
        });

        test('should not populate if templates are not available', () => {
            global.window.PracticePlannerTemplates = null;
            
            const highlights = [{ id: 'h1', page: 1, confidence: 'red' }];
            practicePlanner.populatePracticeSections(highlights);
            
            expect(mockLogger.warn).toHaveBeenCalledWith('Practice Planner: Missing elements or templates for populating sections', {
                sectionsList: true,
                templates: false
            });
        });
    });

    describe('Session Data Collection', () => {
        beforeEach(() => {
            practicePlanner.init();
            
            // Set up form values
            document.querySelector('[data-role="session-name"]').value = 'Morning Practice';
            document.querySelector('[data-role="session-duration"]').value = '45';
            document.querySelector('[data-role="session-focus"]').value = 'tempo';
            
            // Add mock practice sections
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div class="practice-section" data-highlight-id="h1">
                    <select class="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" class="target-time" value="10" />
                    <textarea class="section-notes">Focus on rhythm</textarea>
                </div>
                <div class="practice-section" data-highlight-id="h2">
                    <select class="practice-method">
                        <option value="metronome" selected>With Metronome</option>
                    </select>
                    <input type="number" class="target-time" value="8" />
                    <textarea class="section-notes">Increase tempo gradually</textarea>
                </div>
            `;
        });

        test('should collect session data correctly', () => {
            const sessionData = practicePlanner.collectSessionData();
            
            expect(sessionData).toEqual({
                name: 'Morning Practice',
                duration: 45,
                focus: 'tempo',
                sections: [
                    {
                        highlightId: 'h1',
                        practiceMethod: 'slow-practice',
                        targetTime: 10,
                        notes: 'Focus on rhythm'
                    },
                    {
                        highlightId: 'h2',
                        practiceMethod: 'metronome',
                        targetTime: 8,
                        notes: 'Increase tempo gradually'
                    }
                ],
                totalSections: 2,
                estimatedTime: 18
            });
        });

        test('should use default values for missing form data', () => {
            // Clear form values
            document.querySelector('[data-role="session-name"]').value = '';
            document.querySelector('[data-role="session-duration"]').value = '';
            document.querySelector('[data-role="session-focus"]').selectedIndex = -1;
            
            const sessionData = practicePlanner.collectSessionData();
            
            expect(sessionData.name).toBe('Untitled Session');
            expect(sessionData.duration).toBe(30);
            expect(sessionData.focus).toBe('accuracy');
        });
    });

    describe('Setup Practice Flow', () => {
        beforeEach(() => {
            practicePlanner.init();
        });

        test('should handle setup practice with existing score ID', async () => {
            const scoreId = 'test-score-123';
            const mockHighlights = [
                { id: 'h1', page: 1, confidence: 'red', xPct: 0.1, yPct: 0.2 }
            ];
            
            practicePlanner.currentScoreId = scoreId;
            mockHighlightPersistenceService.loadHighlights.mockResolvedValue(mockHighlights);
            
            const eventSpy = jest.spyOn(window, 'dispatchEvent');
            
            await practicePlanner.handleSetupPractice();
            
            expect(mockHighlightPersistenceService.loadHighlights).toHaveBeenCalledWith(scoreId);
            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'playtime:practice-session-start',
                detail: expect.objectContaining({
                    scoreId,
                    highlights: mockHighlights
                })
            }));
            expect(practicePlanner.isActive).toBe(true);
        });

        test('should handle setup practice without score ID by using most recent score', async () => {
            const mockScores = [
                { id: 'score1', name: 'Score 1' },
                { id: 'score2', name: 'Score 2' }
            ];
            const mockHighlights = [];
            
            practicePlanner.currentScoreId = null;
            mockDatabase.getAll.mockResolvedValue(mockScores);
            mockHighlightPersistenceService.loadHighlights.mockResolvedValue(mockHighlights);
            
            await practicePlanner.handleSetupPractice();
            
            expect(practicePlanner.currentScoreId).toBe('score2');
            expect(mockHighlightPersistenceService.loadHighlights).toHaveBeenCalledWith('score2');
        });

        test('should handle setup practice with no available scores', async () => {
            practicePlanner.currentScoreId = null;
            mockDatabase.getAll.mockResolvedValue([]);
            
            await practicePlanner.handleSetupPractice();
            
            expect(mockLogger.error).toHaveBeenCalledWith('Practice Planner: No scores available');
            expect(practicePlanner.isActive).toBe(false);
        });
    });

    describe('Event Dispatching', () => {
        beforeEach(() => {
            practicePlanner.init();
        });

        test('should dispatch practice session exit event', async () => {
            const scoreId = 'test-score-123';
            practicePlanner.currentScoreId = scoreId;
            
            const eventSpy = jest.spyOn(window, 'dispatchEvent');
            
            await practicePlanner.handleExitPractice();
            
            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'playtime:practice-session-exit',
                detail: { scoreId }
            }));
            expect(practicePlanner.isActive).toBe(false);
        });

        test('should dispatch practice session configured event', () => {
            practicePlanner.currentScoreId = 'test-score-123';
            
            // Set up mock session data
            document.querySelector('[data-role="session-name"]').value = 'Test Session';
            document.querySelector('[data-role="session-duration"]').value = '30';
            
            const eventSpy = jest.spyOn(window, 'dispatchEvent');
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            
            practicePlanner.handleStartPracticeSession();
            
            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'playtime:practice-session-configured',
                detail: expect.objectContaining({
                    scoreId: 'test-score-123',
                    sessionConfig: expect.objectContaining({
                        name: 'Test Session',
                        duration: 30
                    })
                })
            }));
            
            alertSpy.mockRestore();
        });
    });

    describe('Section Management', () => {
        beforeEach(() => {
            practicePlanner.init();
        });

        test('should update section count after removing sections', () => {
            // Add mock sections
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div class="practice-section">Section 1</div>
                <div class="practice-section">Section 2</div>
            `;
            
            practicePlanner.updateSectionCount();
            
            const sectionCount = document.querySelector('[data-role="section-count"]');
            expect(sectionCount.textContent).toBe('2 sections');
            
            // Remove one section
            sectionsList.removeChild(sectionsList.firstElementChild);
            practicePlanner.updateSectionCount();
            
            expect(sectionCount.textContent).toBe('1 section');
        });

        test('should handle singular section count', () => {
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = '<div class="practice-section">Section 1</div>';
            
            practicePlanner.updateSectionCount();
            
            const sectionCount = document.querySelector('[data-role="section-count"]');
            expect(sectionCount.textContent).toBe('1 section');
        });
    });

    describe('Practice Mode State', () => {
        beforeEach(() => {
            practicePlanner.init();
        });

        test('should correctly report practice mode state', () => {
            expect(practicePlanner.isInPracticeMode()).toBe(false);
            
            practicePlanner.showPracticeInterface([]);
            expect(practicePlanner.isInPracticeMode()).toBe(true);
            
            practicePlanner.hidePracticeInterface();
            expect(practicePlanner.isInPracticeMode()).toBe(false);
        });
    });

    describe('Practice Plan Persistence', () => {
        let mockPracticePlanPersistenceService;

        beforeEach(() => {
            // Mock practice plan persistence service
            mockPracticePlanPersistenceService = {
                savePracticePlan: jest.fn()
            };

            // Create practice planner with persistence service
            const { PracticePlanner } = require('../../scripts/practice-planner');
            practicePlanner = new PracticePlanner(
                mockLogger, 
                mockDatabase, 
                mockHighlightPersistenceService, 
                mockPracticePlanPersistenceService
            );
            
            practicePlanner.init();
            practicePlanner.currentScoreId = 'test-score-123';
        });

        test('should save practice plan successfully', async () => {
            mockPracticePlanPersistenceService.savePracticePlan.mockResolvedValue(42);

            // Set up form data
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            const sessionDurationInput = document.querySelector('[data-role="session-duration"]');
            const sessionFocusSelect = document.querySelector('[data-role="session-focus"]');
            
            sessionNameInput.value = 'Test Practice Session';
            sessionDurationInput.value = '45';
            sessionFocusSelect.value = 'tempo';

            // Add practice sections
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div class="practice-section" data-highlight-id="highlight-1">
                    <select class="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" class="target-time" value="8" />
                    <textarea class="section-notes">Focus on dynamics</textarea>
                </div>
                <div class="practice-section" data-highlight-id="highlight-2">
                    <select class="practice-method">
                        <option value="metronome" selected>With Metronome</option>
                    </select>
                    <input type="number" class="target-time" value="12" />
                    <textarea class="section-notes">Work on timing</textarea>
                </div>
            `;

            // Mock alert to avoid dialog
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            
            // Mock event dispatch
            const eventSpy = jest.spyOn(practicePlanner, '_dispatchEvent');

            // Execute save
            await practicePlanner.handleSavePracticePlan();

            // Verify persistence service was called correctly
            expect(mockPracticePlanPersistenceService.savePracticePlan).toHaveBeenCalledWith({
                name: 'Test Practice Session',
                focus: 'tempo',
                duration: 45,
                scoreId: 'test-score-123',
                sections: [
                    {
                        highlightId: 'highlight-1',
                        practiceMethod: 'slow-practice',
                        targetTime: 8,
                        notes: 'Focus on dynamics'
                    },
                    {
                        highlightId: 'highlight-2',
                        practiceMethod: 'metronome',
                        targetTime: 12,
                        notes: 'Work on timing'
                    }
                ],
                totalSections: 2,
                estimatedTime: 20
            });

            // Verify success feedback
            expect(alertSpy).toHaveBeenCalledWith('Practice plan "Test Practice Session" saved successfully!');
            
            // Verify event dispatch
            expect(eventSpy).toHaveBeenCalledWith('playtime:practice-plan-saved', {
                practicePlanId: 42,
                scoreId: 'test-score-123',
                planData: expect.objectContaining({
                    name: 'Test Practice Session',
                    focus: 'tempo',
                    duration: 45
                })
            });

            alertSpy.mockRestore();
        });

        test('should handle save errors gracefully', async () => {
            const error = new Error('Database connection failed');
            mockPracticePlanPersistenceService.savePracticePlan.mockRejectedValue(error);

            // Set up minimal form data
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            sessionNameInput.value = 'Test Session';

            // Add at least one section
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div class="practice-section" data-highlight-id="highlight-1">
                    <select class="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" class="target-time" value="5" />
                </div>
            `;

            // Mock alert to capture error message
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

            // Execute save
            await practicePlanner.handleSavePracticePlan();

            // Verify error logging and user feedback
            expect(mockLogger.error).toHaveBeenCalledWith('Practice Planner: Failed to save practice plan', error);
            expect(alertSpy).toHaveBeenCalledWith('Failed to save practice plan: Database connection failed');

            alertSpy.mockRestore();
        });

        test('should validate required data before saving', async () => {
            // Test without score ID
            practicePlanner.currentScoreId = null;
            
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            
            await practicePlanner.handleSavePracticePlan();
            
            expect(alertSpy).toHaveBeenCalledWith('Failed to save practice plan: No active score selected');
            expect(mockPracticePlanPersistenceService.savePracticePlan).not.toHaveBeenCalled();
            
            alertSpy.mockRestore();
        });

        test('should validate practice sections exist before saving', async () => {
            practicePlanner.currentScoreId = 'test-score-123';
            
            // Empty sections list
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = '';
            
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            
            await practicePlanner.handleSavePracticePlan();
            
            expect(alertSpy).toHaveBeenCalledWith('Failed to save practice plan: No practice sections to save');
            expect(mockPracticePlanPersistenceService.savePracticePlan).not.toHaveBeenCalled();
            
            alertSpy.mockRestore();
        });

        test('should handle missing persistence service', async () => {
            // Create practice planner without persistence service
            const { PracticePlanner } = require('../../scripts/practice-planner');
            const plannerWithoutService = new PracticePlanner(
                mockLogger, 
                mockDatabase, 
                mockHighlightPersistenceService, 
                null // No persistence service
            );
            
            plannerWithoutService.init();
            plannerWithoutService.currentScoreId = 'test-score-123';

            // Add a section so validation passes
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div class="practice-section" data-highlight-id="highlight-1">
                    <select class="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" class="target-time" value="5" />
                </div>
            `;
            
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            
            await plannerWithoutService.handleSavePracticePlan();
            
            expect(alertSpy).toHaveBeenCalledWith('Failed to save practice plan: Practice plan persistence service not available');
            
            alertSpy.mockRestore();
        });
    });
});
