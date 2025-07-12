// Integration Test: File Upload Handler
// Tests the interaction between file input and PDF viewer display

describe('File Upload Integration', () => {
    let mockDatabase;
    
    beforeEach(() => {
        // Mock File constructor (this is already available in JSDOM but we override for consistency)
        global.File = class File {
            constructor(chunks, filename, options = {}) {
                this.name = filename;
                this.type = options.type || 'application/octet-stream';
                this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
            }
        };
        
        // Set up minimal database for integration testing
        const savedPdfs = [];
        mockDatabase = {
            savePDF: function(file) {
                savedPdfs.push({
                    name: file.name,
                    type: file.type,
                    size: file.size
                });
                return Promise.resolve();
            },
            getAllPDFs: function() {
                return Promise.resolve(savedPdfs);
            },
            init: function() {
                return Promise.resolve();
            }
        };
        
        // Make database available globally for main.js
        global.window.PlayTimeDB = mockDatabase;
        
        // Load and initialize main.js for integration testing
        const path = require('path');
        const fs = require('fs');
        const mainJsPath = path.join(__dirname, '../../scripts/main.js');
        const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
        eval(mainJsContent);
        
        // Initialize the file upload handler with dependency injection
        initializeFileUpload(mockDatabase);
    });
    
    afterEach(() => {
        // Clean up
        delete global.File;
        delete global.window.PlayTimeDB;
        mockDatabase = null;
    });
    
    test('should display filename in PDF viewer when file is selected', () => {
        // Arrange
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        // Act - Use the real main.js file upload handler
        const mockFile = new File(['mock pdf content'], 'test-score.pdf', { type: 'application/pdf' });
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Assert
        expect(pdfViewer.textContent).toContain('test-score.pdf');
    });
    
    test('should handle PDF file type validation', () => {
        // Arrange
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        // Act - Use the real main.js file upload handler with invalid file
        const invalidFile = new File(['not a pdf'], 'document.txt', { type: 'text/plain' });
        Object.defineProperty(fileInput, 'files', {
            value: [invalidFile],
            writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Assert
        expect(pdfViewer.textContent).toContain('Error: Please select a PDF file');
    });
    
    test('should clear previous selection when new file is chosen', () => {
        // Arrange
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        // Set up initial state
        pdfViewer.textContent = 'Previous content';
        
        // Act - Use the real main.js file upload handler
        const newFile = new File(['new pdf'], 'new-score.pdf', { type: 'application/pdf' });
        Object.defineProperty(fileInput, 'files', {
            value: [newFile],
            writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Assert - Check the status message element (real implementation)
        const statusElement = pdfViewer.querySelector('.status-message');
        expect(statusElement.textContent).toBe('Selected: new-score.pdf');
        expect(statusElement.getAttribute('data-status')).toBe('success');
    });
    
    test('should save uploaded PDF file to database', async () => {
        // Arrange
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        // Act - Use the actual file upload handler from main.js
        const mockFile = new File(['mock pdf content'], 'integration-test.pdf', { type: 'application/pdf' });
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Allow time for async database operations
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Assert - Check if PDF was saved to database
        const savedPdfs = await window.PlayTimeDB.getAllPDFs();
        expect(savedPdfs).toHaveLength(1);
        expect(savedPdfs[0].name).toBe('integration-test.pdf');
        expect(savedPdfs[0].type).toBe('application/pdf');
    });
});
