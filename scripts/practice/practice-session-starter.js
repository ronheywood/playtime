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
            return await this._startSession(practicePlan, scoreId);

        } catch (error) {
            this.logger.error('Practice Session Starter: Error starting from plan', { planId, scoreId, error });
            return false;
        }
    }

    /**
     * Start a practice session from session configuration (internal method)
     * @private
     * @param {Object} sessionConfig - The practice session configuration
     * @param {string} scoreId - The ID of the score
     * @returns {Promise<boolean>} - Success/failure status
     */
    async _startSession(sessionConfig, scoreId) {
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
            await this.focusOnPracticeSection(firstSection.highlightId);

            return true;

        } catch (error) {
            this.logger.error('Practice Session Starter: Error starting session', { error });
            return false;
        }
    }

    /**
     * Focus on a practice section by highlighting the area
     * This method handles page navigation if the highlight is on a different page
     * @param {string} highlightId - The ID of the highlight to focus on
     */
    async focusOnPracticeSection(highlightId) {
        try {
            this.logger.info('Practice Session Starter: Focusing on section', { highlightId });

            // Always check if we need to navigate to the correct page first
            // Don't rely on element existence since elements might exist in DOM but not be visible
            await this._navigateToHighlightPage(highlightId);
            
            // After potential navigation, wait for highlights to be rendered and find the element
            await this._waitForHighlightElement(highlightId);
            let highlightElement = document.querySelector(`[data-role="highlight"][data-hl-id="${highlightId}"]`);

            if (highlightElement) {
                // Use highlighting module's focus method if available (same as double-click behavior)
                if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.focusOnHighlight === 'function') {
                    this.logger.info('Practice Session Starter: Triggering focus action on highlight', { highlightId });
                    window.PlayTimeHighlighting.focusOnHighlight(highlightElement);
                } else {
                    // Fallback: scroll to the element
                    this.logger.info('Practice Session Starter: Using fallback scroll to highlight', { highlightId });
                    highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                this.logger.warn('Practice Session Starter: Highlight element not found after navigation', { highlightId });
            }
        } catch (error) {
            this.logger.error('Practice Session Starter: Error focusing on section', { highlightId, error });
        }
    }

    /**
     * Navigate to the page containing the specified highlight
     * @private
     * @param {string} highlightId - The ID of the highlight to navigate to
     */
    async _navigateToHighlightPage(highlightId) {
        try {
            // Get highlight data to determine which page it's on
            let highlightData = null;
            
            // Try to get from persistence service if available
            if (window.PlayTimeHighlighting && 
                window.PlayTimeHighlighting._components && 
                window.PlayTimeHighlighting._components.persistenceService) {
                
                try {
                    highlightData = await window.PlayTimeHighlighting._components.persistenceService.getHighlight(highlightId);
                } catch (persistenceError) {
                    this.logger.warn('Practice Session Starter: Could not load highlight from persistence', { 
                        highlightId, 
                        error: persistenceError 
                    });
                }
            }

            // If we have page information and PDF viewer is available
            if (highlightData && highlightData.page && window.PlayTimePDFViewer) {
                const currentPage = window.PlayTimePDFViewer.getCurrentPage();
                const targetPage = highlightData.page;
                
                if (currentPage !== targetPage) {
                    this.logger.info('Practice Session Starter: Navigating to highlight page', { 
                        highlightId, 
                        currentPage, 
                        targetPage 
                    });
                    
                    await window.PlayTimePDFViewer.renderPage(targetPage);
                    
                    // Give the page time to render and highlights to be rehydrated
                    await this._waitForPageRender();
                } else {
                    this.logger.info('Practice Session Starter: Highlight already on current page', { 
                        highlightId, 
                        currentPage 
                    });
                }
            } else {
                this.logger.warn('Practice Session Starter: Could not determine highlight page or PDF viewer not available', { 
                    highlightId,
                    hasHighlightData: !!highlightData,
                    hasPageInfo: !!(highlightData && highlightData.page),
                    hasPDFViewer: !!window.PlayTimePDFViewer
                });
            }
        } catch (error) {
            this.logger.error('Practice Session Starter: Error navigating to highlight page', { highlightId, error });
        }
    }

    /**
     * Wait for page rendering to complete
     * @private
     */
    async _waitForPageRender() {
        return new Promise(resolve => {
            // Wait for rendering and highlight rehydration
            setTimeout(resolve, 500);
        });
    }

    /**
     * Wait for highlight element to be available in the DOM
     * @private
     * @param {string} highlightId - The ID of the highlight to wait for
     */
    async _waitForHighlightElement(highlightId) {
        return new Promise(resolve => {
            const maxAttempts = 10;
            let attempts = 0;
            
            const checkElement = () => {
                try {
                    const element = document.querySelector(`[data-role="highlight"][data-hl-id="${highlightId}"]`);
                    if (element || attempts >= maxAttempts) {
                        resolve();
                    } else {
                        attempts++;
                        setTimeout(checkElement, 100);
                    }
                } catch (error) {
                    // If querySelector fails (e.g., in test environment), just resolve
                    this.logger.warn('Practice Session Starter: Error checking for highlight element', { 
                        highlightId, 
                        error: error.message 
                    });
                    resolve();
                }
            };
            
            checkElement();
        });
    }

    /**
     * Handle timer completion - move to next section or end session
     */
    async handleTimerComplete() {
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
            await this.focusOnPracticeSection(nextSection.highlightId);
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
