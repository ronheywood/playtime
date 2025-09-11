/**
 * Practice Session Manager Module
 * Handles UI events, timer events, session orchestration, and user interactions
 * This is the main orchestrator for practice sessions
 */

class PracticeSessionManager {
    constructor(logger, highlighting, timer, practiceSessionStarter, practicePlanPersistenceService, database, confidenceMapper, options = {}) {
        this.logger = logger;
        this.highlighting = highlighting;
        this.timer = timer;
        this.practiceSessionStarter = practiceSessionStarter;
        this.practicePlanPersistenceService = practicePlanPersistenceService;
        this.database = database;
        this.confidenceMapper = confidenceMapper;
        
        this.practiceSession = null;
        this.practiceSessionTimer = null;
        this.wakeLock = null; // Screen wake lock instance
        
        // Configurable timeouts for testing
        this.pageRenderTimeout = options.pageRenderTimeout ?? 500;
        this.elementCheckInterval = options.elementCheckInterval ?? 100;
    }

    /**
     * Start a practice session from a saved practice plan
     * @param {string} planId - The ID of the practice plan to start
     * @param {string} scoreId - The ID of the score the plan belongs to
     * @returns {Promise<boolean>} - Success/failure status
     */
    async startFromPlan(planId, scoreId) {
        try {
            this.logger.info('Practice Session Manager: Starting session from plan', { planId, scoreId });

            // Load the practice plan
            const practicePlan = await this.practicePlanPersistenceService.loadPracticePlan(planId);
            if (!practicePlan) {
                this.logger.error('Practice Session Manager: Plan not found', { planId });
                return false;
            }

            // Validate the plan has sections
            if (!practicePlan.sections || practicePlan.sections.length === 0) {
                this.logger.warn('Practice Session Manager: Plan has no sections', { planId });
                return false;
            }

            // Start the session with the plan configuration
            return await this._startSession(practicePlan, scoreId);

        } catch (error) {
            this.logger.error('Practice Session Manager: Error starting from plan', { planId, scoreId, error });
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
            this.logger.info('Practice Session Manager: Starting practice session', { 
                sessionName: sessionConfig.name,
                scoreId: scoreId,
                sectionsCount: sessionConfig.sections?.length || 0
            });

            // Validate session configuration
            if (!sessionConfig.sections || sessionConfig.sections.length === 0) {
                this.logger.error('Practice Session Manager: No practice sections available');
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

            // Command the starter to setup practice mode environment
            const setupSuccess = await this.practiceSessionStarter.setupPracticeModeEnvironment();
            if (!setupSuccess) {
                this.logger.error('Practice Session Manager: Failed to setup practice mode environment');
                return false;
            }

            // Initialize timer component if available
            this.practiceSessionTimer = new PracticeSessionTimer(this.logger,{
                onTimerComplete: () => this.handleTimerComplete(),
                onTimerTick: (timeLeft) => this.handleTimerTick(timeLeft),
                onPauseToggle: (isPaused) => this.handlePauseToggle(isPaused),
                onManualNext: () => this.handleManualNext(),
                onExit: () => this.handleTimerExit()
            });
                

            // Request screen wake lock to prevent screen from turning off during practice
            await this.requestWakeLock();

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
                this.logger.info('Practice Session Manager: Timer started for first section', { 
                    targetTime: firstSection.targetTime
                });
            }

            // Update section counter display
            this.updateSectionCounter();

            // Command the starter to focus on the first section
            await this.practiceSessionStarter.focusOnPracticeSection(firstSection.highlightId);

            return true;

        } catch (error) {
            this.logger.error('Practice Session Manager: Error starting session', { error });
            return false;
        }
    }

    /**
     * Request screen wake lock to prevent device screen from turning off during practice
     * @private
     */
    async requestWakeLock() {
        // Only attempt wake lock in browsers that support it
        if (!('wakeLock' in navigator)) {
            this.logger.info('Practice Session Manager: Wake Lock API not supported');
            return;
        }

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.logger.info('Practice Session Manager: Screen wake lock acquired');
            
            // Listen for wake lock release (e.g., when page becomes hidden)
            this.wakeLock.addEventListener('release', () => {
                this.logger.info('Practice Session Manager: Screen wake lock was released');
            });

            // Re-acquire wake lock when page becomes visible again (if session is still active)
            this._handleVisibilityChange = () => {
                if (document.visibilityState === 'visible' && this.practiceSession && !this.wakeLock) {
                    this.logger.info('Practice Session Manager: Page visible again, re-acquiring wake lock');
                    this.requestWakeLock();
                }
            };
            
            document.addEventListener('visibilitychange', this._handleVisibilityChange);
            
        } catch (error) {
            this.logger.warn('Practice Session Manager: Failed to acquire screen wake lock', {
                error: error.message,
                name: error.name
            });
        }
    }

    /**
     * Release screen wake lock
     * @private
     */
    async releaseWakeLock() {
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                this.logger.info('Practice Session Manager: Screen wake lock released');
            } catch (error) {
                this.logger.warn('Practice Session Manager: Error releasing wake lock', {
                    error: error.message
                });
            }
        }

        // Clean up visibility change listener
        if (this._handleVisibilityChange) {
            document.removeEventListener('visibilitychange', this._handleVisibilityChange);
            this._handleVisibilityChange = null;
        }
    }

    /**
     * Update the section counter display
     */
    updateSectionCounter() {
        if (!this.practiceSession) return;

        const sectionCounterElement = document.querySelector('[data-role="section-counter"]');
        if (sectionCounterElement) {
            const current = this.practiceSession.currentSectionIndex + 1;
            const total = this.practiceSession.config.sections.length;
            sectionCounterElement.textContent = `Section ${current} of ${total}`;
            
            this.logger.debug?.('Practice Session Manager: Updated section counter', {
                current,
                total,
                currentIndex: this.practiceSession.currentSectionIndex
            });
        }
    }

    /**
     * Handle timer completion - show completion dialog with options
     */
    async handleTimerComplete() {
        if (!this.practiceSession) return;

        this.logger.info('Practice Session Manager: Timer completed for section', {
            currentIndex: this.practiceSession.currentSectionIndex
        });

        const currentSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
        
        // Show completion dialog with continue/repeat options and confidence update
        await this.showSectionCompletionDialog(currentSection);
    }

    /**
     * Show section completion dialog with user options
     * @param {Object} currentSection - The current practice section
     */
    async showSectionCompletionDialog(currentSection) {
        return new Promise((resolve) => {
            // Create dialog overlay
            const overlay = document.createElement('div');
            overlay.className = 'practice-completion-overlay';

            // Create dialog content
            const dialog = document.createElement('div');
            dialog.className = 'practice-completion-dialog';

            // Get current confidence level for this section
            const currentConfidence = this.getCurrentSectionConfidence(currentSection.highlightId);

            dialog.innerHTML = `
                <h3>Section Complete!</h3>
                <p>
                    How confident were you in this section?
                </p>
                
                <div class="confidence-update">
                    <p>
                        Update confidence level:
                    </p>
                    <div class="confidence-buttons">
                        <button data-confidence="red" class="confidence-btn ${currentConfidence === 'red' ? 'active' : ''}">
                            Needs Work
                        </button>
                        <button data-confidence="amber" class="confidence-btn ${currentConfidence === 'amber' ? 'active' : ''}">
                            Getting There
                        </button>
                        <button data-confidence="green" class="confidence-btn ${currentConfidence === 'green' ? 'active' : ''}">
                            Confident
                        </button>
                    </div>
                </div>

                <div class="action-buttons">
                    <button id="repeat-section">
                        Repeat Section
                    </button>
                    <button id="continue-session">
                        Continue
                    </button>
                    <button id="end-session">
                        End Session
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            let selectedConfidence = currentConfidence;

            // Handle confidence button clicks
            const confidenceBtns = dialog.querySelectorAll('.confidence-btn');
            confidenceBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove active class from all buttons
                    confidenceBtns.forEach(b => {
                        b.classList.remove('active');
                        const confidence = b.dataset.confidence;
                        const isActive = false;
                        this.updateConfidenceButtonStyle(b, confidence, isActive);
                    });
                    
                    // Add active class to clicked button
                    btn.classList.add('active');
                    selectedConfidence = btn.dataset.confidence;
                    this.updateConfidenceButtonStyle(btn, selectedConfidence, true);
                });
            });

            // Handle action button clicks
            const cleanup = () => {
                document.body.removeChild(overlay);
                resolve();
            };

            dialog.querySelector('#repeat-section').addEventListener('click', async () => {
                if (selectedConfidence !== currentConfidence) {
                    await this.updateHighlightConfidence(currentSection.highlightId, selectedConfidence);
                }
                cleanup();
                this.repeatCurrentSection();
            });

            dialog.querySelector('#continue-session').addEventListener('click', async () => {
                if (selectedConfidence !== currentConfidence) {
                    await this.updateHighlightConfidence(currentSection.highlightId, selectedConfidence);
                }
                cleanup();
                this.continueToNextSection();
            });

            dialog.querySelector('#end-session').addEventListener('click', async () => {
                if (selectedConfidence !== currentConfidence) {
                    await this.updateHighlightConfidence(currentSection.highlightId, selectedConfidence);
                }
                cleanup();
                this.handleSessionComplete();
            });

            // Handle overlay click to close (same as continue)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    dialog.querySelector('#continue-session').click();
                }
            });
        });
    }

    /**
     * Update confidence button styling
     * @param {HTMLElement} button - The button element
     * @param {string} confidence - The confidence level
     * @param {boolean} isActive - Whether the button is active
     */
    updateConfidenceButtonStyle(button, confidence, isActive) {
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }

    /**
     * Get current confidence level for a highlight
     * @param {string} highlightId - The highlight ID
     * @returns {string} - The confidence level (red, amber, green)
     */
    getCurrentSectionConfidence(highlightId) {
        const highlightElement = document.querySelector(`[data-role="highlight"][data-hl-id="${highlightId}"]`);
        if (highlightElement) {
            const confidenceData = highlightElement.dataset.confidence;
            const numericConfidence = parseInt(confidenceData, 10);
            if(isNaN(numericConfidence)) throw new Error('Invalid confidence value', numericConfidence);
            return this.confidenceMapper.confidenceToColor(numericConfidence);
        }
        
        throw new Error('Could not find highlight element', highlightId);
    }

    /**
     * Update highlight confidence level
     * @param {string} highlightId - The highlight ID
     * @param {string} newConfidenceColor - The new confidence color (red, amber, green)
     */
    async updateHighlightConfidence(highlightId, newConfidenceColor) {
        try {
            this.logger.info('Practice Session Manager: Updating highlight confidence', {
                highlightId,
                newConfidenceColor
            });

            // Convert color to enum value using ConfidenceMapper
            if (!this.confidenceMapper) {
                throw new Error('ConfidenceMapper dependency is required but not available. Check initialization.');
            }
            
            const confidenceEnum = this.confidenceMapper.colorToConfidence(newConfidenceColor);

            
            const practiceHighlightElement = document.querySelector(`[data-role="highlight"][data-hl-id="${highlightId}"]`);
            if (practiceHighlightElement) {
                practiceHighlightElement.dataset.confidence = confidenceEnum.toString();
                practiceHighlightElement.dataset.color = newConfidenceColor;
                practiceHighlightElement.classList.remove('confidence-red', 'confidence-amber', 'confidence-green');
                practiceHighlightElement.classList.add(`confidence-${newConfidenceColor}`);
            }

            // Update the PDF viewer highlight element and clear inline styles
            const pdfHighlightElement = document.querySelector(`.pdf-viewer-container [data-hl-id="${highlightId}"]`);
            if (pdfHighlightElement) {
                pdfHighlightElement.dataset.confidence = confidenceEnum.toString();
                pdfHighlightElement.dataset.color = newConfidenceColor;
                
                this.logger.info('Practice Session Manager: Updated PDF viewer highlight and cleared inline styles', {
                    highlightId,
                    confidenceEnum,
                    color: newConfidenceColor
                });
            }

            // Update in database using the enum value
            try {
                if (this.database && typeof this.database.updateHighlight === 'function') {
                    await this.database.updateHighlight(parseInt(highlightId, 10), {
                        confidence: confidenceEnum,
                        color: newConfidenceColor  // Also update the color field to keep them in sync
                    });
                    this.logger.info('Practice Session Manager: Database updated with confidence enum and color', {
                        highlightId,
                        confidenceEnum,
                        color: newConfidenceColor
                    });
                }
            } catch (dbError) {
                this.logger.warn('Practice Session Manager: Failed to update database', {
                    highlightId,
                    confidenceEnum,
                    color: newConfidenceColor,
                    error: dbError
                });
                // Continue with DOM update even if database update fails
            }

            // Update via highlighting system if available
            if (this.highlighting && this.highlighting.updateHighlightConfidence) {
                await this.highlighting.updateHighlightConfidence(highlightId, newConfidenceColor);
            } else if (this.highlighting && this.highlighting._components?.persistenceService) {
                // Try to update via persistence service
                try {
                    await this.highlighting._components.persistenceService.updateHighlight(
                        parseInt(highlightId, 10), 
                        { confidence: confidenceEnum }
                    );
                } catch (persistenceError) {
                    this.logger.warn('Practice Session Manager: Persistence service update failed', {
                        highlightId,
                        error: persistenceError
                    });
                }
            }

            this.logger.info('Practice Session Manager: Highlight confidence updated successfully');
            
        } catch (error) {
            this.logger.error('Practice Session Manager: Error updating highlight confidence', {
                highlightId,
                newConfidenceColor,
                error
            });
            throw error; // Re-throw to make failures visible
        }
    }

    /**
     * Repeat the current section
     */
    repeatCurrentSection() {
        if (!this.practiceSession) return;

        const currentSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
        
        this.logger.info('Practice Session Manager: Repeating current section', {
            sectionIndex: this.practiceSession.currentSectionIndex
        });

        // Restart timer for current section
        if (this.practiceSessionTimer) {
            this.practiceSessionTimer.startTimer(currentSection.targetTime);
        }

        // Focus remains on current section - no need to change focus
    }

    /**
     * Continue to the next section or complete session
     */
    async continueToNextSection() {
        if (!this.practiceSession) return;

        // Move to next section
        this.practiceSession.currentSectionIndex++;

        // Check if we have more sections
        if (this.practiceSession.currentSectionIndex < this.practiceSession.config.sections.length) {
            const nextSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
            
            this.logger.info('Practice Session Manager: Moving to next section', {
                sectionIndex: this.practiceSession.currentSectionIndex,
                targetTime: nextSection.targetTime
            });

            // Start timer for next section
            if (this.practiceSessionTimer) {
                this.practiceSessionTimer.startTimer(nextSection.targetTime);
            }

            // Update section counter display
            this.updateSectionCounter();

            // Command the starter to focus on next section
            await this.practiceSessionStarter.focusOnPracticeSection(nextSection.highlightId);

        } else {
            // Session complete
            this.handleSessionComplete();
        }
    }

    /**
     * Handle session completion
     */
    handleSessionComplete() {
        this.logger.info('Practice Session Manager: Session completed');

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

        // Command the starter to restore environment
        this.practiceSessionStarter.cleanupPracticeModeEnvironment();

        // Clean up session state
        this.endSession();
    }

    /**
     * Handle timer tick
     */
    handleTimerTick(timeLeft) {
        // Optional: Custom handling for timer ticks
        this.logger.debug?.('Practice Session Manager: Timer tick', { timeLeft });
    }

    /**
     * Handle pause toggle
     */
    handlePauseToggle(isPaused) {
        this.logger.info('Practice Session Manager: Timer pause toggled', { isPaused });
    }

    /**
     * Handle manual next
     */
    handleManualNext() {
        this.logger.info('Practice Session Manager: Manual next triggered');
        this.handleTimerComplete();
    }

    /**
     * Handle timer exit
     */
    handleTimerExit() {
        this.logger.info('Practice Session Manager: Timer exit triggered');
        
        // Dispatch session exit event
        const event = new CustomEvent('playtime:practice-session-exit', {
            detail: {
                scoreId: this.practiceSession?.scoreId
            }
        });
        window.dispatchEvent(event);

        // Command the starter to restore environment
        this.practiceSessionStarter.cleanupPracticeModeEnvironment();

        // Clean up session state
        this.endSession();
    }

    /**
     * Get the current practice session state
     */
    getCurrentSession() {
        return this.practiceSession;
    }

    /**
     * Check if a practice session is currently active
     */
    isSessionActive() {
        return this.practiceSession !== null;
    }

    /**
     * End the current practice session
     */
    endSession() {
        // Release screen wake lock
        this.releaseWakeLock();

        // Clean up session state
        if (this.practiceSessionTimer) {
            // Temporarily remove the onExit callback to prevent circular calls
            const originalOnExit = this.practiceSessionTimer.onExit;
            this.practiceSessionTimer.onExit = () => {}; // No-op
            
            this.practiceSessionTimer.stop();
            
            // Restore the original callback for future use
            this.practiceSessionTimer.onExit = originalOnExit;
            this.practiceSessionTimer = null;
        }
        
        this.practiceSession = null;
    }
}

// Factory function for creating practice session manager instances (browser only)
if (typeof window !== 'undefined') {
    window.createPracticeSessionManager = function(logger, highlighting, timer, practiceSessionStarter, practicePlanPersistenceService, database, confidenceMapper, options) {
        return new PracticeSessionManager(logger, highlighting, timer, practiceSessionStarter, practicePlanPersistenceService, database, confidenceMapper, options);
    };
}

// Export for Node.js/CommonJS (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSessionManager;
}
