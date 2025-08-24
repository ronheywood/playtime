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
    constructor(logger, database, highlightingModule) {
        this.config = PRACTICE_PLANNER_CONFIG;
        this.logger = logger;
        this.database = database;
        this.highlighting = highlightingModule;
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
        window.addEventListener('playtime:score-loaded', this.handleScoreLoaded.bind(this));
        
        this.logger.info('Practice Planner initialized successfully');
        return true;
    }

    handleScoreLoaded(event) {
        if (event.detail && event.detail.scoreId) {
            this.currentScoreId = event.detail.scoreId;
            this.logger.info('Practice Planner: Score context updated', { scoreId: this.currentScoreId });
        }
    }

    async handleSetupPractice() {
        this.logger.info('Practice Planner: Setup practice clicked');
        
        if (!this.currentScoreId) {
            this.logger.warn('Practice Planner: No active score ID');
            // Try to get the current score from the database
            const scores = await this.database.getAll();
            if (scores.length > 0) {
                this.currentScoreId = scores[scores.length - 1].id; // Use the most recent score
                this.logger.info('Practice Planner: Using most recent score', { scoreId: this.currentScoreId });
            } else {
                this.logger.error('Practice Planner: No scores available');
                return;
            }
        }

        // Get highlights for the current score
        const highlights = await this.getHighlightsForScore(this.currentScoreId);
        
        // Dispatch practice session start event
        const event = new CustomEvent('playtime:practice-session-start', {
            detail: {
                scoreId: this.currentScoreId,
                highlights: highlights
            }
        });
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
            if (this.highlighting && typeof this.highlighting.getHighlightsForScore === 'function') {
                return await this.highlighting.getHighlightsForScore(scoreId);
            }
            // Fallback: return empty array if highlighting module not available
            return [];
        } catch (error) {
            this.logger.error('Practice Planner: Error getting highlights', error);
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
            }
        }

        this.logger.info('Practice Planner: Interface shown', { highlightCount: highlights.length });
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
function createPlayTimePracticePlanner(logger, database, highlightingModule) {
    return new PracticePlanner(logger, database, highlightingModule);
}

// Export for both Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PracticePlanner, createPlayTimePracticePlanner };
} else {
    window.createPlayTimePracticePlanner = createPlayTimePracticePlanner;
}
