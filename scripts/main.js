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

// Resolve the PDF viewer instance in one place (prefer DI, fall back to legacy window global)
function resolvePDFViewer() {
    try {
        if (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer')) {
            return window.diContainer.get('playTimePDFViewer');
        }
    } catch (_) {}
    try { return window.PlayTimePDFViewer || null; } catch(_) { return null; }
}

// --- refactor helpers (no behavior change) ---
async function loadPDFIntoViewer(file) {
    try {
        // Prefer DI-provided instance when available, fall back to window global
    const viewer = resolvePDFViewer();

        if (!viewer || typeof viewer.loadPDF !== 'function') {
            logger.warn('PDF viewer not available or missing loadPDF()');
            return;
        }

        logger.info?.('Loading PDF into viewer...', file && file.name);
        await viewer.loadPDF(file);
        if (typeof viewer.renderPage === 'function') {
            await viewer.renderPage(CONFIG.SETTINGS.DEFAULT_PAGE);
        }
    } catch (err) {
        logger.error?.('Error in loadPDFIntoViewer:', err && err.message);
        throw err;
    }
}

function getPagesFromViewerSafe() {
    try {
        const v = resolvePDFViewer();
        if (v && typeof v.getTotalPages === 'function') {
            const total = v.getTotalPages();
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
        // Prefer DI-provided score list when available
        try {
            let scoreList = null;
            if (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has('playTimeScoreList')) {
                scoreList = window.diContainer.get('playTimeScoreList');
            }
            scoreList = scoreList || window.PlayTimeScoreList;
            if (scoreList && typeof scoreList.refresh === 'function') {
                await scoreList.refresh();
            }
        } catch (_) {}
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

    // DI container provisioning is handled during application bootstrap (DOMContentLoaded)
    // or by the test setup. Remove legacy provisioning here to avoid duplicate
    // initialization and keep initializeFileUpload focused on file-upload concerns.

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            logger.warn(CONFIG.MESSAGES.ERROR_NO_FILE);
            return;
        }
        try {
            logger.info?.('File selected for upload:', file.name);
        } catch(_) {}
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
// TODO: This should be in the UI orchestrator
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

        // Toggle a viewer-level class so CSS can target highlighting-specific touch behavior
        try {
            const viewerContainer = document.querySelector('.pdf-viewer-container') || document.querySelector('[data-role="pdf-viewer"]');
            if (viewerContainer && viewerContainer.classList) {
                viewerContainer.classList.toggle('highlighting-active', active);
            }
        } catch (_) { /* non-fatal */ }
        
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
            // Prefer DI-provided PDF viewer when a DI container is present
            let pdfViewerInstance = null;
            try {
                if (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has('playTimePDFViewer')) {
                    pdfViewerInstance = window.diContainer.get('playTimePDFViewer');
                }
            } catch (_) {
                // ignore DI resolution errors and fall back to legacy factory
            }

            if (!pdfViewerInstance) {
                if (typeof window.createPlayTimePDFViewer === 'function') {
                    // Created from legacy window factory - assign to local only.
                    // We will expose the resolved instance to window once it's
                    // initialized below to centralize global writes.
                    pdfViewerInstance = window.createPlayTimePDFViewer(appLogger);
                } else {
                    appLogger.warn('PlayTimePDFViewer factory not available');
                }
            }

            if (pdfViewerInstance) {
                // Make the resolved instance available on window so legacy
                // helper functions and event handlers that reference
                // `window.PlayTimePDFViewer` continue to work. We only write
                // this global once here (after resolution) to centralize and
                // limit global mutations.
                try { window.PlayTimePDFViewer = pdfViewerInstance; } catch(_) {}
                // Initialize the resolved PDF viewer instance here (whether it
                // came from DI or the legacy factory) so we don't depend on
                // the presence of a window global later in the bootstrap flow.
                try {
                    if (typeof pdfViewerInstance.init === 'function') {
                        await pdfViewerInstance.init();
                        appLogger.info?.('PDF viewer initialized');
                    }
                } catch (initErr) {
                    appLogger.warn?.('PDF viewer init failed', initErr);
                }

                // Attach UI controls directly on the instance when available.
                try {
                    if (typeof pdfViewerInstance.attachUIControls === 'function') {
                        pdfViewerInstance.attachUIControls();
                        appLogger.info?.('PDF viewer UI controls attached');
                    }
                } catch (attachErr) {
                    appLogger.warn?.('Failed attaching PDF viewer UI controls', attachErr);
                }
            }
        } catch (pdfViewerError) {
            appLogger.error('Failed to create PDF viewer:', pdfViewerError.message);
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
        
    // PDF viewer was initialized (and UI controls attached) on the resolved
    // pdfViewerInstance earlier in the DI/factory resolution block. Avoid
    // re-checking window globals here to prevent duplicate logs and
    // spurious warnings in environments where DI is used.
        // Initialize refactored highlighting with dependency injection
        try {

            if (window.diContainer && typeof window.diContainer.get === 'function') {
                window.PlayTimeHighlighting = window.diContainer.get('playTimeHighlighting');
            }

            if (window.PlayTimeHighlighting) {
                // Build deps object using DI-provided database when available
                const deps = {};
                try {
                    if (diContainerInstance && typeof diContainerInstance.get === 'function' && diContainerInstance.has('database')) {
                        deps.database = diContainerInstance.get('database');
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
                    const viewer = resolvePDFViewer();
                    if (pdf && viewer && typeof viewer.loadPDF === 'function') {
                        const blob = new Blob([pdf.data], { type: 'application/pdf' });
                        await viewer.loadPDF(blob);
                        if (typeof viewer.renderPage === 'function') await viewer.renderPage(CONFIG.SETTINGS.DEFAULT_PAGE);
                    }
                } catch(errLoad) { window.logger.warn?.('SCORE_SELECTED viewer load failed', errLoad); }
            };
            window.addEventListener(SCORE_SELECTED, window.__playTimeScoreSelectedHandler);
        } catch (errHandler) { window.logger.warn?.('Failed to set SCORE_SELECTED handler', errHandler); }

        // Initialize score list component after database, viewer & highlighting are ready
        try {
            // Prefer DI-provided instance when available
            let scoreListInstance = null;
            try {
                if (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has('playTimeScoreList')) {
                    scoreListInstance = window.diContainer.get('playTimeScoreList');
                }
            } catch (_) {
                // ignore DI resolution errors here; fall back below
            }

            // Fallback to legacy global if DI wasn't available
            scoreListInstance = scoreListInstance || window.PlayTimeScoreList;

            if (scoreListInstance) {
                // Ensure database is wired
                if (typeof scoreListInstance.setDatabase === 'function') {
                    scoreListInstance.setDatabase(window.PlayTimeDB);
                }
                if (typeof scoreListInstance.init === 'function') await scoreListInstance.init();
                if (typeof scoreListInstance.refresh === 'function') await scoreListInstance.refresh();
                // Keep DI-only: do not assign score list to window here. Tests should inject into DI when needed.
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

        // Register practice plan layout command
        if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.registerHandler === 'function') {
            window.PlayTimeLayoutCommands.registerHandler('practice-plan', async (type, options) => {
                const { action = 'refresh-state', scoreId } = options;
                
                appLogger.info('Practice Plan Layout Command:', { action, scoreId });

                try {
                    switch (action) {
                        case 'refresh-state':
                        case 'check-empty':
                            // Get the practice planner instance
                            let practicePlanner = null;
                            
                            // Try multiple ways to get the practice planner
                            if (window.practicePlanner) {
                                practicePlanner = window.practicePlanner;
                            } else if (window.diContainer) {
                                practicePlanner = window.diContainer.get('practicePlanner');
                            } else if (window.PlayTimeApp && window.PlayTimeApp.practicePlanner) {
                                practicePlanner = window.PlayTimeApp.practicePlanner;
                            }
                            
                            if (!practicePlanner) {
                                appLogger.warn('Practice planner not available for state update');
                                return;
                            }

                            // Use the current score if none provided
                            const currentScoreId = scoreId || practicePlanner.currentScoreId;
                            if (!currentScoreId) {
                                appLogger.debug('No score ID available for practice plan state check');
                                return;
                            }

                            // Check if there are existing practice plans for this score
                            await practicePlanner.checkForExistingPracticePlans(currentScoreId);
                            appLogger.info('Practice plan state refreshed for score:', currentScoreId);
                            break;
                            
                        default:
                            appLogger.warn('Unknown practice plan action:', action);
                    }
                } catch (error) {
                    appLogger.error('Practice plan layout command failed:', error);
                }
            });
            appLogger.info('Practice plan layout command registered');
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
