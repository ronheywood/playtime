// Integration Test: File Upload Handler
// Tests the interaction between file input and PDF viewer display

describe('File Upload Integration', () => {
    
    beforeEach(() => {
        // Mock File constructor (this is already available in JSDOM but we override for consistency)
        global.File = class File {
            constructor(chunks, filename, options = {}) {
                this.name = filename;
                this.type = options.type || 'application/octet-stream';
                this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
            }
        };
    });
    
    afterEach(() => {
        // Clean up
        delete global.File;
    });
    
    test('should display filename in PDF viewer when file is selected', () => {
        // Arrange
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        // Create a simple file upload handler (this is what we need to implement)
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                pdfViewer.textContent = `Selected: ${file.name}`;
            }
        });
        
        // Act
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
        let errorShown = false;
        
        // File upload handler with validation
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                if (file.type === 'application/pdf') {
                    pdfViewer.textContent = `Selected: ${file.name}`;
                } else {
                    pdfViewer.textContent = 'Error: Please select a PDF file';
                    errorShown = true;
                }
            }
        });
        
        // Act - try to upload a non-PDF file
        const invalidFile = new File(['not a pdf'], 'document.txt', { type: 'text/plain' });
        Object.defineProperty(fileInput, 'files', {
            value: [invalidFile],
            writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Assert
        expect(pdfViewer.textContent).toContain('Error: Please select a PDF file');
        expect(errorShown).toBe(true);
    });
    
    test('should clear previous selection when new file is chosen', () => {
        // Arrange
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        // Set up initial state
        pdfViewer.textContent = 'Previous content';
        
        // File upload handler
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type === 'application/pdf') {
                pdfViewer.textContent = `Selected: ${file.name}`;
            }
        });
        
        // Act
        const newFile = new File(['new pdf'], 'new-score.pdf', { type: 'application/pdf' });
        Object.defineProperty(fileInput, 'files', {
            value: [newFile],
            writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Assert
        expect(pdfViewer.textContent).toBe('Selected: new-score.pdf');
        expect(pdfViewer.textContent).not.toContain('Previous content');
    });
});
