/**
 * PlayTime Application
 * Main application class using clean architecture with dependency injection
 * This replaces the legacy global window dependencies approach
 */

class PlayTimeApplication {
    constructor() {
        this.diContainer = null;
        this.stateManager = null;
        this.logger = null;
        this.initialized = false;
        this.components = {};
    }

    /**
     * Initialize the application
     * Sets up dependency injection and core services
     */
    async initialize() {
        if (this.initialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            console.log('Initializing PlayTime Application...');

            // Initialize dependency injection container
            this.diContainer = window.createDiContainer();
            this.diContainer.initialize();

            // Get core services
            this.logger = this.diContainer.get('logger');
            this.stateManager = this.diContainer.get('stateManager');

            this.logger.info('PlayTime Application: Core services initialized');

            // Initialize components
            await this.initializeComponents();

            // Set up global error handling
            this.setupErrorHandling();

            // Mark as initialized
            this.initialized = true;

            this.logger.info('PlayTime Application: Initialization complete');

            // Dispatch initialization complete event
            document.dispatchEvent(new CustomEvent('playtime:initialized', {
                detail: { application: this }
            }));

        } catch (error) {
            console.error('Failed to initialize PlayTime Application:', error);
            throw error;
        }
    }

    /**
     * Initialize application components
     */
    async initializeComponents() {
        this.logger.info('Initializing application components');

        try {
            // Initialize database first
            await this.initializeDatabase();

            // Initialize core UI components
            await this.initializeUIComponents();

            // Initialize business logic components
            await this.initializeBusinessComponents();

            // Set up event handlers and interactions
            this.setupEventHandlers();

            this.logger.info('Application components initialized successfully');

        } catch (error) {
            this.logger.error('Failed to initialize components', error);
            throw error;
        }
    }

    /**
     * Initialize the database
     */
    async initializeDatabase() {
        try {
            const database = this.diContainer.get('database');
            await database.init();
            this.logger.info('Database initialized');
        } catch (error) {
            this.logger.error('Failed to initialize database', error);
            throw error;
        }
    }

    /**
     * Initialize core UI components
     */
    async initializeUIComponents() {
        try {
            // Initialize PDF viewer
            const pdfViewer = this.diContainer.get('playTimePDFViewer');
            await pdfViewer.init();
            pdfViewer.attachUIControls(); // Attach UI controls for navigation and zoom
            this.logger.info('PDF viewer initialized');

            // Initialize score list
            const scoreList = this.diContainer.get('playTimeScoreList');
            await scoreList.init();
            await scoreList.refresh();
            this.logger.info('Score list initialized');

        } catch (error) {
            this.logger.error('Failed to initialize UI components', error);
            throw error;
        }
    }

    /**
     * Initialize business logic components
     */
    async initializeBusinessComponents() {
        try {
            // Initialize highlighting system
            const highlighting = this.diContainer.get('playTimeHighlighting');
            const database = this.diContainer.get('database');
            const logger = this.diContainer.get('logger');

            // Build dependencies object for highlighting
            const deps = { database };

            await highlighting.init({}, logger, window.PlayTimeConfidence, window.PlayTimeConstants, deps);
            // Start with highlighting disabled
            highlighting.disableSelection();
            this.logger.info('Highlighting system initialized');

            // Initialize practice planner
            this.initializePracticePlanner();

        } catch (error) {
            this.logger.error('Failed to initialize business components', error);
            throw error;
        }
    }

    /**
     * Initialize practice planner
     */
    initializePracticePlanner() {
        try {
            if (typeof window.createPlayTimePracticePlanner === 'function') {
                const database = this.diContainer.get('database');
                const logger = this.diContainer.get('logger');

                // Get highlight persistence service
                let highlightPersistenceService = null;
                try {
                    highlightPersistenceService = this.diContainer.get('highlightPersistenceService');
                } catch (e) {
                    // Fallback to component from highlighting module
                    highlightPersistenceService = window.PlayTimeHighlighting?._components?.persistenceService;
                }

                // Initialize practice plan persistence service
                let practicePlanPersistenceService = null;
                if (typeof window.createPracticePlanPersistenceService === 'function') {
                    practicePlanPersistenceService = window.createPracticePlanPersistenceService(database, logger);
                }

                if (highlightPersistenceService) {
                    window.PlayTimePracticePlanner = window.createPlayTimePracticePlanner(
                        logger, database, highlightPersistenceService, practicePlanPersistenceService
                    );
                } else {
                    window.PlayTimePracticePlanner = window.createPlayTimePracticePlanner(
                        logger, database, null, practicePlanPersistenceService
                    );
                }

                // Initialize the practice planner to attach event handlers
                if (window.PlayTimePracticePlanner && typeof window.PlayTimePracticePlanner.init === 'function') {
                    window.PlayTimePracticePlanner.init();
                }

                this.logger.info('Practice planner initialized');
            }
        } catch (error) {
            this.logger.warn('Failed to initialize practice planner', error);
        }
    }

    /**
     * Set up event handlers and UI interactions
     */
    setupEventHandlers() {
        // Set up confidence controls
        this.setupConfidenceControls();

        // Set up highlighting toggle
        this.setupHighlightingToggle();

        // Set up focus mode
        this.setupFocusMode();

        // Set up file upload
        this.setupFileUpload();

        // Set up score selection handler
        this.setupScoreSelectionHandler();

        this.logger.info('Event handlers set up');
    }

    /**
     * Set up confidence controls
     */
    setupConfidenceControls() {
        const confidenceButtons = document.querySelectorAll('[data-role^="color-"]');
        if (confidenceButtons.length === 0) return;

        const setPressed = (activeBtn) => {
            confidenceButtons.forEach(btn => {
                const isActive = btn === activeBtn;
                btn.setAttribute('aria-pressed', String(isActive));
                btn.classList.toggle('selected', isActive);
            });
        };

        confidenceButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Only allow confidence selection if highlighting is active
                const highlightingToggle = document.getElementById('highlighting-toggle');
                const isHighlightingActive = highlightingToggle?.getAttribute('aria-pressed') === 'true';

                if (!isHighlightingActive) {
                    this.logger.info('Confidence selection ignored - highlighting is not active');
                    return;
                }

                setPressed(btn);
                const color = btn.getAttribute('data-color');

                if (color) {
                    // Dispatch confidence change event
                    const eventDetail = { detail: { color } };
                    window.dispatchEvent(new CustomEvent('playtime:confidence-changed', eventDetail));
                }
            });
        });
    }

    /**
     * Set up highlighting toggle
     */
    setupHighlightingToggle() {
        const toggleButton = document.getElementById('highlighting-toggle');
        const confidencePanel = document.getElementById('confidence-panel');

        if (!toggleButton) return;

        let isHighlightingActive = false;

        const updateToggleState = (active) => {
            isHighlightingActive = active;
            toggleButton.setAttribute('aria-pressed', String(active));
            toggleButton.classList.toggle('selected', active);

            // Update button text
            const buttonText = toggleButton.querySelector('span');
            if (buttonText) {
                buttonText.textContent = active ? 'Exit Highlighting' : 'Highlight Sections';
            }

            // Show/hide confidence panel
            if (confidencePanel) {
                confidencePanel.style.display = active ? 'block' : 'none';
            }

            // Toggle highlighting in the module
            const highlighting = this.diContainer.get('playTimeHighlighting');
            if (active) {
                highlighting.enableSelection();
                setInitialConfidence();
            } else {
                highlighting.disableSelection();
                clearActiveConfidence();
            }
        };

        const clearActiveConfidence = () => {
            const confidenceButtons = document.querySelectorAll('[data-role^="color-"]');
            confidenceButtons.forEach(btn => {
                btn.setAttribute('aria-pressed', 'false');
                btn.classList.remove('selected');
            });
        };

        const setInitialConfidence = () => {
            const greenButton = document.getElementById('color-green');
            if (greenButton) {
                greenButton.setAttribute('aria-pressed', 'true');
                greenButton.classList.add('selected');

                // Dispatch confidence change event
                const eventDetail = { detail: { color: 'green' } };
                window.dispatchEvent(new CustomEvent('playtime:confidence-changed', eventDetail));
            }
        };

        toggleButton.addEventListener('click', () => {
            updateToggleState(!isHighlightingActive);
        });

        // Initialize in disabled state
        updateToggleState(false);
    }

    /**
     * Set up focus mode
     */
    setupFocusMode() {
        if (typeof window.createPlayTimeFocusModeCommands === 'function') {
            window.PlayTimeFocusModeCommands = window.createPlayTimeFocusModeCommands();
            if (window.PlayTimeFocusModeCommands?.initializeFocusModeCommands) {
                window.PlayTimeFocusModeCommands.initializeFocusModeCommands();
            }
        }
    }

    /**
     * Set up file upload
     */
    setupFileUpload() {
        const fileInput = document.querySelector('#pdf-upload');
        if (!fileInput) return;

        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                await this.handleFileUpload(file);
            } catch (error) {
                this.logger.error('File upload failed', error);
            }
        });
    }

    /**
     * Handle file upload
     */
    async handleFileUpload(file) {
        if (!file.type.includes('pdf')) {
            this.showStatusMessage('Error: Please select a PDF file', 'error');
            return;
        }

        this.showStatusMessage(`Added: ${file.name}`, 'success');
        this.updateCurrentScoreTitle(file.name);

        try {
            // Load PDF into viewer
            const pdfViewer = this.diContainer.get('playTimePDFViewer');
            await pdfViewer.loadPDF(file);
            await pdfViewer.renderPage(1);

            // Save to database
            const database = this.diContainer.get('database');
            const id = await database.save(file, { pages: 1 });
            window.PlayTimeCurrentScoreId = id;

            // Refresh score list
            const scoreList = this.diContainer.get('playTimeScoreList');
            await scoreList.refresh();

            // Dispatch score selected event
            const detail = { pdfId: id, name: file.name, pages: 1 };
            window.dispatchEvent(new CustomEvent('playtime:score-selected', { detail }));

        } catch (error) {
            this.logger.error('Failed to process uploaded PDF', error);
            this.showStatusMessage('Error loading PDF', 'error');
        }
    }

    /**
     * Set up score selection handler
     * Handles loading PDFs from database when scores are selected
     */
    setupScoreSelectionHandler() {
        window.addEventListener('playtime:score-selected', async (event) => {
            try {
                const { pdfId } = event.detail;
                if (!pdfId) {
                    this.logger.warn('Score selected event missing pdfId');
                    return;
                }

                this.logger.info(`🎯 Loading PDF from database: ${pdfId}`);

                // Get PDF from database
                const database = this.diContainer.get('database');
                const pdf = await database.get(pdfId);

                if (!pdf || !pdf.data) {
                    this.logger.error(`PDF not found or missing data: ${pdfId}`);
                    this.showStatusMessage('Error: PDF data not found', 'error');
                    return;
                }

                // Create blob from database data
                const blob = new Blob([pdf.data], { type: 'application/pdf' });
                const file = new File([blob], pdf.filename || pdf.name || 'score.pdf', { type: 'application/pdf' });

                // Load into PDF viewer
                const pdfViewer = this.diContainer.get('playTimePDFViewer');
                await pdfViewer.loadPDF(file);
                await pdfViewer.renderPage(1);

                // Set current score ID
                window.PlayTimeCurrentScoreId = pdfId;

                this.logger.info(`✅ PDF loaded successfully: ${pdf.filename || pdf.name}`);

            } catch (error) {
                this.logger.error('Failed to load selected score', error);
                this.showStatusMessage('Error loading score', 'error');
            }
        });
    }

    /**
     * Show status message
     */
    showStatusMessage(message, type = 'info') {
        const statusElement = document.querySelector('.status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.setAttribute('data-status', type);
        }
    }

    /**
     * Update current score title
     */
    updateCurrentScoreTitle(filename) {
        if (!filename) return;
        const titleElements = document.querySelectorAll('[data-role="current-score-title"]');
        titleElements.forEach(element => {
            if (element) element.textContent = filename;
        });
    }

    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.logger.error('Uncaught error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logger.error('Unhandled promise rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });
    }

    /**
     * Get a service from the DI container
     * @param {string} serviceName - Name of the service
     * @returns {*} Service instance
     */
    getService(serviceName) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.diContainer.get(serviceName);
    }

    /**
     * Get a component instance
     * @param {string} componentId - Component identifier
     * @returns {*} Component instance
     */
    getComponent(componentId) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.components[componentId];
    }

    /**
     * Create a new component
     * @param {string} componentName - Type of component to create
     * @param {string} componentId - Unique identifier
     * @param {Object} options - Configuration options
     * @returns {*} Component instance
     */
    createComponent(componentName, componentId, options) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        // For now, just store the component info
        this.components[componentId] = { componentName, options };
        return this.components[componentId];
    }

    /**
     * Get current application state
     * @returns {Object} Application state snapshot
     */
    getState() {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.stateManager.getSnapshot();
    }

    /**
     * Subscribe to application state changes
     * @param {string} path - State path to watch
     * @param {Function} callback - Change callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.stateManager.subscribe(path, callback);
    }

    /**
     * Shutdown the application
     * Cleans up resources and components
     */
    async shutdown() {
        if (!this.initialized) {
            console.warn('Application not initialized, nothing to shutdown');
            return;
        }

        this.logger.info('Shutting down PlayTime Application');

        try {
            // Destroy all components
            // Note: Component cleanup will be handled by individual services

            // Reset application state
            this.stateManager.reset();

            // Clear references
            this.components = {};
            this.initialized = false;

            this.logger.info('PlayTime Application shutdown complete');

            // Dispatch shutdown event
            document.dispatchEvent(new CustomEvent('playtime:shutdown'));

        } catch (error) {
            this.logger.error('Error during application shutdown', error);
        }
    }

    /**
     * Restart the application
     */
    async restart() {
        this.logger.info('Restarting PlayTime Application');
        
        await this.shutdown();
        await this.initialize();
        
        this.logger.info('PlayTime Application restart complete');
    }

    /**
     * Get application status information
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.initialized,
            components: Object.keys(this.components),
            state: this.initialized ? this.stateManager.getSnapshot() : null,
            timestamp: Date.now()
        };
    }

    /**
     * Enable development mode features
     * Provides additional debugging and development tools
     */
    enableDevMode() {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }

        this.logger.info('Enabling development mode');

        // Expose services globally for debugging
        window.PlayTime = {
            app: this,
            services: {
                stateManager: this.stateManager,
                logger: this.logger
            },
            getService: (name) => this.getService(name),
            getComponent: (id) => this.getComponent(id),
            getState: () => this.getState(),
            getStatus: () => this.getStatus()
        };

        // Add dev tools to state manager
        this.stateManager.actions.setDevMode = (enabled) => {
            this.stateManager.actions.updatePreferences({ devMode: enabled });
        };

        this.logger.info('Development mode enabled - window.PlayTime available');
    }
}

// Create singleton instance
let applicationInstance = null;

/**
 * Get or create the application instance
 * @returns {PlayTimeApplication} Application instance
 */
function getApplication() {
    if (!applicationInstance) {
        applicationInstance = new PlayTimeApplication();
    }
    return applicationInstance;
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayTimeApplication, getApplication };
} else if (typeof window !== 'undefined') {
    window.PlayTimeApplication = PlayTimeApplication;
    window.getPlayTimeApplication = getApplication;
}

export { PlayTimeApplication, getApplication };
