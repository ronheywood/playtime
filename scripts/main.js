// PlayTime Main Application Entry Point
// This file will be implemented during Outside-In development

/**
 * CODE REVIEW FINDINGS:
 * 
 * 🔧 REFACTORING OPPORTUNITIES:
 * 1. Magic numbers and hardcoded values scattered throughout
 * 2. DOM selectors are hardcoded - should be configurable
 * 3. Error handling inconsistency (console.warn vs console.error)
 * 4. Functions violate Single Responsibility Principle
 * 5. Missing input validation and type documentation
 * 6. Inline CSS styles mixed with JavaScript logic
 * 
 * 📋 SPECIFIC ISSUES TO ADDRESS:
 * - Extract configuration objects for selectors and constants
 * - Create consistent error handling utility
 * - Break down large functions (especially initializeFileUpload)
 * - Add JSDoc type documentation
 * - Move UI styles to CSS classes
 * - Add more thorough parameter validation
 */

// Constants for file types and messages
// TODO: Move to configuration object to avoid magic strings
const FILE_TYPES = {
    PDF: 'application/pdf'
};

const MESSAGES = {
    ERROR_INVALID_FILE: 'Error: Please select a PDF file',
    SUCCESS_FILE_SELECTED: 'Selected: ',
    ERROR_NO_FILE: 'No file selected'
};

// TODO: Add DOM selector configuration object
// const SELECTORS = {
//     FILE_INPUT: '#pdf-upload',
//     PDF_VIEWER: '.pdf-viewer-container',
//     PREV_BUTTON: '#prev-page-btn',
//     NEXT_BUTTON: '#next-page-btn'
// };

// File validation helper
// TODO: Add more comprehensive validation (file size, MIME type verification)
function isValidPDFFile(file) {
    return file && file.type === FILE_TYPES.PDF;
}

// UI update helper for better extensibility
// ISSUE: This function does too much - creating elements AND updating content
// TODO: Split into separate functions for element creation and content updates
// TODO: Add parameter validation for pdfViewer
function updatePDFViewerStatus(pdfViewer, message, isError = false) {
    if (!pdfViewer) return;
    
    // Find or create a status element instead of replacing all content
    let statusElement = pdfViewer.querySelector('.status-message');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'status-message';
        pdfViewer.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    
    // Future: could add CSS classes for styling
    // TODO: Use CSS classes instead of data attributes for better styling control
    if (isError) {
        statusElement.setAttribute('data-status', 'error');
    } else {
        statusElement.setAttribute('data-status', 'success');
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
    // TODO: Use configuration object for selectors instead of hardcoded strings
    const fileInput = document.querySelector('#pdf-upload');
    const pdfViewer = document.querySelector('.pdf-viewer-container');
    
    if (!fileInput || !pdfViewer) {
        // ISSUE: Inconsistent error handling - some places use warn, others error
        console.warn('❌ File upload elements not found');
        return;
    }

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        
        if (!file) {
            console.warn('❌ No file selected');
            return;
        }
        
        if (isValidPDFFile(file)) {
            updatePDFViewerStatus(pdfViewer, MESSAGES.SUCCESS_FILE_SELECTED + file.name, false);
            
            // Save to database if available
            // TODO: Extract to separate function for better testability
            if (database && database.savePDF) {
                try {
                    await database.savePDF(file);
                } catch (error) {
                    // ISSUE: Using console.warn for database errors but console.error for PDF errors
                    console.warn('❌ Failed to save PDF to database:', error);
                }
            }
            
            // Load PDF into viewer for display
            // TODO: Extract to separate function
            if (window.PlayTimePDFViewer && window.PlayTimePDFViewer.loadPDF) {
                try {
                    console.log('🔄 Loading PDF into viewer...');
                    await window.PlayTimePDFViewer.loadPDF(file);
                    
                    // Auto-render first page
                    // TODO: Make default page configurable
                    await window.PlayTimePDFViewer.renderPage(1);
                    console.log('✅ PDF successfully loaded and rendered');
                } catch (error) {
                    console.error('❌ Failed to load PDF into viewer:', error);
                    updatePDFViewerStatus(pdfViewer, 'Error loading PDF: ' + error.message, true);
                }
            } else {
                console.warn('❌ PDF Viewer not available');
            }
        } else {
            updatePDFViewerStatus(pdfViewer, MESSAGES.ERROR_INVALID_FILE, true);
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
    // TODO: Extract selectors to configuration
    const prevPageBtn = document.querySelector('#prev-page-btn');
    const nextPageBtn = document.querySelector('#next-page-btn');
    
    if (!prevPageBtn || !nextPageBtn) {
        console.warn('❌ Page navigation buttons not found');
        return;
    }
    
    // TODO: Add more specific validation for required methods
    if (!pdfViewer || !pdfViewer.prevPage || !pdfViewer.nextPage) {
        console.warn('❌ PDF Viewer navigation methods not available');
        return;
    }
    
    // Add event listeners for page navigation
    // GOOD: Proper async/await usage and error handling
    prevPageBtn.addEventListener('click', async () => {
        try {
            await pdfViewer.prevPage();
        } catch (error) {
            console.error('❌ Failed to navigate to previous page:', error);
        }
    });
    
    nextPageBtn.addEventListener('click', async () => {
        try {
            await pdfViewer.nextPage();
        } catch (error) {
            console.error('❌ Failed to navigate to next page:', error);
        }
    });
    
    console.log('✅ Page navigation buttons initialized');
}

// Initialize the application when DOM is ready
// ISSUE: This function also does too much - initialization AND UI creation
// TODO: Split into initializeApplication() and createDevStatusElement()
document.addEventListener('DOMContentLoaded', async function() {
    // Application starting
    
    try {
        // Initialize file upload handler first (driven by failing tests)
        await initializeFileUpload(window.PlayTimeDB);
        
        // Initialize all modules (placeholders for now)
        // TODO: Add error handling for each module initialization
        await window.PlayTimeDB.init();
        await window.PlayTimePDFViewer.init();
        await window.PlayTimeHighlighting.init();
        
        // Initialize page navigation buttons
        initializePageNavigation(window.PlayTimePDFViewer);
        
        // Application ready
        
        // MAJOR ISSUE: Inline CSS styles mixed with JavaScript logic!
        // TODO: Move all styles to CSS classes in external stylesheet
        // TODO: Extract this to separate function createDevStatusElement()
        const statusElement = document.createElement('div');
        statusElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
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
        console.error('❌ Failed to initialize PlayTime:', error);
    }
});

// Export for testing
// TODO: Export actual functions for better testability instead of placeholder
// TODO: Consider using ES6 modules (export/import) instead of CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        PlayTime: 'placeholder',
        // TODO: Export these functions for testing:
        // isValidPDFFile,
        // updatePDFViewerStatus,
        // initializeFileUpload,
        // initializePageNavigation
    };
}
