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
                isUpdate: false,
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

        test('should update existing practice plan successfully', async () => {
            // Set up existing practice plan
            const existingPlan = {
                id: 5,
                name: 'Existing Plan',
                focus: 'accuracy',
                duration: 30,
                scoreId: 'test-score-123'
            };

            practicePlanner.currentPracticePlan = existingPlan;
            practicePlanner.isEditingExistingPlan = true;

            // Mock the update method
            mockPracticePlanPersistenceService.updatePracticePlan = jest.fn().mockResolvedValue(5);

            // Set up form data
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            const sessionDurationInput = document.querySelector('[data-role="session-duration"]');
            const sessionFocusSelect = document.querySelector('[data-role="session-focus"]');
            
            sessionNameInput.value = 'Updated Practice Session';
            sessionDurationInput.value = '60';
            sessionFocusSelect.value = 'tempo';

            // Add practice sections
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div class="practice-section" data-highlight-id="highlight-3">
                    <select class="practice-method">
                        <option value="hands-separate" selected>Hands Separate</option>
                    </select>
                    <input type="number" class="target-time" value="15" />
                    <textarea class="section-notes">Updated notes</textarea>
                </div>
            `;

            // Mock alert to avoid dialog
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            
            // Mock event dispatch
            const eventSpy = jest.spyOn(practicePlanner, '_dispatchEvent');

            // Execute save (should update)
            await practicePlanner.handleSavePracticePlan();

            // Verify update method was called correctly
            expect(mockPracticePlanPersistenceService.updatePracticePlan).toHaveBeenCalledWith(5, {
                name: 'Updated Practice Session',
                focus: 'tempo',
                duration: 60,
                scoreId: 'test-score-123',
                sections: [
                    {
                        highlightId: 'highlight-3',
                        practiceMethod: 'hands-separate',
                        targetTime: 15,
                        notes: 'Updated notes'
                    }
                ],
                totalSections: 1,
                estimatedTime: 15,
                id: 5
            });

            // Verify success feedback
            expect(alertSpy).toHaveBeenCalledWith('Practice plan "Updated Practice Session" updated successfully!');
            
            // Verify event dispatch
            expect(eventSpy).toHaveBeenCalledWith('playtime:practice-plan-updated', {
                practicePlanId: 5,
                scoreId: 'test-score-123',
                isUpdate: true,
                planData: expect.objectContaining({
                    name: 'Updated Practice Session',
                    focus: 'tempo',
                    duration: 60
                })
            });

            alertSpy.mockRestore();
        });

        test('should check for existing practice plans on score selection', async () => {
            // Mock persistence service methods
            mockPracticePlanPersistenceService.loadPracticePlansForScore = jest.fn().mockResolvedValue([
                { 
                    id: 10, 
                    name: 'Existing Plan', 
                    createdAt: '2023-01-01T10:00:00Z',
                    scoreId: 'test-score-456'
                }
            ]);

            // Mock the button update method
            const updateButtonSpy = jest.spyOn(practicePlanner, 'updateSetupButtonText');

            // Simulate score selection event
            const scoreSelectedEvent = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'test-score-456' }
            });

            await practicePlanner.handleScoreSelected(scoreSelectedEvent);

            // Verify persistence service was called
            expect(mockPracticePlanPersistenceService.loadPracticePlansForScore).toHaveBeenCalledWith('test-score-456');
            
            // Verify current plan is set
            expect(practicePlanner.currentPracticePlan).toEqual(expect.objectContaining({
                id: 10,
                name: 'Existing Plan'
            }));

            // Verify button text was updated
            expect(updateButtonSpy).toHaveBeenCalledWith(true);
        });

        test('should handle no existing practice plans on score selection', async () => {
            // Mock persistence service methods
            mockPracticePlanPersistenceService.loadPracticePlansForScore = jest.fn().mockResolvedValue([]);

            // Mock the button update method
            const updateButtonSpy = jest.spyOn(practicePlanner, 'updateSetupButtonText');

            // Simulate score selection event
            const scoreSelectedEvent = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'test-score-789' }
            });

            await practicePlanner.handleScoreSelected(scoreSelectedEvent);

            // Verify persistence service was called
            expect(mockPracticePlanPersistenceService.loadPracticePlansForScore).toHaveBeenCalledWith('test-score-789');
            
            // Verify current plan is cleared
            expect(practicePlanner.currentPracticePlan).toBeNull();

            // Verify button text was updated for new plan
            expect(updateButtonSpy).toHaveBeenCalledWith(false);
        });

        test('should update setup button text correctly', () => {
            // Test with existing plan
            practicePlanner.updateSetupButtonText(true);
            expect(practicePlanner.setupButton.textContent).toBe('Edit practice plan');
            expect(practicePlanner.setupButton.title).toBe('Edit existing practice plan for this score');

            // Test without existing plan
            practicePlanner.updateSetupButtonText(false);
            expect(practicePlanner.setupButton.textContent).toBe('Setup practice plan');
            expect(practicePlanner.setupButton.title).toBe('Create a new practice plan for this score');
        });

        test('should not rebind global event listeners on score selection', async () => {
            // Mock persistence service methods
            mockPracticePlanPersistenceService.loadPracticePlansForScore = jest.fn().mockResolvedValue([]);

            // Mock the save method to resolve successfully
            mockPracticePlanPersistenceService.savePracticePlan.mockResolvedValue(1);

            // Mock alert to avoid dialog
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

            // Count how many times the save method gets called
            let saveCallCount = 0;
            const originalSave = mockPracticePlanPersistenceService.savePracticePlan;
            mockPracticePlanPersistenceService.savePracticePlan = jest.fn((...args) => {
                saveCallCount++;
                return originalSave(...args);
            });

            // Trigger score selection multiple times to test for event listener rebinding
            for (let i = 0; i < 3; i++) {
                const scoreSelectedEvent = new CustomEvent('playtime:score-selected', {
                    detail: { pdfId: `test-score-${i}` }
                });
                await practicePlanner.handleScoreSelected(scoreSelectedEvent);
            }

            // Set up minimal form data and sections for save to work
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            sessionNameInput.value = 'Test Session';
            
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div class="practice-section" data-highlight-id="highlight-1">
                    <select class="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" class="target-time" value="5" />
                </div>
            `;

            // Click save button once
            const saveButton = document.querySelector('[data-role="save-practice-plan"]');
            saveButton.click();

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify save was only called once, not multiple times due to rebinding
            expect(saveCallCount).toBe(1);

            alertSpy.mockRestore();
        });

        test('should reset form when switching to score without existing plan', async () => {
            // First, set up a score with existing plan
            const existingPlan = {
                id: 10,
                name: 'Existing Plan',
                focus: 'tempo',
                duration: 45,
                createdAt: '2023-01-01T10:00:00Z',
                scoreId: 'test-score-1'
            };

            mockPracticePlanPersistenceService.loadPracticePlansForScore = jest.fn()
                .mockResolvedValueOnce([existingPlan]) // First call returns existing plan
                .mockResolvedValueOnce([]); // Second call returns no plans

            // Simulate score selection with existing plan
            const scoreSelectedEvent1 = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'test-score-1' }
            });
            await practicePlanner.handleScoreSelected(scoreSelectedEvent1);

            // Verify plan is loaded
            expect(practicePlanner.currentPracticePlan).toEqual(expect.objectContaining({
                id: 10,
                name: 'Existing Plan'
            }));

            // Manually fill form to simulate form being populated
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            const sessionDurationInput = document.querySelector('[data-role="session-duration"]');
            const sessionFocusSelect = document.querySelector('[data-role="session-focus"]');
            
            sessionNameInput.value = 'Existing Plan';
            sessionDurationInput.value = '45';
            sessionFocusSelect.value = 'tempo';

            // Now switch to a score without existing plan
            const scoreSelectedEvent2 = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'test-score-2' }
            });
            await practicePlanner.handleScoreSelected(scoreSelectedEvent2);

            // Verify plan is cleared
            expect(practicePlanner.currentPracticePlan).toBeNull();

            // Verify form is reset to defaults
            expect(sessionNameInput.value).toBe('');
            expect(sessionDurationInput.value).toBe('30');
            expect(sessionFocusSelect.value).toBe('accuracy');
        });

        test('should repopulate sections when switching to score without existing plan', async () => {
            // First, set up a score with existing plan and sections
            const existingPlan = {
                id: 10,
                name: 'Existing Plan',
                focus: 'tempo',
                duration: 45,
                createdAt: '2023-01-01T10:00:00Z',
                scoreId: 'test-score-1'
            };

            const score1Highlights = [
                { id: 'highlight-1', page: 1, confidence: 'medium', x: 100, y: 200 },
                { id: 'highlight-2', page: 1, confidence: 'high', x: 150, y: 250 }
            ];

            const score2Highlights = [
                { id: 'highlight-3', page: 2, confidence: 'low', x: 300, y: 400 },
                { id: 'highlight-4', page: 2, confidence: 'medium', x: 350, y: 450 },
                { id: 'highlight-5', page: 3, confidence: 'high', x: 500, y: 600 }
            ];

            // Mock persistence service to return existing plan for score 1, none for score 2
            mockPracticePlanPersistenceService.loadPracticePlansForScore = jest.fn()
                .mockResolvedValueOnce([existingPlan]) // First call (score 1) returns existing plan
                .mockResolvedValueOnce([]); // Second call (score 2) returns no plans

            // Mock highlight retrieval for both scores
            const getHighlightsSpy = jest.spyOn(practicePlanner, 'getHighlightsForScore')
                .mockImplementation((scoreId) => {
                    if (scoreId === 'test-score-1') {
                        return Promise.resolve(score1Highlights);
                    } else if (scoreId === 'test-score-2') {
                        return Promise.resolve(score2Highlights);
                    }
                    return Promise.resolve([]);
                });

            const populateSectionsSpy = jest.spyOn(practicePlanner, 'populatePracticeSections');

            // Clear any previous calls
            getHighlightsSpy.mockClear();
            populateSectionsSpy.mockClear();

            // Simulate score selection with existing plan (score 1)
            const scoreSelectedEvent1 = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'test-score-1' }
            });
            await practicePlanner.handleScoreSelected(scoreSelectedEvent1);

            // Verify existing plan is loaded
            expect(practicePlanner.currentPracticePlan).toEqual(expect.objectContaining({
                id: 10,
                name: 'Existing Plan'
            }));

            // Now switch to a score without existing plan (score 2)
            const scoreSelectedEvent2 = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'test-score-2' }
            });
            await practicePlanner.handleScoreSelected(scoreSelectedEvent2);

            // Verify plan is cleared
            expect(practicePlanner.currentPracticePlan).toBeNull();

            // Verify highlights were retrieved for the new score
            expect(getHighlightsSpy).toHaveBeenCalledWith('test-score-2');

            // Verify sections were repopulated with new score's highlights
            // Check that the most recent call was with score2Highlights
            const populateCallsCount = populateSectionsSpy.mock.calls.length;
            expect(populateCallsCount).toBeGreaterThan(0);
            const lastCall = populateSectionsSpy.mock.calls[populateCallsCount - 1];
            expect(lastCall[0]).toEqual(score2Highlights);
        });
    });
});
