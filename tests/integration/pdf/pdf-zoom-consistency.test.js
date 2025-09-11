// Integration Test: Zoom Handler Consistency
// Ensures all zoom operations (manual, programmatic, focus mode) use a single handler

const TestHelpers = require('../../helpers/test-helpers');
const TEST_CONSTANTS = require('../../helpers/test-constants');

describe('Zoom Handler Consistency', () => {
    let viewer;
    let mockPage;
    let zoomHandlerSpy;
    let layoutChangeSpy;
    let uiUpdateSpy;

    beforeEach(async () => {
        // Setup DOM with UI elements
        TestHelpers.setupBasicDOM();
        
        // Add zoom UI elements to the DOM
        const zoomInBtn = document.createElement('button');
        zoomInBtn.setAttribute('data-role', 'zoom-in');
        document.body.appendChild(zoomInBtn);
        
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.setAttribute('data-role', 'zoom-out');
        document.body.appendChild(zoomOutBtn);
        
        const zoomDisplay = document.createElement('span');
        zoomDisplay.setAttribute('data-role', 'zoom-display');
        zoomDisplay.textContent = '100%';
        document.body.appendChild(zoomDisplay);

        // Setup PDF.js mock
        mockPage = TestHelpers.setupPDFjsMock();
        
        // Canvas spy support
        jest.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'pdf-canvas') {
                return document.querySelector('#pdf-canvas');
            }
            return null;
        });
        
        // Setup canvas parent for sizing
        const canvas = document.querySelector('#pdf-canvas');
        canvas.parentElement = { 
            clientWidth: TEST_CONSTANTS.CANVAS_SIZE.width, 
            clientHeight: TEST_CONSTANTS.CANVAS_SIZE.height 
        };

        // Create viewer instance
        viewer = TestHelpers.createPlayTimePDFViewer(TestHelpers.createSilentLogger(), TestHelpers.createMockConstantsModule());
        
        await viewer.init();
        const file = TestHelpers.createMockFile();
        await viewer.loadPDF(file);
        
        // Initialize UI controls
        viewer.attachUIControls();
        
        // Clear initial mocks
        mockPage.getViewport.mockClear();
        
        // Setup spies to track handler calls
        setupHandlerSpies();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function setupHandlerSpies() {
        // Spy on core zoom operations
        zoomHandlerSpy = jest.spyOn(viewer, 'setZoom');
        
        // Spy on layout change events
        layoutChangeSpy = jest.fn();
        const layoutEventName = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS && window.PlayTimeConstants.EVENTS.LAYOUT_CHANGED) || 'playtime:layout-changed';
        window.addEventListener(layoutEventName, layoutChangeSpy);
        
        // Spy on UI updates by monitoring zoom display changes
        uiUpdateSpy = jest.fn();
        const zoomDisplay = document.querySelector('[data-role="zoom-display"]');
        if (zoomDisplay) {
            const observer = new MutationObserver(uiUpdateSpy);
            observer.observe(zoomDisplay, { childList: true, characterData: true, subtree: true });
        }
    }

    function getZoomDisplayValue() {
        const display = document.querySelector('[data-role="zoom-display"]');
        return display ? display.textContent : null;
    }

    function waitForUpdates(timeout = 100) {
        return new Promise(resolve => setTimeout(resolve, timeout));
    }

    describe('Single Handler Principle', () => {
        test('manual zoom in button calls setZoom handler', async () => {
            const zoomInBtn = document.querySelector('[data-role="zoom-in"]');
            const initialZoom = viewer.getZoom();
            
            zoomHandlerSpy.mockClear();
            zoomInBtn.click();
            await waitForUpdates();
            
            expect(zoomHandlerSpy).toHaveBeenCalledTimes(1);
            expect(viewer.getZoom()).toBeGreaterThan(initialZoom);
        });

        test('manual zoom out button calls setZoom handler', async () => {
            // First zoom in to have room to zoom out
            viewer.setZoom(1.5);
            zoomHandlerSpy.mockClear();
            
            const zoomOutBtn = document.querySelector('[data-role="zoom-out"]');
            const initialZoom = viewer.getZoom();
            
            zoomOutBtn.click();
            await waitForUpdates();
            
            expect(zoomHandlerSpy).toHaveBeenCalledTimes(1);
            expect(viewer.getZoom()).toBeLessThan(initialZoom);
        });

        test('programmatic setZoom calls same handler', async () => {
            zoomHandlerSpy.mockClear();
            
            viewer.setZoom(2.0);
            await waitForUpdates();
            
            expect(zoomHandlerSpy).toHaveBeenCalledTimes(1);
            expect(viewer.getZoom()).toBe(2.0);
        });

        test('zoomIn API calls setZoom handler', async () => {
            zoomHandlerSpy.mockClear();
            
            viewer.zoomIn();
            await waitForUpdates();
            
            expect(zoomHandlerSpy).toHaveBeenCalledTimes(1);
        });

        test('zoomOut API calls setZoom handler', async () => {
            zoomHandlerSpy.mockClear();
            
            viewer.zoomOut();
            await waitForUpdates();
            
            expect(zoomHandlerSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('Consistent UI Updates', () => {
        test('all zoom operations update display consistently', async () => {
            const testOperations = [
                { operation: () => viewer.setZoom(1.5), expectedDisplay: '150%' },
                { operation: () => viewer.setZoom(2.0), expectedDisplay: '200%' },
                { operation: () => viewer.zoomIn(), expectedDisplay: '225%' }, // 2.0 + 0.25
                { operation: () => viewer.zoomOut(), expectedDisplay: '200%' }, // 2.25 - 0.25
            ];

            for (const test of testOperations) {
                test.operation();
                await waitForUpdates();
                
                expect(getZoomDisplayValue()).toBe(test.expectedDisplay);
            }
        });

        test('manual button clicks update display', async () => {
            const zoomInBtn = document.querySelector('[data-role="zoom-in"]');
            const zoomOutBtn = document.querySelector('[data-role="zoom-out"]');
            
            // Initial state
            expect(getZoomDisplayValue()).toBe('100%');
            
            // Zoom in
            zoomInBtn.click();
            await waitForUpdates();
            expect(getZoomDisplayValue()).toBe('125%');
            
            // Zoom in again
            zoomInBtn.click();
            await waitForUpdates();
            expect(getZoomDisplayValue()).toBe('150%');
            
            // Zoom out
            zoomOutBtn.click();
            await waitForUpdates();
            expect(getZoomDisplayValue()).toBe('125%');
        });

        test('focus mode simulation updates display', async () => {
            // Simulate what happens in focus mode
            viewer.setZoom(3.0); // Focus mode typically sets 300%
            await waitForUpdates();
            
            expect(getZoomDisplayValue()).toBe('300%');
            expect(viewer.getZoom()).toBe(3.0);
        });
    });

    describe('Event Consistency', () => {
        test('all zoom operations trigger layout change events', async () => {
            const operations = [
                () => viewer.setZoom(1.5),
                () => viewer.zoomIn(),
                () => viewer.zoomOut(),
                () => document.querySelector('[data-role="zoom-in"]').click(),
                () => document.querySelector('[data-role="zoom-out"]').click(),
            ];

            for (let i = 0; i < operations.length; i++) {
                layoutChangeSpy.mockClear();
                operations[i]();
                await waitForUpdates();
                
                expect(layoutChangeSpy).toHaveBeenCalledTimes(1);
            }
        });

        test('zoom changes trigger canvas re-render', async () => {
            mockPage.getViewport.mockClear();
            
            viewer.setZoom(2.0);
            await waitForUpdates();
            
            // Should have triggered a re-render
            expect(mockPage.getViewport).toHaveBeenCalled();
        });
    });

    describe('Handler Integration', () => {
        test('setZoom handler is the single point of control', async () => {
            // Test that all zoom operations go through setZoom
            const originalSetZoom = viewer.setZoom;
            let setZoomCallCount = 0;
            
            viewer.setZoom = function(...args) {
                setZoomCallCount++;
                return originalSetZoom.apply(this, args);
            };

            // Perform various zoom operations
            viewer.zoomIn();
            await waitForUpdates();
            
            viewer.zoomOut();
            await waitForUpdates();
            
            document.querySelector('[data-role="zoom-in"]').click();
            await waitForUpdates();
            
            viewer.setZoom(2.5);
            await waitForUpdates();

            // All operations should have gone through setZoom
            expect(setZoomCallCount).toBe(4);
            
            // Restore original
            viewer.setZoom = originalSetZoom;
        });

        test('zoom handler maintains bounds consistently', async () => {
            // Test min bound
            viewer.setZoom(0.1);
            expect(viewer.getZoom()).toBe(1.0); // Should clamp to minimum
            
            // Test max bound
            viewer.setZoom(10.0);
            expect(viewer.getZoom()).toBe(3.0); // Should clamp to maximum
            
            // Test button operations respect bounds
            viewer.setZoom(3.0); // At max
            const zoomInBtn = document.querySelector('[data-role="zoom-in"]');
            zoomInBtn.click();
            await waitForUpdates();
            expect(viewer.getZoom()).toBe(3.0); // Should stay at max
            
            viewer.setZoom(1.0); // At min
            const zoomOutBtn = document.querySelector('[data-role="zoom-out"]');
            zoomOutBtn.click();
            await waitForUpdates();
            expect(viewer.getZoom()).toBe(1.0); // Should stay at min
        });
    });

    describe('Real-world Scenarios', () => {
        test('focus mode zoom sequence maintains consistency', async () => {
            // Simulate typical focus mode usage
            
            // 1. User starts at default zoom
            expect(viewer.getZoom()).toBe(1.0);
            expect(getZoomDisplayValue()).toBe('100%');
            
            // 2. User manually zooms in a bit
            viewer.zoomIn();
            await waitForUpdates();
            expect(getZoomDisplayValue()).toBe('125%');
            
            // 3. Focus mode activates and sets zoom to 300%
            viewer.setZoom(3.0);
            await waitForUpdates();
            expect(getZoomDisplayValue()).toBe('300%');
            
            // 4. User manually adjusts while in focus mode
            viewer.zoomOut();
            await waitForUpdates();
            expect(getZoomDisplayValue()).toBe('275%');
            
            // All operations should have maintained consistency
            expect(viewer.getZoom()).toBe(2.75);
        });

        test('rapid zoom operations maintain state consistency', async () => {
            // Simulate rapid user interactions
            const operations = [
                () => viewer.setZoom(1.5),
                () => viewer.zoomIn(),
                () => viewer.zoomOut(),
                () => viewer.setZoom(2.0),
                () => viewer.zoomIn(),
            ];

            for (const operation of operations) {
                operation();
                // Small delay to simulate real usage
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            await waitForUpdates(200); // Wait for all updates to complete

            // Final state should be consistent
            const finalZoom = viewer.getZoom();
            const displayZoom = parseInt(getZoomDisplayValue()) / 100;
            
            expect(Math.abs(finalZoom - displayZoom)).toBeLessThan(0.01); // Should match within rounding
        });
    });
});
