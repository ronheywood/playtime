// Test Constants - Shared across all integration tests
// Extracted magic numbers with clear explanations

const TEST_CONSTANTS = {
    // PDF Document Properties
    PDF_PAGE_SIZE: { width: 595, height: 842 }, // Standard A4 page dimensions in points
    DEFAULT_DOC_PAGES: 3,                       // Standard test document page count
    DEFAULT_FILE_NAME: 'test-score.pdf',        // Standard test file name
    MOCK_BUFFER_SIZE: 1024,                     // Mock PDF file buffer size
    
    // Canvas and UI Properties
    CANVAS_SIZE: { width: 800, height: 600 },   // Mock canvas container dimensions
    
    // Page Navigation
    FIRST_PAGE: 1,                              // First page number
    SECOND_PAGE: 2,                             // Second page number  
    THIRD_PAGE: 3,                              // Third page number
    
    // File Types
    PDF_MIME_TYPE: 'application/pdf',           // PDF MIME type for validation
    
    // Test Timeouts (in milliseconds)
    DEFAULT_TIMEOUT: 5000,                      // Default test timeout
    ASYNC_OPERATION_DELAY: 100,                 // Delay for async operations in tests
    
    // Error Messages
    ERROR_MESSAGES: {
        NO_PDF_LOADED: 'No PDF loaded',
        INVALID_PDF: 'Invalid PDF',
        FILE_NOT_FOUND: 'File not found',
        VIEWER_NOT_AVAILABLE: 'PDF Viewer not available'
    }
};

module.exports = TEST_CONSTANTS;
