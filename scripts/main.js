// PlayTime Main Application Entry Point
// This file will be implemented during Outside-In development

/**
 * CODE REVIEW FINDINGS:
 * 
 * 🔧 REFACTORING OPPORTUNITIES:
 * 1. Magic numbers and hardcoded values scattered throughout
 * 2. DOM selectors are hardcoded - should be configurable
 * 3. ✅ Error handling inconsistency (appLogger.warn vs appLogger.error) - Now using centralized logger
 * 4. Functions violate Single Responsibility Principle
 * 5. Missing input validation and type documentation
 * 6. Inline CSS styles mixed with JavaScript logic
 * 
 * 📋 SPECIFIC ISSUES TO ADDRESS:
 * ✅ Extract configuration objects for selectors and constants
 * ✅ Create centralized logging utility
 * - Break down large functions (especially initializeFileUpload)
 * - Add JSDoc type documentation
 * - Move UI styles to CSS classes
 * - Add more thorough parameter validation
 */

// Configuration objects for selectors and constants
const CONFIG = {
    // DOM Selectors
    SELECTORS: {
        FILE_INPUT: '#pdf-upload',
        PDF_VIEWER: '.pdf-viewer-container',
        PREV_BUTTON: '[data-role="prev-page"]',
        NEXT_BUTTON: '[data-role="next-page"]',
        PAGE_INFO: '[data-role="page-info"]',
        STATUS_MESSAGE: '.status-message',
        SCORES_LIST: '#scores-list',
        CURRENT_SCORE_TITLE: '[data-role="current-score-title"]',
        ZOOM_IN_BTN: '[data-role="zoom-in"]',
        ZOOM_OUT_BTN: '[data-role="zoom-out"]',
        ZOOM_DISPLAY: '[data-role="zoom-display"]',
        FOCUS_MODE_BTN: '[data-role="toggle-focus-mode"]',
        FOCUS_MODE_HIDDEN: '[data-role="focus-mode-hidden"]'
    },
    
    // File Types
    FILE_TYPES: {
        PDF: 'application/pdf'
    },
    
    // User Messages
    MESSAGES: {
        ERROR_INVALID_FILE: 'Error: Please select a PDF file',
        SUCCESS_FILE_SELECTED: 'Added: ',
        ERROR_NO_FILE: 'No file selected',
        ERROR_ELEMENTS_NOT_FOUND: 'Required elements not found',
        ERROR_PDF_VIEWER_UNAVAILABLE: 'PDF Viewer not available',
        ERROR_NAVIGATION_UNAVAILABLE: 'PDF Viewer navigation methods not available'
    },
    
    // Application Settings
    SETTINGS: {
        DEFAULT_PAGE: 1,
        STATUS_ELEMENT_CLASS: 'status-message',
        ERROR_STATUS: 'error',
        SUCCESS_STATUS: 'success'
    }
};

// File validation helper
// TODO: Add more comprehensive validation (file size, MIME type verification)
function isValidPDFFile(file) {
    return file !== null && file !== undefined && file.type === CONFIG.FILE_TYPES.PDF;
}

// UI update helper for better extensibility
// ISSUE: This function does too much - creating elements AND updating content
// TODO: Split into separate functions for element creation and content updates
function updatePDFViewerStatus(pdfViewer, message, isError = false) {
    // stricter param validation (tiny TODO fix)
    if (!pdfViewer || typeof pdfViewer.querySelector !== 'function' || typeof pdfViewer.appendChild !== 'function') return;
    
    // Find or create a status element instead of replacing all content
    let statusElement = pdfViewer.querySelector(CONFIG.SELECTORS.STATUS_MESSAGE);
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = CONFIG.SETTINGS.STATUS_ELEMENT_CLASS;
        pdfViewer.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    
    // Use configuration constants for status attributes
    if (isError) {
        statusElement.setAttribute('data-status', CONFIG.SETTINGS.ERROR_STATUS);
    } else {
        statusElement.setAttribute('data-status', CONFIG.SETTINGS.SUCCESS_STATUS);
    }
}

// Update the current score title display immediately (fix for Bug 1.2)
function updateCurrentScoreTitleDisplay(filename) {
    if (!filename) return;
    try {
        const nodes = document.querySelectorAll(CONFIG.SELECTORS.CURRENT_SCORE_TITLE);
        nodes.forEach(n => { if (n) n.textContent = String(filename); });
    } catch (_) { /* noop for test environments without the element */ }
}

// --- refactor helpers (no behavior change) ---
async function loadPDFIntoViewer(file) {
    if (!window.PlayTimePDFViewer || typeof window.PlayTimePDFViewer.loadPDF !== 'function') return;
    logger.loading('Loading PDF into viewer...');
    await window.PlayTimePDFViewer.loadPDF(file);
    await window.PlayTimePDFViewer.renderPage(CONFIG.SETTINGS.DEFAULT_PAGE);
}

function getPagesFromViewerSafe() {
    try {
        if (window.PlayTimePDFViewer && typeof window.PlayTimePDFViewer.getTotalPages === 'function') {
            const total = window.PlayTimePDFViewer.getTotalPages();
            if (Number.isFinite(total) && total > 0) return total;
        }
    } catch (_) {}
    return undefined;
}

async function saveFileWithMeta(database, file, pagesMeta) {
    if (!database || typeof database.save !== 'function') return;
    try {
    const id = await database.save(file, { pages: pagesMeta });
    if (typeof window !== 'undefined') { window.PlayTimeCurrentScoreId = id; }
        if (window.PlayTimeScoreList && typeof window.PlayTimeScoreList.refresh === 'function') {
            await window.PlayTimeScoreList.refresh();
        }
        // Publish SCORE_SELECTED for newly saved score so dependent modules (highlighting) clear previous highlights
        try {
            const EV = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS) || {};
            const SCORE_SELECTED = EV.SCORE_SELECTED || 'playtime:score-selected';
            const detail = { pdfId: id, name: file.name, pages: pagesMeta };
            // Debug log removed (saveFileWithMeta dispatch SCORE_SELECTED)
            if (window.PlayTimeEventBuffer && typeof window.PlayTimeEventBuffer.publish === 'function') {
                window.PlayTimeEventBuffer.publish(SCORE_SELECTED, detail);
            } else {
                window.dispatchEvent(new CustomEvent(SCORE_SELECTED, { detail }));
            }
            // Mark last dispatch for duplicate suppression in score-list
            try { 
                window.__playTimeLastScoreSelectedId = id; 
                window.__playTimeLastScoreSelectedAt = Date.now(); 
            } catch(globalError) {
                appLogger.warn('Failed to set global tracking variables:', globalError.message);
            }
        } catch (eventError) { 
            logger.warn('Failed dispatching SCORE_SELECTED after save:', eventError.message); 
        }
    } catch (error) {
        logger.error('Failed to save PDF to database:', error);
    }
}

async function handleFileSelection(file, pdfViewerEl, database) {
    if (!isValidPDFFile(file)) {
        updatePDFViewerStatus(pdfViewerEl, CONFIG.MESSAGES.ERROR_INVALID_FILE, true);
        return;
    }

    updatePDFViewerStatus(pdfViewerEl, CONFIG.MESSAGES.SUCCESS_FILE_SELECTED + file.name, false);
    // Update current score title right away so UI reflects the selected/uploaded score
    updateCurrentScoreTitleDisplay(file.name);

    // Load into viewer first so we can compute page count
    try {
        await loadPDFIntoViewer(file);
    } catch (error) {
        logger.error('Failed to load PDF into viewer:', error);
        updatePDFViewerStatus(pdfViewerEl, 'Error loading PDF: ' + (error?.message || String(error)), true);
        return; // abort save if viewer failed
    }

    const pagesMeta = getPagesFromViewerSafe();
    await saveFileWithMeta(database, file, pagesMeta);
    logger.info('PDF successfully loaded and rendered');
}

// File Upload Handler entry point (logic decomposed into helpers above)
async function initializeFileUpload(database = null) {
    // Use configuration object for selectors instead of hardcoded strings
    const fileInput = document.querySelector(CONFIG.SELECTORS.FILE_INPUT);
    const pdfViewer = document.querySelector(CONFIG.SELECTORS.PDF_VIEWER);
    
    if (!fileInput || !pdfViewer) {
        logger.warn(CONFIG.MESSAGES.ERROR_ELEMENTS_NOT_FOUND);
        return;
    }

    /**
     * Dependency Injection provisioning for legacy bootstrap
     * - Attempts to create and initialize the DI container and expose it as `window.diContainer`.
     * - Enforcement strategy:
     *   - If running under a test environment (Jest) and PLAYTIME_THROW_ON_MISSING_DI=1, throw when DI is missing.
     *   - If running in a browser and PlayTimeConfig.throwOnMissingDI is true, log an error instead of throwing.
     */
    (function provideDIContainer() {
    // Prefer runtime configuration via window.PlayTimeConfig; fall back to Node process checks only when available
    const runtimeConfig = (typeof window !== 'undefined' && window.PlayTimeConfig) ? window.PlayTimeConfig : {};
    const throwConfigured = runtimeConfig && runtimeConfig.throwOnMissingDI === true;

        try {
            // Try to use global if already present (browser incremental migration)
            let DIContainerClass = (typeof window !== 'undefined' && window.DIContainer) || null;

            if (!DIContainerClass) {
                try {
                    // Try to require the DIContainer module (Node/test environments)
                    // eslint-disable-next-line global-require
                    const diModule = require('./Core/Infrastructure/DIContainer');
                    DIContainerClass = diModule && (diModule.DIContainer || diModule.DIContainer);
                } catch (e) {
                    DIContainerClass = null;
                }
            }

            // Instantiate and initialize container if possible
            let containerInstance = null;
            try {
                if (DIContainerClass) {
                    // Handle multiple shapes:
                    // - a constructor function/class
                    // - a module object with a DIContainer property
                    // - an already-instantiated container instance
                    if (typeof DIContainerClass === 'function') {
                        containerInstance = new DIContainerClass();
                    } else if (DIContainerClass && typeof DIContainerClass.DIContainer === 'function') {
                        containerInstance = new DIContainerClass.DIContainer();
                    } else if (DIContainerClass && typeof DIContainerClass.initialize === 'function') {
                        // already an instance
                        containerInstance = DIContainerClass;
                    } else {
                        throw new Error('DIContainerClass is not a constructor or usable instance');
                    }

                    if (containerInstance && typeof containerInstance.initialize === 'function') {
                        try { containerInstance.initialize(); } catch (initErr) { /* ignore initialization errors here */ }
                    }
                }
            } catch (instErr) {
                console.warn('Failed to instantiate DIContainer:', instErr && instErr.message);
            }

            // Expose container globally for legacy consumers and tests
            if (typeof window !== 'undefined') {
                window.diContainer = containerInstance;
                // If container provides a logger, prefer that and expose as window.logger
                try {
                    if (containerInstance && typeof containerInstance.get === 'function' && containerInstance.has && containerInstance.has('logger')) {
                        const resolvedLogger = containerInstance.get('logger');
                        if (resolvedLogger) {
                            window.logger = resolvedLogger;
                        }
                    }
                } catch (loggerErr) {
                    // Ignore logger wiring failures - fallbacks will be used
                }
                // Also expose shorthand for PlayTimeApplication bootstrapping
                if (!window.getPlayTimeApplication) {
                    window.getPlayTimeApplication = function() {
                        if (!window.PlayTimeApplication) return null;
                        if (!window.__playtime_app_instance) {
                            window.__playtime_app_instance = new window.PlayTimeApplication();
                        }
                        return window.__playtime_app_instance;
                    };
                }
            }
        } catch (err) {
            console.error('Error while provisioning DI container:', err && err.message);
        }
    })();

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            logger.warn(CONFIG.MESSAGES.ERROR_NO_FILE);
            return;
        }
        await handleFileSelection(file, pdfViewer, database);
    });
}

// NOTE: Navigation + zoom UI controls are now fully initialized inside the PDF viewer implementation
// via pdfViewer.attachUIControls(). The previous initializePageNavigation() shim has been removed.

// Initialize confidence controls (accessibility + UX)
function initializeConfidenceControls() {
    const ids = ['color-green', 'color-amber', 'color-red'];
    const buttons = ids
        .map(id => document.getElementById(id))
        .filter(Boolean);
    if (buttons.length === 0) return; // not present in test DOM sometimes

    const setPressed = (activeBtn) => {
        buttons.forEach(btn => {
            const isActive = btn === activeBtn;
            btn.setAttribute('aria-pressed', String(isActive));
            btn.classList.toggle('selected', isActive);
        });
    };

    const CONST = (typeof window !== 'undefined' && window.PlayTimeConstants) ? 
        window.PlayTimeConstants : 
        (function(){ 
            try { 
                return require('./constants'); 
            } catch(error) { 
                appLogger.warn('Failed to load constants module, using fallback:', error.message);
                return { EVENTS: { CONFIDENCE_CHANGED: 'playtime:confidence-changed' } }; 
            } 
        })();
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Only allow confidence selection if highlighting is active
            const highlightingToggle = document.getElementById('highlighting-toggle');
            const isHighlightingActive = highlightingToggle?.getAttribute('aria-pressed') === 'true';
            
            if (!isHighlightingActive) {
                appLogger.info('Confidence selection ignored - highlighting is not active');
                return;
            }
            
            setPressed(btn);
            const color = btn.getAttribute('data-color');
            
            if (!color) {
                appLogger.warn('Confidence button missing data-color attribute');
                return;
            }
            
            // Publish confidence change event for decoupled subscribers
            const eventDetail = { detail: { color } };
            try {
                const ev = new CustomEvent(CONST.EVENTS.CONFIDENCE_CHANGED, eventDetail);
                window.dispatchEvent(ev);
            } catch (windowError) {
                appLogger.warn('Failed to dispatch event on window, trying document:', windowError.message);
                try { 
                    document.dispatchEvent(new CustomEvent(CONST.EVENTS.CONFIDENCE_CHANGED, eventDetail)); 
                } catch (documentError) {
                    appLogger.error('Failed to dispatch confidence change event:', documentError.message);
                    throw new Error(`Event dispatch failed on both window and document: ${documentError.message}`);
                }
            }
        });
    });
}

// Initialize highlighting toggle controls
function initializeHighlightingToggle(logger = console) {
    const toggleButton = document.getElementById('highlighting-toggle');
    const confidencePanel = document.getElementById('confidence-panel');
    
    if (!toggleButton) {
        logger.warn('Highlighting toggle button not found');
        return;
    }
    
    let isHighlightingActive = false;
    
    const updateToggleState = (active) => {
        isHighlightingActive = active;
        toggleButton.setAttribute('aria-pressed', String(active));
        toggleButton.classList.toggle('selected', active);
        
        // Update button text based on state
        const buttonText = toggleButton.querySelector('span');
        if (buttonText) {
            buttonText.textContent = active ? 'Exit Highlighting' : 'Highlight Sections';
        }
        
        // Show/hide confidence panel
        if (confidencePanel) {
            confidencePanel.style.display = active ? 'block' : 'none';
        }
        
        // Enable/disable highlighting in the highlighting module
        if (window.PlayTimeHighlighting) {
            if (active) {
                window.PlayTimeHighlighting.enableSelection();
                // Auto-select the first confidence option (Confident/Green)
                setInitialConfidence();
                logger.info('Highlighting activated');
            } else {
                window.PlayTimeHighlighting.disableSelection();
                // Clear any active confidence when deactivating
                clearActiveConfidence();
                logger.info('Highlighting deactivated');
            }
        }
    };
    
    const clearActiveConfidence = () => {
        // Reset all confidence buttons
        const confidenceButtons = document.querySelectorAll('[data-role^="color-"]');
        confidenceButtons.forEach(btn => {
            btn.setAttribute('aria-pressed', 'false');
            btn.classList.remove('selected');
        });
        
        // Clear active confidence in highlighting module
        if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._state) {
            window.PlayTimeHighlighting._state.activeConfidence = null;
        }
    };
    
    const setInitialConfidence = () => {
        // Auto-select the first confidence option (Confident/Green)
        const greenButton = document.getElementById('color-green');
        if (greenButton) {
            greenButton.setAttribute('aria-pressed', 'true');
            greenButton.classList.add('selected');
            
            // Dispatch confidence change event
            const color = greenButton.getAttribute('data-color');
            if (color) {
                try {
                    const CONST = (typeof window !== 'undefined' && window.PlayTimeConstants) ? 
                        window.PlayTimeConstants : 
                        { EVENTS: { CONFIDENCE_CHANGED: 'playtime:confidence-changed' } };
                    
                    const eventDetail = { detail: { color } };
                    const ev = new CustomEvent(CONST.EVENTS.CONFIDENCE_CHANGED, eventDetail);
                    window.dispatchEvent(ev);
                } catch (error) {
                    appLogger.warn('Failed to dispatch initial confidence event:', error.message);
                }
            }
        }
    };
    
    // Handle toggle button click
    toggleButton.addEventListener('click', () => {
        updateToggleState(!isHighlightingActive);
    });
    
    // Initialize in disabled state
    updateToggleState(false);
}

// Initialize the application when DOM is ready
// ISSUE: This function also does too much - initialization AND UI creation
// TODO: Split into initializeApplication() and createDevStatusElement()
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', async function() {
        // Application starting - import DIContainer module (browser ESM path with .js)
        // createDiContainer() is exported to allow tests to create containers without side-effects

        try {
            const diModule = await import('./Core/Infrastructure/DIContainer.js');
            if (diModule && typeof diModule.createDiContainer === 'function') {
                const diContainerInstance = diModule.createDiContainer();
                diContainerInstance.initialize();
                window.diContainer = diContainerInstance;
            }
        } catch (_) {}

        try {
            // Initialize modules with logger dependency injection
            // Prefer DI-provided logger when available
            
            let appLogger = console;
            try {
                if (diContainerInstance && typeof diContainerInstance.get === 'function' && diContainerInstance.has && diContainerInstance.has('logger')) {
                    appLogger = diContainerInstance.get('logger') || window.logger || console;
                } else {
                    appLogger = window.logger || console;
                }
            } catch (e) {
                appLogger = window.logger || console;
            }

        if (!window.logger) {
            // Expose chosen logger globally to avoid scattered window.logger usage
            window.logger = appLogger;
            try { appLogger.warn('PlayTimeLogger not available, using DI or console fallback'); } catch (_) {}
        }
        
        // Create module instances with injected functions
        // DB: allow test injection, fallback to IndexedDBDatabase factory if not provided
        try {
            if (typeof window.createPlayTimeDB === 'function') {
                window.PlayTimeDB = window.createPlayTimeDB(appLogger);
            } else {
                // Fallback: dynamically import IndexedDBDatabase (ES module) and use the factory
                const module = await import('./db/IndexedDBDatabase.js');
                if (typeof module.createIndexedDBDatabase === 'function') {
                    window.PlayTimeDB = module.createIndexedDBDatabase(appLogger);
                } else {
                    throw new Error('IndexedDBDatabase module does not export a usable factory');
                }
            }
        } catch (dbError) {
            appLogger.error('Failed to create database instance:', dbError.message);
            throw new Error(`Database initialization failed: ${dbError.message}`);
        }

        // Initialize modules with better error handling
        try {
            if (typeof window.createPlayTimePDFViewer === 'function') {
                window.PlayTimePDFViewer = window.createPlayTimePDFViewer(appLogger);
            } else {
                appLogger.warn('PlayTimePDFViewer factory not available');
            }
        } catch (pdfViewerError) {
            appLogger.error('Failed to create PDF viewer:', pdfViewerError.message);
        }
        
        try {
            if (typeof window.createPlayTimeScoreList === 'function') {
                window.PlayTimeScoreList = window.createPlayTimeScoreList(null, appLogger); // Database will be set after initialization
            } else {
                appLogger.warn('PlayTimeScoreList factory not available');
            }
        } catch (scoreListError) {
            appLogger.error('Failed to create score list:', scoreListError.message);
        }
        // Practice planner will be initialized after highlighting module is ready
        
        // Initialize file upload handler first (driven by failing tests)
        try {
            await initializeFileUpload(window.PlayTimeDB);
        } catch (fileUploadError) {
            appLogger.error('Failed to initialize file upload handler:', fileUploadError.message);
            throw new Error(`File upload initialization failed: ${fileUploadError.message}`);
        }
        
        // Initialize all modules (placeholders for now)
        try {
            await window.PlayTimeDB.init();
        } catch (dbInitError) {
            appLogger.error('Failed to initialize database:', dbInitError.message);
            throw new Error(`Database initialization failed: ${dbInitError.message}`);
        }
        
        // Initialize PDF viewer early so highlighting + rehydration have a ready viewer
        try {
            if (window.PlayTimePDFViewer) {
                await window.PlayTimePDFViewer.init();
            } else {
                appLogger.warn('PlayTimePDFViewer not available for initialization');
            }
        } catch (pdfInitError) {
            appLogger.error('Failed to initialize PDF viewer:', pdfInitError.message);
            throw new Error(`PDF viewer initialization failed: ${pdfInitError.message}`);
        }
        // Attach navigation + zoom UI controls now that viewer is initialized
        if (window.PlayTimePDFViewer && typeof window.PlayTimePDFViewer.attachUIControls === 'function') {
            try {
                window.PlayTimePDFViewer.attachUIControls();
                window.logger.info?.('PDF viewer UI controls attached');
            } catch (e) {
                window.logger.warn?.('Failed attaching PDF viewer UI controls', e);
            }
        }
        // Initialize refactored highlighting with dependency injection
        try {
            
            if (window.diContainer && typeof window.diContainer.get === 'function') {
                window.PlayTimeHighlighting = window.diContainer.get('playTimeHighlighting');
            }

            if (window.PlayTimeHighlighting) {
                // Build deps object using DI-provided database when available
                const deps = {};
                try {
                    if (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has('database')) {
                        deps.database = window.diContainer.get('database');
                    }
                } catch (_) {}
                deps.database = deps.database || window.PlayTimeDB;

                await window.PlayTimeHighlighting.init({}, appLogger, window.PlayTimeConfidence, window.PlayTimeConstants, deps);
                // Start with highlighting disabled - user must explicitly activate it
                window.PlayTimeHighlighting.disableSelection();
                appLogger.info('Highlighting initialized in disabled state');
            } else {
                appLogger.warn('PlayTimeHighlighting module not available');
            }
        } catch (highlightingError) {
            appLogger.error('Failed to initialize highlighting module:', highlightingError && highlightingError.message);
            throw new Error(`Highlighting initialization failed: ${highlightingError && highlightingError.message}`);
        }
        
        // Initialize practice planner after highlighting is ready
            if (typeof window.createPlayTimePracticePlanner === 'function') {
            // Prefer DI-provided highlight persistence service, fall back to PlayTimeHighlighting components
            let highlightPersistenceService = null;

            if (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has('highlightPersistenceService')) {
                highlightPersistenceService = window.diContainer.get('highlightPersistenceService');
            }
            if (!highlightPersistenceService) {
                highlightPersistenceService = window.PlayTimeHighlighting?._components?.persistenceService;
            }
            
            // Initialize practice plan persistence service
            let practicePlanPersistenceService = null;
            if (typeof window.createPracticePlanPersistenceService === 'function') {
                practicePlanPersistenceService = window.createPracticePlanPersistenceService(window.PlayTimeDB, appLogger);
                appLogger.info('Practice plan persistence service initialized');
            } else {
                appLogger.warn('Practice plan persistence service not available');
            }
            
            if (highlightPersistenceService) {
                window.PlayTimePracticePlanner = window.createPlayTimePracticePlanner(appLogger, window.PlayTimeDB, highlightPersistenceService, practicePlanPersistenceService);
                window.logger.info?.('Practice planner initialized with highlight persistence service');
            } else {
                window.logger.warn?.('Practice planner: Highlight persistence service not available');
                // Create without highlight persistence service as fallback
                window.PlayTimePracticePlanner = window.createPlayTimePracticePlanner(appLogger, window.PlayTimeDB, null, practicePlanPersistenceService);
            }
        }
    // (Removed legacy auto-select fallback; selection will be event driven in upcoming refactor)
        // Central SCORE_SELECTED event handler (unified selection pipeline)
        try {
            const EV = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS) || {};
            const SCORE_SELECTED = EV.SCORE_SELECTED || 'playtime:score-selected';
            // Idempotent: remove existing to avoid duplicate handlers in tests with re-requires
            window.removeEventListener(SCORE_SELECTED, window.__playTimeScoreSelectedHandler || (()=>{}));
            window.__playTimeScoreSelectedHandler = async (e) => {
                const detail = e && e.detail || {};
                const pdfId = detail.pdfId;
                if (pdfId == null) return;
                // Debug log removed (main SCORE_SELECTED handler invoked)
                try { 
                    window.PlayTimeCurrentScoreId = pdfId; 
                } catch(scoreIdError) { 
                    appLogger.warn('Failed to set PlayTimeCurrentScoreId:', scoreIdError.message); 
                }
                try { 
                    updateCurrentScoreTitleDisplay(detail.name); 
                } catch(titleError) { 
                    appLogger.warn('Failed to update score title display:', titleError.message); 
                }
                // Load PDF binary & render first page; highlight will rehydrate after PAGE_CHANGED
                try {
                    const pdf = await window.PlayTimeDB.get(pdfId);
                    if (pdf && window.PlayTimePDFViewer) {
                        const blob = new Blob([pdf.data], { type: 'application/pdf' });
                        await window.PlayTimePDFViewer.loadPDF(blob);
                        await window.PlayTimePDFViewer.renderPage(CONFIG.SETTINGS.DEFAULT_PAGE);
                    }
                } catch(errLoad) { window.logger.warn?.('SCORE_SELECTED viewer load failed', errLoad); }
            };
            window.addEventListener(SCORE_SELECTED, window.__playTimeScoreSelectedHandler);
        } catch (errHandler) { window.logger.warn?.('Failed to set SCORE_SELECTED handler', errHandler); }

        // Initialize score list component after database, viewer & highlighting are ready
        try {
            if (window.PlayTimeScoreList) { 
                window.PlayTimeScoreList.setDatabase(window.PlayTimeDB); 
                await window.PlayTimeScoreList.init(); 
                await window.PlayTimeScoreList.refresh(); 
            } else {
                appLogger.warn('PlayTimeScoreList not available for initialization');
            }
        } catch (scoreListInitError) {
            appLogger.error('Failed to initialize score list:', scoreListInitError.message);
        }
        
        // Initialize practice planner component
        try {
            if (window.PlayTimePracticePlanner) { 
                await window.PlayTimePracticePlanner.init(); 
            } else {
                appLogger.warn('PlayTimePracticePlanner not available for initialization');
            }
        } catch (practicePlannerError) {
            appLogger.error('Failed to initialize practice planner:', practicePlannerError.message);
        }
        
        // Register practice mode layout command handler
        if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.registerHandler === 'function') {
            window.PlayTimeLayoutCommands.registerHandler('practice-mode', (type, options) => {
                const viewerSection = document.querySelector('#viewer-section');
                
                switch (options.action) {
                    case 'enter':
                        // Set data attribute to indicate practice mode is active
                        if (viewerSection) {
                            viewerSection.setAttribute('data-practice-mode', 'active');
                        }
                        window.logger.info?.('Practice mode: Entered practice planning mode');
                        break;
                    case 'exit':
                        // Remove data attribute to return to normal mode
                        if (viewerSection) {
                            viewerSection.removeAttribute('data-practice-mode');
                        }
                        window.logger.info?.('Practice mode: Exited practice planning mode');
                        break;
                    default:
                        window.logger.warn?.('Unknown practice mode action:', options.action);
                }
            });
            window.logger.info?.('Practice mode layout command handler registered');
        }
        // Reload scenario: current score id already set but no highlights rendered yet -> replay SCORE_SELECTED
        try {
            if (window.PlayTimeCurrentScoreId != null && !window.__playTimeReloadReplayed) {
                const existingHighlights = document.querySelectorAll('[data-role="highlight"]').length;
                if (existingHighlights === 0 && window.PlayTimeDB && typeof window.PlayTimeDB.getHighlights === 'function') {
                    const secs = await window.PlayTimeDB.getHighlights(window.PlayTimeCurrentScoreId);
                    if (secs && secs.length) {
                        const pdfMeta = await window.PlayTimeDB.get(window.PlayTimeCurrentScoreId);
                        const EV = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS) || {};
                        const SCORE_SELECTED = EV.SCORE_SELECTED || 'playtime:score-selected';
                        const detail = { pdfId: pdfMeta.id, name: pdfMeta.name || pdfMeta.filename, pages: pdfMeta.pages };
                        // Debug log removed (main replay SCORE_SELECTED reload)
                        if (window.PlayTimeEventBuffer && typeof window.PlayTimeEventBuffer.publish === 'function') {
                            window.PlayTimeEventBuffer.publish(SCORE_SELECTED, detail);
                        } else {
                            window.dispatchEvent(new CustomEvent(SCORE_SELECTED, { detail }));
                        }
                        window.__playTimeReloadReplayed = true;
                    }
                }
            }
        } catch(_) { /* ignore */ }
        // Auto-dispatch SCORE_SELECTED for first stored PDF on reload if none selected yet
        try {
            if (window.PlayTimeCurrentScoreId == null && window.PlayTimeDB && typeof window.PlayTimeDB.getAll === 'function') {
                const pdfs = await window.PlayTimeDB.getAll();
                if (pdfs && pdfs.length > 0) {
                    const first = pdfs[0];
                    const EV = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS) || {};
                    const SCORE_SELECTED = EV.SCORE_SELECTED || 'playtime:score-selected';
                    const detail = { pdfId: first.id, name: first.name || first.filename, pages: first.pages };
                    // Debug log removed (main auto-dispatch SCORE_SELECTED)
                    if (window.PlayTimeEventBuffer && typeof window.PlayTimeEventBuffer.publish === 'function') {
                        window.PlayTimeEventBuffer.publish(SCORE_SELECTED, detail);
                    } else {
                        window.dispatchEvent(new CustomEvent(SCORE_SELECTED, { detail }));
                    }
                }
            }
        } catch(_) { /* ignore */ }
        
    // PDF viewer UI controls (navigation + zoom) are attached internally by the viewer module.

    // Initialize confidence controls
    initializeConfidenceControls();
    
    // Initialize highlighting toggle
    initializeHighlightingToggle(appLogger);

    // Initialize focus mode with command architecture (replaces procedural approach)
        if (typeof window.createPlayTimeFocusModeCommands === 'function') {
            window.PlayTimeFocusModeCommands = window.createPlayTimeFocusModeCommands();
            if (window.PlayTimeFocusModeCommands && window.PlayTimeFocusModeCommands.initializeFocusModeCommands) {
                window.PlayTimeFocusModeCommands.initializeFocusModeCommands();
            }
        }
        
        // Application ready
        } catch (error) {
            const appLogger = window.logger || console;
            appLogger.error('Failed to initialize PlayTime application:', error.message);
        // Show user-friendly error message
        const errorContainer = document.querySelector('.error-container') || document.body;
        if (errorContainer) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'application-error';
            errorMessage.style.cssText = 'background: #ffebee; color: #c62828; padding: 12px; margin: 8px; border-radius: 4px; border: 1px solid #e57373;';
            errorMessage.textContent = `Application failed to start: ${error.message}. Please refresh the page or check the appLogger for details.`;
            errorContainer.appendChild(errorMessage);
        }
            throw error; // Re-throw so it's visible in appLogger
        }
    });
}

// Export for testing
// TODO: Consider using ES6 modules (export/import) instead of CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        CONFIG,
        isValidPDFFile,
        updatePDFViewerStatus,
        updateCurrentScoreTitleDisplay,
        initializeFileUpload
    };
}
