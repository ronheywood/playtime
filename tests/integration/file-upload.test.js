// Integration Test: File Upload Handler
// Tests the interaction between file input and PDF viewer display

// Import shared test utilities
const TEST_CONSTANTS = require('../helpers/test-constants');
const TestHelpers = require('../helpers/test-helpers');

describe('File Upload Integration', () => {
    let mockDatabase;
    
    beforeEach(async () => {
        // Setup DOM for file upload testing
        TestHelpers.setupFileUploadDOM();
        
        // Set up minimal database for integration testing
        const savedPdfs = [];
        mockDatabase = {
            // capture optional meta (e.g., pages)
            save: function(file, meta = {}) {
                const record = {
                    name: file.name,
                    type: file.type,
                    size: file.size
                };
                if (Number.isFinite(meta.pages)) {
                    record.pages = Number(meta.pages);
                }
                savedPdfs.push(record);
                return Promise.resolve();
            },
            getAll: function() {
                return Promise.resolve(savedPdfs);
            },
            init: function() {
                return Promise.resolve();
            }
        };
        
        // Setup main.js integration (this will create default mocks)
        await TestHelpers.setupMainJSIntegration();
        
        // The file upload is already initialized by PlayTimeApplication.setupFileUpload()
        // during the bootstrap, so no manual initialization needed
    });
    
    afterEach(() => {
        // Clean up
        delete global.window.PlayTimeDB;
        mockDatabase = null;
    });
    
    test('should display filename in PDF viewer when file is selected', () => {
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        const mockFile = TestHelpers.createMockPDFFile(TEST_CONSTANTS.DEFAULT_FILE_NAME);
        TestHelpers.simulateFileUpload(fileInput, mockFile);
        
        expect(pdfViewer.textContent).toContain(TEST_CONSTANTS.DEFAULT_FILE_NAME);
    });
    
    test('should handle PDF file type validation', () => {
        const fileInput = document.querySelector('#pdf-upload');
        
        const invalidFile = { name: 'document.txt', type: 'text/plain' };
        TestHelpers.simulateFileUpload(fileInput, invalidFile);
        
        const statusElement = document.querySelector('.status-message');
        expect(statusElement.textContent).toContain('Error: Please select a PDF file');
    });
    
    test('should clear previous selection when new file is chosen', () => {
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        pdfViewer.textContent = 'Previous content';
        
        const newFile = TestHelpers.createMockPDFFile('new-score.pdf');
        TestHelpers.simulateFileUpload(fileInput, newFile);
        
        const statusElement = pdfViewer.querySelector('.status-message');
        expect(statusElement.textContent).toBe('Selected: new-score.pdf');
        expect(statusElement.getAttribute('data-status')).toBe('success');
    });
    
    test('should save uploaded PDF file to database', async () => {
        const fileInput = document.querySelector('#pdf-upload');
        
        const mockFile = TestHelpers.createMockPDFFile('integration-test.pdf');
        TestHelpers.simulateFileUpload(fileInput, mockFile);
        
        // Wait for async file processing to complete
        await TestHelpers.waitFor(200);
        
        const savedPdfs = await window.PlayTimeDB.getAll();
        expect(savedPdfs).toHaveLength(1);
        expect(savedPdfs[0].name).toBe('integration-test.pdf');
        expect(savedPdfs[0].type).toBe(TEST_CONSTANTS.PDF_MIME_TYPE);
    });
    
    test('should load PDF into viewer when valid file is uploaded', async () => {
        const fileInput = document.querySelector('#pdf-upload');
        
        const mockPDFViewer = {
            loadPDF: jest.fn(() => Promise.resolve()),
            renderPage: jest.fn(() => Promise.resolve()),
            init: jest.fn(() => Promise.resolve())
        };
        global.window.PlayTimePDFViewer = mockPDFViewer;
        
        const mockFile = TestHelpers.createMockPDFFile('viewer-test.pdf');
        TestHelpers.simulateFileUpload(fileInput, mockFile);
        
        await TestHelpers.waitFor();
        
        expect(mockPDFViewer.loadPDF).toHaveBeenCalledWith(mockFile);
        expect(mockPDFViewer.renderPage).toHaveBeenCalledWith(TEST_CONSTANTS.FIRST_PAGE);
        
        delete global.window.PlayTimePDFViewer;
    });
    
    test('should handle PDF viewer loading errors gracefully', async () => {
        const fileInput = document.querySelector('#pdf-upload');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        const mockPDFViewer = {
            loadPDF: jest.fn(() => Promise.reject(new Error('Failed to load PDF'))),
            renderPage: jest.fn(() => Promise.resolve()),
            init: jest.fn(() => Promise.resolve())
        };
        global.window.PlayTimePDFViewer = mockPDFViewer;
        
        const mockFile = TestHelpers.createMockPDFFile('error-test.pdf');
        TestHelpers.simulateFileUpload(fileInput, mockFile);
        
        await TestHelpers.waitFor();
        
        expect(mockPDFViewer.loadPDF).toHaveBeenCalledWith(mockFile);
        expect(mockPDFViewer.renderPage).not.toHaveBeenCalled();
        
        const statusElement = pdfViewer.querySelector('.status-message');
        expect(statusElement.textContent).toContain('Error loading PDF');
        expect(statusElement.getAttribute('data-status')).toBe('error');
        
        delete global.window.PlayTimePDFViewer;
    });

    // New test: ensure pages are persisted as part of saved metadata
    test('should persist page count in database metadata', async () => {
        const fileInput = document.querySelector('#pdf-upload');

        // Mock viewer to return a deterministic page count
        const mockPDFViewer = {
            loadPDF: jest.fn(() => Promise.resolve()),
            renderPage: jest.fn(() => Promise.resolve()),
            init: jest.fn(() => Promise.resolve()),
            getTotalPages: jest.fn(() => 3)
        };
        global.window.PlayTimePDFViewer = mockPDFViewer;

        const mockFile = TestHelpers.createMockPDFFile('pages-meta.pdf');
        TestHelpers.simulateFileUpload(fileInput, mockFile);

        await TestHelpers.waitFor(200);

        const savedPdfs = await window.PlayTimeDB.getAll();
        expect(savedPdfs).toHaveLength(1);
        expect(savedPdfs[0].name).toBe('pages-meta.pdf');
        expect(savedPdfs[0].pages).toBe(3);

        delete global.window.PlayTimePDFViewer;
    });
});
