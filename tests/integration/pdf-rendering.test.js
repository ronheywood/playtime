// Integration Test: PDF Rendering
// Tests the integration between file upload and PDF.js rendering

describe('PDF Rendering Integration', () => {
    let mockPDFViewer;
    
    beforeEach(() => {
        // Create a consistent mock page that we can reference later
        const mockPage = {
            getViewport: jest.fn((options) => ({
                width: 595,
                height: 842,
                scale: options.scale || 1.0
            })),
            render: jest.fn(() => ({
                promise: Promise.resolve()
            }))
        };

        // Mock PDF.js library
        global.pdfjsLib = {
            GlobalWorkerOptions: { workerSrc: null },
            getDocument: jest.fn(() => ({
                promise: Promise.resolve({
                    numPages: 3,
                    getPage: jest.fn((pageNum) => Promise.resolve(mockPage))
                })
            }))
        };

        // Store the mock page for test access
        global.mockPage = mockPage;

        // Mock canvas and DOM elements
        const mockCanvas = {
            getContext: jest.fn(() => ({
                clearRect: jest.fn(),
                drawImage: jest.fn()
            })),
            parentElement: {
                clientWidth: 800,
                clientHeight: 600
            },
            width: 0,
            height: 0
        };

        document.body.innerHTML = `
            <div class="pdf-viewer-container">
                <canvas id="pdf-canvas"></canvas>
            </div>
            <div id="page-info">Page 1 of 1</div>
        `;

        // Mock getElementById to return our mock canvas
        jest.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'pdf-canvas') return mockCanvas;
            return null;
        });

        // Load the PDF viewer module
        const path = require('path');
        const fs = require('fs');
        const pdfViewerPath = path.join(__dirname, '../../scripts/pdf-viewer.js');
        const pdfViewerContent = fs.readFileSync(pdfViewerPath, 'utf8');
        eval(pdfViewerContent);
        
        mockPDFViewer = global.window.PlayTimePDFViewer;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should initialize PDF.js worker configuration', async () => {
        // Act
        await mockPDFViewer.init();
        
        // Assert
        expect(global.pdfjsLib.GlobalWorkerOptions.workerSrc).toContain('pdf.worker.min.js');
    });

    test('should load and render PDF from file', async () => {
        // Arrange
        await mockPDFViewer.init();
        
        // Create a mock file with arrayBuffer method
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        
        // Act
        await mockPDFViewer.loadPDF(mockFile);
        
        // Assert
        expect(global.pdfjsLib.getDocument).toHaveBeenCalledWith(expect.any(ArrayBuffer));
        expect(mockPDFViewer.getTotalPages()).toBe(3);
        expect(mockPDFViewer.getCurrentPage()).toBe(1);
    });

    test('should render specific page when requested', async () => {
        // Arrange
        await mockPDFViewer.init();
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        await mockPDFViewer.loadPDF(mockFile);
        
        // Act
        await mockPDFViewer.renderPage(2);
        
        // Assert
        expect(mockPDFViewer.getCurrentPage()).toBe(2);
    });

    test('should update page info display', async () => {
        // Arrange
        await mockPDFViewer.init();
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        await mockPDFViewer.loadPDF(mockFile);
        
        // Act
        mockPDFViewer.updatePageInfo();
        
        // Assert
        const pageInfo = document.querySelector('#page-info');
        expect(pageInfo?.textContent).toBe('Page 1 of 3');
    });

    test('should navigate to next page', async () => {
        // Arrange
        await mockPDFViewer.init();
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        await mockPDFViewer.loadPDF(mockFile);
        
        // Act
        await mockPDFViewer.nextPage();
        
        // Assert
        expect(mockPDFViewer.getCurrentPage()).toBe(2);
        const pageInfo = document.querySelector('#page-info');
        expect(pageInfo?.textContent).toBe('Page 2 of 3');
    });

    test('should navigate to previous page', async () => {
        // Arrange
        await mockPDFViewer.init();
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        await mockPDFViewer.loadPDF(mockFile);
        await mockPDFViewer.nextPage(); // Go to page 2
        
        // Act
        await mockPDFViewer.prevPage();
        
        // Assert
        expect(mockPDFViewer.getCurrentPage()).toBe(1);
        const pageInfo = document.querySelector('#page-info');
        expect(pageInfo?.textContent).toBe('Page 1 of 3');
    });

    test('should not go beyond page boundaries', async () => {
        // Arrange
        await mockPDFViewer.init();
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        await mockPDFViewer.loadPDF(mockFile);
        
        // Act - try to go to previous page when already on first page
        await mockPDFViewer.prevPage();
        
        // Assert - should still be on page 1
        expect(mockPDFViewer.getCurrentPage()).toBe(1);
        
        // Act - go to last page then try to go beyond
        await mockPDFViewer.renderPage(3);
        await mockPDFViewer.nextPage();
        
        // Assert - should still be on page 3
        expect(mockPDFViewer.getCurrentPage()).toBe(3);
    });

    test('should handle PDF loading errors gracefully', async () => {
        // Arrange
        await mockPDFViewer.init();
        global.pdfjsLib.getDocument.mockImplementation(() => ({
            promise: Promise.reject(new Error('Invalid PDF'))
        }));
        
        const mockFile = {
            name: 'invalid.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        
        // Act & Assert
        await expect(mockPDFViewer.loadPDF(mockFile)).rejects.toThrow('Invalid PDF');
    });

    test('should handle rendering errors when no PDF is loaded', async () => {
        // Arrange
        await mockPDFViewer.init();
        
        // Act & Assert
        await expect(mockPDFViewer.renderPage(1)).rejects.toThrow('No PDF loaded');
    });

    test('should calculate appropriate scale for canvas', async () => {
        // Arrange
        await mockPDFViewer.init();
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        
        // Act
        await mockPDFViewer.loadPDF(mockFile);
        await mockPDFViewer.renderPage(1); // This triggers the scale calculation
        
        // Assert - verify that getViewport was called with calculated scale
        const mockPage = global.mockPage;
        
        // Should be called twice: once with scale 1.0 to get dimensions, then with calculated scale
        expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 1.0 });
        expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: expect.any(Number) });
    });
});
