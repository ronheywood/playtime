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
        SUCCESS_FILE_SELECTED: 'Selected: ',
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
// TODO: Add parameter validation for pdfViewer
function updatePDFViewerStatus(pdfViewer, message, isError = false) {
    if (!pdfViewer) return;
    
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

// File Upload Handler - Refactored with better error handling and reusability
// MAJOR ISSUE: This function violates Single Responsibility Principle!
// It handles: file validation, database saving, PDF loading, UI updates
// TODO: Break into smaller functions:
//   - handleFileSelection(file, database, pdfViewer)
//   - validateAndSaveFile(file, database)
//   - loadPDFIntoViewer(file, pdfViewer)
//   - updateFileUploadUI(filename, pdfViewer)
async function initializeFileUpload(database = null) {
    // Use configuration object for selectors instead of hardcoded strings
    const fileInput = document.querySelector(CONFIG.SELECTORS.FILE_INPUT);
    const pdfViewer = document.querySelector(CONFIG.SELECTORS.PDF_VIEWER);
    
    if (!fileInput || !pdfViewer) {
        // ISSUE: Inconsistent error handling - some places use warn, others error
        logger.warn(CONFIG.MESSAGES.ERROR_ELEMENTS_NOT_FOUND);
        return;
    }

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        
        if (!file) {
            logger.warn(CONFIG.MESSAGES.ERROR_NO_FILE);
            return;
        }
        
        if (isValidPDFFile(file)) {
            updatePDFViewerStatus(pdfViewer, CONFIG.MESSAGES.SUCCESS_FILE_SELECTED + file.name, false);
            
            // Save to database if available (use new DB abstraction)
            if (database && database.save) {
                try {
                    await database.save(file);
                    // Refresh the score list to show the newly added PDF using the score list component
                    if (window.PlayTimeScoreList) {
                        await window.PlayTimeScoreList.refresh();
                    }
                } catch (error) {
                    // Using consistent error logging for database failures
                    logger.error('Failed to save PDF to database:', error);
                }
            }
            
            // Load PDF into viewer for display
            // TODO: Extract to separate function
            if (window.PlayTimePDFViewer && window.PlayTimePDFViewer.loadPDF) {
                try {
                    logger.loading('Loading PDF into viewer...');
                    await window.PlayTimePDFViewer.loadPDF(file);
                    
                    // Use configuration for default page
                    await window.PlayTimePDFViewer.renderPage(CONFIG.SETTINGS.DEFAULT_PAGE);
                    logger.info('PDF successfully loaded and rendered');
                } catch (error) {
                    logger.error('Failed to load PDF into viewer:', error);
                    updatePDFViewerStatus(pdfViewer, 'Error loading PDF: ' + error.message, true);
                }
            } else {
                logger.warn(CONFIG.MESSAGES.ERROR_PDF_VIEWER_UNAVAILABLE);
            }
        } else {
            updatePDFViewerStatus(pdfViewer, CONFIG.MESSAGES.ERROR_INVALID_FILE, true);
        }
    });
    
    // File upload handler initialized
}

// Page Navigation Handler - Connect UI buttons to PDF viewer
// TODO: Add JSDoc type documentation
// TODO: Add more thorough parameter validation (check for required methods)
// TODO: Use configuration object for button selectors
/**
 * GOOD: Function has single responsibility and clear purpose
 * GOOD: Proper error handling with try-catch blocks
 * IMPROVEMENT NEEDED: Parameter validation could be more thorough
 * IMPROVEMENT NEEDED: DOM selectors should be configurable
 */
function initializePageNavigation(pdfViewer = null) {
    // Use configuration for button selectors
    const prevPageBtn = document.querySelector(CONFIG.SELECTORS.PREV_BUTTON);
    const nextPageBtn = document.querySelector(CONFIG.SELECTORS.NEXT_BUTTON);
    
    if (!prevPageBtn || !nextPageBtn) {
        logger.warn('Page navigation buttons not found');
        return;
    }
    
    // TODO: Add more specific validation for required methods
    if (!pdfViewer || !pdfViewer.prevPage || !pdfViewer.nextPage) {
        logger.warn(CONFIG.MESSAGES.ERROR_NAVIGATION_UNAVAILABLE);
        return;
    }
    
    // Add event listeners for page navigation
    // GOOD: Proper async/await usage and error handling
    prevPageBtn.addEventListener('click', async () => {
        try {
            await pdfViewer.prevPage();
        } catch (error) {
            logger.error('Failed to navigate to previous page:', error);
        }
    });
    
    nextPageBtn.addEventListener('click', async () => {
        try {
            await pdfViewer.nextPage();
        } catch (error) {
            logger.error('Failed to navigate to next page:', error);
        }
    });
    
    logger.info('Page navigation buttons initialized');
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

// Initialize the application when DOM is ready
// ISSUE: This function also does too much - initialization AND UI creation
// TODO: Split into initializeApplication() and createDevStatusElement()
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
        
        // Application ready
        
        // MAJOR ISSUE: Inline CSS styles mixed with JavaScript logic!
        // TODO: Move all styles to CSS classes in external stylesheet
        // TODO: Extract this to separate function createDevStatusElement()
        const statusElement = document.createElement('div');
        statusElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 150px;
            background: #ff6b35;
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 9999;
        `;
        // TODO: Move this text to configuration/constants
        statusElement.textContent = '⚠️ Implementation Needed - Check Console';
        document.body.appendChild(statusElement);
        
    } catch (error) {
        logger.error('Failed to initialize PlayTime:', error);
    }
});

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
