/** @jest-environment jsdom */
const SelectionOverlay = require('../../../scripts/highlighting/SelectionOverlay');

describe('SelectionOverlay', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="test-container" style="position: relative; width: 500px; height: 300px;">
            </div>
        `;
        container = document.getElementById('test-container');
    });

    describe('initialization', () => {
        test('throws error without container', () => {
            const overlay = new SelectionOverlay();
            
            expect(() => overlay.init(null)).toThrow('SelectionOverlay requires a valid container element');
        });

        test('creates overlay element in container', () => {
            const overlay = new SelectionOverlay();
            overlay.init(container);

            const overlayEl = container.querySelector('[data-role="selection-overlay"]');
            expect(overlayEl).toBeTruthy();
            expect(overlayEl.className).toBe('selection-overlay');
            expect(overlayEl.style.position).toBe('absolute');
            expect(overlayEl.style.display).toBe('none');
        });

        test('reuses existing overlay element', () => {
            // Create existing overlay
            const existingOverlay = document.createElement('div');
            existingOverlay.setAttribute('data-role', 'selection-overlay');
            container.appendChild(existingOverlay);

            const overlay = new SelectionOverlay();
            overlay.init(container);

            const overlayElements = container.querySelectorAll('[data-role="selection-overlay"]');
            expect(overlayElements.length).toBe(1);
            expect(overlayElements[0]).toBe(existingOverlay);
        });

        test('ensures container is positioned', () => {
            const unpositionedContainer = document.createElement('div');
            unpositionedContainer.style.position = 'static';
            document.body.appendChild(unpositionedContainer);

            const overlay = new SelectionOverlay();
            overlay.init(unpositionedContainer);

            expect(unpositionedContainer.style.position).toBe('relative');
        });

        test('applies custom configuration', () => {
            const config = {
                overlayClass: 'custom-overlay',
                fallbackStyles: {
                    border: '3px solid blue',
                    background: 'rgba(0,0,255,0.1)'
                }
            };
            const overlay = new SelectionOverlay(config);
            overlay.init(container);

            const overlayEl = container.querySelector('[data-role="selection-overlay"]');
            expect(overlayEl.className).toBe('custom-overlay');
        });
    });

    describe('show/hide functionality', () => {
        let overlay;

        beforeEach(() => {
            overlay = new SelectionOverlay();
            overlay.init(container);
        });

        test('shows overlay with specified dimensions', () => {
            overlay.show(10, 20, 100, 50);

            expect(overlay.isVisible).toBe(true);
            expect(overlay.overlay.style.left).toBe('10px');
            expect(overlay.overlay.style.top).toBe('20px');
            expect(overlay.overlay.style.width).toBe('100px');
            expect(overlay.overlay.style.height).toBe('50px');
            expect(overlay.overlay.style.display).toBe('block');
            expect(overlay.overlay.style.visibility).toBe('visible');
            expect(overlay.overlay.style.opacity).toBe('1');
        });

        test('shows overlay with default minimal size', () => {
            overlay.show();

            expect(overlay.overlay.style.left).toBe('0px');
            expect(overlay.overlay.style.top).toBe('0px');
            expect(overlay.overlay.style.width).toBe('1px');
            expect(overlay.overlay.style.height).toBe('1px');
        });

        test('hides overlay', () => {
            overlay.show(10, 20, 100, 50);
            overlay.hide();

            expect(overlay.isVisible).toBe(false);
            expect(overlay.overlay.style.display).toBe('none');
            expect(overlay.overlay.style.visibility).toBe('hidden');
            expect(overlay.overlay.style.opacity).toBe('0');
        });

        test('show/hide methods are chainable', () => {
            expect(overlay.show()).toBe(overlay);
            expect(overlay.hide()).toBe(overlay);
        });
    });

    describe('updateFromPoints', () => {
        let overlay;

        beforeEach(() => {
            overlay = new SelectionOverlay();
            overlay.init(container);
        });

        test('updates overlay to span between two points', () => {
            const startPoint = { x: 50, y: 100 };
            const currentPoint = { x: 200, y: 150 };

            overlay.updateFromPoints(startPoint, currentPoint);

            expect(overlay.overlay.style.left).toBe('50px'); // min(50, 200)
            expect(overlay.overlay.style.top).toBe('100px'); // min(100, 150)
            expect(overlay.overlay.style.width).toBe('150px'); // abs(200 - 50)
            expect(overlay.overlay.style.height).toBe('50px'); // abs(150 - 100)
            expect(overlay.isVisible).toBe(true);
        });

        test('handles reversed drag direction', () => {
            const startPoint = { x: 200, y: 150 };
            const currentPoint = { x: 50, y: 100 };

            overlay.updateFromPoints(startPoint, currentPoint);

            expect(overlay.overlay.style.left).toBe('50px');
            expect(overlay.overlay.style.top).toBe('100px');
            expect(overlay.overlay.style.width).toBe('150px');
            expect(overlay.overlay.style.height).toBe('50px');
        });

        test('handles missing points gracefully', () => {
            overlay.updateFromPoints(null, { x: 100, y: 100 });
            expect(overlay.isVisible).toBe(false);

            overlay.updateFromPoints({ x: 100, y: 100 }, null);
            expect(overlay.isVisible).toBe(false);
        });
    });

    describe('getRect and utility methods', () => {
        let overlay;

        beforeEach(() => {
            overlay = new SelectionOverlay();
            overlay.init(container);
        });

        test('getRect returns current overlay dimensions when visible', () => {
            overlay.show(25, 75, 100, 50);
            const rect = overlay.getRect();

            expect(rect).toEqual({
                left: 25,
                top: 75,
                width: 100,
                height: 50
            });
        });

        test('getRect returns null when hidden', () => {
            overlay.show(25, 75, 100, 50);
            overlay.hide();
            
            expect(overlay.getRect()).toBe(null);
        });

        test('isSignificantSize checks if overlay is large enough', () => {
            overlay.show(0, 0, 5, 5);
            expect(overlay.isSignificantSize()).toBe(true);

            overlay.show(0, 0, 1, 1);
            expect(overlay.isSignificantSize()).toBe(false);

            overlay.show(0, 0, 10, 1);
            expect(overlay.isSignificantSize(5, 5)).toBe(false);
        });
    });

    describe('destruction', () => {
        test('destroy removes overlay from DOM and cleans up state', () => {
            const overlay = new SelectionOverlay();
            overlay.init(container);

            expect(container.querySelector('[data-role="selection-overlay"]')).toBeTruthy();

            overlay.destroy();

            expect(container.querySelector('[data-role="selection-overlay"]')).toBeFalsy();
            expect(overlay.overlay).toBe(null);
            expect(overlay.container).toBe(null);
            expect(overlay.isVisible).toBe(false);
        });

        test('destroy handles missing overlay gracefully', () => {
            const overlay = new SelectionOverlay();
            
            expect(() => overlay.destroy()).not.toThrow();
        });
    });

    describe('style fallback application', () => {
        test('applies fallback styles when CSS not loaded', () => {
            const config = {
                fallbackStyles: {
                    border: '3px dashed red',
                    background: 'rgba(255,0,0,0.2)',
                    boxSizing: 'content-box',
                    pointerEvents: 'auto'
                }
            };
            const overlay = new SelectionOverlay(config);
            overlay.init(container);

            const overlayEl = overlay.overlay;
            
            // In test environment, getComputedStyle won't have real CSS
            // so fallback styles should be applied
            expect(overlayEl.style.border).toBe('3px dashed red');
            expect(overlayEl.style.background).toMatch(/rgba\(255,\s*0,\s*0,\s*0\.2\)/);
            expect(overlayEl.style.boxSizing).toBe('content-box');
            expect(overlayEl.style.pointerEvents).toBe('auto');
        });
    });
});
