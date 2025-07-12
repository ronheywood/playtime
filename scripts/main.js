// PlayTime Main Application Entry Point
// This file will be implemented during Outside-In development

console.log('🎵 PlayTime application loading...');

// Constants for file types and messages
const FILE_TYPES = {
    PDF: 'application/pdf'
};

const MESSAGES = {
    ERROR_INVALID_FILE: 'Error: Please select a PDF file',
    SUCCESS_FILE_SELECTED: 'Selected: ',
    ERROR_NO_FILE: 'No file selected'
};

// File validation helper
function isValidPDFFile(file) {
    return file && file.type === FILE_TYPES.PDF;
}

// UI update helper for better extensibility
function updatePDFViewerStatus(pdfViewer, message, isError = false) {
    if (!pdfViewer) return;
    
    pdfViewer.textContent = message;
    // Future: could add CSS classes for styling
    if (isError) {
        pdfViewer.setAttribute('data-status', 'error');
    } else {
        pdfViewer.setAttribute('data-status', 'success');
    }
}

// File Upload Handler - Refactored with better error handling and reusability
async function initializeFileUpload() {
    const fileInput = document.querySelector('#pdf-upload');
    const pdfViewer = document.querySelector('.pdf-viewer-container');
    
    if (!fileInput || !pdfViewer) {
        console.warn('❌ File upload elements not found');
        return;
    }

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        
        if (!file) {
            console.warn('❌ No file selected');
            return;
        }
        
        if (isValidPDFFile(file)) {
            updatePDFViewerStatus(pdfViewer, MESSAGES.SUCCESS_FILE_SELECTED + file.name, false);
        } else {
            updatePDFViewerStatus(pdfViewer, MESSAGES.ERROR_INVALID_FILE, true);
        }
    });
    
    console.log('✅ File upload handler initialized');
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 PlayTime application starting...');
    
    try {
        // Initialize file upload handler first (driven by failing tests)
        await initializeFileUpload();
        
        // Initialize all modules (placeholders for now)
        await window.PlayTimeDB.init();
        await window.PlayTimePDFViewer.init();
        await window.PlayTimeHighlighting.init();
        
        console.log('✅ PlayTime application ready!');
        console.log('📝 Implementation needed - use failing tests as guidance');
        
        // Show status in the UI
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
        statusElement.textContent = '⚠️ Implementation Needed - Check Console';
        document.body.appendChild(statusElement);
        
    } catch (error) {
        console.error('❌ Failed to initialize PlayTime:', error);
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayTime: 'placeholder' };
}
