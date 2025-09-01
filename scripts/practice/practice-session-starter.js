/**
 * Practice Session Starter Module
 * Handles starting practice sessions independently from the UI
 * This module can be used by both the practice planning UI and sidebar shortcuts
 */

class PracticeSessionStarter {
    constructor(logger, database, practicePlanPersistenceService, options = {}) {
        this.logger = logger;
        this.database = database;
        this.practicePlanPersistenceService = practicePlanPersistenceService;
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

            // Disable highlight selection during practice mode
            if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.disableSelection === 'function') {
                window.PlayTimeHighlighting.disableSelection();
                this.logger.info('Practice Session Starter: Highlight selection disabled');
                
                // Add visual indicator
                this._showSelectionDisabledIndicator();
            }

            // Set practice mode layout
            if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.execute === 'function') {
                window.PlayTimeLayoutCommands.execute('practice-mode', { action: 'enter' });
                this.logger.info('Practice Session Starter: Entered practice mode layout');
            } else {
                // Fallback: Set the attribute directly if layout commands are not available
                const viewerSection = document.querySelector('#viewer-section');
                if (viewerSection) {
                    viewerSection.setAttribute('data-practice-mode', 'active');
                    this.logger.info('Practice Session Starter: Set practice mode attribute directly');
                }
            }

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
                this.logger.info('Practice Session Starter: Timer started for first section', { 
                    targetTime: firstSection.targetTime
                });
            }

            // Update section counter display
            this.updateSectionCounter();

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
                // Remove current-practice-section class from all highlights first
                const allHighlights = document.querySelectorAll('[data-role="highlight"]');
                allHighlights.forEach(highlight => {
                    highlight.classList.remove('current-practice-section');
                });

                // Add current-practice-section class to the current highlight
                highlightElement.classList.add('current-practice-section');
                this.logger.info('Practice Session Starter: Applied current-practice-section class', { highlightId });

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
            setTimeout(resolve, this.pageRenderTimeout);
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
                        setTimeout(checkElement, this.elementCheckInterval);
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
     * Request screen wake lock to prevent device screen from turning off during practice
     * @private
     */
    async requestWakeLock() {
        // Only attempt wake lock in browsers that support it
        if (!('wakeLock' in navigator)) {
            this.logger.info('Practice Session Starter: Wake Lock API not supported');
            return;
        }

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.logger.info('Practice Session Starter: Screen wake lock acquired');
            
            // Listen for wake lock release (e.g., when page becomes hidden)
            this.wakeLock.addEventListener('release', () => {
                this.logger.info('Practice Session Starter: Screen wake lock was released');
            });

            // Re-acquire wake lock when page becomes visible again (if session is still active)
            this._handleVisibilityChange = () => {
                if (document.visibilityState === 'visible' && this.practiceSession && !this.wakeLock) {
                    this.logger.info('Practice Session Starter: Page visible again, re-acquiring wake lock');
                    this.requestWakeLock();
                }
            };
            
            document.addEventListener('visibilitychange', this._handleVisibilityChange);
            
        } catch (error) {
            this.logger.warn('Practice Session Starter: Failed to acquire screen wake lock', {
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
                this.logger.info('Practice Session Starter: Screen wake lock released');
            } catch (error) {
                this.logger.warn('Practice Session Starter: Error releasing wake lock', {
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
            
            this.logger.debug?.('Practice Session Starter: Updated section counter', {
                current,
                total,
                currentIndex: this.practiceSession.currentSectionIndex
            });
        }
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

            // Update section counter display
            this.updateSectionCounter();

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

        // Exit focus mode if active
        this._exitFocusMode();

        // Hide the timer UI (same as exit button behavior)
        this._hideTimer();

        // Clean up by calling endSession to ensure all cleanup happens consistently
        this.endSession();
    }

    /**
     * Exit focus mode if currently active
     * @private
     */
    _exitFocusMode() {
        try {
            // Check if focus mode is currently active by looking at canvas attribute
            const canvas = document.querySelector('[data-role="pdf-canvas"]');
            const isInFocusMode = canvas && canvas.getAttribute('data-focus-mode') === 'active';
            
            if (isInFocusMode && window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.exitFocusMode === 'function') {
                this.logger.info('Practice Session Starter: Exiting focus mode after session completion');
                window.PlayTimeHighlighting.exitFocusMode();
            } else {
                this.logger.debug?.('Practice Session Starter: Focus mode not active or highlighting not available');
            }
        } catch (error) {
            this.logger.warn('Practice Session Starter: Error exiting focus mode', { error: error.message });
        }
    }

    /**
     * Hide the timer UI (same as exit button behavior)
     * @private
     */
    _hideTimer() {
        try {
            const timerContainer = document.querySelector('#practice-session-timer');
            if (timerContainer) {
                timerContainer.style.display = 'none';
                this.logger.info('Practice Session Starter: Timer UI hidden');
            } else {
                this.logger.debug?.('Practice Session Starter: Timer container not found');
            }
        } catch (error) {
            this.logger.warn('Practice Session Starter: Error hiding timer', { error: error.message });
        }
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

        // Exit focus mode if active
        this._exitFocusMode();

        // Hide the timer UI (same as exit button behavior)
        this._hideTimer();

        // Clean up by calling endSession to ensure all cleanup happens consistently
        this.endSession();
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
        // Release screen wake lock
        this.releaseWakeLock();

        // Re-enable highlight selection
        if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.enableSelection === 'function') {
            window.PlayTimeHighlighting.enableSelection();
            this.logger.info('Practice Session Starter: Highlight selection re-enabled');
            
            // Remove visual indicator
            this._hideSelectionDisabledIndicator();
        }

        // Optimize DOM cleanup for better performance on iPad
        // Use requestAnimationFrame to defer heavy DOM operations
        const scheduleCleanup = (typeof requestAnimationFrame !== 'undefined') 
            ? requestAnimationFrame 
            : (callback) => setTimeout(callback, 0);
            
        scheduleCleanup(() => {
            this._performDOMCleanup();
        });
        
        // Clean up session state immediately
        if (this.practiceSessionTimer) {
            this.practiceSessionTimer.stop();
            this.practiceSessionTimer = null;
        }
        
        this.practiceSession = null;
    }

    /**
     * Perform DOM cleanup operations with performance optimizations
     * @private
     */
    _performDOMCleanup() {
        // Batch DOM operations to minimize reflows
        const viewerSection = document.querySelector('#viewer-section');
        
        if (viewerSection && typeof viewerSection.removeAttribute === 'function') {
            // Use a single style change to disable CSS rules efficiently (browser only)
            if (viewerSection.style && typeof viewerSection.style.setProperty === 'function') {
                viewerSection.style.setProperty('--practice-mode-exit', 'true');
            }
            
            // Remove practice mode attribute (triggers CSS recalculation)
            viewerSection.removeAttribute('data-practice-mode');
            
            // Clean up current-practice-section class only from elements that have it
            if (typeof viewerSection.querySelectorAll === 'function') {
                const currentSectionHighlights = viewerSection.querySelectorAll('[data-role="highlight"].current-practice-section');
                currentSectionHighlights.forEach(highlight => {
                    if (highlight && highlight.classList && typeof highlight.classList.remove === 'function') {
                        highlight.classList.remove('current-practice-section');
                    }
                });
            }
            
            // Remove the temporary style property (browser only)
            if (viewerSection.style && typeof viewerSection.style.removeProperty === 'function') {
                const scheduleStyleCleanup = (typeof requestAnimationFrame !== 'undefined') 
                    ? requestAnimationFrame 
                    : (callback) => setTimeout(callback, 0);
                    
                scheduleStyleCleanup(() => {
                    if (viewerSection.style && typeof viewerSection.style.removeProperty === 'function') {
                        viewerSection.style.removeProperty('--practice-mode-exit');
                    }
                });
            }
            
            this.logger.info('Practice Session Starter: DOM cleanup completed');
        }
        
        // Exit practice mode layout after DOM operations
        if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.execute === 'function') {
            window.PlayTimeLayoutCommands.execute('practice-mode', { action: 'exit' });
            this.logger.info('Practice Session Starter: Exited practice mode layout');
        }
    }

    /**
     * Check if a practice session is currently active
     */
    isSessionActive() {
        return this.practiceSession !== null;
    }

    /**
     * Show visual indicator that selection is disabled
     * @private
     */
    _showSelectionDisabledIndicator() {
        try {
            const viewerContainer = document.querySelector('[data-role="pdf-viewer"]') || document.body;
            viewerContainer.classList.add('practice-mode-selection-disabled');
            
            // Show indicator temporarily
            viewerContainer.classList.add('show-indicator');
            setTimeout(() => {
                viewerContainer.classList.remove('show-indicator');
            }, 3000); // Hide after 3 seconds
            
            this.logger.debug?.('Practice Session Starter: Selection disabled indicator shown');
        } catch (error) {
            this.logger.warn('Practice Session Starter: Error showing selection disabled indicator', { error: error.message });
        }
    }

    /**
     * Hide visual indicator that selection is disabled
     * @private
     */
    _hideSelectionDisabledIndicator() {
        try {
            const viewerContainer = document.querySelector('[data-role="pdf-viewer"]') || document.body;
            viewerContainer.classList.remove('practice-mode-selection-disabled', 'show-indicator');
            
            this.logger.debug?.('Practice Session Starter: Selection disabled indicator hidden');
        } catch (error) {
            this.logger.warn('Practice Session Starter: Error hiding selection disabled indicator', { error: error.message });
        }
    }
}

// Factory function for creating practice session starter instances (browser only)
if (typeof window !== 'undefined') {
    window.createPracticeSessionStarter = function(logger, database, practicePlanPersistenceService, options) {
        return new PracticeSessionStarter(logger, database, practicePlanPersistenceService, options);
    };
}

// Export for Node.js/CommonJS (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSessionStarter;
}
