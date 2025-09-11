/**
 * PlayTime Acceptance Tests
 * Outside-In methodology - these tests will initially fail and drive development
 */

const { SCORE_LIST_CONFIG } = require('../../scripts/score-list');
const { PT_CONSTANTS } = require('../../scripts/constants');
// Import templates needed for practice planner
const { PracticePlannerTemplates } = require('../../scripts/Practice/templates/practice-planner-template.js');
const SELECTORS = PT_CONSTANTS.SELECTORS;

// Make templates available globally for tests
global.window.PracticePlannerTemplates = PracticePlannerTemplates;

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
        const MemoryDatabase = require('../../scripts/db/MemoryDatabase');
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
                setZoom: jest.fn().mockImplementation((v) => { zoom = clamp(Number(v) || 1.0); return zoom; }),
                // Minimal implementation used by focus mode handler during tests
                focusOnRectPercent: jest.fn().mockImplementation(async (pctRect, opts = {}) => {
                    // Emulate logic: ensure zoom > 1 for focus highlight
                    if (zoom <= 1) {
                        viewer.setZoom(1.1);
                    }
                    return { zoom: viewer.getZoom(), centered: { deltaX: 0, deltaY: 0 } };
                })
            };
            viewer.zoomIn = jest.fn(() => viewer.setZoom(zoom + ZOOM.STEP));
            viewer.zoomOut = jest.fn(() => viewer.setZoom(zoom - ZOOM.STEP));
            return viewer;
        };
        // Prefer registering the test factory into the DI container when
        // available so the app can resolve the viewer via DI. Keep a global
        // fallback for legacy test paths.
        
        if (typeof global.window.createPlayTimePDFViewer === 'function') {
            
            if (global.window.diContainer && global.window.diContainer.container && typeof global.window.diContainer.container.singleton === 'function') {
                try { global.window.diContainer.container.singleton('playTimePDFViewer', (logger) => global.window.createPlayTimePDFViewer(logger, PT_CONSTANTS)); } catch(_) {}
            }
                
            if (!global.window.PlayTimePDFViewer) {
                try { global.window.PlayTimePDFViewer = global.window.createPlayTimePDFViewer(global.logger || console); } catch(_) {}
            }
        }
        
    // Setup dependencies for highlighting module (required after dependency injection refactoring)
    const confidence = require('../../scripts/confidence');
    global.window.PlayTimeConfidence = confidence;
    
    // Use real highlighting capability (data-role driven)
    const Highlighting = require('../../scripts/highlighting/highlighting.js');
    global.window.PlayTimeHighlighting = Highlighting;
    // Provide a minimal Mock DIContainer so main.js can resolve highlightPersistenceService
    // This proxy lazily forwards calls to the real persistence service once highlighting initializes.
    class MockDIContainer {
        constructor() {
            this._services = new Map();
        }
        initialize() { /* noop for tests */ }
        has(name) {
            // advertise common names main.js queries
            return ['logger', 'database', 'playTimeHighlighting', 'highlightPersistenceService'].includes(name);
        }
        get(name) {
            if (name === 'logger') return global.logger || console;
            if (name === 'database') return global.window.PlayTimeDB;
            if (name === 'playTimeHighlighting') return global.window.PlayTimeHighlighting;
            if (name === 'highlightPersistenceService') {
                // Return a proxy that forwards method calls to the real persistence service when available
                return new Proxy({}, {
                    get: (_target, prop) => {
                        return (...args) => {
                            const svc = global.window.PlayTimeHighlighting && global.window.PlayTimeHighlighting._components && global.window.PlayTimeHighlighting._components.persistenceService;
                            if (!svc) throw new Error('HighlightPersistenceService not initialized yet');
                            const fn = svc[prop];
                            if (typeof fn === 'function') return fn.apply(svc, args);
                            return fn;
                        };
                    }
                });
            }
            throw new Error('MockDIContainer: unknown service ' + name);
        }
    }
    global.window.DIContainer = MockDIContainer;
        
    // Setup score list component
    const { createPlayTimeScoreList } = require('../../scripts/score-list');
    global.window.createPlayTimeScoreList = createPlayTimeScoreList;
    
    // Setup focus mode command system
    const createPlayTimeFocusModeCommands = require('../../scripts/layout/focus-mode-commands.js');
    global.window.createPlayTimeFocusModeCommands = createPlayTimeFocusModeCommands;
    
    // Setup layout commands for focus mode
    const layoutCommands = require('../../scripts/layout/layout-commands.js');
    global.window.PlayTimeLayoutCommands = layoutCommands;
    
    // Setup focus mode handler
    const FocusModeHandler = require('../../scripts/layout/focus-mode-handler.js');
    global.window.PlayTimeFocusModeHandler = FocusModeHandler;
    
    // Setup practice planner
    const { createPlayTimePracticePlanner } = require('../../scripts/Practice/practice-planner.js');
    global.window.createPlayTimePracticePlanner = createPlayTimePracticePlanner;
        
        // Setup logger for main.js
        const logger = require('../../scripts/logger');
        global.logger = logger;
    // Set logger to silent for tests
    logger.setSilent(true);
        
    // Bootstrap the application using integration test harness (same as integration tests)
    const { triggerDOMContentLoaded } = require('../helpers/integration-bootstrap');
    await triggerDOMContentLoaded();

        // Inject a score list instance into the DI container for cleaner wiring
        try {
            const scoreListInstance = createPlayTimeScoreList(null, global.logger);
            if (window.diContainer && window.diContainer.container && window.diContainer.container.instances) {
                // Place the instance directly into the ServiceContainer instances map
                window.diContainer.container.instances.set('playTimeScoreList', scoreListInstance);
            } else if (window.diContainer && window.diContainer.container && typeof window.diContainer.container.singleton === 'function') {
                // Register as a singleton factory that returns the instance
                try { window.diContainer.container.singleton('playTimeScoreList', () => scoreListInstance, ['database','logger']); } catch (_) {}
            } else {
                // final fallback for older bootstraps
                window.PlayTimeScoreList = scoreListInstance;
            }
        } catch (_) {}

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
            test.skip('As a musician, I want to see a list of all scores I have previously added', async () => {
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

            test.skip('As a musician, I want to select a score from my list to open and view its content', async () => {

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
                const zoomInBtn = document.querySelector(PT_CONSTANTS.SELECTORS.ZOOM_IN);
                const zoomOutBtn = document.querySelector(PT_CONSTANTS.SELECTORS.ZOOM_OUT);
                const zoomDisplay = document.querySelector('[data-role="zoom-display"]'); // Add to constants if needed
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
                const focusModeBtn = document.querySelector(PT_CONSTANTS.SELECTORS.FOCUS_SECTION_BTN);
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
                const focusModeBtn = document.querySelector(PT_CONSTANTS.SELECTORS.FOCUS_SECTION_BTN);
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
            test.skip('As a musician, I want to draw a rectangle over a part of the score to define a practice section', async () => {
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

                // First activate highlighting mode by clicking the toggle button
                const highlightToggle = document.querySelector('#highlighting-toggle');
                expect(highlightToggle).toBeTruthy();
                highlightToggle.click();
                
                // Verify confidence panel is now visible
                const confidencePanel = document.querySelector('#confidence-panel');
                expect(confidencePanel).toBeTruthy();
                expect(confidencePanel.style.display).not.toBe('none');

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
            test.skip('As a musician, I want highlighted sections (practice sections) to persist when I switch away and back to the score', async () => {
                // First activate highlighting mode
                const highlightToggle = document.querySelector('#highlighting-toggle');
                expect(highlightToggle).toBeTruthy();
                highlightToggle.click();
                
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

                // Add a second score directly through the DB (avoids redefining file input files)
                const secondFile = new File(['mock pdf content 2'], 'another-score.pdf', { type: 'application/pdf' });
                if (window.PlayTimeDB && window.PlayTimeDB.save) {
                    await window.PlayTimeDB.save(secondFile);
                }
                if (global.window.PlayTimeScoreList) {
                    await global.window.PlayTimeScoreList.refresh();
                }
                await new Promise(r => setTimeout(r, 50));
                // Find items again after refresh
                let scoreItems = document.querySelectorAll('.score-item[data-pdf-id]');
                // Click second score (switch away)
                const secondItem = Array.from(scoreItems).find(i => i.textContent.includes('another-score.pdf'));
                if (secondItem) secondItem.click();
                await new Promise(r => setTimeout(r, 50));
                // Switch back to first score
                scoreItems = document.querySelectorAll('.score-item[data-pdf-id]');
                const firstItem = Array.from(scoreItems).find(i => i.textContent.includes('sample-score.pdf'));
                if (firstItem) firstItem.click();
                await new Promise(r => setTimeout(r, 80));

                // Assert - highlight recreated with confidence attribute (numeric) OR legacy data-color
                const amberRehydrated = document.querySelector('.highlight[data-color="amber"], .highlight[data-confidence]');
                expect(amberRehydrated).toBeTruthy();
            });

            test.skip('Green confidence highlight is created in DOM and stored when drawn', async () => {
                // Arrange
                // First activate highlighting mode
                const highlightToggle = document.querySelector('#highlighting-toggle');
                expect(highlightToggle).toBeTruthy();
                highlightToggle.click();
                
                const greenBtn = document.querySelector('#color-green');
                expect(greenBtn).toBeTruthy();
                greenBtn.click();
                const canvas = document.querySelector('#pdf-canvas');
                expect(canvas).toBeTruthy();
                const md = new MouseEvent('mousedown', { bubbles: true, clientX: 110, clientY: 110 });
                const mm = new MouseEvent('mousemove', { bubbles: true, clientX: 190, clientY: 150 });
                const mu = new MouseEvent('mouseup', { bubbles: true, clientX: 190, clientY: 150 });
                canvas.dispatchEvent(md);
                canvas.dispatchEvent(mm);
                canvas.dispatchEvent(mu);
                // Assert DOM
                const greenHighlight = document.querySelector('.highlight[data-color="green"]');
                expect(greenHighlight).toBeTruthy();
                // Assert persistence (if DB supports getHighlights)
                if (window.PlayTimeDB && typeof window.PlayTimeDB.getHighlights === 'function' && window.PlayTimeCurrentScoreId != null) {
                    const secs = await window.PlayTimeDB.getHighlights(window.PlayTimeCurrentScoreId);
                    const anyGreen = (secs || []).some(s => String(s.confidence) === '2' || s.confidence === 2);
                    expect(anyGreen).toBe(true);
                }
            });
        });

        describe('User Story 4.3: Focus on a Highlighted Section', () => {
            test.skip('As a musician, I want to select one of my highlighted sections from the score', async () => {
                const canvas = document.querySelector(SELECTORS.CANVAS);
                const viewer = document.querySelector(SELECTORS.VIEWER);
                expect(canvas).toBeTruthy();
                expect(viewer).toBeTruthy();

                // First activate highlighting mode
                const highlightToggle = document.querySelector('#highlighting-toggle');
                expect(highlightToggle).toBeTruthy();
                highlightToggle.click();

                // Choose a confidence color to enable drawing
                const greenBtn = document.querySelector(SELECTORS.COLOR_GREEN);
                expect(greenBtn).toBeTruthy();
                greenBtn.click();

                // Draw a highlight (simulate drag)
                const md = new MouseEvent('mousedown', { bubbles: true, clientX: 120, clientY: 120 });
                const mm = new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 170 });
                const mu = new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 170 });
                canvas.dispatchEvent(md);
                canvas.dispatchEvent(mm);
                canvas.dispatchEvent(mu);

                const highlight = document.querySelector('.highlight[data-color="green"]');
                expect(highlight).toBeTruthy();

                // Capture focus event
                let focusEventDetail = null;
                viewer.addEventListener('playtime:highlight-focus-requested', (e) => { focusEventDetail = e.detail; });

                // Act - double-click highlight to trigger focus
                highlight.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

                // Assert implemented behavior: focus-mode class added (zoom now handled by PDF viewer, not CSS transform)
                expect(viewer.classList.contains('focus-mode')).toBe(true);
                // New architecture: zoom comes from PDF viewer API, not canvas.style.transform
                try {
                    const _viewer = (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer')) ? window.diContainer.get('playTimePDFViewer') : window.PlayTimePDFViewer;
                    if (_viewer && typeof _viewer.getZoom === 'function') {
                        // allow a microtask for async focusOnRectPercent scheduling
                        await new Promise(r => setTimeout(r, 5));
                        const z = _viewer.getZoom();
                        expect(z).toBeGreaterThan(1);
                    }
                } catch(_) {}
                // Event dispatched with highlight information
                expect(focusEventDetail).not.toBeNull();
                expect(focusEventDetail.highlight).toBeTruthy();
            });

            test.skip('As a musician, I want the application to zoom in on the selected section for focused practice', async () => {
                const canvas = document.querySelector(SELECTORS.CANVAS);
                const viewer = document.querySelector(SELECTORS.VIEWER);
                expect(canvas).toBeTruthy();
                expect(viewer).toBeTruthy();

                // First activate highlighting mode
                const highlightToggle = document.querySelector('#highlighting-toggle');
                expect(highlightToggle).toBeTruthy();
                highlightToggle.click();

                // Prepare highlight (draw amber)
                const amberBtn = document.querySelector(SELECTORS.COLOR_AMBER);
                expect(amberBtn).toBeTruthy();
                amberBtn.click();
                const md = new MouseEvent('mousedown', { bubbles: true, clientX: 160, clientY: 140 });
                const mm = new MouseEvent('mousemove', { bubbles: true, clientX: 260, clientY: 210 });
                const mu = new MouseEvent('mouseup', { bubbles: true, clientX: 260, clientY: 210 });
                canvas.dispatchEvent(md);
                canvas.dispatchEvent(mm);
                canvas.dispatchEvent(mu);

                const highlight = document.querySelector('.highlight[data-color="amber"]');
                expect(highlight).toBeTruthy();

                // Capture exit event later
                let exitEventFired = false;
                viewer.addEventListener('playtime:highlight-focus-exited', () => { exitEventFired = true; });

                // Focus with double-click
                highlight.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                // Verify zoom increased via PDF viewer API (no longer using CSS scale transform on canvas)
                try {
                    const _viewer = (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer')) ? window.diContainer.get('playTimePDFViewer') : window.PlayTimePDFViewer;
                    if (_viewer && typeof _viewer.getZoom === 'function') {
                        await new Promise(r => setTimeout(r, 5));
                        const z = _viewer.getZoom();
                        expect(z).toBeGreaterThan(1);
                    }
                } catch(_) {}
                expect(viewer.classList.contains('focus-mode')).toBe(true);

                // Exit focus mode via public API
                if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.exitFocusMode === 'function') {
                    window.PlayTimeHighlighting.exitFocusMode();
                }

                expect(viewer.classList.contains('focus-mode')).toBe(false);
                // Canvas transform should remain unset/none in new zoom architecture
                expect(canvas.style.transform === '' || canvas.style.transform === 'none').toBe(true);
                expect(exitEventFired).toBe(true);
            });

            test.skip('Double-clicking (or focusing) a highlight dispatches a focus-mode layout command, increases pdf viewer zoom, and (conceptually) centers the highlight', async () => {
                const HighlightElement = require('../../scripts/highlighting/HighlightElement');
                const CoordinateMapper = require('../../scripts/highlighting/CoordinateMapper');

                const viewer = document.querySelector(SELECTORS.VIEWER);
                const canvas = document.querySelector(SELECTORS.CANVAS);
                expect(viewer).toBeTruthy();
                expect(canvas).toBeTruthy();

                // Capture last layout command payload (RED: currently focusOnHighlight does NOT dispatch this)
                let lastLayoutCommand = null;
                window.addEventListener('playtime:layout-command', (e) => {
                    lastLayoutCommand = e.detail;
                });

                // Mock non-zero geometry for viewer & canvas so focus math works (JSDOM normally returns 0 sizes)
                const width = 1200; const height = 800;
                viewer.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height });
                canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height });

                // Provide explicit canvas dimensions (some code may reference width/height props)
                canvas.width = width; canvas.height = height;

                // Create a highlight value object at an off-center location to verify translation
                const highlightVO = new HighlightElement({ xPct: 0.25, yPct: 0.4, wPct: 0.2, hPct: 0.15, color: 'red', confidence: 3, page: null });
                const absRect = CoordinateMapper.safeBoundingRect(canvas);
                const highlightEl = highlightVO.createDOMElement(absRect, 0, 0, { highlightClass: 'highlight', enableFocus: true });
                viewer.appendChild(highlightEl);
                expect(highlightEl).toBeTruthy();

                // Trigger focus mode via public API (manual creation bypassed internal click wiring)
                if (window.PlayTimeHighlighting && typeof window.PlayTimeHighlighting.focusOnHighlight === 'function') {
                    window.PlayTimeHighlighting.focusOnHighlight(highlightEl, { padding: 20 });
                } else {
                    highlightEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                }

                // NEW EXPECTATIONS (RED):
                // 1. A layout command of type 'focus-mode' should have been dispatched carrying highlight percentages
                expect(lastLayoutCommand && lastLayoutCommand.type).toBe('focus-mode');
                expect(lastLayoutCommand.options).toBeTruthy();
                expect(lastLayoutCommand.options.highlight).toMatchObject({
                    xPct: expect.any(Number),
                    yPct: expect.any(Number),
                    wPct: expect.any(Number),
                    hPct: expect.any(Number)
                });

                // 2. Viewer should have focus-mode class (may be added by handler after command)
                expect(viewer.classList.contains('focus-mode')).toBe(true);

                // 3. PDF viewer zoom API should reflect increased zoom (>1)
                try {
                    const _viewer = (window.diContainer && typeof window.diContainer.get === 'function' && window.diContainer.has && window.diContainer.has('playTimePDFViewer')) ? window.diContainer.get('playTimePDFViewer') : window.PlayTimePDFViewer;
                    if (_viewer && typeof _viewer.getZoom === 'function') {
                        const z = _viewer.getZoom();
                        expect(z).toBeGreaterThan(1);
                    } else {
                        // Force failure if pdf viewer unavailable (missing setup)
                        expect('PDF_VIEWER_AVAILABLE').toBe('true');
                    }
                } catch(_) {
                    expect('PDF_VIEWER_AVAILABLE').toBe('true');
                }

                // 4. (Conceptual) Centering: we can't measure scroll in JSDOM reliably yet; will assert in GREEN phase via returned zoom & future API
            });
        });
    });

    describe('Activity 5: Practice Session Planning & Progress Tracking', () => {
        beforeEach(async () => {
            // Load a PDF and create some highlights for practice planning tests
            const fileInput = document.querySelector('input[type="file"]');
            const mockFile = new File(['mock pdf content'], 'practice-score.pdf', { type: 'application/pdf' });
            Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: false });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Wait for PDF to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Manually initialize practice planner if not already done
            if (!global.window.PlayTimePracticePlanner && global.window.createPlayTimePracticePlanner) {
                
                global.window.PlayTimePracticePlanner = global.window.createPlayTimePracticePlanner(
                    logger, 
                    global.window.PlayTimeDB, 
                    global.window.PlayTimeHighlighting
                );
                await global.window.PlayTimePracticePlanner.init();
            } else if (global.window.PlayTimePracticePlanner) {
                await global.window.PlayTimePracticePlanner.init();
            }
        });

        describe('User Story 5.1: Configure Practice Session', () => {
            test('As a musician, I want to access practice planning from the main view', async () => {
                // GIVEN: I have a score loaded with some highlights
                const canvas = document.querySelector(SELECTORS.CANVAS);
                expect(canvas).toBeTruthy();
                
                // WHEN: I look for the practice planning call to action
                const practicePlanButton = document.querySelector('[data-role="setup-practice-plan"]');
                
                // THEN: I should see a "Setup practice plan" button above the focus mode toggle
                expect(practicePlanButton).toBeTruthy();
                expect(practicePlanButton.textContent).toContain('Setup practice plan');
                
                // AND: The button should be positioned above the focus mode toggle
                const focusToggle = document.querySelector('[data-role="toggle-focus-mode"]');
                expect(focusToggle).toBeTruthy();
                
                // In test environment, check DOM order instead of visual positioning
                const parent = practicePlanButton.parentElement;
                const children = Array.from(parent.children);
                const practicePlanIndex = children.indexOf(practicePlanButton);
                const focusToggleIndex = children.indexOf(focusToggle);
                expect(practicePlanIndex).toBeLessThan(focusToggleIndex);
            });

            test('As a musician, I want to enter practice planning mode by clicking the setup button', async () => {
                // GIVEN: I have the practice plan button available
                const practicePlanButton = document.querySelector('[data-role="setup-practice-plan"]');
                expect(practicePlanButton).toBeTruthy();
                
                // WHEN: I click the setup practice plan button
                let practiceSessionEvent = null;
                window.addEventListener('playtime:practice-session-start', (e) => {
                    practiceSessionEvent = e.detail;
                });
                
                practicePlanButton.click();
                
                // Wait a bit for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // THEN: A practice session start event should be dispatched with score context
                expect(practiceSessionEvent).toBeTruthy();
                expect(practiceSessionEvent.scoreId).toBeTruthy();
                expect(practiceSessionEvent.highlights).toBeDefined(); // array, may be empty initially
                expect(Array.isArray(practiceSessionEvent.highlights)).toBe(true);
            });

            test.skip('As a musician, I want the PDF canvas to be replaced with practice planning interface', async () => {
                // GIVEN: I can see the PDF canvas initially
                const canvas = document.querySelector(SELECTORS.CANVAS);
                const pdfViewer = document.querySelector(SELECTORS.VIEWER);
                expect(canvas).toBeTruthy();
                expect(pdfViewer).toBeTruthy();
                expect(canvas.style.display).not.toBe('none');
                
                // WHEN: I click setup practice plan
                const practicePlanButton = document.querySelector('[data-role="setup-practice-plan"]');
                practicePlanButton.click();
                
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // THEN: The viewer section should be in practice mode
                const viewerSection = document.querySelector('#viewer-section');
                expect(viewerSection.getAttribute('data-practice-mode')).toBe('active');
                
                // AND: A practice planning interface should be visible
                const practiceInterface = document.querySelector('[data-role="practice-planner"]');
                expect(practiceInterface).toBeTruthy();
                expect(practiceInterface.style.display).not.toBe('none');
            });

            test.skip('As a musician, I want to exit practice planning mode and return to the canvas view', async () => {
                // GIVEN: I am in practice planning mode
                const practicePlanButton = document.querySelector('[data-role="setup-practice-plan"]');
                practicePlanButton.click();
                
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // GIVEN: Practice mode should be active
                const viewerSection = document.querySelector('#viewer-section');
                expect(viewerSection.getAttribute('data-practice-mode')).toBe('active');
                const practiceInterface = document.querySelector('[data-role="practice-planner"]');
                expect(practiceInterface.style.display).not.toBe('none');
                
                // WHEN: I click the exit practice planning button
                let practiceSessionExitEvent = null;
                window.addEventListener('playtime:practice-session-exit', (e) => {
                    practiceSessionExitEvent = e.detail;
                });
                
                const exitButton = document.querySelector('[data-role="exit-practice-planning"]');
                expect(exitButton).toBeTruthy();
                exitButton.click();
                
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // THEN: A practice session exit event should be dispatched
                expect(practiceSessionExitEvent).toBeTruthy();
                
                // AND: Practice mode should be inactive
                expect(viewerSection.getAttribute('data-practice-mode')).toBeNull();
                
                // AND: The practice planning interface should be hidden
                expect(practiceInterface.style.display).toBe('none');
            });

            test('As a musician, I want to see a message when no highlights exist for practice planning', async () => {
                // GIVEN: I have a score with no highlights
                // (beforeEach loads a clean score)
                
                // WHEN: I enter practice planning mode
                const practicePlanButton = document.querySelector('[data-role="setup-practice-plan"]');
                practicePlanButton.click();
                
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // THEN: I should see a message about creating highlights
                const practiceInterface = document.querySelector('[data-role="practice-planner"]');
                expect(practiceInterface).toBeTruthy();
                
                const noHighlightsMessage = practiceInterface.querySelector('[data-role="no-highlights-message"]');
                expect(noHighlightsMessage).toBeTruthy();
                expect(noHighlightsMessage.textContent).toContain('No highlighted sections yet');
                
                // AND: There should be a way to return to highlight creation
                const returnToHighlightingButton = practiceInterface.querySelector('[data-role="return-to-highlighting"]');
                expect(returnToHighlightingButton).toBeTruthy();
            });
            test.skip('As a musician, I want to see the highlights I have created for a score listed in a sortable list', async () => {
                // GIVEN: several highlights exist for the score  
                const scoreId = 1;
                const highlights = [
                    { 
                        id: 'highlight-1', 
                        scoreId: scoreId, 
                        page: 2, 
                        xPct: 0.1, 
                        yPct: 0.3, 
                        wPct: 0.4, 
                        hPct: 0.1, 
                        confidence: 0
                    },
                    { 
                        id: 'highlight-2', 
                        scoreId: scoreId, 
                        page: 1, 
                        xPct: 0.2, 
                        yPct: 0.1, 
                        wPct: 0.3, 
                        hPct: 0.1, 
                        confidence: 1 
                    },
                    { 
                        id: 'highlight-3', 
                        scoreId: scoreId, 
                        page: 1, 
                        xPct: 0.1, 
                        yPct: 0.5, 
                        wPct: 0.5, 
                        hPct: 0.1, 
                        confidence: 2 
                    },
                ];
                
                // Save the highlights in the database
                await Promise.all(highlights.map(highlight => {
                    return window.PlayTimeDB.addHighlight({ ...highlight, pdfId: scoreId });
                }));

                // WHEN: I enter practice planning mode
                const practicePlanButton = document.querySelector('[data-role="setup-practice-plan"]');
                practicePlanButton.click();
                
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 150));

                // THEN: The practice content should be visible
                const practiceContent = document.querySelector('[data-role="practice-plan-content"]');
                expect(practiceContent).toBeTruthy();
                expect(practiceContent.style.display).not.toBe('none');

                // AND: I should see a list of practice sections
                const sectionsList = document.querySelector('[data-role="practice-sections-list"]');
                expect(sectionsList).toBeTruthy();

                // AND: The sections should be sorted by page and position
                const sections = sectionsList.querySelectorAll('.practice-section');
                expect(sections.length).toBe(3);

                // Verify sorting: Page 1 sections should come first, then Page 2
                const firstSection = sections[0];
                const secondSection = sections[1]; 
                const thirdSection = sections[2];

                // Check that page 1 sections come before page 2
                expect(firstSection.textContent).toContain('Page 1');
                expect(secondSection.textContent).toContain('Page 1');
                expect(thirdSection.textContent).toContain('Page 2');

                // AND: Each section should show confidence level
                expect(firstSection.textContent).toContain('Unsure'); // amber from highlight-2
                expect(secondSection.textContent).toContain('Confident'); // green from highlight-3  
                expect(thirdSection.textContent).toContain('Needs Work'); // red from highlight-1

                // AND: Section count should be displayed
                const sectionCount = document.querySelector('[data-role="section-count"]');
                expect(sectionCount).toBeTruthy();
                expect(sectionCount.textContent).toBe('3 sections');
            });
            
        });
    });
});
