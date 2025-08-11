// Integration Test: PDF Viewer Zoom Functionality
// Drives inner-loop development of zoom API before acceptance focus-mode feature

const TestHelpers = require('../helpers/test-helpers');
const TEST_CONSTANTS = require('../helpers/test-constants');

/**
 * EXPECTED NEW VIEWER API (to be implemented):
 * - getZoom(): number (returns current zoom multiplier, default 1.0)
 * - setZoom(multiplier: number): void (clamps to allowed range)
 * - zoomIn(): void (increments by step e.g. 0.25)
 * - zoomOut(): void (decrements by step)
 * - INTERNAL: renderPage should apply (fitScale * zoomMultiplier)
 */

describe('PDF Viewer Zoom Integration', () => {
    let viewer;
    let mockPage;

    beforeEach(async () => {
        // DOM with canvas
        TestHelpers.setupBasicDOM();
        // PDF.js mock
        mockPage = TestHelpers.setupPDFjsMock();
        // Canvas spy support
        jest.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'pdf-canvas') {
                return document.querySelector('#pdf-canvas');
            }
            return null;
        });
        // Provide parentElement size for fitting
        const canvas = document.querySelector('#pdf-canvas');
        canvas.parentElement = { clientWidth: TEST_CONSTANTS.CANVAS_SIZE.width, clientHeight: TEST_CONSTANTS.CANVAS_SIZE.height };
        // Create viewer instance
        viewer = TestHelpers.createPlayTimePDFViewer({
            info: () => {}, warn: () => {}, error: () => {}
        });
        await viewer.init();
        const file = TestHelpers.createMockFile();
        await viewer.loadPDF(file);
        mockPage.getViewport.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should expose default zoom of 1.0', () => {
        // Fails until getZoom implemented
        expect(typeof viewer.getZoom).toBe('function');
        expect(viewer.getZoom()).toBe(1.0);
    });

    test('setZoom should increase effective render scale', async () => {
        // Render baseline page first
        await viewer.renderPage(TEST_CONSTANTS.FIRST_PAGE);
        // Capture last scale argument used (second call to getViewport in render implementation)
        const baselineCalls = mockPage.getViewport.mock.calls.map(c => c[0]?.scale).filter(Boolean);
        expect(baselineCalls.length).toBeGreaterThan(0);
        const baselineFitScale = baselineCalls[baselineCalls.length - 1];

        mockPage.getViewport.mockClear();

        // Act: increase zoom
        expect(typeof viewer.setZoom).toBe('function');
        viewer.setZoom(1.5); // expect clamp and internal storage
        await viewer.renderPage(TEST_CONSTANTS.FIRST_PAGE);

        const zoomCalls = mockPage.getViewport.mock.calls.map(c => c[0]?.scale).filter(Boolean);
        const newFitScale = zoomCalls[zoomCalls.length - 1];

        expect(newFitScale).toBeGreaterThan(baselineFitScale); // Should be larger scale applied
        expect(viewer.getZoom()).toBeCloseTo(1.5, 2);
    });

    test('zoomIn and zoomOut adjust zoom within bounds', async () => {
        expect(typeof viewer.zoomIn).toBe('function');
        expect(typeof viewer.zoomOut).toBe('function');

        const startZoom = viewer.getZoom();
        viewer.zoomIn();
        const afterIn = viewer.getZoom();
        expect(afterIn).toBeGreaterThan(startZoom);

        viewer.zoomOut();
        const afterOut = viewer.getZoom();
        // After zoomOut from afterIn should return roughly to startZoom (depending on clamp/precision)
        expect(afterOut).toBeLessThanOrEqual(afterIn);

        // Clamp tests
        viewer.setZoom(100); // way above max
        expect(viewer.getZoom()).toBeLessThanOrEqual(3); // expected max (design choice)
        viewer.setZoom(0.01); // way below min
        expect(viewer.getZoom()).toBeGreaterThanOrEqual(0.5); // expected min (design choice)
    });
});
