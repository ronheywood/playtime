// PlayTime Main Application Entry Point
// This file will be implemented during Outside-In development

/**
 * CODE REVIEW FINDINGS:
 * 
 * 🔧 REFACTORING OPPORTUNITIES:
 * 1. Magic numbers and hardcoded values scattered throughout
 * 2. DOM selectors are hardcoded - should be configurable
 * 3. ✅ Error handling inconsistency (console.warn vs console.error) - Now using centralized logger
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
            try { window.__playTimeLastScoreSelectedId = id; window.__playTimeLastScoreSelectedAt = Date.now(); } catch(_) {}
        } catch (e) { (window.logger||console).warn('Failed dispatching SCORE_SELECTED after save', e); }
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

    const CONST = (typeof window !== 'undefined' && window.PlayTimeConstants) ? window.PlayTimeConstants : (function(){ try { return require('./constants'); } catch(_) { return { EVENTS: { CONFIDENCE_CHANGED: 'playtime:confidence-changed' } }; } })();
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            setPressed(btn);
            const color = btn.getAttribute('data-color');
            // Publish confidence change event for decoupled subscribers
            try {
                const ev = new CustomEvent(CONST.EVENTS.CONFIDENCE_CHANGED, { detail: { color } });
                window.dispatchEvent(ev);
            } catch (_) {
                try { document.dispatchEvent(new CustomEvent(CONST.EVENTS.CONFIDENCE_CHANGED, { detail: { color } })); } catch (_) {}
            }
        });
    });
}

// Initialize the application when DOM is ready
// ISSUE: This function also does too much - initialization AND UI creation
// TODO: Split into initializeApplication() and createDevStatusElement()
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
document.addEventListener('DOMContentLoaded', async function() {
    // Application starting
    
    try {
        // Initialize modules with logger dependency injection
        // Get logger from window (loaded from logger.js script tag)
        const appLogger = window.logger || console;
        
        // Create module instances with injected functions
        // DB: allow test injection, fallback to IndexedDBDatabase factory if not provided
        if (typeof window.createPlayTimeDB === 'function') {
            window.PlayTimeDB = window.createPlayTimeDB(appLogger);
        } else {
            // Fallback: dynamically import IndexedDBDatabase (ES module) and use the factory
            const module = await import('../db/IndexedDBDatabase.js');
            if (typeof module.createIndexedDBDatabase === 'function') {
                window.PlayTimeDB = module.createIndexedDBDatabase(appLogger);
            } else {
                throw new Error('IndexedDBDatabase module does not export a usable factory');
            }
        }

        if (typeof window.createPlayTimePDFViewer === 'function') {
            window.PlayTimePDFViewer = window.createPlayTimePDFViewer(appLogger);
        }
        if (typeof window.createPlayTimeScoreList === 'function') {
            window.PlayTimeScoreList = window.createPlayTimeScoreList(null, appLogger); // Database will be set after initialization
        }
        if (typeof window.createPlayTimePracticePlanner === 'function') {
            window.PlayTimePracticePlanner = window.createPlayTimePracticePlanner(appLogger, window.PlayTimeDB, window.PlayTimeHighlighting);
        }
        // PlayTimeHighlighting doesn't need refactoring yet - keeping as is
        
        // Initialize file upload handler first (driven by failing tests)
        await initializeFileUpload(window.PlayTimeDB);
        
        // Initialize all modules (placeholders for now)
        // TODO: Add error handling for each module initialization
        await window.PlayTimeDB.init();
        
        // Initialize PDF viewer early so highlighting + rehydration have a ready viewer
        await window.PlayTimePDFViewer.init();
        // Attach navigation + zoom UI controls now that viewer is initialized
        if (window.PlayTimePDFViewer && typeof window.PlayTimePDFViewer.attachUIControls === 'function') {
            try {
                window.PlayTimePDFViewer.attachUIControls();
                (window.logger || console).info('PDF viewer UI controls attached');
            } catch (e) {
                (window.logger || console).warn('Failed attaching PDF viewer UI controls', e);
            }
        }
        // Initialize refactored highlighting with dependency injection
        if (window.PlayTimeHighlighting) {
            await window.PlayTimeHighlighting.init({}, appLogger, window.PlayTimeConfidence, window.PlayTimeConstants);
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
                try { window.PlayTimeCurrentScoreId = pdfId; } catch(_) {}
                try { updateCurrentScoreTitleDisplay(detail.name); } catch(_) {}
                // Load PDF binary & render first page; highlight will rehydrate after PAGE_CHANGED
                try {
                    const pdf = await window.PlayTimeDB.get(pdfId);
                    if (pdf && window.PlayTimePDFViewer) {
                        const blob = new Blob([pdf.data], { type: 'application/pdf' });
                        await window.PlayTimePDFViewer.loadPDF(blob);
                        await window.PlayTimePDFViewer.renderPage(CONFIG.SETTINGS.DEFAULT_PAGE);
                    }
                } catch(errLoad) { (window.logger || console).warn('SCORE_SELECTED viewer load failed', errLoad); }
            };
            window.addEventListener(SCORE_SELECTED, window.__playTimeScoreSelectedHandler);
        } catch (errHandler) { (window.logger || console).warn('Failed to set SCORE_SELECTED handler', errHandler); }

        // Initialize score list component after database, viewer & highlighting are ready
    if (window.PlayTimeScoreList) { window.PlayTimeScoreList.setDatabase(window.PlayTimeDB); await window.PlayTimeScoreList.init(); await window.PlayTimeScoreList.refresh(); }
        
        // Initialize practice planner component
        if (window.PlayTimePracticePlanner) { 
            await window.PlayTimePracticePlanner.init(); 
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
                        (window.logger || console).info('Practice mode: Entered practice planning mode');
                        break;
                    case 'exit':
                        // Remove data attribute to return to normal mode
                        if (viewerSection) {
                            viewerSection.removeAttribute('data-practice-mode');
                        }
                        (window.logger || console).info('Practice mode: Exited practice planning mode');
                        break;
                    default:
                        (window.logger || console).warn('Unknown practice mode action:', options.action);
                }
            });
            (window.logger || console).info('Practice mode layout command handler registered');
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

    // Initialize focus mode with command architecture (replaces procedural approach)
        if (typeof window.createPlayTimeFocusModeCommands === 'function') {
            window.PlayTimeFocusModeCommands = window.createPlayTimeFocusModeCommands();
            if (window.PlayTimeFocusModeCommands && window.PlayTimeFocusModeCommands.initializeFocusModeCommands) {
                window.PlayTimeFocusModeCommands.initializeFocusModeCommands();
            }
        }
        
        // Application ready
    } catch (error) {
        logger.error('Failed to initialize PlayTime:', error);
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
