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
    constructor(logger, database, highlightPersistenceService, practicePlanPersistenceService, practiceSessionStarter = null) {
        this.config = PRACTICE_PLANNER_CONFIG;
        this.logger = logger;
        this.database = database;
        this.highlightPersistenceService = highlightPersistenceService;
        this.practicePlanPersistenceService = practicePlanPersistenceService;
        this.currentScoreId = null;
        this.isActive = false;
        this.currentPracticePlan = null; // Store currently loaded practice plan
        this.isEditingExistingPlan = false; // Track if we're editing an existing plan
        
    // Initialize practice session starter module (injected)
    this.practiceSessionStarter = practiceSessionStarter;
        
        // Initialize practice session manager module
        this.practiceSessionManager = null;
        
        // DOM elements - will be populated by init()
        this.setupButton = null;
        this.startPracticeSessionButton = null;
        this.exitButton = null;
        this.returnToHighlightingButton = null;
        this.practiceInterface = null;
        this.noHighlightsMessage = null;
        this.practiceContent = null;
    this.modalOverlay = null; // container for modal overlay
    }

    init() {
        this.logger.info('Initializing Practice Planner');
        
    // Find sidebar trigger first
        this.setupButton = document.querySelector('[data-role="setup-practice-plan"]');

    // Ensure the planner UI exists (inject from template if necessary)
    this.ensurePracticePlannerUI();

    // Find DOM elements inside planner
    this.startPracticeSessionButton = document.querySelector('[data-role="start-practice-session-sidebar"]');
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
        
        if (this.startPracticeSessionButton) {
            this.startPracticeSessionButton.addEventListener('click', this.handleStartPracticeSessionFromSidebar.bind(this));
        }
        
        if (this.returnToHighlightingButton) {
            this.returnToHighlightingButton.addEventListener('click', this.handleExitPractice.bind(this));
        }

        // Attach global button event listeners (once during initialization)
        this.attachGlobalEventListeners();

        // Initialize practice session starter module
        if (!this.practiceSessionStarter) {
            this.logger.warn('Practice Planner: Practice session starter not injected; callers should pass one into the constructor');
        } else {
            this.logger.info('Practice Planner: Practice session starter injected');
        }

        // Initialize practice session manager module
        if (typeof window.createPracticeSessionManager === 'function') {
            this.practiceSessionManager = window.createPracticeSessionManager(
                this.logger,
                window.PlayTimeHighlighting,
                new PracticeSessionTimer(this.logger, {}),
                this.practiceSessionStarter,
                this.practicePlanPersistenceService,
                this.database
            );
            this.logger.info('Practice Planner: Practice session manager initialized');
        } else {
            this.logger.warn('Practice Planner: Practice session manager not available');
        }

        this.logger.info('Practice Planner event handlers attached');

        // Listen for score changes to update current score context
        window.addEventListener('playtime:score-selected', this.handleScoreSelected.bind(this));
        
        this.logger.info('Practice Planner initialized successfully');
        return true;
    }

    /**
     * Ensure the practice planner UI exists in the DOM. If missing, inject a modal overlay
     * using the PracticePlannerTemplates.
     */
    ensurePracticePlannerUI() {
        // If planner already present, capture overlay if wrapped and return
        const existing = document.querySelector('[data-role="practice-planner"]');
        if (existing) {
            this.modalOverlay = existing.closest('.practice-planner-modal');
            return;
        }

        // Require templates to inject
        if (!window.PracticePlannerTemplates || typeof window.PracticePlannerTemplates.mainCard !== 'function') {
            this.logger.warn?.('Practice Planner: Templates not available to build UI');
            return;
        }

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.className = 'practice-planner-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        // Insert the planner card
        overlay.innerHTML = window.PracticePlannerTemplates.mainCard();

        // Append to body so it overlays the whole app
        document.body.appendChild(overlay);

        // Store refs and initialize icons
        this.modalOverlay = overlay;
        try { window.lucide?.createIcons?.(); } catch(_) {}
    }

    async handleScoreSelected(event) {
        if (event.detail && event.detail.pdfId) {
            this.currentScoreId = event.detail.pdfId;
            this.logger.info('Practice Planner: Score context updated from score-selected event', { 
                scoreId: this.currentScoreId,
                eventDetail: event.detail
            });

            // Check for existing practice plans for this score
            await this.checkForExistingPracticePlans(this.currentScoreId);
        }
    }

    /**
     * Check if the selected score has existing practice plans and update UI accordingly
     */
    async checkForExistingPracticePlans(scoreId) {
        try {
            if (!this.practicePlanPersistenceService) {
                this.logger.debug?.('Practice plan persistence service not available');
                this.updateSetupButtonText(false);
                return;
            }

            // If practice interface is currently open, close it when switching scores
            // to avoid showing stale data from the previous score
            if (this.isInPracticeMode()) {
                this.hidePracticeInterface();
                this.logger.debug?.('Practice Planner: Closed practice interface due to score change');
            }

            const existingPlans = await this.practicePlanPersistenceService.loadPracticePlansForScore(scoreId);
            
            if (existingPlans && existingPlans.length > 0) {
                // For now, use the most recent plan (could be enhanced to show a list)
                const mostRecentPlan = existingPlans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                this.currentPracticePlan = mostRecentPlan;
                this.updateSetupButtonText(true);
                
                this.logger.info('Practice Planner: Found existing practice plan for score', {
                    scoreId: scoreId,
                    planId: mostRecentPlan.id,
                    planName: mostRecentPlan.name
                });
            } else {
                this.currentPracticePlan = null;
                this.updateSetupButtonText(false);
                this.resetForm(); // Reset form when no existing plan
                
                // Load highlights for the new score and populate sections
                const highlights = await this.getHighlightsForScore(scoreId);
                this.populatePracticeSections(highlights);
                
                this.logger.debug?.('Practice Planner: No existing practice plans found for score', {
                    scoreId: scoreId,
                    highlightCount: highlights.length
                });
            }
        } catch (error) {
            this.logger.warn?.('Practice Planner: Error checking for existing practice plans', error);
            this.currentPracticePlan = null;
            this.updateSetupButtonText(false);
            this.resetForm(); // Reset form on error as well
            
            // Clear sections on error and try to load highlights for current score
            try {
                const highlights = await this.getHighlightsForScore(scoreId);
                this.populatePracticeSections(highlights);
            } catch (highlightError) {
                this.logger.warn?.('Practice Planner: Error loading highlights after error', highlightError);
                // Clear sections if we can't load highlights
                this.populatePracticeSections([]);
            }
        }
    }

    /**
     * Update the setup button text and start session button visibility based on whether an existing plan exists
     */
    updateSetupButtonText(hasExistingPlan) {
        // Update setup button text if it exists
        if (this.setupButton) {
            if (hasExistingPlan) {
                this.setupButton.textContent = 'Edit practice plan';
                this.setupButton.title = 'Edit existing practice plan for this score';
            } else {
                this.setupButton.textContent = 'Setup practice plan';
                this.setupButton.title = 'Create a new practice plan for this score';
            }
        }

        // Update start practice session button visibility
        if (this.startPracticeSessionButton) {
            if (hasExistingPlan) {
                this.startPracticeSessionButton.style.display = 'flex';
            } else {
                this.startPracticeSessionButton.style.display = 'none';
            }
        }
    }

    /**
     * Reset the practice plan form to default values
     */
    resetForm() {
        try {
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            const sessionDurationInput = document.querySelector('[data-role="session-duration"]');
            const sessionFocusSelect = document.querySelector('[data-role="session-focus"]');

            if (sessionNameInput) sessionNameInput.value = '';
            if (sessionDurationInput) sessionDurationInput.value = '30'; // Default duration
            if (sessionFocusSelect) sessionFocusSelect.value = 'accuracy'; // Default focus

            this.logger.debug?.('Practice Planner: Form reset to default values');
        } catch (error) {
            this.logger.error?.('Practice Planner: Failed to reset form', error);
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

        // If we have an existing practice plan, load it into the form
        if (this.currentPracticePlan) {
            this.isEditingExistingPlan = true;
            await this.loadExistingPracticePlanIntoForm(this.currentPracticePlan);
        } else {
            this.isEditingExistingPlan = false;
        }
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

    /**
     * Load existing practice plan data into the form
     */
    async loadExistingPracticePlanIntoForm(practicePlan) {
        try {
            this.logger.info('Practice Planner: Loading existing practice plan into form', {
                planId: practicePlan.id,
                planName: practicePlan.name
            });

            // Fill session form fields
            const sessionNameInput = document.querySelector('[data-role="session-name"]');
            const sessionDurationInput = document.querySelector('[data-role="session-duration"]');
            const sessionFocusSelect = document.querySelector('[data-role="session-focus"]');

            if (sessionNameInput) sessionNameInput.value = practicePlan.name || '';
            if (sessionDurationInput) sessionDurationInput.value = practicePlan.duration || '30';
            if (sessionFocusSelect) sessionFocusSelect.value = practicePlan.focus || 'accuracy';

            // Load practice plan highlights to restore section settings
            if (this.practicePlanPersistenceService) {
                const fullPlan = await this.practicePlanPersistenceService.loadPracticePlan(practicePlan.id);
                if (fullPlan && fullPlan.sections) {
                    this.applySectionSettings(fullPlan.sections);
                }
            }

            this.logger.info('Practice Planner: Existing practice plan loaded successfully');
        } catch (error) {
            this.logger.error('Practice Planner: Failed to load existing practice plan', error);
        }
    }

    /**
     * Apply saved section settings to the current practice sections
     */
    applySectionSettings(savedSections) {
        try {
            // Create a map of highlight IDs to their saved settings
            const settingsMap = new Map();
            savedSections.forEach(section => {
                settingsMap.set(section.highlightId, section);
            });

            // Apply settings to current practice sections
            const currentSections = document.querySelectorAll('[data-role="practice-section"]');
            currentSections.forEach(sectionElement => {
                const highlightId = sectionElement.dataset.highlightId;
                const savedSettings = settingsMap.get(highlightId);

                if (savedSettings) {
                    // Apply practice method
                    const methodSelect = sectionElement.querySelector('[data-role="practice-method"]');
                    if (methodSelect && savedSettings.practiceMethod) {
                        methodSelect.value = savedSettings.practiceMethod;
                    }

                    // Apply target time
                    const targetTimeInput = sectionElement.querySelector('[data-role="target-time"]');
                    if (targetTimeInput && savedSettings.targetTime) {
                        targetTimeInput.value = savedSettings.targetTime;
                    }

                    // Apply notes
                    const notesTextarea = sectionElement.querySelector('[data-role="section-notes"]');
                    if (notesTextarea && savedSettings.notes) {
                        notesTextarea.value = savedSettings.notes;
                    }

                    this.logger.debug?.('Practice Planner: Applied settings to section', {
                        highlightId: highlightId,
                        method: savedSettings.practiceMethod,
                        targetTime: savedSettings.targetTime
                    });
                }
            });

            this.logger.info('Practice Planner: Section settings applied', {
                savedSectionsCount: savedSections.length,
                currentSectionsCount: currentSections.length
            });

        } catch (error) {
            this.logger.error('Practice Planner: Failed to apply section settings', error);
        }
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

        // Show modal overlay + planner card
        if (this.modalOverlay) {
            this.modalOverlay.classList.add('open');
        }
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
        try {
            lucide.createIcons();
        } catch (_) {}

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
     * Attach global event listeners (called once during initialization)
     */
    attachGlobalEventListeners() {
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

        this.logger.debug?.('Practice Planner: Global event listeners attached');
    }

    /**
     * Attach event listeners to practice section elements (called when sections are repopulated)
     */
    attachSectionEventListeners() {
        const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
        if (!sectionsList) return;

        // Remove section buttons
        sectionsList.querySelectorAll('[data-role="remove-section"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.target.closest('[data-role="practice-section"]');
                if (section && confirm('Remove this section from the practice plan?')) {
                    section.remove();
                    this.updateSectionCount();
                }
            });
        });

        // Practice method changes
        sectionsList.querySelectorAll('[data-role="practice-method"]').forEach(select => {
            select.addEventListener('change', (e) => {
                this.logger.debug?.('Practice method changed', {
                    sectionId: e.target.closest('[data-role="practice-section"]')?.dataset.highlightId,
                    method: e.target.value
                });
            });
        });

        // Target time changes
        sectionsList.querySelectorAll('[data-role="target-time"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.logger.debug?.('Target time changed', {
                    sectionId: e.target.closest('[data-role="practice-section"]')?.dataset.highlightId,
                    time: e.target.value
                });
            });
        });

        this.logger.debug?.('Practice Planner: Section event listeners attached');
    }

    /**
     * Update the section count display
     */
    updateSectionCount() {
        const sectionCount = document.querySelector('[data-role="section-count"]');
        const sections = document.querySelectorAll('[data-role="practice-section"]');
        
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
        
        // Validate we have sections to practice
        if (!sessionData.sections || sessionData.sections.length === 0) {
            alert('No practice sections available. Please add some highlighted sections first.');
            return;
        }

        // Use the practice session starter module if available, otherwise fallback to original logic
        if (this.practiceSessionStarter) {
            // Hide the practice planner interface first
            this.hidePracticeInterface();
            
            // Save as temporary practice plan first, then start session
            this.saveAndStartSession(sessionData);
        } else {
            // Fallback to original logic for backward compatibility
            this.logger.info('Practice Planner: Using fallback session management');
            
            // Initialize practice session state (fallback)
            this._fallbackPracticeSession = {
                config: sessionData,
                currentSectionIndex: 0,
                startTime: Date.now(),
                sectionNotes: {}
            };
            
            // Initialize timer component with event callbacks (fallback)
            this._practiceSessionTimer = new PracticeSessionTimer(this.logger, {
                onTimerComplete: () => this.handleTimerComplete(),
                onTimerTick: (timeLeft) => this.handleTimerTick(timeLeft),
                onPauseToggle: (isPaused) => this.handlePauseToggle(isPaused),
                onManualNext: () => this.handleManualNext(),
                onExit: () => this.handleTimerExit()
            });
            
            // Dispatch practice session start event
            const event = new CustomEvent('playtime:practice-session-configured', {
                detail: {
                    scoreId: this.currentScoreId,
                    sessionConfig: sessionData
                }
            });
            window.dispatchEvent(event);

            // Hide the practice planner interface
            this.hidePracticeInterface();

            // Start the timer for the first section
            const firstSection = sessionData.sections[0];
            this._practiceSessionTimer.startTimer(firstSection.targetTime);
            
            // Focus on the first section
            this.focusOnPracticeSection(firstSection.highlightId);
        }
    }

    /**
     * Save session data as temporary practice plan and start session
     * @param {Object} sessionData - The session configuration data
     */
    async saveAndStartSession(sessionData) {
        try {
            // Create a temporary practice plan name
            const tempPlanName = `Temp Session - ${new Date().toLocaleTimeString()}`;
            
            // Prepare practice plan data
            const practicePlanData = {
                ...sessionData,
                name: tempPlanName,
                scoreId: this.currentScoreId,
                isTemporary: true
            };

            // Save as temporary practice plan
            if (!this.practicePlanPersistenceService) {
                this.logger.error('Practice Planner: Practice plan persistence service not available');
                alert('Cannot start session: persistence service not available');
                return;
            }

            const tempPlanId = await this.practicePlanPersistenceService.savePracticePlan(practicePlanData);
            
            this.logger.info('Practice Planner: Temporary practice plan created', { 
                id: tempPlanId,
                name: tempPlanName
            });

            // Start session from the saved plan
            const success = await this.practiceSessionManager.startFromPlan(tempPlanId, this.currentScoreId);
            
            if (!success) {
                this.logger.error('Practice Planner: Failed to start session from temporary plan');
                alert('Failed to start practice session');
                // Show interface again on failure
                this.showPracticeInterface();
            }

        } catch (error) {
            this.logger.error('Practice Planner: Error saving temporary plan and starting session', error);
            alert('Error starting practice session');
            // Show interface again on failure
            this.showPracticeInterface();
        }
    }

    /**
     * Handle starting a practice session from the sidebar button (for saved plans)
     */
    async handleStartPracticeSessionFromSidebar() {
        if (!this.currentPracticePlan) {
            this.logger.warn('Practice Planner: No current practice plan available to start');
            alert('No practice plan available. Please create a practice plan first.');
            return;
        }

        if (!this.practiceSessionManager) {
            this.logger.error('Practice Planner: Practice session manager not available');
            alert('Practice session manager not available');
            return;
        }

        this.logger.info('Practice Planner: Starting practice session from sidebar', {
            planId: this.currentPracticePlan.id,
            planName: this.currentPracticePlan.name,
            scoreId: this.currentScoreId
        });

        try {
            const success = await this.practiceSessionManager.startFromPlan(this.currentPracticePlan.id, this.currentScoreId);
            
            if (!success) {
                this.logger.error('Practice Planner: Failed to start session from saved plan');
                alert('Failed to start practice session from saved plan');
            }
        } catch (error) {
            this.logger.error('Practice Planner: Error starting session from sidebar', error);
            alert('Error starting practice session');
        }
    }

    /**
     * Get the current practice session (delegated to practice session starter or fallback)
     */
    get practiceSession() {
        if (this.practiceSessionStarter) {
            return this.practiceSessionStarter.getCurrentSession();
        }
        return this._fallbackPracticeSession || null;
    }

    /**
     * Get the practice session timer (delegated to practice session starter or fallback)
     */
    get practiceSessionTimer() {
        if (this.practiceSessionStarter) {
            return this.practiceSessionStarter.practiceSessionTimer;
        }
        return this._practiceSessionTimer || null;
    }
    
    /**
     * Handle timer completion - move to next section or end session
     */
    handleTimerComplete() {
        if (!this.practiceSession) return;
        
        // Get notes from the UI for current section
        const notes = this.getCurrentSectionNotes();
        
        // Save notes for current section
        const currentSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
        if (currentSection && notes) {
            this.practiceSession.sectionNotes[currentSection.highlightId] = notes;
        }
        
        // Move to next section
        this.practiceSession.currentSectionIndex++;
        
        if (this.practiceSession.currentSectionIndex < this.practiceSession.config.sections.length) {
            // Start next section
            const nextSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
            this.practiceSessionTimer.startTimer(nextSection.targetTime);
            this.focusOnPracticeSection(nextSection.highlightId);
            
            this.logger.info('Practice Planner: Moving to next section', {
                sectionIndex: this.practiceSession.currentSectionIndex,
                highlightId: nextSection.highlightId
            });
        } else {
            // Session complete
            this.endPracticeSession(true);
        }
    }
    
    /**
     * Handle timer tick for any real-time updates
     */
    handleTimerTick(timeLeft) {
        // Could be used for progress indicators or other real-time updates
        this.logger.debug?.('Practice Planner: Timer tick', { timeLeft });
    }
    
    /**
     * Handle pause/resume toggle
     */
    handlePauseToggle(isPaused) {
        this.logger.info('Practice Planner: Timer pause toggled', { isPaused });
    }
    
    /**
     * Handle manual advance to next section
     */
    handleManualNext() {
        if (!this.practiceSession) return;
        
        // Get notes from the UI for current section
        const notes = this.getCurrentSectionNotes();
        
        // Save notes for current section
        const currentSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
        if (currentSection && notes) {
            this.practiceSession.sectionNotes[currentSection.highlightId] = notes;
        }
        
        // Move to next section
        this.practiceSession.currentSectionIndex++;
        
        if (this.practiceSession.currentSectionIndex < this.practiceSession.config.sections.length) {
            // Start next section
            const nextSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
            this.practiceSessionTimer.startTimer(nextSection.targetTime);
            this.focusOnPracticeSection(nextSection.highlightId);
            
            this.logger.info('Practice Planner: Manual advance to next section', {
                sectionIndex: this.practiceSession.currentSectionIndex,
                highlightId: nextSection.highlightId
            });
        } else {
            // Session complete
            this.endPracticeSession(true);
        }
    }
    
    /**
     * Handle timer exit
     */
    handleTimerExit() {
        if (!this.practiceSession) return;
        
        // Get notes from the UI for current section
        const notes = this.getCurrentSectionNotes();
        
        // Save notes for current section
        const currentSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
        if (currentSection && notes) {
            this.practiceSession.sectionNotes[currentSection.highlightId] = notes;
        }
        
        // End session early
        this.endPracticeSession(false);
    }
    
    /**
     * Get current section notes from the UI
     */
    getCurrentSectionNotes() {
        const notesInput = document.querySelector('[data-role="section-notes-input"]');
        return notesInput ? notesInput.value : '';
    }
    
    /**
     * End the practice session
     */
    endPracticeSession(completed) {
        // Exit focus mode
        if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.exitFocusMode === 'function') {
            window.PlayTimeHighlighting.exitFocusMode();
        }
        
        // Calculate session statistics
        const endTime = Date.now();
        const totalTime = this.practiceSession ? Math.round((endTime - this.practiceSession.startTime) / 1000 / 60) : 0; // minutes
        
        const sessionStats = {
            completed,
            completedSections: completed ? this.practiceSession.config.sections.length : this.practiceSession.currentSectionIndex,
            totalSections: this.practiceSession.config.sections.length,
            totalTime,
            notes: this.practiceSession.sectionNotes
        };
        
        this.logger.info('Practice Planner: Session ended', sessionStats);
        
        // Show completion message
        const message = completed 
            ? `Practice session completed!\n\nCompleted all ${sessionStats.totalSections} sections in ${totalTime} minutes.`
            : `Practice session ended.\n\nCompleted ${sessionStats.completedSections} of ${sessionStats.totalSections} sections in ${totalTime} minutes.`;
        
        alert(message);
        
        // Clear session state
        if (this.practiceSessionStarter) {
            this.practiceSessionStarter.endSession();
        } else {
            // Fallback for when practiceSessionStarter is not available
            this._fallbackPracticeSession = null;
            this._practiceSessionTimer = null;
        }
    }

    /**
     * Focus on a specific highlight using the highlighting module
     */
    async focusOnPracticeSection(highlightId) {
        try {
            // Find the highlight element (try both attribute formats for compatibility)
            let highlightElement = document.querySelector(`[data-role="highlight"][data-highlight-id="${highlightId}"]`);
            if (!highlightElement) {
                highlightElement = document.querySelector(`[data-role="highlight"][data-hl-id="${highlightId}"]`);
            }
            
            if (!highlightElement) {
                this.logger.warn?.('Practice Planner: Highlight element not found', { highlightId });
                return;
            }

            // Remove current-practice-section class from all highlights first
            const allHighlights = document.querySelectorAll('[data-role="highlight"]');
            allHighlights.forEach(highlight => {
                highlight.classList.remove('current-practice-section');
            });

            // Add current-practice-section class to the current highlight
            highlightElement.classList.add('current-practice-section');
            this.logger.debug?.('Practice Planner: Applied current-practice-section class', { highlightId });
            
            // Use the highlighting module to focus on this highlight
            if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.focusOnHighlight === 'function') {
                window.PlayTimeHighlighting.focusOnHighlight(highlightElement, { padding: 20 });
                this.logger.debug?.('Practice Planner: Focused on highlight', { highlightId });
            } else {
                this.logger.warn?.('Practice Planner: PlayTimeHighlighting not available');
            }
        } catch (error) {
            this.logger.error?.('Practice Planner: Error focusing on highlight', error);
        }
    }
    
    /**
     * Hide the practice timer UI
     */
    hidePracticeTimer() {
        const timerElement = document.getElementById('practice-session-timer');
        if (timerElement) {
            timerElement.style.display = 'none';
        }
    }
    
    /**
     * Attach event listeners to timer controls
     */
    attachTimerEventListeners() {
        const pauseButton = document.querySelector('[data-role="pause-timer"]');
        const nextButton = document.querySelector('[data-role="next-section"]');
        const exitButton = document.querySelector('[data-role="exit-practice-session"]');
        const notesInput = document.querySelector('[data-role="section-notes-input"]');
        
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.togglePauseTimer());
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.nextSection());
        }
        
        if (exitButton) {
            exitButton.addEventListener('click', () => this.endPracticeSession());
        }
        
        if (notesInput) {
            notesInput.addEventListener('input', (e) => this.updateSectionNotes(e.target.value));
        }
    }
    
    /**
     * Start the countdown timer for current section
     */
    startSectionTimer(targetTimeMinutes) {
        // Guard clause - ensure we have an active practice session
        if (!this.practiceSession) {
            this.logger.warn?.('Practice Planner: Cannot start timer - no active practice session');
            return;
        }
        
        // Clear any existing timer
        if (this.practiceSession.timer) {
            clearInterval(this.practiceSession.timer);
        }
        
        // Convert minutes to seconds
        let timeLeftSeconds = targetTimeMinutes * 60;
        this.practiceSession.sectionTimeLeft = timeLeftSeconds;
        
        // Update display immediately
        this.updateTimerDisplay();
        
        // Start countdown
        this.practiceSession.timer = setInterval(() => {
            if (!this.practiceSession.isPaused) {
                this.practiceSession.sectionTimeLeft--;
                this.updateTimerDisplay();
                
                if (this.practiceSession.sectionTimeLeft <= 0) {
                    // Time's up, move to next section
                    this.nextSection();
                }
            }
        }, 1000);
    }
    
    /**
     * Update the timer display
     */
    updateTimerDisplay() {
        if (!this.practiceSession) return;
        
        const timeRemainingElement = document.querySelector('[data-role="time-remaining"]');
        const sectionCounterElement = document.querySelector('[data-role="section-counter"]');
        const sessionNameElement = document.querySelector('[data-role="active-session-name"]');
        const pauseButton = document.querySelector('[data-role="pause-timer"]');
        
        // Update time display
        if (timeRemainingElement) {
            const minutes = Math.floor(this.practiceSession.sectionTimeLeft / 60);
            const seconds = this.practiceSession.sectionTimeLeft % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timeRemainingElement.textContent = timeString;
            
            // Add warning/critical classes
            timeRemainingElement.classList.remove('warning', 'critical');
            if (this.practiceSession.sectionTimeLeft <= 30) {
                timeRemainingElement.classList.add('critical');
            } else if (this.practiceSession.sectionTimeLeft <= 60) {
                timeRemainingElement.classList.add('warning');
            }
        }
        
        // Update section counter
        if (sectionCounterElement) {
            const current = this.practiceSession.currentSectionIndex + 1;
            const total = this.practiceSession.config.sections.length;
            sectionCounterElement.textContent = `Section ${current} of ${total}`;
        }
        
        // Update session name
        if (sessionNameElement) {
            sessionNameElement.textContent = this.practiceSession.config.name || 'Practice Session';
        }
        
        // Update pause button icon
        if (pauseButton) {
            const icon = pauseButton.querySelector('i');
            if (icon) {
                if (this.practiceSession.isPaused) {
                    icon.setAttribute('data-lucide', 'play');
                    pauseButton.title = 'Resume timer';
                } else {
                    icon.setAttribute('data-lucide', 'pause');
                    pauseButton.title = 'Pause timer';
                }
                // Refresh lucide icons
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        }
    }
    
    /**
     * Toggle pause/resume timer
     */
    togglePauseTimer() {
        if (!this.practiceSession) return;
        
        this.practiceSession.isPaused = !this.practiceSession.isPaused;
        this.updateTimerDisplay();
        
        this.logger.debug?.('Practice Planner: Timer toggled', { 
            isPaused: this.practiceSession.isPaused 
        });
    }
    
    /**
     * Move to next section
     */
    nextSection() {
        if (!this.practiceSession) return;
        
        // Save notes for current section
        const notesInput = document.querySelector('[data-role="section-notes-input"]');
        if (notesInput && notesInput.value.trim()) {
            const currentSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
            this.practiceSession.sectionNotes[currentSection.highlightId] = notesInput.value.trim();
            notesInput.value = ''; // Clear for next section
        }
        
        // Clear current timer
        if (this.practiceSession.timer) {
            clearInterval(this.practiceSession.timer);
        }
        
        // Start next section
        const nextIndex = this.practiceSession.currentSectionIndex + 1;
        this.startPracticeSection(nextIndex);
    }
    
    /**
     * End the practice session
     */
    endPracticeSession() {
        if (!this.practiceSession) return;
        
        // Clear timer
        if (this.practiceSession.timer) {
            clearInterval(this.practiceSession.timer);
        }
        
        // Hide timer UI
        this.hidePracticeTimer();
        
        // Exit focus mode
        if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.exitFocusMode === 'function') {
            window.PlayTimeHighlighting.exitFocusMode();
        }
        
        // Calculate session statistics
        const endTime = Date.now();
        const totalTime = Math.round((endTime - this.practiceSession.startTime) / 1000 / 60); // minutes
        const completedSections = this.practiceSession.currentSectionIndex;
        const totalSections = this.practiceSession.config.sections.length;
        
        this.logger.info('Practice Planner: Session ended', {
            totalTime,
            completedSections,
            totalSections,
            notes: this.practiceSession.sectionNotes
        });
        
        // Show completion message
        const isComplete = completedSections >= totalSections;
        const message = isComplete 
            ? `Practice session completed!\n\nCompleted all ${totalSections} sections in ${totalTime} minutes.`
            : `Practice session ended.\n\nCompleted ${completedSections} of ${totalSections} sections in ${totalTime} minutes.`;
        
        alert(message);
        
        // Clear session state
        if (this.practiceSessionStarter) {
            this.practiceSessionStarter.endSession();
        } else {
            // Fallback for when practiceSessionStarter is not available
            this._fallbackPracticeSession = null;
        }
    }
    
    /**
     * Update notes for current section
     */
    updateSectionNotes(notes) {
        if (!this.practiceSession) return;
        
        const currentSection = this.practiceSession.config.sections[this.practiceSession.currentSectionIndex];
        if (currentSection) {
            this.practiceSession.sectionNotes[currentSection.highlightId] = notes;
        }
    }

    /**
     * Handle saving a practice plan
     */
    async handleSavePracticePlan() {
        try {
            const sessionData = this.collectSessionData();
            
            const isUpdate = this.isEditingExistingPlan && !!this.currentPracticePlan;
            this.logger.info('Practice Planner: Saving practice plan', { 
                ...sessionData, 
                isUpdate: isUpdate,
                existingPlanId: isUpdate ? this.currentPracticePlan.id : null
            });

            // Validate that we have a current score ID
            if (!this.currentScoreId) {
                throw new Error('No active score selected');
            }

            // Validate that we have sections to save
            if (!sessionData.sections || sessionData.sections.length === 0) {
                throw new Error('No practice sections to save');
            }

            // Prepare practice plan data
            const practicePlanData = {
                name: sessionData.name,
                focus: sessionData.focus,
                duration: sessionData.duration,
                scoreId: this.currentScoreId,
                sections: sessionData.sections,
                totalSections: sessionData.totalSections,
                estimatedTime: sessionData.estimatedTime
            };

            // If updating, include the existing plan ID
            if (isUpdate) {
                practicePlanData.id = this.currentPracticePlan.id;
            }

            // Save the practice plan using the persistence service
            if (!this.practicePlanPersistenceService) {
                throw new Error('Practice plan persistence service not available');
            }

            let practicePlanId;
            if (isUpdate) {
                practicePlanId = await this.practicePlanPersistenceService.updatePracticePlan(this.currentPracticePlan.id, practicePlanData);
            } else {
                practicePlanId = await this.practicePlanPersistenceService.savePracticePlan(practicePlanData);
            }
            
            this.logger.info('Practice Planner: Practice plan saved successfully', { 
                id: practicePlanId,
                name: sessionData.name,
                isUpdate: isUpdate
            });

            // Show success message
            const actionText = isUpdate ? 'updated' : 'saved';
            alert(`Practice plan "${sessionData.name}" ${actionText} successfully!`);

            // Update our current practice plan reference
            if (isUpdate) {
                this.currentPracticePlan = { ...this.currentPracticePlan, ...practicePlanData };
            } else {
                this.currentPracticePlan = { id: practicePlanId, ...practicePlanData };
                this.isEditingExistingPlan = true;
                this.updateSetupButtonText(true); // Now we have a plan to edit
            }

            // Dispatch event for other components
            this._dispatchEvent(isUpdate ? 'playtime:practice-plan-updated' : 'playtime:practice-plan-saved', {
                practicePlanId: practicePlanId,
                scoreId: this.currentScoreId,
                isUpdate: isUpdate,
                planData: practicePlanData
            });

        } catch (error) {
            this.logger.error('Practice Planner: Failed to save practice plan', error);
            alert(`Failed to save practice plan: ${error.message}`);
        }
    }

    /**
     * Collect all session configuration data from the form
     */
    collectSessionData() {
        const sessionName = document.querySelector('[data-role="session-name"]')?.value || 'Untitled Session';
        const sessionDuration = parseInt(document.querySelector('[data-role="session-duration"]')?.value || '30');
        const sessionFocus = document.querySelector('[data-role="session-focus"]')?.value || 'accuracy';
        
        const sections = Array.from(document.querySelectorAll('[data-role="practice-section"]')).map(section => {
            return {
                highlightId: section.dataset.highlightId,
                practiceMethod: section.querySelector('[data-role="practice-method"]')?.value || 'slow-practice',
                targetTime: parseInt(section.querySelector('[data-role="target-time"]')?.value || '5'),
                notes: section.querySelector('[data-role="section-notes"]')?.value || ''
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
        if (this.modalOverlay) {
            this.modalOverlay.classList.remove('open');
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
function createPlayTimePracticePlanner(logger, database, highlightPersistenceService, practicePlanPersistenceService) {
    // Resolve a browser practiceSessionStarter (if available) and inject into constructor
    let practiceSessionStarter = null;
    if (typeof window !== 'undefined' && typeof window.createPracticeSessionStarter === 'function') {
        try {
            practiceSessionStarter = window.createPracticeSessionStarter(logger);
        } catch (_) {
            // ignore resolution errors and leave practiceSessionStarter null
        }
    }

    return new PracticePlanner(logger, database, highlightPersistenceService, practicePlanPersistenceService, practiceSessionStarter);
}

// Export for both Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PracticePlanner, createPlayTimePracticePlanner };
} else {
    window.createPlayTimePracticePlanner = createPlayTimePracticePlanner;
}
