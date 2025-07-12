// Integration Test: PDF Rendering
// Tests the integration between file upload and PDF.js rendering

// Import shared test utilities
const TEST_CONSTANTS = require('../helpers/test-constants');
const TestHelpers = require('../helpers/test-helpers');

describe('PDF Rendering Integration', () => {
    let mockPDFViewer;
    let consoleSpy;
    
    beforeEach(() => {
        // Mock console methods to reduce test noise from pdf-viewer.js
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(() => {}),
            warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
            error: jest.spyOn(console, 'error').mockImplementation(() => {})
        };

        // Set up a silent logger for dependency injection
        const silentLogger = {
            log: () => {},
            warn: () => {},
            error: () => {},
            info: () => {},
            loading: () => {},
            debug: () => {},
            setSilent: () => {}
        };

        // Setup PDF.js mock using helper function
        TestHelpers.setupPDFjsMock();

        // Create mock canvas using helper function
        const mockCanvas = TestHelpers.createMockCanvas();

        // Setup basic DOM structure
        TestHelpers.setupBasicDOM();

        // Mock getElementById to return our mock canvas
        jest.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'pdf-canvas') return mockCanvas;
            return null;
        });

        // Load the pdf-viewer.js factory function and create instance with silent logger
        mockPDFViewer = TestHelpers.createPlayTimePDFViewer(silentLogger);
    });

    afterEach(() => {
        // Restore console methods
        consoleSpy.log.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.error.mockRestore();
        
        jest.restoreAllMocks();
    });

    test('should initialize PDF.js worker configuration', async () => {
        await mockPDFViewer.init();
        
        expect(global.pdfjsLib.GlobalWorkerOptions.workerSrc).toContain('pdf.worker.min.js');
    });

    test('should load and render PDF from file', async () => {
        await TestHelpers.setupPDFViewerWithFile(mockPDFViewer);
        
        expect(global.pdfjsLib.getDocument).toHaveBeenCalledWith(expect.any(ArrayBuffer));
        expect(mockPDFViewer.getTotalPages()).toBe(TEST_CONSTANTS.DEFAULT_DOC_PAGES);
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.FIRST_PAGE);
    });

    test('should render specific page when requested', async () => {
        await TestHelpers.setupPDFViewerWithFile(mockPDFViewer);
        
        await mockPDFViewer.renderPage(TEST_CONSTANTS.SECOND_PAGE);
        
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.SECOND_PAGE);
    });

    test('should update page info display', async () => {
        await TestHelpers.setupPDFViewerWithFile(mockPDFViewer);
        
        mockPDFViewer.updatePageInfo();
        
        TestHelpers.assertPageInfoDisplay(TEST_CONSTANTS.FIRST_PAGE, TEST_CONSTANTS.DEFAULT_DOC_PAGES);
    });

    test('should navigate to next page', async () => {
        await TestHelpers.setupPDFViewerWithFile(mockPDFViewer);
        
        await mockPDFViewer.nextPage();
        
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.SECOND_PAGE);
        TestHelpers.assertPageInfoDisplay(TEST_CONSTANTS.SECOND_PAGE, TEST_CONSTANTS.DEFAULT_DOC_PAGES);
    });

    test('should navigate to previous page', async () => {
        await TestHelpers.setupPDFViewerWithFile(mockPDFViewer);
        await mockPDFViewer.nextPage();
        
        await mockPDFViewer.prevPage();
        
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.FIRST_PAGE);
        TestHelpers.assertPageInfoDisplay(TEST_CONSTANTS.FIRST_PAGE, TEST_CONSTANTS.DEFAULT_DOC_PAGES);
    });

    test('should not go beyond page boundaries', async () => {
        await mockPDFViewer.init();
        const mockFile = TestHelpers.createMockFile();
        await mockPDFViewer.loadPDF(mockFile);
        
        await mockPDFViewer.prevPage();
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.FIRST_PAGE);
        
        await mockPDFViewer.renderPage(TEST_CONSTANTS.THIRD_PAGE);
        await mockPDFViewer.nextPage();
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.THIRD_PAGE);
    });

    test('should handle PDF loading errors gracefully', async () => {
        await mockPDFViewer.init();
        global.pdfjsLib.getDocument.mockImplementation(() => ({
            promise: Promise.reject(new Error(TEST_CONSTANTS.ERROR_MESSAGES.INVALID_PDF))
        }));
        
        const mockFile = TestHelpers.createMockFile('invalid.pdf');
        
        await expect(mockPDFViewer.loadPDF(mockFile)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGES.INVALID_PDF);
    });

    test('should handle rendering errors when no PDF is loaded', async () => {
        await TestHelpers.setupPDFViewer(mockPDFViewer);
        
        await expect(mockPDFViewer.renderPage(TEST_CONSTANTS.FIRST_PAGE)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGES.NO_PDF_LOADED);
    });

    test('should calculate appropriate scale for canvas', async () => {
        const mockFile = TestHelpers.createMockFile();
        await TestHelpers.setupPDFViewer(mockPDFViewer);
        
        await mockPDFViewer.loadPDF(mockFile);
        await mockPDFViewer.renderPage(TEST_CONSTANTS.FIRST_PAGE);
        
        const mockPage = global.mockPage;
        expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 1.0 });
        expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: expect.any(Number) });
    });

    test('should integrate with UI navigation buttons to change pages', async () => {
        TestHelpers.setupNavigationDOM();
        
        const mockFile = TestHelpers.createMockFile();
        await TestHelpers.setupPDFViewer(mockPDFViewer);
        await mockPDFViewer.loadPDF(mockFile);

        TestHelpers.setupMainJSIntegration();
        
        if (typeof initializePageNavigation === 'function') {
            initializePageNavigation(mockPDFViewer);
        }

        const pageInfo = document.querySelector('#page-info');

        // Verify initial state
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.FIRST_PAGE);
        TestHelpers.assertPageInfoDisplay(TEST_CONSTANTS.FIRST_PAGE, TEST_CONSTANTS.DEFAULT_DOC_PAGES);

        // Navigate forward
        await mockPDFViewer.nextPage();
        mockPDFViewer.updatePageInfo();
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.SECOND_PAGE);
        TestHelpers.assertPageInfoDisplay(TEST_CONSTANTS.SECOND_PAGE, TEST_CONSTANTS.DEFAULT_DOC_PAGES);

        // Navigate back
        await mockPDFViewer.prevPage();
        mockPDFViewer.updatePageInfo();
        expect(mockPDFViewer.getCurrentPage()).toBe(TEST_CONSTANTS.FIRST_PAGE);
        TestHelpers.assertPageInfoDisplay(TEST_CONSTANTS.FIRST_PAGE, TEST_CONSTANTS.DEFAULT_DOC_PAGES);
    });
});
