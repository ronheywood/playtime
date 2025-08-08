// Integration Test: Application Initialization
// Tests that the main application JavaScript loads and initializes correctly

// Import shared test utilities
const TEST_CONSTANTS = require('../helpers/test-constants');
const TestHelpers = require('../helpers/test-helpers');
const { CONFIG } = require('../../scripts/main');

describe('Application Initialization', () => {
    beforeEach(() => {
        jest.resetModules();
        
        // Mock console methods to avoid noise in tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        
        // Setup file upload DOM structure
        TestHelpers.setupFileUploadDOM();
        
        // Setup main.js mocks
        TestHelpers.setupMainJsMocks();
    });
    
    afterEach(() => {
        TestHelpers.cleanupLoggerMocks();
        
        document.body.innerHTML = '';
        
        delete global.window.PlayTimeDB;
        delete global.window.PlayTimePDFViewer;
        delete global.window.PlayTimeHighlighting;
    });
    
    test('should initialize file upload handler when DOM is ready', async () => {
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        TestHelpers.setupMainJSIntegration();
        
        // Trigger DOMContentLoaded event to initialize the app
        const domContentLoadedEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domContentLoadedEvent);
        
        await TestHelpers.waitFor();
        
        const mockFile = TestHelpers.createMockPDFFile('test-file.pdf');
        TestHelpers.simulateFileUpload(fileInput, mockFile);
        
        expect(pdfViewer.textContent).toContain(CONFIG.MESSAGES.SUCCESS_FILE_SELECTED + 'test-file.pdf');
    });
    
    test('should handle missing DOM elements gracefully', async () => {
        document.body.innerHTML = '<div>No upload elements</div>';
        
        TestHelpers.setupMainJSIntegration();
        
        const domContentLoadedEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domContentLoadedEvent);
        
        await TestHelpers.waitFor();
        
        expect(global.logger.warn).toHaveBeenCalledWith('Required elements not found');
    });
});
