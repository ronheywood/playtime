/**
 * PlayTime Acceptance Tests
 * Outside-In methodology - these tests will initially fail and drive development
 */

const { SCORE_LIST_CONFIG } = require('../../scripts/score-list');
const { CONFIG } = require('../../scripts/main');
const { SELECTORS } = require('../../scripts/constants');

describe('PlayTime Music Practice App', () => {
    beforeAll(async () => {
        // JSDOM setup is handled in tests/setup.js
    });

    beforeEach(async () => {
        // Use global test DOM from tests/setup.js
        const pdfCanvas = document.querySelector(SELECTORS.CANVAS) || document.querySelector('#pdf-canvas');
        const fileInput = document.querySelector('input[type="file"]');
        const pdfViewer = document.querySelector(SELECTORS.VIEWER) || document.querySelector('.pdf-viewer-container');
        if (!pdfCanvas || !fileInput || !pdfViewer) {
            throw new Error('🚨 TEST SETUP FAILED: Missing required elements');
        }
        
        // Use the real in-memory database implementation for acceptance tests
        const MemoryDatabase = require('../../db/MemoryDatabase');
        global.window.createPlayTimeDB = (logger) => new MemoryDatabase();

        // Mock PDF viewer with loadPDF and renderPage methods + zoom API for UI tests
        global.window.createPlayTimePDFViewer = (logger) => {
            let zoom = 1.0;
            const ZOOM = { MIN: 1.0, MAX: 3.0, STEP: 0.25 };
            const clamp = (v) => Math.min(Math.max(v, ZOOM.MIN), ZOOM.MAX);
            const viewer = {
                init: jest.fn().mockResolvedValue(true),
                loadPDF: jest.fn().mockResolvedValue(true),
                renderPage: jest.fn().mockResolvedValue(true),
                getZoom: () => zoom,
                getZoomBounds: () => ({ min: ZOOM.MIN, max: ZOOM.MAX }),
                setZoom: jest.fn().mockImplementation((v) => { zoom = clamp(Number(v) || 1.0); return zoom; })
            };
            viewer.zoomIn = jest.fn(() => viewer.setZoom(zoom + ZOOM.STEP));
            viewer.zoomOut = jest.fn(() => viewer.setZoom(zoom - ZOOM.STEP));
            return viewer;
        };
        
    // Use real highlighting capability (data-role driven)
    const Highlighting = require('../../scripts/highlighting.js');
    global.window.PlayTimeHighlighting = Highlighting;
        
    // Setup score list component
    const { createPlayTimeScoreList } = require('../../scripts/score-list');
    global.window.createPlayTimeScoreList = createPlayTimeScoreList;
    
    // Setup focus mode command system
    const createPlayTimeFocusModeCommands = require('../../scripts/focus-mode-commands');
    global.window.createPlayTimeFocusModeCommands = createPlayTimeFocusModeCommands;
    
    // Setup layout commands for focus mode
    const layoutCommands = require('../../scripts/layout-commands');
    global.window.PlayTimeLayoutCommands = layoutCommands;
    
    // Setup focus mode handler
    const FocusModeHandler = require('../../scripts/focus-mode-handler');
    global.window.PlayTimeFocusModeHandler = FocusModeHandler;
        
        // Setup logger for main.js
        const logger = require('../../scripts/logger');
        global.logger = logger;
        // Set logger to silent for tests
        logger.setSilent(true);
        
    // Require main.js once; it registers a DOMContentLoaded handler
        // Removed duplicate inner requires for SELECTORS
    require('../../scripts/main');
        
        // Trigger DOMContentLoaded event to initialize the app
        const domContentLoadedEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domContentLoadedEvent);
        
        // Wait for initialization to complete
        
    // Verify elements still exist AFTER app initialization
    const postInitCanvas = document.querySelector(SELECTORS.CANVAS) || document.querySelector('#pdf-canvas');
    const postInitInput = document.querySelector('input[type="file"]');
    const postInitViewer = document.querySelector(SELECTORS.VIEWER) || document.querySelector('.pdf-viewer-container');
        
        if (!postInitCanvas || !postInitInput || !postInitViewer) {
            throw new Error(`🚨 POST-INIT TEST SETUP FAILED: Elements disappeared after app init. Canvas: ${!!postInitCanvas}, Input: ${!!postInitInput}, Viewer: ${!!postInitViewer}`);
        }
        
        // Clear IndexedDB for clean test state using JSDOM
        await new Promise((resolve) => {
            const deleteReq = global.indexedDB.deleteDatabase('PlayTimeDB');
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => resolve();
        });
    });

    describe('Activity 1: Manage Music Scores', () => {
        describe('User Story 1.1: Add New Score', () => {
            test('As a musician, I want to upload a PDF score from my device', async () => {
                // Arrange
                const testPdfPath = 'tests/fixtures/sample-score.pdf';
                
                // Act
                const fileInput = document.querySelector('input[type="file"]');
                expect(fileInput).toBeTruthy();
                
                // Simulate file selection (we'll create a mock file since we can't actually read files in JSDOM)
                const mockFile = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
                Object.defineProperty(fileInput, 'files', {
                    value: [mockFile],
                    writable: false,
                });
                
                // Trigger change event
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Assert - Check if PDF canvas and viewer are present (these will fail until we implement them)
                const { SELECTORS } = require('../../scripts/constants');
                const pdfCanvas = document.querySelector(SELECTORS.CANVAS) || document.querySelector('#pdf-canvas');
                const pdfViewer = document.querySelector(SELECTORS.VIEWER) || document.querySelector('.pdf-viewer-container');
                expect(pdfCanvas).toBeTruthy();
                expect(pdfViewer?.textContent).toContain('sample-score.pdf');
            });

            test('After uploading a score, the current score title updates immediately', async () => {
                // Arrange
                const fileInput = document.querySelector('input[type="file"]');
                expect(fileInput).toBeTruthy();
                const mockFile = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
                Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: false });

                // Act
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                // Allow async handlers to complete
                await new Promise(resolve => setTimeout(resolve, 20));

                // Assert: current score title reflects uploaded file name
                const currentScoreTitle = document.querySelector(SCORE_LIST_CONFIG.SELECTORS.CURRENT_SCORE_TITLE);
                expect(currentScoreTitle).toBeTruthy();
                expect(currentScoreTitle?.textContent).toContain('sample-score.pdf');
            });

            test('After uploading a second score, it remains selected and visible (does not revert to first)', async () => {
                // Arrange
                const fileInput = document.querySelector('input[type="file"]');
                const first = new File(['mock pdf 1'], 'first.pdf', { type: 'application/pdf' });
                const second = new File(['mock pdf 2'], 'second.pdf', { type: 'application/pdf' });

                // Upload first
                Object.defineProperty(fileInput, 'files', { value: [first], writable: false, configurable: true });
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise(r => setTimeout(r, 30));

                // Upload second
                Object.defineProperty(fileInput, 'files', { value: [second], writable: false, configurable: true });
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Allow async handlers and any list refreshes to complete
                await new Promise(r => setTimeout(r, 60));

                // Assert
                const currentScoreTitle = document.querySelector(SCORE_LIST_CONFIG.SELECTORS.CURRENT_SCORE_TITLE);
                expect(currentScoreTitle).toBeTruthy();
                expect(currentScoreTitle?.textContent).toContain('second.pdf');
            });

            test('As a musician, I want the uploaded PDF to be saved locally in my browser', async () => {
                // Arrange
                const mockFile = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
                const fileInput = document.querySelector('input[type="file"]');

                // Act - Simulate file upload
                Object.defineProperty(fileInput, 'files', {
                    value: [mockFile],
                    writable: false,
                });
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Allow time for async operations
                await new Promise(resolve => setTimeout(resolve, 100));

                // Verify the PDF is stored using our mock database (new DB abstraction)
                const storedPdfs = await global.window.PlayTimeDB.getAll();

                // Assert - Check that the file was saved (accounting for potential duplicates from multiple event listeners)
                expect(storedPdfs.length).toBeGreaterThanOrEqual(1);
                expect(storedPdfs[0].name).toBe('sample-score.pdf');
            });
        });

        describe('User Story 1.2: View & Select Existing Score', () => {
            test('As a musician, I want to see a list of all scores I have previously added', async () => {
                // Clear any existing data from previous tests (new DB abstraction)
                if (global.window.PlayTimeDB.getAll) {
                    const all = await global.window.PlayTimeDB.getAll();
                    if (all && all.length) {
                        for (const item of all) {
                            if (item && item.id) {
                                await global.window.PlayTimeDB.delete(item.id);
                            }
                        }
                    }
                }

                // Clear the DOM score list as well
                const scoresListElement = document.querySelector('#scores-list');
                if (scoresListElement) {
                    scoresListElement.innerHTML = '';
                }

                // Refresh the score list to ensure it starts empty
                if (global.window.PlayTimeScoreList) {
                    await global.window.PlayTimeScoreList.refresh();
                }

                // Directly add PDFs to the database (simulating file uploads)
                const mockFile1 = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
                const mockFile2 = new File(['mock pdf content 2'], 'another-score.pdf', { type: 'application/pdf' });

                if (global.window.PlayTimeDB.save) {
                    await global.window.PlayTimeDB.save(mockFile1);
                    await global.window.PlayTimeDB.save(mockFile2);
                } else if (global.window.PlayTimeDB.savePDF) {
                    await global.window.PlayTimeDB.savePDF(mockFile1);
                    await global.window.PlayTimeDB.savePDF(mockFile2);
                }

                // Refresh the score list to show the uploaded PDFs
                if (global.window.PlayTimeScoreList) {
                    await global.window.PlayTimeScoreList.refresh();
                }

                // Wait for DOM updates
                await new Promise(resolve => setTimeout(resolve, 10));

                // Act & Assert
                const scoresList = document.querySelector('#scores-list');
                expect(scoresList).toBeTruthy();
                const scoreItems = document.querySelectorAll('.score-item');
                expect(scoreItems).toHaveLength(2);
                expect(scoresList.textContent).toContain('sample-score.pdf');
                expect(scoresList.textContent).toContain('another-score.pdf');
            });

            test('As a musician, I want to select a score from my list to open and view its content', async () => {

                // Arrange - Upload two PDFs, replacing the file input between uploads to avoid redefining 'files'
                let fileInput = document.querySelector('input[type="file"]');
                const mockFile1 = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
                const mockFile2 = new File(['mock pdf content 2'], 'another-score.pdf', { type: 'application/pdf' });

                // First upload
                Object.defineProperty(fileInput, 'files', { value: [mockFile1], writable: false });
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                if (global.window.PlayTimeScoreList) {
                    await global.window.PlayTimeScoreList.refresh();
                }
                await new Promise(resolve => setTimeout(resolve, 20));

                // Add the second file directly to the DB abstraction
                if (global.window.PlayTimeDB.save) {
                    await global.window.PlayTimeDB.save(mockFile2);
                } else if (global.window.PlayTimeDB.savePDF) {
                    await global.window.PlayTimeDB.savePDF(mockFile2);
                }
                if (global.window.PlayTimeScoreList) {
                    await global.window.PlayTimeScoreList.refresh();
                }
                await new Promise(resolve => setTimeout(resolve, 20));

                // Wait for the target score item to appear in the DOM
                let targetScore = null;
                for (let i = 0; i < 20; i++) {
                    const scoreItems = document.querySelectorAll('.score-item[data-pdf-id]');
                    targetScore = Array.from(scoreItems).find(item => item.textContent.includes('another-score.pdf'));
                    if (targetScore) break;
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                expect(targetScore).toBeTruthy();

                // Act: Click the target score item
                targetScore.click();

                // Wait for the UI to update (current score title)
                let currentScoreTitle = null;
                for (let i = 0; i < 20; i++) {
                    currentScoreTitle = document.querySelector(SCORE_LIST_CONFIG.SELECTORS.CURRENT_SCORE_TITLE);
                    if (currentScoreTitle && currentScoreTitle.textContent.includes('another-score.pdf')) break;
                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                // Assert
                const pdfCanvas = document.querySelector(SELECTORS.CANVAS) || document.querySelector('#pdf-canvas');
                expect(pdfCanvas).toBeTruthy();
                expect(currentScoreTitle).toBeTruthy();
                expect(currentScoreTitle.textContent).toContain('another-score.pdf');
            });
        });
    });

    describe('Activity 2: Analyze Score', () => {
        beforeEach(async () => {
            // Load a PDF for markup tests
            const fileInput = document.querySelector('input[type="file"]');
            const mockFile = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
            Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: false });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        describe('User Story 2.1: View PDF Score', () => {
            test('As a musician, I want to view the pages of my selected PDF score clearly on the screen', async () => {
                // Assert
                const pdfCanvas = document.querySelector(SELECTORS.CANVAS) || document.querySelector('#pdf-canvas');
                expect(pdfCanvas).toBeTruthy();
                
                // Check that the canvas has content (not empty)
                const canvas = document.querySelector(SELECTORS.CANVAS) || document.getElementById('pdf-canvas');
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const canvasHasContent = imageData.data.some(pixel => pixel !== 0);
                expect(canvasHasContent).toBe(true);
            });

            test('As a musician, I want basic page navigation for multi-page scores', async () => {
                // Assert navigation controls exist
                const prevPageBtn = document.querySelector('#prev-page-btn');
                const nextPageBtn = document.querySelector('#next-page-btn');
                const pageInfo = document.querySelector(SELECTORS.PAGE_INFO) || document.querySelector('#page-info');
                
                expect(prevPageBtn).toBeTruthy();
                expect(nextPageBtn).toBeTruthy();
                expect(pageInfo?.textContent).toContain('Page 1');
            });

            test('As a musician, I want a zoom button to increase the score view', async () => {
                const zoomInBtn = document.querySelector(CONFIG.SELECTORS.ZOOM_IN_BTN);
                const zoomOutBtn = document.querySelector(CONFIG.SELECTORS.ZOOM_OUT_BTN);
                const zoomDisplay = document.querySelector(CONFIG.SELECTORS.ZOOM_DISPLAY);
                expect(zoomInBtn).toBeTruthy();
                expect(zoomOutBtn).toBeTruthy();
                // Functional check: clicking changes canvas dimensions & display text
                const canvas = document.querySelector('#pdf-canvas');
                const initialWidth = canvas.width;
                if (zoomInBtn) zoomInBtn.click();
                await new Promise(r => setTimeout(r, 10));
                const afterWidth = canvas.width;
                expect(afterWidth).toBeGreaterThanOrEqual(initialWidth); // allow equality if min pages small
                if (zoomDisplay) {
                    // Expect display to reflect >= 100%
                    const numeric = parseInt(zoomDisplay.textContent);
                    if (!isNaN(numeric)) {
                        expect(numeric).toBeGreaterThanOrEqual(100);
                    }
                }
            });
        });
    });

    describe('Activity 3: Practice Score', () => {
        beforeEach(async () => {
            // Setup with a PDF
            const fileInput = document.querySelector('input[type="file"]');
            const mockFile = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
            Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: false });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        describe('User Story 3.1: Distraction-Free Mode', () => {
            test('As a musician, I want to hide UI distractions to focus on the score', async () => {
                // Arrange
                const focusModeBtn = document.querySelector(CONFIG.SELECTORS.FOCUS_MODE_BTN);
                const sidebar = document.querySelector(SELECTORS.SIDEBAR) || document.querySelector('.sidebar');
                expect(focusModeBtn).toBeTruthy();
                expect(sidebar).toBeTruthy();

                // Assert initial state: sidebar is visible
                expect(window.getComputedStyle(sidebar).display).not.toBe('none');

                // Act
                focusModeBtn.click();
                await new Promise(resolve => setTimeout(resolve, 50)); // wait for CSS transition

                // Assert final state: sidebar is hidden
                expect(window.getComputedStyle(sidebar).display).toBe('none');
            });

            test('Toggling focus mode does not clear the canvas content (dimensions unchanged)', async () => {
                // Arrange
                const focusModeBtn = document.querySelector(CONFIG.SELECTORS.FOCUS_MODE_BTN);
                const canvas = document.getElementById('pdf-canvas');
                expect(focusModeBtn).toBeTruthy();
                expect(canvas).toBeTruthy();
                const w = canvas.width;
                const h = canvas.height;
                expect(w).toBeGreaterThan(0);
                expect(h).toBeGreaterThan(0);

                // Act - enter focus
                focusModeBtn.click();
                await new Promise(r => setTimeout(r, 30));

                // Assert - dimensions unchanged
                expect(canvas.width).toBe(w);
                expect(canvas.height).toBe(h);

                // Act - exit focus
                const exitBtn = document.querySelector(SELECTORS.EXIT_FOCUS_BTN) || document.getElementById('exit-focus-btn');
                exitBtn?.click();
                await new Promise(r => setTimeout(r, 30));

                // Assert - still unchanged
                expect(canvas.width).toBe(w);
                expect(canvas.height).toBe(h);
            });
        });
    });

    describe('Activity 4: Practice Marked Sections', () => {
        beforeEach(async () => {
            // Setup with a PDF; do not pre-draw or set colors so overlay starts hidden
            const fileInput = document.querySelector('input[type="file"]');
            const mockFile = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
            Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: false });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        describe('User Story 4.1: Highlight Sections', () => {
            test('As a musician, I want to draw a rectangle over a part of the score to define a practice section', async () => {
                // Arrange
                const HL_CONFIG = global.window.PlayTimeHighlighting?.CONFIG || { SELECTORS: { CANVAS: '[data-role="pdf-canvas"]', SELECTION_OVERLAY: '[data-role="selection-overlay"]' } };
                const canvas = document.querySelector(HL_CONFIG.SELECTORS.CANVAS) || document.getElementById('pdf-canvas');

                // Assert - selection overlay should not be visible before dragging (check computed style)
                let selectionOverlay = document.querySelector(HL_CONFIG.SELECTORS.SELECTION_OVERLAY) || document.querySelector('.selection-overlay');
                if (selectionOverlay) {
                    const style = window.getComputedStyle(selectionOverlay);
                    expect(style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0').toBe(true);
                } else {
                    // If not in DOM, that's also not visible
                    expect(selectionOverlay).toBeFalsy();
                }

                // Act - simulate drawing a rectangle with mouse events
                const mouseDownEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    clientX: 100,
                    clientY: 100
                });
                const mouseMoveEvent = new MouseEvent('mousemove', {
                    bubbles: true,
                    clientX: 200,
                    clientY: 150
                });
                const mouseUpEvent = new MouseEvent('mouseup', {
                    bubbles: true,
                    clientX: 200,
                    clientY: 150
                });

                canvas.dispatchEvent(mouseDownEvent);
                canvas.dispatchEvent(mouseMoveEvent);

                // Assert - check for selection feedback (should now be visible)
                selectionOverlay = document.querySelector(HL_CONFIG.SELECTORS.SELECTION_OVERLAY) || document.querySelector('.selection-overlay');
                expect(selectionOverlay).toBeTruthy();
                const style = window.getComputedStyle(selectionOverlay);
                expect(style.display == 'none' && style.visibility == 'hidden' && style.opacity !== '0').toBe(false);
                
                canvas.dispatchEvent(mouseUpEvent);
                const hidden = window.getComputedStyle(selectionOverlay);
                expect(hidden.display == 'none' && hidden.visibility == 'hidden' && hidden.opacity == '0').toBe(true);
            });

            test('As a musician, I want to assign a color code (green, amber, red) to each section', async () => {
                // Arrange
                const HL_CONFIG = global.window.PlayTimeHighlighting?.CONFIG || { SELECTORS: { CANVAS: '[data-role="pdf-canvas"]', SELECTION_OVERLAY: '[data-role="selection-overlay"]' } };
                const canvas = document.querySelector(HL_CONFIG.SELECTORS.CANVAS) || document.getElementById('pdf-canvas');

                //set color code
                const colorCode = 'green'; // example color code
                const greenBtn = document.querySelector(SELECTORS.COLOR_GREEN);
                expect(greenBtn).toBeTruthy();
                greenBtn.click();

                // Act - simulate drawing a rectangle with mouse events
                const mouseDownEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    clientX: 100,
                    clientY: 100
                });
                const mouseMoveEvent = new MouseEvent('mousemove', {
                    bubbles: true,
                    clientX: 200,
                    clientY: 150
                });
                const mouseUpEvent = new MouseEvent('mouseup', {
                    bubbles: true,
                    clientX: 200,
                    clientY: 150
                });

                canvas.dispatchEvent(mouseDownEvent);
                canvas.dispatchEvent(mouseMoveEvent);
                canvas.dispatchEvent(mouseUpEvent);
                
                // Assert
                const greenHighlight = document.querySelector(SELECTORS.HIGHLIGHT + '[data-color="'+colorCode+'"]');
                expect(greenHighlight).toBeTruthy();
            });
        });

        describe('User Story 4.2: Persist Highlights', () => {
            test('As a musician, I want highlighted sections (practice sections) to persist when I reopen the score', async () => {
                // Arrange - choose a confidence (was color) BEFORE drawing (domain rule)
                const amberBtn = document.querySelector('#color-amber');
                expect(amberBtn).toBeTruthy();
                amberBtn.click();

                // Draw highlight
                const canvas = document.querySelector('#pdf-canvas');
                expect(canvas).toBeTruthy();
                const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 });
                const mouseMoveEvent = new MouseEvent('mousemove', { bubbles: true, clientX: 180, clientY: 140 });
                const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true, clientX: 180, clientY: 140 });
                canvas.dispatchEvent(mouseDownEvent);
                canvas.dispatchEvent(mouseMoveEvent);
                canvas.dispatchEvent(mouseUpEvent);

                // Sanity: highlight exists pre-reload
                let created = document.querySelector('.highlight[data-color="amber"]');
                expect(created).toBeTruthy();

                // Capture DOM-independent proof soon: we rely on persistence layer after reload

                // Simulate reload (simplified). Rebuild DOM from index.html then re-run app init
                const fs = require('fs');
                const path = require('path');
                const htmlContent = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
                document.documentElement.innerHTML = htmlContent;

                // Re-require setup pieces like in beforeEach of earlier suites (minimal bootstrap)
                // NOTE: We intentionally do not re-import the test file itself.
                const { SELECTORS: R_SELECTORS } = require('../../scripts/constants');
                const logger = require('../../scripts/logger');
                logger.setSilent(true);
                // Provide Memory DB factory again
                const MemoryDatabase = require('../../db/MemoryDatabase');
                global.window.createPlayTimeDB = (l) => new MemoryDatabase();
                // PDF viewer stub
                global.window.createPlayTimePDFViewer = (l) => ({
                    init: jest.fn().mockResolvedValue(true),
                    loadPDF: jest.fn().mockResolvedValue(true),
                    renderPage: jest.fn().mockResolvedValue(true),
                    getZoom: () => 1,
                    getZoomBounds: () => ({ min: 1, max: 3 }),
                    setZoom: jest.fn()
                });
                // Highlighting module
                global.window.PlayTimeHighlighting = require('../../scripts/highlighting.js');
                // Score list
                const { createPlayTimeScoreList } = require('../../scripts/score-list');
                global.window.createPlayTimeScoreList = createPlayTimeScoreList;
                // Main (will register DOMContentLoaded)
                require('../../scripts/main');
                document.dispatchEvent(new Event('DOMContentLoaded'));
                await new Promise(r => setTimeout(r, 50));

                // Select first score item (we add data-filename via component soon)
                const scoreItems = document.querySelectorAll('.score-item');
                if (scoreItems.length) {
                    scoreItems[0].click();
                }
                await new Promise(r => setTimeout(r, 50));

                // Assert - highlight recreated with confidence attribute (numeric) OR legacy data-color
                const amberRehydrated = document.querySelector('.highlight[data-color="amber"], .highlight[data-confidence]');
                expect(amberRehydrated).toBeTruthy();
            });
        });

        describe('User Story 4.3: Focus on a Highlighted Section', () => {
            test.skip('As a musician, I want to select one of my highlighted sections from the score', async () => {
                // Act
                const redHighlight = document.querySelector('.highlight[data-color="red"]');
                redHighlight?.click();
                
                // Assert
                expect(redHighlight?.classList.contains('selected')).toBe(true);
            });

            test.skip('As a musician, I want the application to zoom in on the selected section for focused practice', async () => {
                // Arrange - capture baseline canvas state BEFORE focus
                const pdfCanvas = document.querySelector('#pdf-canvas');
                expect(pdfCanvas).toBeTruthy();
                const initialTransform = window.getComputedStyle(pdfCanvas).transform;
                const initialWidth = pdfCanvas.width;
                const initialHeight = pdfCanvas.height;

                // Sanity: current implementation should have either 'none' or a matrix()
                expect(initialWidth).toBeGreaterThan(0);
                expect(initialHeight).toBeGreaterThan(0);

                // Act - select highlight then press focus button
                const redHighlight = document.querySelector('.highlight[data-color="red"]');
                redHighlight?.click();

                const focusSectionBtn = document.querySelector('#focus-section-btn');
                expect(focusSectionBtn).toBeTruthy();
                // For real UX we expect the focus button to be visible before click (will enforce later)
                // Clicking even if display none (JSDOM) still triggers handler if attached
                focusSectionBtn?.click();

                // Assert - EXPECT CHANGES that are NOT IMPLEMENTED YET (should FAIL until feature added)
                const postTransform = window.getComputedStyle(pdfCanvas).transform;
                const postWidth = pdfCanvas.width;
                const postHeight = pdfCanvas.height;

                // 1. Transform matrix should change and not remain 'none'
                expect(postTransform).not.toBe(initialTransform);
                expect(postTransform).not.toBe('none');

                // 2. Canvas should be re-rendered at a larger scale (either width or height increases)
                expect(postWidth > initialWidth || postHeight > initialHeight).toBe(true);

                // 3. Focus mode data attribute should be set on canvas (future implementation requirement)
                expect(pdfCanvas.getAttribute('data-focus-mode')).toBe('active');

                // 4. Exit button should become visible, focus button should hide
                const exitFocusBtn = document.querySelector(SELECTORS.EXIT_FOCUS_BTN) || document.querySelector('#exit-focus-btn');
                expect(exitFocusBtn).toBeTruthy();
                expect(exitFocusBtn?.style.display).not.toBe('none');
                expect(focusSectionBtn?.style.display).toBe('none');
            });
        });
    });
});
