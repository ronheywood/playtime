// Integration Test: PDF Rendering
// Tests the integration between file upload and PDF.js rendering

/**
 * CODE REVIEW FINDINGS FOR PDF RENDERING TESTS:
 * 
 * 🧪 TEST QUALITY ISSUES:
 * 1. Massive code duplication - almost every test repeats the same setup
 * 2. Magic numbers without explanation (595, 842, 800, 600, etc.)
 * 3. Inconsistent mock structure - some detailed, others minimal
 * 4. Missing timeout handling for async operations
 * 5. Hard to maintain - changes to setup require updating multiple tests
 * 
 * 📋 SPECIFIC IMPROVEMENTS NEEDED:
 * - Extract test helper functions for common setup patterns
 * - Create named constants for magic numbers with explanations
 * - Standardize mock object structure across all tests
 * - Add proper timeout and error handling for async operations
 * - Consider using beforeEach for common setup instead of repeating in each test
 * 
 * 💡 POSITIVE ASPECTS:
 * - Good test coverage of different scenarios
 * - Proper use of async/await in tests
 * - Clear test descriptions and arrange/act/assert structure
 * - Good boundary testing (page limits, error cases)
 */

describe('PDF Rendering Integration', () => {
    let mockPDFViewer;
    
    beforeEach(() => {
        // ISSUE: Magic numbers without explanation - what do these dimensions represent?
        // TODO: Extract to named constants with clear explanations
        // const PDF_PAGE_DIMENSIONS = { width: 595, height: 842 }; // Standard A4 page size
        // const CANVAS_CONTAINER_SIZE = { width: 800, height: 600 }; // Mock container dimensions
        
        // Create a consistent mock page that we can reference later
        const mockPage = {
            getViewport: jest.fn((options) => ({
                width: 595,  // TODO: Use named constant
                height: 842, // TODO: Use named constant
                scale: options.scale || 1.0
            })),
            render: jest.fn(() => ({
                promise: Promise.resolve()
            }))
        };

        // Mock PDF.js library
        // GOOD: Consistent mock structure for PDF.js
        global.pdfjsLib = {
            GlobalWorkerOptions: { workerSrc: null },
            getDocument: jest.fn(() => ({
                promise: Promise.resolve({
                    numPages: 3, // TODO: Make this configurable for different test scenarios
                    getPage: jest.fn((pageNum) => Promise.resolve(mockPage))
                })
            }))
        };

        // Store the mock page for test access
        global.mockPage = mockPage;

        // Mock canvas and DOM elements
        // ISSUE: Complex mock object - consider extracting to helper function
        const mockCanvas = {
            getContext: jest.fn(() => ({
                clearRect: jest.fn(),
                drawImage: jest.fn()
            })),
            parentElement: {
                clientWidth: 800,  // TODO: Use named constant
                clientHeight: 600  // TODO: Use named constant
            },
            width: 0,
            height: 0
        };

        // TODO: Extract DOM setup to helper function to reduce duplication
        document.body.innerHTML = `
            <div class="pdf-viewer-container">
                <canvas id="pdf-canvas"></canvas>
            </div>
            <div id="page-info">Page 1 of 1</div>
        `;

        // Mock getElementById to return our mock canvas
        // GOOD: Proper Jest spying and mocking
        jest.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'pdf-canvas') return mockCanvas;
            return null;
        });

        // Load the PDF viewer module
        // GOOD: Loading real module code for integration testing
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
        // ISSUE: Code duplication - this setup pattern is repeated in multiple tests
        // TODO: Extract to helper function: setupPDFViewerWithMockFile()
        
        // Arrange
        await mockPDFViewer.init();
        
        // Create a mock file with arrayBuffer method
        // TODO: Extract to helper function: createMockPDFFile(name)
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024))) // TODO: Use named constant for buffer size
        };
        
        // Act
        await mockPDFViewer.loadPDF(mockFile);
        
        // Assert
        // GOOD: Clear assertions with appropriate matchers
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

    test('should integrate with UI navigation buttons to change pages', async () => {
        // GOOD: This test addresses a real integration gap (buttons not working)
        // GOOD: Comprehensive test setup including DOM structure
        
        // Arrange - Set up the complete DOM structure including navigation buttons
        document.body.innerHTML = `
            <div class="pdf-viewer-container">
                <canvas id="pdf-canvas"></canvas>
            </div>
            <div class="viewer-controls">
                <button id="prev-page-btn" aria-label="Previous page">◀</button>
                <span id="page-info">Page 1 of 1</span>
                <button id="next-page-btn" aria-label="Next page">▶</button>
            </div>
        `;

        await mockPDFViewer.init();
        // TODO: Use helper function to reduce duplication
        const mockFile = {
            name: 'test-score.pdf',
            arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024)))
        };
        await mockPDFViewer.loadPDF(mockFile);

        // Load main.js to set up button event listeners
        // GOOD: Loading real implementation to test actual integration
        const path = require('path');
        const fs = require('fs');
        const mainJsPath = path.join(__dirname, '../../scripts/main.js');
        const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
        
        // Mock the required global objects for main.js
        // TODO: Extract mock setup to helper function
        global.window.PlayTimeDB = { init: jest.fn().mockResolvedValue(true) };
        global.window.PlayTimeHighlighting = { init: jest.fn().mockResolvedValue(true) };
        
        // Execute main.js to define the functions
        eval(mainJsContent);
        
        // Manually initialize page navigation since DOMContentLoaded won't fire in tests
        // GOOD: Direct function call for testing specific functionality
        if (typeof initializePageNavigation === 'function') {
            initializePageNavigation(mockPDFViewer);
        }

        // Get the actual button elements
        const nextBtn = document.querySelector('#next-page-btn');
        const prevBtn = document.querySelector('#prev-page-btn');
        const pageInfo = document.querySelector('#page-info');

        // Verify initial state
        expect(mockPDFViewer.getCurrentPage()).toBe(1);
        expect(pageInfo?.textContent).toBe('Page 1 of 3');

        // Act - Click next page button
        nextBtn?.click();
        
        // Wait a tick to ensure async operations complete
        // GOOD: Proper handling of async operations in tests
        await new Promise(resolve => setTimeout(resolve, 0));

        // Assert - Verify page changed
        expect(mockPDFViewer.getCurrentPage()).toBe(2);
        expect(pageInfo?.textContent).toBe('Page 2 of 3');

        // Act - Click previous page button  
        prevBtn?.click();
        
        // Wait a tick to ensure async operations complete
        await new Promise(resolve => setTimeout(resolve, 0));

        // Assert - Verify page changed back
        expect(mockPDFViewer.getCurrentPage()).toBe(1);
        expect(pageInfo?.textContent).toBe('Page 1 of 3');
    });
});

/**
 * RECOMMENDED REFACTORING: Extract Test Helper Functions
 * 
 * The following helper functions would significantly reduce code duplication:
 * 
 * const TestHelpers = {
 *     // Create standard mock file for testing
 *     createMockPDFFile: (name = 'test-score.pdf', bufferSize = 1024) => ({
 *         name,
 *         arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(bufferSize)))
 *     }),
 * 
 *     // Setup PDF viewer with initialized state and loaded file
 *     setupPDFViewerWithFile: async (mockPDFViewer) => {
 *         await mockPDFViewer.init();
 *         const mockFile = TestHelpers.createMockPDFFile();
 *         await mockPDFViewer.loadPDF(mockFile);
 *         return mockFile;
 *     },
 * 
 *     // Create mock canvas with standard dimensions
 *     createMockCanvas: () => ({ ... }),
 * 
 *     // Setup DOM for navigation testing
 *     setupNavigationDOM: () => { ... }
 * };
 * 
 * CONSTANTS to extract:
 * const TEST_CONSTANTS = {
 *     PDF_PAGE_SIZE: { width: 595, height: 842 }, // A4 dimensions
 *     CANVAS_SIZE: { width: 800, height: 600 },
 *     DEFAULT_DOC_PAGES: 3,
 *     MOCK_BUFFER_SIZE: 1024
 * };
 */
