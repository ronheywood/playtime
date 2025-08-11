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
        expect(typeof viewer.getZoom).toBe('function');
        expect(viewer.getZoom()).toBe(1.0);
    });

    test('setZoom should increase effective render scale', async () => {
        await viewer.renderPage(TEST_CONSTANTS.FIRST_PAGE);
        const baselineCalls = mockPage.getViewport.mock.calls.map(c => c[0]?.scale).filter(Boolean);
        expect(baselineCalls.length).toBeGreaterThan(0);
        const baselineFitScale = baselineCalls[baselineCalls.length - 1];
        mockPage.getViewport.mockClear();
        viewer.setZoom(1.5);
        await viewer.renderPage(TEST_CONSTANTS.FIRST_PAGE);
        const zoomCalls = mockPage.getViewport.mock.calls.map(c => c[0]?.scale).filter(Boolean);
        const newFitScale = zoomCalls[zoomCalls.length - 1];
        expect(newFitScale).toBeGreaterThan(baselineFitScale);
        expect(viewer.getZoom()).toBeCloseTo(1.5, 2);
    });

    test('zoomIn and zoomOut adjust zoom within bounds', async () => {
        const startZoom = viewer.getZoom();
        viewer.zoomIn();
        const afterIn = viewer.getZoom();
        expect(afterIn).toBeGreaterThan(startZoom);
        viewer.zoomOut();
        const afterOut = viewer.getZoom();
        expect(afterOut).toBeLessThanOrEqual(afterIn);
        viewer.setZoom(100);
        expect(viewer.getZoom()).toBeLessThanOrEqual(3);
        viewer.setZoom(0.01);
        expect(viewer.getZoom()).toBeGreaterThanOrEqual(1.0);
    });

    // New tests
    test('auto re-render updates effective scale without explicit render call', async () => {
        // Arrange: render once to establish baseline effective scale
        await viewer.renderPage(TEST_CONSTANTS.FIRST_PAGE);
        const baselineEffective = viewer.getEffectiveScale();
        // Act: change zoom (auto re-render should happen)
        viewer.setZoom(2.0);
        // Await microtask queue flush
        await Promise.resolve();
        // Since reRenderCurrentPage awaited internally, allow event loop tick
        await TestHelpers.waitFor(0);
        const newEffective = viewer.getEffectiveScale();
        expect(newEffective).toBeGreaterThan(baselineEffective);
        expect(viewer.getZoom()).toBeCloseTo(2.0, 2);
    });

    test('cumulative zoomIn steps follow defined STEP value', () => {
        const step = 0.25; // from implementation
        expect(viewer.getZoom()).toBeCloseTo(1.0, 5);
        viewer.zoomIn(); // 1.25
        expect(viewer.getZoom()).toBeCloseTo(1.0 + step, 5);
        viewer.zoomIn(); // 1.5
        expect(viewer.getZoom()).toBeCloseTo(1.0 + (2 * step), 5);
    });

    test('clamps zoom exactly at min and max bounds', () => {
        viewer.setZoom(-999);
        expect(viewer.getZoom()).toBe(1.0);
        viewer.setZoom(999);
        expect(viewer.getZoom()).toBe(3.0);
    });

    test('base fit scale cached so second render does not recompute base scale', async () => {
        await viewer.renderPage(1); // establish cache and baseline
        const firstCallCount = mockPage.getViewport.mock.calls.length;
        mockPage.getViewport.mockClear();
        await viewer.renderPage(1); // second render same page
        const secondCallCount = mockPage.getViewport.mock.calls.length;
        // Should not exceed original number of viewport computations (no extra base recompute)
        expect(secondCallCount).toBeLessThanOrEqual(firstCallCount);
    });

    test('switching pages creates a new cached base scale entry', async () => {
        await viewer.renderPage(1);
        mockPage.getViewport.mockClear();
        await viewer.renderPage(2); // different page -> new base
        const calls = mockPage.getViewport.mock.calls.map(c => c[0]?.scale);
        // Expect one of the calls for second page to have scale 1 (base capture)
        expect(calls).toContain(1);
    });
});
