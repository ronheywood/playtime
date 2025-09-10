/**
 * Practice Planner Integration Tests
 * Tests the practice planner functionality in isolation
 */

// Use the same setup approach as other tests
require('../setup');
global.PracticeSessionTimer = require('../../scripts/Practice/practice-session-timer'); // Ensure timer is loaded first

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
                    <div data-role="practice-section" data-highlight-id="${highlight.id}" data-section-index="${index}">
                        <div data-role="practice-section-content">
                            <h5>Section ${index + 1} - Page ${highlight.page}</h5>
                            <div class="confidence-badge confidence-${highlight.confidence}">
                                ${highlight.confidence.toUpperCase()}
                            </div>
                            ${annotationSection}
                            <select data-role="practice-method">
                                <option value="slow-practice">Slow Practice</option>
                                <option value="hands-separate">Hands Separate</option>
                                <option value="metronome">With Metronome</option>
                            </select>
                            <input type="number" data-role="target-time" value="5" min="1" max="30" />
                            <button class="remove-section">Remove</button>
                        </div>
                    </div>
                `;
            })
        };

        // Load the timer component first (since practice planner depends on it)
        const PracticeSessionTimer = require('../../scripts/Practice/practice-session-timer');
        
        // Make timer available on global/window
        if (typeof global !== 'undefined') {
            global.window = global.window || {};
        }
        
        // Load the practice planner module
        const { PracticePlanner } = require('../../scripts/Practice/practice-planner');
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
                <div data-role="practice-section" data-highlight-id="h1">
                    <select data-role="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" data-role="target-time" value="10" />
                    <textarea data-role="section-notes">Focus on rhythm</textarea>
                </div>
                <div data-role="practice-section" data-highlight-id="h2">
                    <select data-role="practice-method">
                        <option value="metronome" selected>With Metronome</option>
                    </select>
                    <input type="number" data-role="target-time" value="8" />
                    <textarea data-role="section-notes">Increase tempo gradually</textarea>
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
            
            // Set up mock session data - Make sure input exists and is properly set
            let sessionNameInput = document.querySelector('[data-role="session-name"]');
            if (!sessionNameInput) {
                sessionNameInput = document.createElement('input');
                sessionNameInput.setAttribute('data-role', 'session-name');
                document.body.appendChild(sessionNameInput);
            }
            sessionNameInput.value = 'Test Session';
            
            let sessionDurationInput = document.querySelector('[data-role="session-duration"]');
            if (!sessionDurationInput) {
                sessionDurationInput = document.createElement('input');
                sessionDurationInput.setAttribute('data-role', 'session-duration');
                document.body.appendChild(sessionDurationInput);
            }
            sessionDurationInput.value = '30';
            
            // Add practice sections to allow session to start
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div data-role="practice-section" data-highlight-id="highlight-1">
                    <select data-role="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" data-role="target-time" value="5" />
                </div>
            `;
            
            // Mock timer element and highlights - use createElement to avoid clobbering existing DOM
            const highlight = document.createElement('div');
            highlight.setAttribute('data-role', 'highlight');
            highlight.setAttribute('data-highlight-id', 'highlight-1');
            document.body.appendChild(highlight);
            
            const timerDiv = document.createElement('div');
            timerDiv.setAttribute('data-role', 'practice-session-timer');
            timerDiv.style.display = 'none';
            timerDiv.innerHTML = `
                <div data-role="time-remaining"></div>
                <div data-role="section-counter"></div>
                <div data-role="active-session-name"></div>
                <button data-role="pause-timer"><i data-lucide="pause"></i></button>
                <button data-role="next-section"></button>
                <button data-role="exit-practice-session"></button>
                <input data-role="section-notes-input" />
            `;
            document.body.appendChild(timerDiv);
            
            const eventSpy = jest.spyOn(window, 'dispatchEvent');
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            
            practicePlanner.handleStartPracticeSession();
            
            // Get the actual dispatched event - should be the configured event, not start
            expect(eventSpy).toHaveBeenCalled();
            
            // Find the practice-session-configured event
            const configuredEventCall = eventSpy.mock.calls.find(call => 
                call[0].type === 'playtime:practice-session-configured'
            );
            expect(configuredEventCall).toBeTruthy();
            
            const dispatchedEvent = configuredEventCall[0];
            expect(dispatchedEvent.type).toBe('playtime:practice-session-configured');
            expect(dispatchedEvent.detail.scoreId).toBe('test-score-123');
            expect(dispatchedEvent.detail.sessionConfig.name).toBe('Test Session');
            expect(dispatchedEvent.detail.sessionConfig.duration).toBe(30);
            
            alertSpy.mockRestore();
            
            // Clean up practice session
            if (practicePlanner.practiceSession?.timer) {
                clearInterval(practicePlanner.practiceSession.timer);
            }
            practicePlanner.practiceSession = null;
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
                <div data-role="practice-section">Section 1</div>
                <div data-role="practice-section">Section 2</div>
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
            sectionsList.innerHTML = '<div data-role="practice-section">Section 1</div>';
            
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
            const { PracticePlanner } = require('../../scripts/Practice/practice-planner');
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
                <div data-role="practice-section" data-highlight-id="highlight-1">
                    <select data-role="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" data-role="target-time" value="8" />
                    <textarea data-role="section-notes">Focus on dynamics</textarea>
                </div>
                <div data-role="practice-section" data-highlight-id="highlight-2">
                    <select data-role="practice-method">
                        <option value="metronome" selected>With Metronome</option>
                    </select>
                    <input type="number" data-role="target-time" value="12" />
                    <textarea data-role="section-notes">Work on timing</textarea>
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
                <div data-role="practice-section" data-highlight-id="highlight-1">
                    <select data-role="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" data-role="target-time" value="5" />
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
            const { PracticePlanner } = require('../../scripts/Practice/practice-planner');
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
                <div data-role="practice-section" data-highlight-id="highlight-1">
                    <select data-role="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" data-role="target-time" value="5" />
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
                <div data-role="practice-section" data-highlight-id="highlight-3">
                    <select data-role="practice-method">
                        <option value="hands-separate" selected>Hands Separate</option>
                    </select>
                    <input type="number" data-role="target-time" value="15" />
                    <textarea data-role="section-notes">Updated notes</textarea>
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
                <div data-role="practice-section" data-highlight-id="highlight-1">
                    <select data-role="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" data-role="target-time" value="5" />
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

        test('should close practice interface when switching scores while interface is open', async () => {
            // Mock persistence service to return a plan for the first score
            const existingPlan = {
                id: 10,
                name: 'Existing Plan',
                scoreId: 'test-score-1'
            };

            mockPracticePlanPersistenceService.loadPracticePlansForScore = jest.fn()
                .mockResolvedValueOnce([existingPlan]) // First call returns existing plan
                .mockResolvedValueOnce([]); // Second call returns no plans

            // Mock highlight retrieval
            const getHighlightsSpy = jest.spyOn(practicePlanner, 'getHighlightsForScore')
                .mockImplementation(() => Promise.resolve([]));

            // Spy on hidePracticeInterface and isInPracticeMode
            const hidePracticeInterfaceSpy = jest.spyOn(practicePlanner, 'hidePracticeInterface');
            const isInPracticeModeSpy = jest.spyOn(practicePlanner, 'isInPracticeMode');

            // First, select a score with an existing plan
            const scoreSelectedEvent1 = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'test-score-1' }
            });
            await practicePlanner.handleScoreSelected(scoreSelectedEvent1);

            // Simulate that practice interface is open
            isInPracticeModeSpy.mockReturnValue(true);

            // Now switch to a different score
            const scoreSelectedEvent2 = new CustomEvent('playtime:score-selected', {
                detail: { pdfId: 'test-score-2' }
            });
            await practicePlanner.handleScoreSelected(scoreSelectedEvent2);

            // Verify that hidePracticeInterface was called
            expect(hidePracticeInterfaceSpy).toHaveBeenCalled();

            // Clean up
            isInPracticeModeSpy.mockRestore();
        });
    });

    describe('Practice Session Management', () => {
        beforeEach(() => {
            // Mock PlayTimeHighlighting for focus functionality
            window.PlayTimeHighlighting = {
                focusOnHighlight: jest.fn(),
                exitFocusMode: jest.fn()
            };

            // Mock lucide icons
            window.lucide = {
                createIcons: jest.fn()
            };
        });

        afterEach(() => {
            // Clean up any running timers
            if (practicePlanner.practiceSession?.timer) {
                clearInterval(practicePlanner.practiceSession.timer);
            }
            practicePlanner.practiceSession = null;
            
            // Clean up event listeners
            if (practicePlanner.startPracticeSessionButton) {
                const newButton = practicePlanner.startPracticeSessionButton.cloneNode(true);
                practicePlanner.startPracticeSessionButton.parentNode.replaceChild(newButton, practicePlanner.startPracticeSessionButton);
                practicePlanner.startPracticeSessionButton = newButton;
            }
            
            // Clean up mocks
            delete window.PlayTimeHighlighting;
            delete window.lucide;
        });

        test('should start practice session with first section', async () => {
            // Set up session data
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            sessionNameInput.value = 'Test Session';
            
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div class="practice-section border border-border rounded-lg p-4 bg-card" data-role="practice-section" data-highlight-id="highlight-1">
                    <select data-role="practice-method">
                        <option value="slow-practice" selected>Slow Practice</option>
                    </select>
                    <input type="number" data-role="target-time" value="3" />
                </div>
                <div class="practice-section border border-border rounded-lg p-4 bg-card" data-role="practice-section" data-highlight-id="highlight-2">
                    <select data-role="practice-method">
                        <option value="tempo-practice" selected>Tempo Practice</option>
                    </select>
                    <input type="number" data-role="target-time" value="5" />
                </div>
            `;

            // Mock highlight elements - use createElement to avoid clobbering existing DOM
            const highlight1 = document.createElement('div');
            highlight1.setAttribute('data-role', 'highlight');
            highlight1.setAttribute('data-highlight-id', 'highlight-1');
            document.body.appendChild(highlight1);
            
            const highlight2 = document.createElement('div');
            highlight2.setAttribute('data-role', 'highlight');
            highlight2.setAttribute('data-highlight-id', 'highlight-2');
            document.body.appendChild(highlight2);

            // Mock timer element
            const timerDiv = document.createElement('div');
            timerDiv.setAttribute('data-role', 'practice-session-timer');
            timerDiv.style.display = 'none';
            timerDiv.innerHTML = `
                <div data-role="time-remaining"></div>
                <div data-role="section-counter"></div>
                <div data-role="active-session-name"></div>
                <button data-role="pause-timer"><i data-lucide="pause"></i></button>
                <button data-role="next-section"></button>
                <button data-role="exit-practice-session"></button>
                <input data-role="section-notes-input" />
            `;
            document.body.appendChild(timerDiv);

            const hidePracticeInterfaceSpy = jest.spyOn(practicePlanner, 'hidePracticeInterface');

            // Start practice session
            practicePlanner.handleStartPracticeSession();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify session was initialized
            expect(practicePlanner.practiceSession).toBeTruthy();
            expect(practicePlanner.practiceSession.config.name).toBe('Test Session');
            expect(practicePlanner.practiceSession.config.sections).toHaveLength(2);
            expect(practicePlanner.practiceSession.currentSectionIndex).toBe(0);

            // Verify interface was hidden
            expect(hidePracticeInterfaceSpy).toHaveBeenCalled();

            // Verify highlight was focused
            expect(window.PlayTimeHighlighting.focusOnHighlight).toHaveBeenCalledWith(
                expect.any(Element),
                { padding: 20 }
            );

            // Verify timer UI is shown
            const timerElement = document.querySelector('[data-role="practice-session-timer"]');
            expect(timerElement.style.display).toBe('block');
        });

        test('should advance to next section when timer expires', async () => {
            // Use fake timers for this test
            jest.useFakeTimers();
            
            // Set up a session with very short timer
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            sessionNameInput.value = 'Quick Test';
            
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div data-role="practice-section" data-highlight-id="highlight-1">
                    <input type="number" data-role="target-time" value="1" />
                </div>
                <div data-role="practice-section" data-highlight-id="highlight-2">
                    <input type="number" data-role="target-time" value="1" />
                </div>
            `;

            // Mock elements
            document.body.innerHTML += `
                <div data-role="highlight" data-highlight-id="highlight-1"></div>
                <div data-role="highlight" data-highlight-id="highlight-2"></div>
                <div data-role="practice-session-timer" style="display: none;">
                    <div data-role="time-remaining"></div>
                    <div data-role="section-counter"></div>
                    <div data-role="active-session-name"></div>
                    <button data-role="pause-timer"><i data-lucide="pause"></i></button>
                    <button data-role="next-section"></button>
                    <button data-role="exit-practice-session"></button>
                    <input data-role="section-notes-input" />
                </div>
            `;

            // Mock alert to prevent errors in test environment
            global.alert = jest.fn();

            // Start session
            practicePlanner.handleStartPracticeSession();

            // Add spy to track if timer completion callback is called
            const handleTimerCompleteSpy = jest.spyOn(practicePlanner, 'handleTimerComplete');

            // Fast-forward time to complete first section (60 seconds)
            jest.advanceTimersByTime(60000);

            // Should have advanced to second section (check via practice planner)
            expect(practicePlanner.practiceSession.currentSectionIndex).toBe(1);
            
            // Restore real timers
            jest.useRealTimers();
        });

        test('should end session when all sections complete', async () => {
            // Use fake timers for this test
            jest.useFakeTimers();
            
            // Set up session with one very short section
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            sessionNameInput.value = 'Single Section Test';
            
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div data-role="practice-section" data-highlight-id="highlight-1">
                    <input type="number" data-role="target-time" value="1" />
                </div>
            `;

            // Mock elements
            document.body.innerHTML += `
                <div data-role="highlight" data-highlight-id="highlight-1"></div>
                <div data-role="practice-session-timer" style="display: none;">
                    <div data-role="time-remaining"></div>
                    <button data-role="pause-timer"><i data-lucide="pause"></i></button>
                    <button data-role="next-section"></button>
                    <button data-role="exit-practice-session"></button>
                    <input data-role="section-notes-input" />
                </div>
            `;

            // Mock alert
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

            // Start session
            practicePlanner.handleStartPracticeSession();

            // Fast-forward time to complete the single section (60 seconds)
            jest.advanceTimersByTime(60000);

            // Session should be ended
            expect(practicePlanner.practiceSession).toBeNull();
            expect(alertSpy).toHaveBeenCalledWith(
                expect.stringContaining('Practice session completed!')
            );
            expect(window.PlayTimeHighlighting.exitFocusMode).toHaveBeenCalled();

            alertSpy.mockRestore();
            jest.useRealTimers();
        });

        test('should pause and resume timer', () => {
            // Set up session
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            sessionNameInput.value = 'Pause Test';
            
            const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
            sectionsList.innerHTML = `
                <div data-role="practice-section" data-highlight-id="highlight-1">
                    <input type="number" data-role="target-time" value="5" />
                </div>
            `;

            // Mock elements
            document.body.innerHTML += `
                <div data-role="highlight" data-highlight-id="highlight-1"></div>
                <div data-role="practice-session-timer" style="display: none;">
                    <button data-role="pause-timer"><i data-lucide="pause"></i></button>
                </div>
            `;

            // Start session
            practicePlanner.handleStartPracticeSession();

            // Should not be paused initially
            expect(practicePlanner.practiceSessionTimer.isPaused).toBe(false);

            // Pause timer
            practicePlanner.practiceSessionTimer.togglePause();
            expect(practicePlanner.practiceSessionTimer.isPaused).toBe(true);

            // Resume timer
            practicePlanner.practiceSessionTimer.togglePause();
            expect(practicePlanner.practiceSessionTimer.isPaused).toBe(false);
        });
    });

    describe('Sidebar Start Practice Session Button', () => {
        let mockPracticePlanPersistenceService;
        let mockPracticeSessionManager;

        beforeEach(() => {
            // Mock practice plan persistence service
            mockPracticePlanPersistenceService = {
                loadPracticePlansForScore: jest.fn(),
                savePracticePlan: jest.fn(),
                loadPracticePlan: jest.fn()
            };

            // Mock practice session manager
            mockPracticeSessionManager = {
                startFromPlan: jest.fn()
            };

            // Add the sidebar button to DOM BEFORE setting up practice planner
            document.body.innerHTML += `
                <button data-role="start-practice-session-sidebar" id="start-practice-session-sidebar" 
                        class="btn btn-primary w-full text-xs" style="display: none;">
                    <i data-lucide="play" class="w-4 h-4 mr-1"></i>
                    <span>Start Practice Session</span>
                </button>
            `;

            // Set up practice planner with mocked services
            practicePlanner.practicePlanPersistenceService = mockPracticePlanPersistenceService;
            practicePlanner.practiceSessionManager = mockPracticeSessionManager;

            // Reinitialize to pick up the new button
            practicePlanner.startPracticeSessionButton = document.querySelector('[data-role="start-practice-session-sidebar"]');
            if (practicePlanner.startPracticeSessionButton) {
                practicePlanner.startPracticeSessionButton.addEventListener('click', practicePlanner.handleStartPracticeSessionFromSidebar.bind(practicePlanner));
            }
        });

        test('should show start practice session button when existing plan is found', async () => {
            // Ensure button exists and is accessible
            expect(practicePlanner.startPracticeSessionButton).toBeTruthy();
            
            // Initial state should be hidden
            expect(practicePlanner.startPracticeSessionButton.style.display).toBe('none');

            // Test the updateSetupButtonText method directly
            practicePlanner.updateSetupButtonText(true);
            
            // Button should be visible
            expect(practicePlanner.startPracticeSessionButton.style.display).toBe('flex');

            // Also test that it can be hidden again
            practicePlanner.updateSetupButtonText(false);
            expect(practicePlanner.startPracticeSessionButton.style.display).toBe('none');
        });

        test('should hide start practice session button when no existing plan is found', async () => {
            mockPracticePlanPersistenceService.loadPracticePlansForScore.mockResolvedValue([]);
            practicePlanner.currentScoreId = 'score-1';

            // Simulate score selection which triggers plan loading
            await practicePlanner.handleScoreSelected({ detail: { pdfId: 'score-1' } });

            // Button should be hidden
            expect(practicePlanner.startPracticeSessionButton.style.display).toBe('none');
            expect(practicePlanner.currentPracticePlan).toBeNull();
        });

        test('should start practice session when sidebar button is clicked', async () => {
            const mockPlan = {
                id: 'plan-123',
                name: 'Test Practice Plan',
                scoreId: 'score-1',
                sections: [
                    { highlightId: 'highlight-1', targetTime: 300 }
                ]
            };

            // Set up current practice plan
            practicePlanner.currentPracticePlan = mockPlan;
            practicePlanner.currentScoreId = 'score-1';
            mockPracticeSessionManager.startFromPlan.mockResolvedValue(true);

            // Click the sidebar button
            await practicePlanner.handleStartPracticeSessionFromSidebar();

            // Should call startFromPlan with correct parameters
            expect(mockPracticeSessionManager.startFromPlan).toHaveBeenCalledWith('plan-123', 'score-1');
        });

        test('should show error when sidebar button is clicked but no plan is available', async () => {
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            
            // No current practice plan
            practicePlanner.currentPracticePlan = null;

            // Click the sidebar button
            await practicePlanner.handleStartPracticeSessionFromSidebar();

            // Should show error and not call startFromPlan
            expect(alertSpy).toHaveBeenCalledWith('No practice plan available. Please create a practice plan first.');
            expect(mockPracticeSessionManager.startFromPlan).not.toHaveBeenCalled();

            alertSpy.mockRestore();
        });

        test('should handle start from plan failure gracefully', async () => {
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
            const mockPlan = {
                id: 'plan-123',
                name: 'Test Practice Plan',
                scoreId: 'score-1'
            };

            // Set up current practice plan
            practicePlanner.currentPracticePlan = mockPlan;
            practicePlanner.currentScoreId = 'score-1';
            mockPracticeSessionManager.startFromPlan.mockResolvedValue(false);

            // Click the sidebar button
            await practicePlanner.handleStartPracticeSessionFromSidebar();

            // Should show error message
            expect(alertSpy).toHaveBeenCalledWith('Failed to start practice session from saved plan');
            expect(mockPracticeSessionManager.startFromPlan).toHaveBeenCalledWith('plan-123', 'score-1');

            alertSpy.mockRestore();
        });
    });
});
