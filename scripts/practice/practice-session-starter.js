/**
 * Practice Session Starter Module
 * Handles starting practice sessions independently from the UI
 * This module can be used by both the practice planning UI and sidebar shortcuts
 */

class PracticeSessionStarter {
    constructor(logger, database, practicePlanPersistenceService) {
        this.logger = logger;
        this.database = database;
        this.practicePlanPersistenceService = practicePlanPersistenceService;
        this.practiceSession = null;
        this.practiceSessionTimer = null;
    }

    /**
     * Start a practice session from a saved practice plan
     * @param {string} planId - The ID of the practice plan to start
     * @param {string} scoreId - The ID of the score the plan belongs to
     * @returns {Promise<boolean>} - Success/failure status
     */
    async startFromPlan(planId, scoreId) {
        try {
            this.logger.info('Practice Session Starter: Starting session from plan', { planId, scoreId });

            // Load the practice plan
            const practicePlan = await this.practicePlanPersistenceService.loadPracticePlan(planId);
            if (!practicePlan) {
                this.logger.error('Practice Session Starter: Plan not found', { planId });
                return false;
            }

            // Validate the plan has sections
            if (!practicePlan.sections || practicePlan.sections.length === 0) {
                this.logger.warn('Practice Session Starter: Plan has no sections', { planId });
                return false;
            }

            // Start the session with the plan configuration
            return await this.startSession(practicePlan, scoreId);

        } catch (error) {
            this.logger.error('Practice Session Starter: Error starting from plan', { planId, scoreId, error });
            return false;
        }
    }

    /**
     * Start a practice session from session configuration
     * @param {Object} sessionConfig - The practice session configuration
     * @param {string} scoreId - The ID of the score
     * @returns {Promise<boolean>} - Success/failure status
     */
    async startSession(sessionConfig, scoreId) {
        try {
            this.logger.info('Practice Session Starter: Starting practice session', { 
                sessionName: sessionConfig.name,
                scoreId: scoreId,
                sectionsCount: sessionConfig.sections?.length || 0
            });

            // Validate session configuration
            if (!sessionConfig.sections || sessionConfig.sections.length === 0) {
                this.logger.error('Practice Session Starter: No practice sections available');
                return false;
            }

            // Initialize practice session state
            this.practiceSession = {
                config: sessionConfig,
                currentSectionIndex: 0,
                startTime: Date.now(),
                sectionNotes: {},
                scoreId: scoreId
            };

            // Initialize timer component if available
            if (window.PracticeSessionTimer) {
                this.practiceSessionTimer = new window.PracticeSessionTimer({
                    logger: this.logger,
                    onTimerComplete: () => this.handleTimerComplete(),
                    onTimerTick: (timeLeft) => this.handleTimerTick(timeLeft),
                    onPauseToggle: (isPaused) => this.handlePauseToggle(isPaused),
                    onManualNext: () => this.handleManualNext(),
                    onExit: () => this.handleTimerExit()
                });
            } else {
                this.logger.warn('Practice Session Starter: Timer component not available');
            }

            // Dispatch practice session start event
            const event = new CustomEvent('playtime:practice-session-configured', {
                detail: {
                    scoreId: scoreId,
                    sessionConfig: sessionConfig
                }
            });
            window.dispatchEvent(event);

            // Start the timer for the first section
            const firstSection = sessionConfig.sections[0];
            if (this.practiceSessionTimer) {
                this.practiceSessionTimer.startTimer(firstSection.targetTime);
                this.logger.info('Practice Session Starter: Timer started for first section', { 
                    targetTime: firstSection.targetTime
                });
            }

            // Focus on the first section
            this.focusOnPracticeSection(firstSection.highlightId);

            return true;

        } catch (error) {
            this.logger.error('Practice Session Starter: Error starting session', { error });
            return false;
        }
    }

    /**
     * Focus on a practice section by highlighting the area
     * @param {string} highlightId - The ID of the highlight to focus on
     */
    focusOnPracticeSection(highlightId) {
        try {
            this.logger.info('Practice Session Starter: Focusing on section', { highlightId });

            // Find the highlight element
            const highlightElement = document.querySelector(`[data-highlight-id="${highlightId}"]`);
            if (highlightElement) {
                // Use highlighting module's focus method if available
                if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.focusOnHighlight === 'function') {
                    window.PlayTimeHighlighting.focusOnHighlight(highlightElement);
                } else {
                    // Fallback: scroll to the element
                    highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                this.logger.warn('Practice Session Starter: Highlight element not found', { highlightId });
            }
        } catch (error) {
            this.logger.error('Practice Session Starter: Error focusing on section', { highlightId, error });
        }
    }

    /**
     * Handle timer completion - move to next section or end session
     */
    handleTimerComplete() {
        if (!this.practiceSession) return;

        this.logger.info('Practice Session Starter: Timer completed for section', {
            currentIndex: this.practiceSession.currentSectionIndex
        });

        // Move to next section
        this.practiceSession.currentSectionIndex++;

        // Check if we have more sections
        if (this.practiceSession.currentSectionIndex < this.practiceSession.config.sections.length) {
            const nextSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
            
            this.logger.info('Practice Session Starter: Moving to next section', {
                sectionIndex: this.practiceSession.currentSectionIndex,
                targetTime: nextSection.targetTime
            });

            // Start timer for next section
            if (this.practiceSessionTimer) {
                this.practiceSessionTimer.startTimer(nextSection.targetTime);
            }

            // Focus on next section
            this.focusOnPracticeSection(nextSection.highlightId);
        } else {
            // Session complete
            this.handleSessionComplete();
        }
    }

    /**
     * Handle session completion
     */
    handleSessionComplete() {
        this.logger.info('Practice Session Starter: Session completed');

        // Dispatch session complete event
        const event = new CustomEvent('playtime:practice-session-complete', {
            detail: {
                scoreId: this.practiceSession.scoreId,
                sessionConfig: this.practiceSession.config,
                duration: Date.now() - this.practiceSession.startTime,
                sectionNotes: this.practiceSession.sectionNotes
            }
        });
        window.dispatchEvent(event);

        // Clean up
        this.practiceSession = null;
        this.practiceSessionTimer = null;
    }

    /**
     * Handle timer tick
     */
    handleTimerTick(timeLeft) {
        // Optional: Custom handling for timer ticks
        this.logger.debug?.('Practice Session Starter: Timer tick', { timeLeft });
    }

    /**
     * Handle pause toggle
     */
    handlePauseToggle(isPaused) {
        this.logger.info('Practice Session Starter: Timer pause toggled', { isPaused });
    }

    /**
     * Handle manual next
     */
    handleManualNext() {
        this.logger.info('Practice Session Starter: Manual next triggered');
        this.handleTimerComplete();
    }

    /**
     * Handle timer exit
     */
    handleTimerExit() {
        this.logger.info('Practice Session Starter: Timer exit triggered');
        
        // Dispatch session exit event
        const event = new CustomEvent('playtime:practice-session-exit', {
            detail: {
                scoreId: this.practiceSession?.scoreId
            }
        });
        window.dispatchEvent(event);

        // Clean up
        this.practiceSession = null;
        this.practiceSessionTimer = null;
    }

    /**
     * Get the current practice session state
     */
    getCurrentSession() {
        return this.practiceSession;
    }

    /**
     * End the current practice session
     */
    endSession() {
        if (this.practiceSessionTimer) {
            this.practiceSessionTimer.stop();
            this.practiceSessionTimer = null;
        }
        
        this.practiceSession = null;
    }

    /**
     * Check if a practice session is currently active
     */
    isSessionActive() {
        return this.practiceSession !== null;
    }
}

// Factory function for creating practice session starter instances
window.createPracticeSessionStarter = function(logger, database, practicePlanPersistenceService) {
    return new PracticeSessionStarter(logger, database, practicePlanPersistenceService);
};

// Export for Node.js/CommonJS (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSessionStarter;
}
