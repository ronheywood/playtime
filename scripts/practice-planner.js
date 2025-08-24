/**
 * Practice Planner Module
 * Handles practice session planning functionality
 */

class PracticePlanner {
    constructor(logger, database, highlightingModule) {
        this.logger = logger;
        this.database = database;
        this.highlighting = highlightingModule;
        this.currentScoreId = null;
        this.isActive = false;
        
        // DOM elements
        this.setupButton = null;
        this.exitButton = null;
        this.returnToHighlightingButton = null;
        this.pdfCanvas = null;
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
        this.pdfCanvas = document.querySelector('[data-role="pdf-canvas"]');
        this.practiceInterface = document.querySelector('[data-role="practice-planner"]');
        this.noHighlightsMessage = document.querySelector('[data-role="no-highlights-message"]');
        this.practiceContent = document.querySelector('[data-role="practice-plan-content"]');

        this.logger.info('Practice Planner DOM elements found:', {
            setupButton: !!this.setupButton,
            exitButton: !!this.exitButton,
            pdfCanvas: !!this.pdfCanvas,
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
        
        // Hide PDF canvas
        if (this.pdfCanvas) {
            this.pdfCanvas.style.display = 'none';
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
        
        // Show PDF canvas
        if (this.pdfCanvas) {
            this.pdfCanvas.style.display = 'block';
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
