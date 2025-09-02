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

    /**
     * Create mock confidence module for testing
     * @returns {Object} Mock confidence module with color mapping functions
     */
    createMockConfidenceModule: () => ({
        confidenceToColor: jest.fn((confidence) => {
            const colors = ['red', 'amber', 'green'];
            return colors[confidence] || 'red';
        }),
        colorToConfidence: jest.fn((color) => {
            const confidenceMap = { 'red': 0, 'amber': 1, 'green': 2 };
            return confidenceMap[color] || 0;
        })
    }),

    /**
     * Create mock constants module for testing
     * @returns {Object} Mock constants module with standard values
     */
    createMockConstantsModule: () => ({
        COLORS: {
            RED: 'red',
            AMBER: 'amber', 
            GREEN: 'green'
        },
        EVENTS: {
            LAYOUT_CHANGED: 'playtime:layout-changed'
        }
    }),

    // DOM Setup Helpers

    /**
     * Setup global DOM environment with window event dispatching
     */
    setupDOM: () => {
        global.window = global.window || {};
        global.window.dispatchEvent = global.window.dispatchEvent || jest.fn();
        global.window.addEventListener = global.window.addEventListener || jest.fn();
        global.document = global.document || document;
    },

    /**
     * Cleanup DOM environment
     */
    cleanup: () => {
        if (document.body) {
            document.body.innerHTML = '';
        }
        if (global.window && global.window.dispatchEvent && typeof global.window.dispatchEvent.mockClear === 'function') {
            global.window.dispatchEvent.mockClear();
        }
    },

    /**
     * Setup basic DOM structure for PDF viewer
     */
    setupBasicDOM: () => {
        document.body.innerHTML = `
            <div class="pdf-viewer-container" data-role="pdf-viewer">
                <canvas id="pdf-canvas" data-role="pdf-canvas"></canvas>
            </div>
            <div id="page-info" data-role="page-info">Page 1 of 1</div>
        `;
    },

    /**
     * Setup DOM structure for focus mode testing
     */
    setupFocusModeDOM: () => {
        document.body.innerHTML = `
            <div class="sidebar">Sidebar content</div>
            <div class="pdf-viewer-container">
                <canvas id="pdf-canvas"></canvas>
            </div>
            <div class="viewer-controls">
                <button id="focus-section-btn">Focus</button>
                <button id="exit-focus-btn" style="display: none">Exit</button>
                <button data-role="toggle-focus-mode" aria-pressed="false">Toggle</button>
            </div>
        `;
    },

    /**
     * Create mock elements for focus mode testing with event listeners
     * @returns {Object} Object containing all focus mode elements
     */
    createFocusModeElements: () => {
        TestHelpers.setupFocusModeDOM();
        
        const elements = {
            focusBtn: document.getElementById('focus-section-btn'),
            exitBtn: document.getElementById('exit-focus-btn'),
            toggleBtn: document.querySelector('[data-role="toggle-focus-mode"]'),
            viewerContainer: document.querySelector('.pdf-viewer-container'),
            canvas: document.getElementById('pdf-canvas'),
            sidebar: document.querySelector('.sidebar')
        };

        // Add mock click methods for testing
        Object.values(elements).forEach(element => {
            if (element && !element.click) {
                element.click = jest.fn(() => {
                    const clickEvent = new Event('click', { bubbles: true });
                    element.dispatchEvent(clickEvent);
                });
            }
        });

        // Add mock style properties
        elements.canvas.style = elements.canvas.style || {};
        elements.sidebar.style = elements.sidebar.style || {};
        elements.focusBtn.style = elements.focusBtn.style || {};
        elements.exitBtn.style = elements.exitBtn.style || {};
        elements.viewerContainer.style = elements.viewerContainer.style || {};

        // Mock getBoundingClientRect for layout calculations
        elements.canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0, top: 0, width: 800, height: 600
        }));
        elements.viewerContainer.getBoundingClientRect = jest.fn(() => ({
            width: 1000, height: 700
        }));

        return elements;
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
                <button id="prev-page-btn" data-role="prev-page" aria-label="Previous page">◀</button>
                <span id="page-info" data-role="page-info">Page 1 of 1</span>
                <button id="next-page-btn" data-role="next-page" aria-label="Next page">▶</button>
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
                <button id="prev-page-btn" data-role="prev-page" aria-label="Previous page">◀</button>
                <span id="page-info" data-role="page-info">Page 1 of 1</span>
                <button id="next-page-btn" data-role="next-page" aria-label="Next page">▶</button>
            </div>
            
            <!-- Highlighting Toggle -->
            <div class="flex items-center justify-center mb-2">
                <button data-role="toggle-highlighting" id="highlighting-toggle" class="btn btn-outline w-full text-xs" aria-pressed="false">
                    <i data-lucide="pen-tool" class="w-4 h-4 mr-1"></i>
                    <span>Highlight Sections</span>
                </button>
            </div>
            
            <!-- Confidence Panel (hidden by default) -->
            <div id="confidence-panel" class="p-4 border-b border-border" style="display: none;">
                <div class="text-sm font-medium mb-3 text-foreground">Mark Section Confidence:</div>
                <div class="flex flex-col gap-2" id="confidence-controls">
                    <button id="color-green" data-role="color-green" data-color="green" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                        <div class="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Confident</span>
                    </button>
                    <button id="color-amber" data-role="color-amber" data-color="amber" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                        <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span>Unsure</span>
                    </button>
                    <button id="color-red" data-role="color-red" data-color="red" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Needs Work</span>
                    </button>
                </div>
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
        
        // Mock PDF viewer factory
        global.window.createPlayTimePDFViewer = (logger = console) => {
            return {
                init: jest.fn().mockResolvedValue(true),
                loadPDF: jest.fn().mockResolvedValue(true),
                renderPage: jest.fn().mockResolvedValue(true),
                getCurrentPage: jest.fn().mockReturnValue(1),
                getTotalPages: jest.fn().mockReturnValue(1)
            };
        };
        
        // Mock score list factory
        global.window.createPlayTimeScoreList = (db = null, logger = console) => {
            return {
                init: jest.fn().mockResolvedValue(true),
                setDatabase: jest.fn(),
                render: jest.fn(),
                refresh: jest.fn()
            };
        };
        
        global.window.PlayTimeHighlighting = { 
            init: jest.fn().mockResolvedValue(true),
            highlightText: jest.fn(),
            clearHighlights: jest.fn(),
            enableSelection: jest.fn(),
            disableSelection: jest.fn(),
            _state: {
                activeConfidence: null
            }
        };
        
        // Mock confidence module
        global.window.PlayTimeConfidence = {
            init: jest.fn(),
            setActiveConfidence: jest.fn(),
            clearActiveConfidence: jest.fn()
        };
        
        // Mock constants module
        global.window.PlayTimeConstants = {
            EVENTS: {
                CONFIDENCE_CHANGED: 'confidence-changed',
                PAGE_CHANGED: 'page-changed',
                SCORE_SELECTED: 'score-selected'
            },
            SELECTORS: {
                CANVAS: '#pdf-canvas',
                COLOR_GREEN: '[data-role="color-green"]',
                COLOR_AMBER: '[data-role="color-amber"]',
                COLOR_RED: '[data-role="color-red"]'
            }
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
        const createPlayTimeDB = require('../../scripts/db/db.js');
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
        const pageInfo = document.querySelector('[data-role="page-info"]');
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
    },

    /**
     * Create a silent logger for tests to reduce console noise
     * @returns {Object} Silent logger that suppresses all output
     */
    createSilentLogger: () => {
        return {
            info: () => {},
            warn: () => {},
            error: () => {},
            loading: () => {},
            debug: () => {}
        };
    }
};

/**
 * Loads fixture data into the browser's IndexedDB for Playwright tests.
 * This function is executed in the browser context via page.evaluate().
 *
 * @param {import('playwright').Page} page - The Playwright page object.
 * @param {object} fixture - The fixture data to load.
 * @returns {Promise<void>}
 */
TestHelpers.loadFixtureIntoIndexedDB = async (page, fixture) => {
  await page.evaluate(async (fixtureData) => {
    const dbName = 'PlayTimeDatabase';
    const dbVersion = 1;
    const scoresStoreName = 'scores';
    const highlightsStoreName = 'highlights';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(scoresStoreName)) {
          db.createObjectStore(scoresStoreName, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(highlightsStoreName)) {
          db.createObjectStore(highlightsStoreName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;

        try {
          const transaction = db.transaction([scoresStoreName, highlightsStoreName], 'readwrite');
          const scoresStore = transaction.objectStore(scoresStoreName);
          const highlightsStore = transaction.objectStore(highlightsStoreName);

          // Clear existing data
          scoresStore.clear();
          highlightsStore.clear();

          // Add score metadata and file
          const scoreRecord = {
            id: fixtureData.id,
            name: fixtureData.name,
            file: fixtureData.file,
            meta: fixtureData.meta,
          };
          scoresStore.add(scoreRecord);

          // Add all highlights
          fixtureData.highlights.forEach(highlight => {
            highlightsStore.add(highlight);
          });

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          
          transaction.onerror = (error) => {
            db.close();
            reject(new Error('Transaction failed while loading fixture: ' + error));
          };
        } catch (error) {
          db.close();
          reject(error);
        }
      };
    });
  }, fixture);
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
    const module = await import('../../scripts/db/IndexedDBDatabase.js');
    if (typeof module.createIndexedDBDatabase === 'function') {
        return module.createIndexedDBDatabase(logger);
    } else if (typeof module.IndexedDBDatabase === 'function') {
        return new module.IndexedDBDatabase(logger);
    } else {
        throw new Error('IndexedDBDatabase module does not export a usable factory or class');
    }
};

// Visual Test Helpers for Playwright

/**
 * Activate highlighting mode in visual tests
 * Required since highlighting is now disabled by default
 * @param {Page} page - Playwright page object
 */
TestHelpers.activateHighlighting = async (page) => {
    // Click the "Highlight Sections" button to activate highlighting
    await page.click('#highlighting-toggle');
    
    // Wait for the confidence panel to become visible
    await page.waitForSelector('#confidence-panel', { state: 'visible' });
    
    // Give a brief moment for the UI to settle
    await page.waitForTimeout(100);
};

/**
 * Setup common visual test environment with highlighting activated
 * @param {Page} page - Playwright page object
 * @param {string} theme - 'light' or 'dark'
 * @param {Object} size - {w: number, h: number}
 */
TestHelpers.setupVisualTestWithHighlighting = async (page, theme = 'light', size = { w: 1440, h: 900 }) => {
    await page.setViewportSize({ width: size.w, height: size.h });
    const url = theme === 'dark' ? '/?theme=dark' : '/';
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#app');
    // Allow lucide + theme to settle
    await page.waitForTimeout(150);
    // Activate highlighting for tests that need it
    await TestHelpers.activateHighlighting(page);
};
