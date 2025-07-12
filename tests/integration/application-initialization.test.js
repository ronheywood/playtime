// Integration Test: Application Initialization
// Tests that the main application JavaScript loads and initializes correctly

describe('Application Initialization', () => {
    beforeEach(() => {
        // Clear any existing modules
        jest.resetModules();
        
        // Mock console methods to avoid noise in tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        
        // Setup basic DOM structure
        document.body.innerHTML = `
            <input type="file" id="pdf-upload" accept="application/pdf">
            <div class="pdf-viewer-container"></div>
        `;
        
        // Mock the PlayTime modules that main.js depends on
        global.window.PlayTimeDB = { init: jest.fn().mockResolvedValue(true) };
        global.window.PlayTimePDFViewer = { init: jest.fn().mockResolvedValue(true) };
        global.window.PlayTimeHighlighting = { init: jest.fn().mockResolvedValue(true) };
    });
    
    afterEach(() => {
        // Restore console methods
        console.log.mockRestore();
        console.warn.mockRestore();
        console.error.mockRestore();
        
        // Clean up DOM
        document.body.innerHTML = '';
        
        // Clean up global objects
        delete global.window.PlayTimeDB;
        delete global.window.PlayTimePDFViewer;
        delete global.window.PlayTimeHighlighting;
    });
    
    test('should initialize file upload handler when DOM is ready', async () => {
        // Arrange
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        // Act - Load and execute the main application script
        const fs = require('fs');
        const path = require('path');
        const mainJsPath = path.join(__dirname, '../../scripts/main.js');
        const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
        
        // Execute the main.js content
        eval(mainJsContent);
        
        // Trigger DOMContentLoaded event to initialize the app
        const domContentLoadedEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domContentLoadedEvent);
        
        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Now test the file upload functionality
        const mockFile = new File(['mock pdf content'], 'test-file.pdf', { type: 'application/pdf' });
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: false,
        });
        
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Assert
        expect(pdfViewer.textContent).toContain('Selected: test-file.pdf');
    });
    
    test('should handle missing DOM elements gracefully', async () => {
        // Arrange - Remove the required elements
        document.body.innerHTML = '<div>No upload elements</div>';
        
        // Act - Load and execute the main application script
        const fs = require('fs');
        const path = require('path');
        const mainJsPath = path.join(__dirname, '../../scripts/main.js');
        const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
        
        // Execute the main.js content
        eval(mainJsContent);
        
        // Trigger DOMContentLoaded event
        const domContentLoadedEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domContentLoadedEvent);
        
        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Assert - Should not throw errors, console.warn should be called
        expect(console.warn).toHaveBeenCalledWith('❌ File upload elements not found');
    });
});
