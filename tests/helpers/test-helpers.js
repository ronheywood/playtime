// Test Helper Functions - Shared utilities for integration tests
// Reduces code duplication across test files

const TEST_CONSTANTS = require('./test-constants');

const TestHelpers = {
    // File and Mock Creation Helpers
    
    /**
     * Create standard mock PDF file for testing
     * @param {string} name - File name (defaults to TEST_CONSTANTS.DEFAULT_FILE_NAME)
     * @param {number} bufferSize - Buffer size (defaults to TEST_CONSTANTS.MOCK_BUFFER_SIZE)
     * @returns {Object} Mock file object with arrayBuffer method
     */
    createMockPDFFile: (name = TEST_CONSTANTS.DEFAULT_FILE_NAME, bufferSize = TEST_CONSTANTS.MOCK_BUFFER_SIZE) => ({
        name,
        type: TEST_CONSTANTS.PDF_MIME_TYPE,
        arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(bufferSize)))
    }),

    /**
     * Create mock file for testing (alias for createMockPDFFile for backward compatibility)
     */
    createMockFile: (name = TEST_CONSTANTS.DEFAULT_FILE_NAME, bufferSize = TEST_CONSTANTS.MOCK_BUFFER_SIZE) => 
        TestHelpers.createMockPDFFile(name, bufferSize),

    /**
     * Create mock canvas with standard dimensions
     * @returns {Object} Mock canvas element with getContext method
     */
    createMockCanvas: () => ({
        getContext: jest.fn(() => ({
            clearRect: jest.fn(),
            drawImage: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            scale: jest.fn(),
            translate: jest.fn()
        })),
        parentElement: {
            clientWidth: TEST_CONSTANTS.CANVAS_SIZE.width,
            clientHeight: TEST_CONSTANTS.CANVAS_SIZE.height
        },
        width: 0,
        height: 0,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    }),

    /**
     * Create mock page with standard dimensions
     * @returns {Object} Mock PDF page object with getViewport and render methods
     */
    createMockPage: () => ({
        getViewport: jest.fn((options) => ({
            width: TEST_CONSTANTS.PDF_PAGE_SIZE.width,
            height: TEST_CONSTANTS.PDF_PAGE_SIZE.height,
            scale: options.scale || 1.0
        })),
        render: jest.fn(() => ({
            promise: Promise.resolve()
        })),
        getTextContent: jest.fn(() => Promise.resolve({ items: [] })),
        getAnnotations: jest.fn(() => Promise.resolve([]))
    }),

    // DOM Setup Helpers

    /**
     * Setup basic DOM structure for PDF viewer
     */
    setupBasicDOM: () => {
        document.body.innerHTML = `
            <div class="pdf-viewer-container">
                <canvas id="pdf-canvas"></canvas>
            </div>
            <div id="page-info">Page 1 of 1</div>
        `;
    },

    /**
     * Setup DOM structure for navigation testing with buttons
     */
    setupNavigationDOM: () => {
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
    },

    /**
     * Setup complete DOM structure for file upload testing
     */
    setupFileUploadDOM: () => {
        document.body.innerHTML = `
            <div class="upload-container">
                <input type="file" id="pdf-upload" accept=".pdf" />
                <label for="pdf-upload">Upload PDF</label>
            </div>
            <div class="pdf-viewer-container">
                <canvas id="pdf-canvas"></canvas>
            </div>
            <div class="viewer-controls">
                <button id="prev-page-btn" aria-label="Previous page">◀</button>
                <span id="page-info">Page 1 of 1</span>
                <button id="next-page-btn" aria-label="Next page">▶</button>
            </div>
        `;
    },

    /**
     * Setup complete DOM by loading actual index.html file
     * Used for acceptance tests that need the full application structure
     */
    setupCompleteDOM: () => {
        const fs = require('fs');
        const path = require('path');
        
        // Clean up first
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        
        // Load the app HTML content and set up DOM properly
        let htmlContent = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
        
        // Remove script tags to prevent interference in test environment
        htmlContent = htmlContent.replace(/<script[^>]*>.*?<\/script>/gi, '');
        htmlContent = htmlContent.replace(/<script[^>]*\/>/gi, '');
        
        // Extract head and body content from the HTML file manually
        const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        
        if (headMatch) {
            document.head.innerHTML = headMatch[1];
        }
        
        if (bodyMatch) {
            document.body.innerHTML = bodyMatch[1];
        }
        
        // Verify DOM elements are present
        const pdfCanvas = document.querySelector('#pdf-canvas');
        const fileInput = document.querySelector('input[type="file"]');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        if (!pdfCanvas || !fileInput || !pdfViewer) {
            throw new Error(`🚨 TEST SETUP FAILED: Missing required elements. Canvas: ${!!pdfCanvas}, Input: ${!!fileInput}, Viewer: ${!!pdfViewer}`);
        }
    },

    // PDF Viewer Setup Helpers

    /**
     * Setup PDF viewer with initialization only
     * @param {Object} mockPDFViewer - Mock PDF viewer instance
     */
    setupPDFViewer: async (mockPDFViewer) => {
        await mockPDFViewer.init();
    },

    /**
     * Setup PDF viewer with initialized state and loaded file
     * @param {Object} mockPDFViewer - Mock PDF viewer instance
     * @returns {Object} The mock file that was loaded
     */
    setupPDFViewerWithFile: async (mockPDFViewer) => {
        await mockPDFViewer.init();
        const mockFile = TestHelpers.createMockPDFFile();
        await mockPDFViewer.loadPDF(mockFile);
        return mockFile;
    },

    // Integration and Mock Setup Helpers

    /**
     * Setup mock globals for main.js integration tests
     */
    setupMainJsMocks: () => {
        // Setup logger for tests
        const logger = require('../../scripts/logger');
        global.logger = logger;
        
        // Mock logger methods for testing
        jest.spyOn(logger, 'info').mockImplementation(() => {});
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
        jest.spyOn(logger, 'loading').mockImplementation(() => {});
        jest.spyOn(logger, 'debug').mockImplementation(() => {});
        
        global.window = global.window || {};
        // Inject a createPlayTimeDB factory that returns a mock/in-memory DB with the new abstraction
        global.window.createPlayTimeDB = (logger = console) => {
            return {
                init: jest.fn().mockResolvedValue(true),
                save: jest.fn().mockResolvedValue(true),
                getAll: jest.fn().mockResolvedValue([]),
                get: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(true)
            };
        };
        global.window.PlayTimeHighlighting = { 
            init: jest.fn().mockResolvedValue(true),
            highlightText: jest.fn(),
            clearHighlights: jest.fn()
        };
    },

    /**
     * Setup main.js integration for navigation testing
     * Loads and evaluates main.js in the test environment
     */
    setupMainJSIntegration: () => {
        const path = require('path');
        const fs = require('fs');
        const mainJsPath = path.join(__dirname, '../../scripts/main.js');
        const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
        
        // Mock the required global objects for main.js
        TestHelpers.setupMainJsMocks();
        
        // Execute main.js to define the functions and make them globally available
        eval(mainJsContent);
        
        // Make key functions available globally for testing
        if (typeof initializeFileUpload !== 'undefined') {
            global.initializeFileUpload = initializeFileUpload;
        }
        if (typeof initializePDFViewer !== 'undefined') {
            global.initializePDFViewer = initializePDFViewer;
        }
        if (typeof initializeApplication !== 'undefined') {
            global.initializeApplication = initializeApplication;
        }
    },

    /**
     * Setup PDF.js library mock with configurable options
     * @param {number} numPages - Number of pages in the mock document
     * @param {boolean} shouldFail - Whether PDF loading should fail
     */
    setupPDFjsMock: (numPages = TEST_CONSTANTS.DEFAULT_DOC_PAGES, shouldFail = false) => {
        const mockPage = TestHelpers.createMockPage();

        global.pdfjsLib = {
            GlobalWorkerOptions: { workerSrc: null },
            getDocument: jest.fn(() => {
                if (shouldFail) {
                    return {
                        promise: Promise.reject(new Error(TEST_CONSTANTS.ERROR_MESSAGES.INVALID_PDF))
                    };
                }
                return {
                    promise: Promise.resolve({
                        numPages: numPages,
                        getPage: jest.fn((pageNum) => Promise.resolve(mockPage))
                    })
                };
            })
        };

        // Store the mock page for test access
        global.mockPage = mockPage;
        
        return mockPage;
    },

    // Factory functions for dependency injection in tests
    
    /**
     * Create PlayTime Database instance using production factory with dependency injection
     * @param {Object} logger - Logger instance to use for logging
     * @returns {Object} Database interface
     */
    createPlayTimeDB: (logger = console) => {
        const createPlayTimeDB = require('../../scripts/db');
        return createPlayTimeDB(logger);
    },

    /**
     * Create PlayTime PDF Viewer instance using production factory with dependency injection
     * @param {Object} logger - Logger instance to use for logging
     * @returns {Object} PDF Viewer interface
     */
    createPlayTimePDFViewer: (logger = console) => {
        const createPlayTimePDFViewer = require('../../scripts/pdf-viewer');
        return createPlayTimePDFViewer(logger);
    },

    // Utility Helpers

    /**
     * Wait for a specified amount of time (useful for async operations)
     * @param {number} ms - Milliseconds to wait
     */
    waitFor: (ms = TEST_CONSTANTS.ASYNC_OPERATION_DELAY) => 
        new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Simulate file input change event
     * @param {HTMLElement} fileInput - File input element
     * @param {Object} file - File object to simulate
     */
    simulateFileUpload: (fileInput, file) => {
        Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: false,
        });
        
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
    },

    /**
     * Simulate button click event
     * @param {HTMLElement} button - Button element to click
     */
    simulateButtonClick: (button) => {
        const clickEvent = new Event('click', { bubbles: true });
        button.dispatchEvent(clickEvent);
    },

    /**
     * Assert that page info display shows correct information
     * @param {number} currentPage - Expected current page
     * @param {number} totalPages - Expected total pages
     */
    assertPageInfoDisplay: (currentPage, totalPages) => {
        const pageInfo = document.querySelector('#page-info');
        expect(pageInfo?.textContent).toBe(`Page ${currentPage} of ${totalPages}`);
    },

    /**
     * Clean up logger mocks after tests
     */
    cleanupLoggerMocks: () => {
        if (global.logger) {
            if (global.logger.info?.mockRestore) global.logger.info.mockRestore();
            if (global.logger.warn?.mockRestore) global.logger.warn.mockRestore();
            if (global.logger.error?.mockRestore) global.logger.error.mockRestore();
            if (global.logger.loading?.mockRestore) global.logger.loading.mockRestore();
            if (global.logger.debug?.mockRestore) global.logger.debug.mockRestore();
        }
    }
};

module.exports = TestHelpers;

/**
 * Create a real IndexedDBDatabase instance using the ES module factory.
 *
 * This helper enables direct integration testing of the concrete IndexedDBDatabase implementation.
 * It uses dynamic import, so your test runner must support ESM (see Jest docs for ESM support).
 *
 * @example
 *   const db = await TestHelpers.createIndexedDBDatabase(logger);
 *
 * @param {Object} logger - Logger instance to use for logging
 * @returns {Promise<Object>} IndexedDBDatabase instance
 */
TestHelpers.createIndexedDBDatabase = async (logger = console) => {
    // Use dynamic import to load the ES module
    const module = await import('../../db/IndexedDBDatabase.js');
    if (typeof module.createIndexedDBDatabase === 'function') {
        return module.createIndexedDBDatabase(logger);
    } else if (typeof module.IndexedDBDatabase === 'function') {
        return new module.IndexedDBDatabase(logger);
    } else {
        throw new Error('IndexedDBDatabase module does not export a usable factory or class');
    }
};
