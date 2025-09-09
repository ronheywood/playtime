/**
 * Refactored Practice Session Component
 * Uses dependency injection and clean service architecture
 * This replaces the legacy practice-session-manager.js with clean separation of concerns
 */
class PracticeSessionComponent {
    constructor(container) {
        // Inject services from container
        this.stateManager = container.get('stateManager');
        this.practiceSessionService = container.get('practiceSessionService');
        this.highlightingService = container.get('highlightingService');
        this.logger = container.get('logger');
        
        // UI state subscriptions
        this.subscriptions = [];
        
        // Timer for practice sections
        this.sectionTimer = null;
        this.wakeLock = null;
        
        this.init();
    }

    /**
     * Initialize component and set up subscriptions
     */
    init() {
        this.logger.info('Practice Session Component: Initializing');
        
        // Subscribe to practice session state changes
        const sessionSub = this.stateManager.subscribe('practiceSession', (session, oldSession) => {
            this.onPracticeSessionChanged(session, oldSession);
        });
        this.subscriptions.push(sessionSub);

        // Subscribe to UI preferences changes
        const prefSub = this.stateManager.subscribe('preferences', (preferences) => {
            this.onPreferencesChanged(preferences);
        });
        this.subscriptions.push(prefSub);

        // Set up DOM event handlers
        this.bindEventHandlers();
    }

    /**
     * Bind DOM event handlers
     */
    bindEventHandlers() {
        // Practice control buttons
        document.addEventListener('click', async (event) => {
            if (event.target.matches('[data-action="start-practice"]')) {
                const planId = event.target.dataset.planId;
                const scoreId = event.target.dataset.scoreId;
                await this.startPracticeFromPlan(planId, scoreId);
            }
            
            if (event.target.matches('[data-action="complete-section"]')) {
                const confidence = event.target.dataset.confidence;
                await this.completePracticeSection(confidence);
            }
            
            if (event.target.matches('[data-action="end-practice"]')) {
                await this.endPracticeSession();
            }
        });

        // Timer events
        document.addEventListener('practice-timer-complete', async () => {
            await this.onTimerComplete();
        });
    }

    /**
     * Start a practice session from a saved plan
     * @param {string} planId - Practice plan ID
     * @param {string} scoreId - Score ID
     * @returns {Promise<boolean>} Success status
     */
    async startPracticeFromPlan(planId, scoreId) {
        try {
            this.logger.info('Starting practice session from plan', { planId, scoreId });

            // Use business service to start the session
            const sessionData = await this.practiceSessionService.startPracticeSession(planId, scoreId);
            
            // Update application state
            this.stateManager.actions.startPracticeSession(sessionData);
            this.stateManager.actions.setCurrentScore({ id: scoreId });

            // Request wake lock to prevent screen sleeping
            await this.requestWakeLock();

            this.logger.info('Practice session started successfully', { sessionId: sessionData.id });
            return true;

        } catch (error) {
            this.logger.error('Failed to start practice session', error);
            this.showErrorMessage('Failed to start practice session. Please try again.');
            return false;
        }
    }

    /**
     * Complete the current practice section
     * @param {string} confidence - User's confidence level for the section
     */
    async completePracticeSection(confidence) {
        try {
            const session = this.stateManager.selectors.getPracticeSession();
            if (!session) {
                this.logger.warn('No active practice session to complete section');
                return;
            }

            this.logger.info('Completing practice section', { 
                sectionIndex: session.currentSection, 
                confidence 
            });

            // Use business service to complete the section
            const updatedSession = await this.practiceSessionService.completePracticeSection(
                session.id, 
                session.currentSection, 
                confidence
            );

            // Update state with progress
            this.stateManager.actions.updatePracticeProgress(
                updatedSession.currentSection, 
                confidence
            );

            // Update highlights if needed
            if (session.sections && session.sections[session.currentSection]) {
                const section = session.sections[session.currentSection];
                if (section.highlightIds && section.highlightIds.length > 0) {
                    await this.highlightingService.batchUpdateConfidence(
                        section.highlightIds, 
                        confidence
                    );
                    
                    // Refresh highlights in state
                    const highlights = await this.highlightingService.getHighlights(session.scoreId);
                    this.stateManager.actions.setHighlights(highlights);
                }
            }

            // Check if session is complete
            if (updatedSession.status === 'completed') {
                await this.onSessionComplete(updatedSession);
            } else {
                // Move to next section
                this.startSectionTimer();
            }

        } catch (error) {
            this.logger.error('Failed to complete practice section', error);
            this.showErrorMessage('Failed to complete section. Please try again.');
        }
    }

    /**
     * End the practice session
     */
    async endPracticeSession() {
        try {
            const session = this.stateManager.selectors.getPracticeSession();
            if (!session) {
                this.logger.warn('No active practice session to end');
                return;
            }

            this.logger.info('Ending practice session', { sessionId: session.id });

            // Use business service to end the session
            const finalSession = await this.practiceSessionService.endPracticeSession(session.id);

            // Update state
            this.stateManager.actions.endPracticeSession();

            // Release wake lock
            await this.releaseWakeLock();

            // Stop timer
            this.stopSectionTimer();

            // Show completion summary
            this.showSessionSummary(finalSession);

            this.logger.info('Practice session ended successfully');

        } catch (error) {
            this.logger.error('Failed to end practice session', error);
            this.showErrorMessage('Failed to end practice session properly.');
        }
    }

    /**
     * Handle practice session state changes
     */
    onPracticeSessionChanged(session, oldSession) {
        if (!session && oldSession) {
            // Session ended
            this.onSessionEnded();
        } else if (session && !oldSession) {
            // Session started
            this.onSessionStarted(session);
        } else if (session && oldSession && session.currentSection !== oldSession.currentSection) {
            // Section changed
            this.onSectionChanged(session.currentSection);
        }
    }

    /**
     * Handle preferences changes
     */
    onPreferencesChanged(preferences) {
        // Update timer duration if changed
        if (this.sectionTimer && preferences.timerDuration) {
            this.updateTimerDuration(preferences.timerDuration);
        }
    }

    /**
     * Handle session start
     */
    onSessionStarted(session) {
        this.logger.info('Practice session started in UI', { sessionId: session.id });
        
        // Update UI to show practice mode
        this.showPracticeMode();
        
        // Start first section timer
        this.startSectionTimer();
        
        // Update page navigation if needed
        if (session.sections && session.sections[0]) {
            this.navigateToSection(session.sections[0]);
        }
    }

    /**
     * Handle session end
     */
    onSessionEnded() {
        this.logger.info('Practice session ended in UI');
        
        // Stop timer
        this.stopSectionTimer();
        
        // Release wake lock
        this.releaseWakeLock();
        
        // Update UI to normal mode
        this.hidePracticeMode();
    }

    /**
     * Handle section change
     */
    onSectionChanged(sectionIndex) {
        this.logger.info('Practice section changed', { sectionIndex });
        
        const session = this.stateManager.selectors.getPracticeSession();
        if (session && session.sections && session.sections[sectionIndex]) {
            this.navigateToSection(session.sections[sectionIndex]);
        }
        
        // Restart timer for new section
        this.startSectionTimer();
    }

    /**
     * Handle timer completion
     */
    async onTimerComplete() {
        const showDialog = this.stateManager.selectors.shouldShowConfidenceDialog();
        
        if (showDialog) {
            this.showConfidenceDialog();
        } else {
            // Auto-complete with medium confidence
            await this.completePracticeSection('medium');
        }
    }

    /**
     * Handle session completion
     */
    async onSessionComplete(session) {
        this.logger.info('Practice session completed', { sessionId: session.id });
        
        // Calculate session statistics
        const stats = await this.practiceSessionService.calculateSessionStatistics(session.id);
        
        // Update state to completed
        this.stateManager.actions.endPracticeSession();
        
        // Show completion dialog
        this.showCompletionDialog(session, stats);
        
        // Release wake lock
        await this.releaseWakeLock();
    }

    /**
     * Start section timer
     */
    startSectionTimer() {
        this.stopSectionTimer(); // Stop any existing timer
        
        const duration = this.stateManager.selectors.getTimerDuration();
        
        this.sectionTimer = setTimeout(() => {
            document.dispatchEvent(new CustomEvent('practice-timer-complete'));
        }, duration);
        
        this.logger.info('Section timer started', { duration });
    }

    /**
     * Stop section timer
     */
    stopSectionTimer() {
        if (this.sectionTimer) {
            clearTimeout(this.sectionTimer);
            this.sectionTimer = null;
            this.logger.info('Section timer stopped');
        }
    }

    /**
     * Update timer duration
     */
    updateTimerDuration(newDuration) {
        // If timer is running, restart with new duration
        if (this.sectionTimer) {
            this.startSectionTimer();
        }
    }

    /**
     * Request wake lock to prevent screen sleeping
     */
    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.logger.info('Wake lock acquired');
            } catch (error) {
                this.logger.warn('Failed to acquire wake lock', error);
            }
        }
    }

    /**
     * Release wake lock
     */
    async releaseWakeLock() {
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                this.logger.info('Wake lock released');
            } catch (error) {
                this.logger.warn('Failed to release wake lock', error);
            }
        }
    }

    // UI Methods (to be implemented in Sprint 3)

    showPracticeMode() {
        // Show practice UI elements
        document.body.classList.add('practice-mode');
    }

    hidePracticeMode() {
        // Hide practice UI elements
        document.body.classList.remove('practice-mode');
    }

    showConfidenceDialog() {
        // Show confidence selection dialog
        this.stateManager.actions.openDialog('confidence-dialog');
    }

    showCompletionDialog(session, stats) {
        // Show session completion dialog with statistics
        this.stateManager.actions.openDialog('session-complete-dialog');
    }

    showSessionSummary(session) {
        // Show session summary
        console.log('Session Summary:', session);
    }

    showErrorMessage(message) {
        // Show error message to user
        console.error(message);
    }

    navigateToSection(section) {
        // Navigate to the section page/location
        if (section.page) {
            this.stateManager.actions.setPdfPage(section.page);
        }
    }

    /**
     * Cleanup subscriptions and timers
     */
    destroy() {
        this.logger.info('Practice Session Component: Destroying');
        
        // Unsubscribe from all state changes
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions = [];
        
        // Stop timer
        this.stopSectionTimer();
        
        // Release wake lock
        this.releaseWakeLock();
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSessionComponent;
} else if (typeof window !== 'undefined') {
    window.PracticeSessionComponent = PracticeSessionComponent;
}

export default PracticeSessionComponent;
