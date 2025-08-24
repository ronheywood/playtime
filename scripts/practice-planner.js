/**
 * Practice Planner Module
 * Handles practice session planning functionality
 */

// Configuration
const PRACTICE_PLANNER_CONFIG = {
    SELECTORS: {
        // Practice planner UI elements
        PRACTICE_PLANNER_CARD: '[data-role="practice-planner"]',
        SETUP_PRACTICE_BTN: '[data-role="setup-practice"]',
        RETURN_TO_HIGHLIGHTING_BTN: '[data-role="return-to-highlighting"]',
        PRACTICE_SESSION_FORM: '[data-role="practice-session-form"]',
        SESSION_NAME_INPUT: '[data-role="session-name"]',
        SESSION_DURATION_INPUT: '[data-role="session-duration"]',
        SESSION_FOCUS_SELECT: '[data-role="session-focus"]',
        START_SESSION_BTN: '[data-role="start-session"]'
    },
    
    CSS_CLASSES: {
        HIDDEN: 'd-none',
        VISIBLE: 'd-block'
    }
};

class PracticePlanner {
    constructor(logger, database, highlightPersistenceService) {
        this.config = PRACTICE_PLANNER_CONFIG;
        this.logger = logger;
        this.database = database;
        this.highlightPersistenceService = highlightPersistenceService;
        this.currentScoreId = null;
        this.isActive = false;
        
        // DOM elements - will be populated by init()
        this.setupButton = null;
        this.exitButton = null;
        this.returnToHighlightingButton = null;
        this.practiceInterface = null;
        this.noHighlightsMessage = null;
        this.practiceContent = null;
    }

    init() {
        this.logger.info('Initializing Practice Planner');
        
        // Find DOM elements
        this.setupButton = document.querySelector('[data-role="setup-practice-plan"]');
        this.exitButton = document.querySelector('[data-role="exit-practice-planning"]');
        this.returnToHighlightingButton = document.querySelector('[data-role="return-to-highlighting"]');
        this.practiceInterface = document.querySelector('[data-role="practice-planner"]');
        this.noHighlightsMessage = document.querySelector('[data-role="no-highlights-message"]');
        this.practiceContent = document.querySelector('[data-role="practice-plan-content"]');

        this.logger.info('Practice Planner DOM elements found:', {
            setupButton: !!this.setupButton,
            exitButton: !!this.exitButton,
            practiceInterface: !!this.practiceInterface
        });

        if (!this.setupButton || !this.exitButton || !this.practiceInterface) {
            if (this.logger.error) {
                this.logger.error('Practice Planner: Required DOM elements not found');
            } else {
                console.error('Practice Planner: Required DOM elements not found');
            }
            return false;
        }

        // Bind event handlers
        this.setupButton.addEventListener('click', this.handleSetupPractice.bind(this));
        this.exitButton.addEventListener('click', this.handleExitPractice.bind(this));
        
        if (this.returnToHighlightingButton) {
            this.returnToHighlightingButton.addEventListener('click', this.handleExitPractice.bind(this));
        }

        this.logger.info('Practice Planner event handlers attached');

        // Listen for score changes to update current score context
        window.addEventListener('playtime:score-selected', this.handleScoreSelected.bind(this));
        
        this.logger.info('Practice Planner initialized successfully');
        return true;
    }

    handleScoreSelected(event) {
        if (event.detail && event.detail.pdfId) {
            this.currentScoreId = event.detail.pdfId;
            this.logger.info('Practice Planner: Score context updated from score-selected event', { 
                scoreId: this.currentScoreId,
                eventDetail: event.detail
            });
        }
    }

    async handleSetupPractice() {
        this.logger.info('Practice Planner: Setup practice clicked', { 
            currentScoreId: this.currentScoreId,
            timestamp: Date.now()
        });
        
        if (!this.currentScoreId) {
            this.logger.warn('Practice Planner: No active score ID');
            
            // Try to get from global state first
            if (window.PlayTimeCurrentScoreId) {
                this.currentScoreId = window.PlayTimeCurrentScoreId;
                this.logger.info('Practice Planner: Using global current score ID', { 
                    scoreId: this.currentScoreId
                });
            } else {
                // Fallback: Try to get the current score from the database
                const scores = await this.database.getAll();
                this.logger.info('Practice Planner: Retrieved scores from database', { 
                    scoresCount: scores.length,
                    scores: scores.map(s => ({ id: s.id, name: s.name }))
                });
                
                if (scores.length > 0) {
                    this.currentScoreId = scores[scores.length - 1].id; // Use the most recent score
                    this.logger.warn('Practice Planner: Using most recent score as fallback', { 
                        scoreId: this.currentScoreId,
                        scoreName: scores[scores.length - 1].name
                    });
                } else {
                    this.logger.error('Practice Planner: No scores available');
                    return;
                }
            }
        }

        // Get highlights for the current score
        this.logger.info('Practice Planner: Retrieving highlights for score', { scoreId: this.currentScoreId });
        const highlights = await this.getHighlightsForScore(this.currentScoreId);
        this.logger.info('Practice Planner: Retrieved highlights', { 
            scoreId: this.currentScoreId,
            highlightsCount: highlights.length,
            highlights: highlights.map(h => ({ 
                id: h.id, 
                page: h.page, 
                confidence: h.confidence,
                xPct: h.xPct,
                yPct: h.yPct
            }))
        });
        
        // Dispatch practice session start event
        const eventDetail = {
            scoreId: this.currentScoreId,
            highlights: highlights,
            timestamp: Date.now()
        };
        
        const event = new CustomEvent('playtime:practice-session-start', {
            detail: eventDetail
        });
        
        this.logger.info('Practice Planner: Dispatching practice session start event', eventDetail);
        window.dispatchEvent(event);

        // Show practice interface and hide canvas
        this.showPracticeInterface(highlights);
    }

    async handleExitPractice() {
        this.logger.info('Practice Planner: Exit practice clicked');
        
        // Dispatch practice session exit event
        const event = new CustomEvent('playtime:practice-session-exit', {
            detail: {
                scoreId: this.currentScoreId
            }
        });
        window.dispatchEvent(event);

        // Hide practice interface and show canvas
        this.hidePracticeInterface();
    }

    async getHighlightsForScore(scoreId) {
        try {
            this.logger.info('Practice Planner: Getting highlights for score', { 
                scoreId, 
                hasHighlightPersistenceService: !!this.highlightPersistenceService,
                persistenceServiceType: this.highlightPersistenceService ? this.highlightPersistenceService.constructor.name : 'none'
            });
            
            if (this.highlightPersistenceService && typeof this.highlightPersistenceService.loadHighlights === 'function') {
                const highlights = await this.highlightPersistenceService.loadHighlights(scoreId);
                this.logger.info('Practice Planner: Loaded highlights from persistence service', { 
                    scoreId, 
                    highlightsCount: highlights ? highlights.length : 0,
                    highlights: highlights || []
                });
                return highlights || [];
            }
            // Fallback: return empty array if persistence service not available
            this.logger.warn('Practice Planner: Highlight persistence service not available', {
                scoreId,
                highlightPersistenceService: this.highlightPersistenceService
            });
            return [];
        } catch (error) {
            this.logger.error('Practice Planner: Error getting highlights', { scoreId, error: error.message, stack: error.stack });
            return [];
        }
    }

    showPracticeInterface(highlights = []) {
        this.isActive = true;
        
        // Dispatch layout command to hide PDF viewer
        if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.changeLayout === 'function') {
            window.PlayTimeLayoutCommands.changeLayout('practice-mode', {
                action: 'enter',
                highlights: highlights,
                highlightCount: highlights.length
            });
        } else {
            this.logger.warn?.('Practice Planner: PlayTimeLayoutCommands not available');
        }

        // Show practice interface
        if (this.practiceInterface) {
            this.practiceInterface.style.display = 'block';
        }

        // Show appropriate content based on highlights
        if (highlights.length === 0) {
            if (this.noHighlightsMessage) {
                this.noHighlightsMessage.style.display = 'block';
            }
            if (this.practiceContent) {
                this.practiceContent.style.display = 'none';
            }
        } else {
            if (this.noHighlightsMessage) {
                this.noHighlightsMessage.style.display = 'none';
            }
            if (this.practiceContent) {
                this.practiceContent.style.display = 'block';
                // Populate the practice sections
                this.populatePracticeSections(highlights);
            }
        }

        this.logger.info('Practice Planner: Interface shown', { highlightCount: highlights.length });
    }

    /**
     * Populate the practice sections list with highlights
     */
    populatePracticeSections(highlights) {
        this.logger.info('Practice Planner: Populating practice sections', { 
            highlightsCount: highlights.length,
            highlights: highlights.map(h => ({ id: h.id, page: h.page, confidence: h.confidence }))
        });
        
        const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
        const sectionCount = document.querySelector('[data-role="section-count"]');
        
        this.logger.info('Practice Planner: DOM elements found', {
            sectionsList: !!sectionsList,
            sectionCount: !!sectionCount,
            hasTemplates: !!window.PracticePlannerTemplates
        });
        
        if (!sectionsList || !window.PracticePlannerTemplates) {
            this.logger.warn('Practice Planner: Missing elements or templates for populating sections', {
                sectionsList: !!sectionsList,
                templates: !!window.PracticePlannerTemplates
            });
            return;
        }

        // Sort highlights by page and position
        const sortedHighlights = highlights.sort((a, b) => {
            if (a.page !== b.page) {
                return (a.page || 1) - (b.page || 1);
            }
            return (a.yPct || 0) - (b.yPct || 0);
        });

        this.logger.info('Practice Planner: Sorted highlights', { 
            originalCount: highlights.length,
            sortedCount: sortedHighlights.length,
            sortedHighlights: sortedHighlights.map(h => ({ id: h.id, page: h.page, yPct: h.yPct, confidence: h.confidence }))
        });

        // Generate HTML for each highlight
        const sectionsHTML = sortedHighlights
            .map((highlight, index) => {
                const sectionHTML = window.PracticePlannerTemplates.practiceSection(highlight, index);
                this.logger.debug?.('Practice Planner: Generated section HTML', { highlight: highlight.id, index, htmlLength: sectionHTML.length });
                return sectionHTML;
            })
            .join('');

        this.logger.info('Practice Planner: Generated sections HTML', { 
            htmlLength: sectionsHTML.length,
            sectionsCount: sortedHighlights.length
        });

        sectionsList.innerHTML = sectionsHTML;

        // Update section count
        if (sectionCount) {
            const countText = `${highlights.length} section${highlights.length === 1 ? '' : 's'}`;
            sectionCount.textContent = countText;
            this.logger.info('Practice Planner: Updated section count', { countText });
        }

        // Attach event listeners to the new sections
        this.attachSectionEventListeners();

        this.logger.info('Practice Planner: Populated practice sections successfully', { count: highlights.length });
    }

    /**
     * Attach event listeners to practice section elements
     */
    attachSectionEventListeners() {
        const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
        if (!sectionsList) return;

        // Remove section buttons
        sectionsList.querySelectorAll('.remove-section').forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.target.closest('.practice-section');
                if (section && confirm('Remove this section from the practice plan?')) {
                    section.remove();
                    this.updateSectionCount();
                }
            });
        });

        // Practice method changes
        sectionsList.querySelectorAll('.practice-method').forEach(select => {
            select.addEventListener('change', (e) => {
                this.logger.debug?.('Practice method changed', {
                    sectionId: e.target.closest('.practice-section')?.dataset.highlightId,
                    method: e.target.value
                });
            });
        });

        // Target time changes
        sectionsList.querySelectorAll('.target-time').forEach(input => {
            input.addEventListener('change', (e) => {
                this.logger.debug?.('Target time changed', {
                    sectionId: e.target.closest('.practice-section')?.dataset.highlightId,
                    time: e.target.value
                });
            });
        });

        // Start practice session button
        const startButton = document.querySelector('[data-role="start-practice-session"]');
        if (startButton) {
            startButton.addEventListener('click', this.handleStartPracticeSession.bind(this));
        }

        // Save practice plan button
        const saveButton = document.querySelector('[data-role="save-practice-plan"]');
        if (saveButton) {
            saveButton.addEventListener('click', this.handleSavePracticePlan.bind(this));
        }
    }

    /**
     * Update the section count display
     */
    updateSectionCount() {
        const sectionCount = document.querySelector('[data-role="section-count"]');
        const sections = document.querySelectorAll('.practice-section');
        
        if (sectionCount) {
            const count = sections.length;
            sectionCount.textContent = `${count} section${count === 1 ? '' : 's'}`;
        }
    }

    /**
     * Handle starting a practice session
     */
    handleStartPracticeSession() {
        const sessionData = this.collectSessionData();
        
        this.logger.info('Practice Planner: Starting practice session', sessionData);
        
        // Dispatch practice session start event with full configuration
        const event = new CustomEvent('playtime:practice-session-configured', {
            detail: {
                scoreId: this.currentScoreId,
                sessionConfig: sessionData
            }
        });
        window.dispatchEvent(event);
        
        // For now, just show an alert - in the future this could launch a practice timer
        alert(`Starting practice session: "${sessionData.name}" (${sessionData.duration} minutes)`);
    }

    /**
     * Handle saving a practice plan
     */
    handleSavePracticePlan() {
        const sessionData = this.collectSessionData();
        
        this.logger.info('Practice Planner: Saving practice plan', sessionData);
        
        // TODO: Implement practice plan persistence
        alert('Practice plan saved! (Feature coming soon)');
    }

    /**
     * Collect all session configuration data from the form
     */
    collectSessionData() {
        const sessionName = document.querySelector('[data-role="session-name"]')?.value || 'Untitled Session';
        const sessionDuration = parseInt(document.querySelector('[data-role="session-duration"]')?.value || '30');
        const sessionFocus = document.querySelector('[data-role="session-focus"]')?.value || 'accuracy';
        
        const sections = Array.from(document.querySelectorAll('.practice-section')).map(section => {
            return {
                highlightId: section.dataset.highlightId,
                practiceMethod: section.querySelector('.practice-method')?.value || 'slow-practice',
                targetTime: parseInt(section.querySelector('.target-time')?.value || '5'),
                notes: section.querySelector('.section-notes')?.value || ''
            };
        });

        return {
            name: sessionName,
            duration: sessionDuration,
            focus: sessionFocus,
            sections: sections,
            totalSections: sections.length,
            estimatedTime: sections.reduce((total, section) => total + section.targetTime, 0)
        };
    }

    hidePracticeInterface() {
        this.isActive = false;
        
        // Dispatch layout command to show PDF viewer
        if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.changeLayout === 'function') {
            window.PlayTimeLayoutCommands.changeLayout('practice-mode', {
                action: 'exit'
            });
        } else {
            this.logger.warn?.('Practice Planner: PlayTimeLayoutCommands not available');
        }

        // Hide practice interface
        if (this.practiceInterface) {
            this.practiceInterface.style.display = 'none';
        }

        this.logger.info('Practice Planner: Interface hidden');
    }

    isInPracticeMode() {
        return this.isActive;
    }

    /**
     * Dispatch a custom event
     * @param {string} eventType - The event type to dispatch
     * @param {object} detail - Event detail data
     */
    _dispatchEvent(eventType, detail) {
        try {
            const event = new CustomEvent(eventType, {
                detail: detail,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
            this.logger.debug?.(`Practice Planner: Dispatched event ${eventType}`, detail);
        } catch (error) {
            this.logger.warn?.(`Practice Planner: Failed to dispatch event ${eventType}`, error);
        }
    }
}

// Factory function for creating practice planner instance
function createPlayTimePracticePlanner(logger, database, highlightPersistenceService) {
    return new PracticePlanner(logger, database, highlightPersistenceService);
}

// Export for both Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PracticePlanner, createPlayTimePracticePlanner };
} else {
    window.createPlayTimePracticePlanner = createPlayTimePracticePlanner;
}
