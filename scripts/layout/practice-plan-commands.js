/**
 * Practice Plan Layout Command - Updates practice plan UI state
 * Handles practice plan button states when highlights are deleted
 */

class PracticePlanLayoutCommand {
    constructor(logger = console) {
        this.logger = logger;
        this.type = 'practice-plan';
    }

    /**
     * Execute practice plan layout command
     * @param {Object} options - Command options
     * @param {string} options.action - Action to perform ('refresh-state', 'check-empty')
     * @param {string} options.scoreId - Optional score ID to check
     */
    async execute(options = {}) {
        const { action = 'refresh-state', scoreId } = options;
        
        this.logger.info('Practice Plan Layout Command:', { action, scoreId });

        try {
            switch (action) {
                case 'refresh-state':
                case 'check-empty':
                    await this._checkAndUpdatePracticePlanState(scoreId);
                    break;
                    
                default:
                    this.logger.warn('Unknown practice plan action:', action);
                    return false;
            }
            
            return true;
        } catch (error) {
            this.logger.error('Practice plan layout command failed:', error);
            return false;
        }
    }

    /**
     * Check practice plan state and update UI accordingly
     * @private
     * @param {string} scoreId - Score ID to check
     */
    async _checkAndUpdatePracticePlanState(scoreId) {
        // Get the current practice planner instance
        const practicePlanner = this._getPracticePlanner();
        if (!practicePlanner) {
            this.logger.warn('Practice planner not available for state update');
            return;
        }

        // Use the current score if none provided
        const currentScoreId = scoreId || practicePlanner.currentScoreId;
        if (!currentScoreId) {
            this.logger.debug('No score ID available for practice plan state check');
            return;
        }

        // Check if there are existing practice plans for this score
        try {
            await practicePlanner.checkForExistingPracticePlans(currentScoreId);
            this.logger.info('Practice plan state refreshed for score:', currentScoreId);
        } catch (error) {
            this.logger.error('Failed to refresh practice plan state:', error);
        }
    }

    /**
     * Get the practice planner instance from global scope
     * @private
     * @returns {Object|null} Practice planner instance
     */
    _getPracticePlanner() {
        // Try multiple ways to get the practice planner
        if (typeof window !== 'undefined') {
            // From global window
            if (window.practicePlanner) {
                return window.practicePlanner;
            }
            
            // From DI container
            if (window.diContainer) {
                const practicePlanner = window.diContainer.get('practicePlanner');
                if (practicePlanner) {
                    return practicePlanner;
                }
            }
            
            // From PlayTime app
            if (window.PlayTimeApp && window.PlayTimeApp.practicePlanner) {
                return window.PlayTimeApp.practicePlanner;
            }
        }
        
        return null;
    }
}

// Export for both Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PracticePlanLayoutCommand };
} else {
    window.PracticePlanLayoutCommand = PracticePlanLayoutCommand;
}