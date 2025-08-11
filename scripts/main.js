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
        PREV_BUTTON: '#prev-page-btn',
        NEXT_BUTTON: '#next-page-btn',
        STATUS_MESSAGE: '.status-message',
        SCORES_LIST: '#scores-list',
        CURRENT_SCORE_TITLE: '[data-role="current-score-title"]'
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
        await database.save(file, { pages: pagesMeta });
        if (window.PlayTimeScoreList && typeof window.PlayTimeScoreList.refresh === 'function') {
            await window.PlayTimeScoreList.refresh();
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

// Page Navigation Handler - Connect UI buttons to PDF viewer
/**
 * Initialize prev/next navigation buttons for the PDF viewer.
 * @param {{ prevPage: Function, nextPage: Function }} pdfViewer - Viewer with navigation methods
 * @returns {void}
 */
function initializePageNavigation(pdfViewer = null) {
    // Use configuration for button selectors
    const prevPageBtn = document.querySelector(CONFIG.SELECTORS.PREV_BUTTON);
    const nextPageBtn = document.querySelector(CONFIG.SELECTORS.NEXT_BUTTON);
    
    // resolve logger safely (supports Node tests and browser)
    const log = (typeof window !== 'undefined' && window.logger)
        ? window.logger
        : (typeof logger !== 'undefined' ? logger : console);
    
    if (!prevPageBtn || !nextPageBtn) {
        log.warn('Page navigation buttons not found');
        return;
    }
    
    if (!pdfViewer || !pdfViewer.prevPage || !pdfViewer.nextPage) {
        log.warn(CONFIG.MESSAGES.ERROR_NAVIGATION_UNAVAILABLE);
        return;
    }
    
    prevPageBtn.addEventListener('click', async () => {
        try {
            await pdfViewer.prevPage();
        } catch (error) {
            log.error('Failed to navigate to previous page:', error);
        }
    });
    
    nextPageBtn.addEventListener('click', async () => {
        try {
            await pdfViewer.nextPage();
        } catch (error) {
            log.error('Failed to navigate to next page:', error);
        }
    });
    
    log.info('Page navigation buttons initialized');
}

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

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            setPressed(btn);
            const color = btn.getAttribute('data-color');
            // Optional: notify highlighting module if it exposes an API
            if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.setActiveColor === 'function') {
                try { window.PlayTimeHighlighting.setActiveColor(color); } catch (_) {}
            }
        });
    });
}

// Focus Mode (zoom into a selected highlight via CSS transform)
function initializeFocusMode() {
    const focusBtn = document.getElementById('focus-section-btn');
    const exitBtn = document.getElementById('exit-focus-btn');
    const toggleBtn = document.getElementById('focus-mode-toggle'); // newly added quick toggle
    const viewerContainer = document.querySelector('.pdf-viewer-container');
    const canvas = document.getElementById('pdf-canvas');
    if (!focusBtn || !exitBtn || !viewerContainer || !canvas) return;

    function clearHighlightSelection() {
        document.querySelectorAll('.highlight.selected').forEach(h => h.classList.remove('selected'));
    }

    viewerContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains('highlight')) {
            clearHighlightSelection();
            target.classList.add('selected');
            focusBtn.style.display = '';
            if (toggleBtn) toggleBtn.disabled = false;
        }
    });

    function applyFallbackFocus() {
        const scaleFactor = 1.5;
        if (canvas.width > 0) canvas.width = Math.round(canvas.width * scaleFactor);
        if (canvas.height > 0) canvas.height = Math.round(canvas.height * scaleFactor);
        if (!canvas.style.transform) canvas.style.transform = 'none';
        canvas.style.transformOrigin = 'top left';
        canvas.style.transform = `scale(${scaleFactor})`;
        canvas.style.transition = 'transform 0.15s ease';
    }

    function enterFocusMode() {
        const selected = document.querySelector('.highlight.selected');
        canvas.setAttribute('data-focus-mode', 'active');
        if (!selected) {
            applyFallbackFocus();
        } else {
            const rect = selected.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const viewerRect = viewerContainer.getBoundingClientRect();
            const left = rect.width === 0 && rect.height === 0 ? parseFloat(selected.style.left) || 0 : rect.left - canvasRect.left;
            const top = rect.width === 0 && rect.height === 0 ? parseFloat(selected.style.top) || 0 : rect.top - canvasRect.top;
            const hWidth = rect.width || parseFloat(selected.style.width) || 1;
            const hHeight = rect.height || parseFloat(selected.style.height) || 1;
            const containerW = viewerRect.width || viewerContainer.clientWidth || canvas.width || 800;
            const containerH = viewerRect.height || viewerContainer.clientHeight || canvas.height || 600;
            const scale = Math.min(containerW / hWidth, containerH / hHeight) * 0.9;
            const scaledHighlightW = hWidth * scale;
            const scaledHighlightH = hHeight * scale;
            const offsetX = (containerW - scaledHighlightW) / 2 - (left * scale);
            const offsetY = (containerH - scaledHighlightH) / 2 - (top * scale);
            if (!canvas.style.transform) canvas.style.transform = 'none';
            canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
            canvas.style.transition = 'transform 0.25s ease';
        }
        focusBtn.style.display = 'none';
        exitBtn.style.display = '';
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-pressed', 'true');
            toggleBtn.classList.add('active');
        }
    }

    function exitFocusMode() {
        canvas.removeAttribute('data-focus-mode');
        canvas.style.transform = '';
        exitBtn.style.display = 'none';
        focusBtn.style.display = '';
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-pressed', 'false');
            toggleBtn.classList.remove('active');
        }
    }

    focusBtn.addEventListener('click', enterFocusMode);
    exitBtn.addEventListener('click', exitFocusMode);
    if (toggleBtn) {
        // Disabled until selection or explicit use; allow fallback regardless
        toggleBtn.addEventListener('click', () => {
            const active = canvas.getAttribute('data-focus-mode') === 'active';
            if (active) {
                exitFocusMode();
            } else {
                enterFocusMode();
            }
        });
    }

    if (!focusBtn.style.display) focusBtn.style.display = 'none';
    exitBtn.style.display = 'none';
    if (toggleBtn) toggleBtn.disabled = false;
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
        // PlayTimeHighlighting doesn't need refactoring yet - keeping as is
        
        // Initialize file upload handler first (driven by failing tests)
        await initializeFileUpload(window.PlayTimeDB);
        
        // Initialize all modules (placeholders for now)
        // TODO: Add error handling for each module initialization
        await window.PlayTimeDB.init();
        
        // Initialize score list component after database is ready
        if (window.PlayTimeScoreList) {
            window.PlayTimeScoreList.setDatabase(window.PlayTimeDB);
            await window.PlayTimeScoreList.init();
            await window.PlayTimeScoreList.refresh();
        }
        
        await window.PlayTimePDFViewer.init();
        if (window.PlayTimeHighlighting) {
            await window.PlayTimeHighlighting.init();
        }
        
        // Initialize page navigation buttons
        initializePageNavigation(window.PlayTimePDFViewer);
        
        // Initialize confidence controls
        initializeConfidenceControls();
        // Initialize focus mode (after highlights & canvas exist)
        initializeFocusMode();
        
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
        initializeFileUpload,
        initializePageNavigation
    };
}
