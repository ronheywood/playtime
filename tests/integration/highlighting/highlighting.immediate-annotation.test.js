/** @jest-environment jsdom */

require('../../../scripts/main.js');
const { PT_CONSTANTS } = require('../../../scripts/constants.js');
const TestHelpers = require('../../helpers/test-helpers');

describe('Highlight Creation with Immediate Annotation', () => {
    let highlighting;
    let mockCanvas;
    let mockConfidenceModule;
    let mockConstantsModule;
    let silentLogger;

    beforeEach(() => {
        // Create silent logger to reduce test noise
        silentLogger = TestHelpers.createSilentLogger();
        
        // Ensure highlighting module is available
        const Highlighting = require('../../../scripts/highlighting/highlighting.js');
        global.PlayTimeHighlighting = Highlighting;
        
        // Setup DOM
        document.body.innerHTML = `
            <div class="pdf-viewer-container">
                <div id="pdf-canvas" style="position: relative; width: 800px; height: 600px;">
                    <canvas width="800" height="600"></canvas>
                </div>
            </div>
        `;

        mockCanvas = document.getElementById('pdf-canvas');
        
        // Mock confidence module
        mockConfidenceModule = {
            getActiveConfidence: jest.fn().mockReturnValue(2),
            getColorFromConfidence: jest.fn().mockReturnValue('green')
        };

        // Mock constants module  
        mockConstantsModule = {
            EVENTS: {
                CONFIDENCE_CHANGED: 'playtime:confidence-changed',
                SCORE_SELECTED: 'playtime:score-selected',
                PAGE_CHANGED: 'playtime:page-changed',
                LAYOUT_CHANGED: 'playtime:layout-changed',
                HIGHLIGHT_FOCUS_REQUESTED: 'playtime:highlight-focus-requested',
                HIGHLIGHT_FOCUS_EXITED: 'playtime:highlight-focus-exited',
                HIGHLIGHT_ANNOTATION_REQUESTED: 'playtime:highlight-annotation-requested',
                HIGHLIGHT_ANNOTATION_SAVED: 'playtime:highlight-annotation-saved',
                HIGHLIGHT_ANNOTATION_CANCELLED: 'playtime:highlight-annotation-cancelled'
            }
        };

        // Mock HighlightElement class
        global.HighlightElement = class MockHighlightElement {
            static fromRect(rect, canvasRect, color, confidence, page) {
                return new MockHighlightElement(rect, canvasRect, color, confidence, page);
            }

            constructor(rect, canvasRect, color, confidence, page) {
                this.rect = rect;
                this.canvasRect = canvasRect;
                this.color = color;
                this.confidence = confidence;
                this.page = page;
                this.id = 'highlight-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            }

            static createDOMElement(canvasRect, offsetLeft, offsetTop, options) {
                const element = document.createElement('div');
                element.className = 'highlight';
                element.style.cssText = `
                    position: absolute;
                    left: 100px;
                    top: 100px;
                    width: 200px;
                    height: 30px;
                    background: rgba(0, 255, 0, 0.3);
                    border: 2px solid green;
                `;
                
                // Add required data attributes
                element.dataset.hlId = 'test-highlight-' + Date.now();
                element.dataset.hlColor = 'green';
                element.dataset.hlConfidence = '3';
                element.dataset.page = '1';
                element.dataset.hlXPct = '12.5';
                element.dataset.hlYPct = '16.7';
                element.dataset.hlWPct = '25';
                element.dataset.hlHPct = '5';
                
                return element;
            }
        };

        // Initialize highlighting system
        highlighting = global.PlayTimeHighlighting;
        highlighting.init({}, silentLogger, mockConfidenceModule, mockConstantsModule);

        // Mock persistence service
        highlighting._components.persistenceService = {
            isAvailable: jest.fn().mockReturnValue(true),
            saveHighlight: jest.fn().mockResolvedValue(true)
        };

        // Set active confidence
        highlighting._state.activeConfidence = 2;

        // Mock PDF viewer for page information
        global.window.PlayTimePDFViewer = {
            getCurrentPage: jest.fn().mockReturnValue(1)
        };

        // Mock global score ID
        global.PlayTimeCurrentScoreId = 'test-score-123';
    });

    afterEach(() => {
        if (highlighting) {
            highlighting._clearHighlights();
        }
        document.body.innerHTML = '';
        delete global.HighlightElement;
        delete global.PlayTimeCurrentScoreId;
    });

    test('creates highlight and immediately shows annotation form', async () => {
        // Mock persistence service for this test
        const mockPersistenceService = {
            isAvailable: jest.fn().mockReturnValue(true),
            saveHighlight: jest.fn().mockResolvedValue(123)
        };
        highlighting._components.persistenceService = mockPersistenceService;

        // Mock the annotation form component
        const mockAnnotationForm = {
            showForHighlight: jest.fn(),
            hide: jest.fn()
        };
        highlighting._components.annotationForm = mockAnnotationForm;

        // Create a highlight by simulating mouse selection
        const mockSelection = { 
            rect: { x: 100, y: 100, width: 200, height: 30 }
        };
        
        // Simulate highlight creation via selection completion
        await highlighting._handleSelectionComplete(mockSelection);

        // Verify annotation form was shown
        expect(mockAnnotationForm.showForHighlight).toHaveBeenCalledWith(
            expect.objectContaining({
                color: 'green',
                confidence: 2,
                page: 1,
                isNewHighlight: true,
                element: expect.any(HTMLElement)
            })
        );

        // Verify highlight was created in DOM
        const highlights = document.querySelectorAll('.highlight');
        expect(highlights.length).toBe(1);
        expect(highlights[0].dataset.color).toBe('green');
    });

    test('shows action button when new highlight annotation is cancelled', () => {
        // Mock the action button component
        const mockActionButton = {
            showForHighlight: jest.fn(),
            hide: jest.fn()
        };
        highlighting._components.actionButton = mockActionButton;

        // Create mock highlight data
        const mockHighlightElement = document.createElement('div');
        mockHighlightElement.dataset.hlId = 'test-highlight';
        mockHighlightElement.dataset.hlColor = 'amber';

        const mockHighlightData = {
            highlightId: 'test-highlight',
            color: 'amber',
            isNewHighlight: true,
            element: mockHighlightElement
        };

        // Call the cancel handler
        highlighting._handleAnnotationCancelled(mockHighlightData);

        // Verify action button was shown
        expect(mockActionButton.showForHighlight).toHaveBeenCalledWith(mockHighlightElement);
    });

    test('does not show action button when existing highlight annotation is cancelled', () => {
        // Mock the action button component
        const mockActionButton = {
            showForHighlight: jest.fn(),
            hide: jest.fn()
        };
        highlighting._components.actionButton = mockActionButton;

        // Create mock highlight data for existing highlight
        const mockHighlightData = {
            highlightId: 'existing-highlight',
            color: 'red',
            isNewHighlight: false // Not a new highlight
        };

        // Call the cancel handler
        highlighting._handleAnnotationCancelled(mockHighlightData);

        // Verify action button was NOT shown
        expect(mockActionButton.showForHighlight).not.toHaveBeenCalled();
    });

    test('annotation form shows correct message for new highlights', () => {
        const annotationForm = highlighting._components.annotationForm;
        
        // Create mock form element
        const mockForm = document.createElement('div');
        const infoElement = document.createElement('p');
        infoElement.setAttribute('data-highlight-info', '');
        mockForm.appendChild(infoElement);
        annotationForm.form = mockForm;

        // Test with new highlight
        const newHighlightData = {
            color: 'green',
            page: 2,
            isNewHighlight: true
        };

        annotationForm.populateForm(newHighlightData);
        expect(infoElement.textContent).toBe('Add a title and notes to your new green highlight on page 2');

        // Test with existing highlight
        const existingHighlightData = {
            color: 'amber',
            page: 3,
            isNewHighlight: false
        };

        annotationForm.populateForm(existingHighlightData);
        expect(infoElement.textContent).toBe('Adding annotation to amber highlight on page 3');
    });
});
