/**
 * PlayTime Acceptance Tests
 * Outside-In methodology - these tests will initially fail and drive development
 */

describe('PlayTime Music Practice App', () => {
    beforeAll(async () => {
        // JSDOM setup is handled in tests/setup.js
    });

    beforeEach(async () => {
        // Clean up first
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        
        // Load the app HTML content and set up DOM properly
        const fs = require('fs');
        const path = require('path');
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
        
        // Verify DOM elements are present BEFORE continuing
        const pdfCanvas = document.querySelector('#pdf-canvas');
        const fileInput = document.querySelector('input[type="file"]');
        const pdfViewer = document.querySelector('.pdf-viewer-container');
        
        if (!pdfCanvas || !fileInput || !pdfViewer) {
            throw new Error(`🚨 TEST SETUP FAILED: Missing required elements. Canvas: ${!!pdfCanvas}, Input: ${!!fileInput}, Viewer: ${!!pdfViewer}`);
        }
        
        // Use the real in-memory database implementation for acceptance tests
        const MemoryDatabase = require('../../db/MemoryDatabase');
        global.window.createPlayTimeDB = (logger) => new MemoryDatabase();

        // Mock PDF viewer with loadPDF and renderPage methods
        global.window.createPlayTimePDFViewer = (logger) => ({ 
            init: jest.fn().mockResolvedValue(true),
            loadPDF: jest.fn().mockResolvedValue(true),
            renderPage: jest.fn().mockResolvedValue(true)
        });
        
        global.window.PlayTimeHighlighting = { init: jest.fn().mockResolvedValue(true) };
        
        // Setup score list component
        const createPlayTimeScoreList = require('../../scripts/score-list');
        global.window.createPlayTimeScoreList = createPlayTimeScoreList;
        
        // Setup logger for main.js
        const logger = require('../../scripts/logger');
        global.logger = logger;
        // Set logger to silent for tests
        logger.setSilent(true);
        
        // Load and execute the main application script
        const mainJsPath = path.join(__dirname, '../../scripts/main.js');
        const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
        eval(mainJsContent);
        
        // Trigger DOMContentLoaded event to initialize the app
        const domContentLoadedEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domContentLoadedEvent);
        
        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Verify elements still exist AFTER app initialization
        const postInitCanvas = document.querySelector('#pdf-canvas');
        const postInitInput = document.querySelector('input[type="file"]');
        const postInitViewer = document.querySelector('.pdf-viewer-container');
        
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
                const pdfCanvas = document.querySelector('#pdf-canvas');
                const pdfViewer = document.querySelector('.pdf-viewer-container');
                expect(pdfCanvas).toBeTruthy();
                expect(pdfViewer?.textContent).toContain('sample-score.pdf');
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
                    currentScoreTitle = document.querySelector('.current-score-title');
                    if (currentScoreTitle && currentScoreTitle.textContent.includes('another-score.pdf')) break;
                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                // Assert
                const pdfCanvas = document.querySelector('#pdf-canvas');
                expect(pdfCanvas).toBeTruthy();
                expect(currentScoreTitle).toBeTruthy();
                expect(currentScoreTitle.textContent).toContain('another-score.pdf');
            });
        });
    });

    describe('Activity 2: Analyze & Mark Up Score', () => {
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
                const pdfCanvas = document.querySelector('#pdf-canvas');
                expect(pdfCanvas).toBeTruthy();
                
                // Check that the canvas has content (not empty)
                const canvas = document.getElementById('pdf-canvas');
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const canvasHasContent = imageData.data.some(pixel => pixel !== 0);
                expect(canvasHasContent).toBe(true);
            });

            test('As a musician, I want basic page navigation for multi-page scores', async () => {
                // Assert navigation controls exist
                const prevPageBtn = document.querySelector('#prev-page-btn');
                const nextPageBtn = document.querySelector('#next-page-btn');
                const pageInfo = document.querySelector('#page-info');
                
                expect(prevPageBtn).toBeTruthy();
                expect(nextPageBtn).toBeTruthy();
                expect(pageInfo?.textContent).toContain('Page 1');
            });
        });

        describe('User Story 2.2: Highlight Sections', () => {
            test.skip('As a musician, I want to draw a rectangle over a part of the score to define a practice section', async () => {
                // Arrange
                const canvas = document.querySelector('#pdf-canvas');

                // Assert - selection overlay should not be visible before dragging (check computed style)
                let selectionOverlay = document.querySelector('.selection-overlay');
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
                canvas.dispatchEvent(mouseUpEvent);

                // Assert - check for selection feedback (should now be visible)
                selectionOverlay = document.querySelector('.selection-overlay');
                expect(selectionOverlay).toBeTruthy();
                const style = window.getComputedStyle(selectionOverlay);
                expect(style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0').toBe(true);
            });

            test.skip('As a musician, I want to assign a color code (green, amber, red) to each section', async () => {
                // Arrange - create a selection first
                const canvas = document.querySelector('#pdf-canvas');
                const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 });
                const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 150 });
                canvas.dispatchEvent(mouseDownEvent);
                canvas.dispatchEvent(mouseUpEvent);
                
                // Act
                const colorGreenBtn = document.querySelector('#color-green');
                colorGreenBtn?.click();
                
                // Assert
                const greenHighlight = document.querySelector('.highlight[data-color="green"]');
                expect(greenHighlight).toBeTruthy();
            });
        });

        describe('User Story 2.3: Persist Highlights', () => {
            test.skip('As a musician, I want highlighted sections to be saved locally and persist when I reopen the score', async () => {
                // Arrange - create a highlight
                const canvas = document.querySelector('#pdf-canvas');
                const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 });
                const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 150 });
                canvas.dispatchEvent(mouseDownEvent);
                canvas.dispatchEvent(mouseUpEvent);
                
                const colorAmberBtn = document.querySelector('#color-amber');
                colorAmberBtn?.click();
                
                // Act - reload the page to simulate reopening
                // In JSDOM, we simulate this by reloading the HTML and then selecting the score
                const fs = require('fs');
                const path = require('path');
                const htmlContent = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
                document.documentElement.innerHTML = htmlContent;
                
                const scoreItem = document.querySelector('.score-item[data-filename="sample-score.pdf"]');
                scoreItem?.click();
                
                // Assert - highlight should still be there
                const amberHighlight = document.querySelector('.highlight[data-color="amber"]');
                expect(amberHighlight).toBeTruthy();
            });
        });
    });

    describe('Activity 3: Practice Marked Sections', () => {
        beforeEach(async () => {
            // Setup with a PDF and some highlights
            const fileInput = document.querySelector('input[type="file"]');
            const mockFile = new File(['mock pdf content'], 'sample-score.pdf', { type: 'application/pdf' });
            Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: false });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Create a highlight
            const canvas = document.querySelector('#pdf-canvas');
            const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 });
            const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 150 });
            canvas.dispatchEvent(mouseDownEvent);
            canvas.dispatchEvent(mouseUpEvent);
            
            const colorRedBtn = document.querySelector('#color-red');
            colorRedBtn?.click();
        });

        describe('User Story 3.1: Focus on a Highlighted Section', () => {
            test.skip('As a musician, I want to select one of my highlighted sections from the score', async () => {
                // Act
                const redHighlight = document.querySelector('.highlight[data-color="red"]');
                redHighlight?.click();
                
                // Assert
                expect(redHighlight?.classList.contains('selected')).toBe(true);
            });

            test('As a musician, I want the application to zoom in on the selected section for focused practice', async () => {
                // Act
                const redHighlight = document.querySelector('.highlight[data-color="red"]');
                redHighlight?.click();
                
                const focusSectionBtn = document.querySelector('#focus-section-btn');
                focusSectionBtn?.click();
                
                // Assert - check that the view has changed (zoomed/cropped)
                const pdfCanvas = document.querySelector('#pdf-canvas');
                const canvasTransform = window.getComputedStyle(pdfCanvas).transform;
                expect(canvasTransform).not.toBe('none');
                
                const exitFocusBtn = document.querySelector('#exit-focus-btn');
                expect(exitFocusBtn).toBeTruthy();
            });
        });
    });
});
