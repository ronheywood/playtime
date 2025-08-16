/** @jest-environment jsdom */
const CoordinateMapper = require('../../../scripts/highlighting/CoordinateMapper');

describe('CoordinateMapper', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="container" style="position: absolute; left: 100px; top: 50px; width: 400px; height: 300px;">
                <canvas id="canvas" style="position: absolute; left: 20px; top: 10px; width: 200px; height: 150px;"></canvas>
            </div>
        `;
        container = document.getElementById('container');
    });

    describe('getRelativePoint', () => {
        test('converts client coordinates to relative coordinates', () => {
            // Mock getBoundingClientRect
            container.getBoundingClientRect = jest.fn(() => ({
                left: 100, top: 50, width: 400, height: 300
            }));

            const result = CoordinateMapper.getRelativePoint(container, 250, 175);

            expect(result).toEqual({ x: 150, y: 125 });
        });

        test('throws error for invalid container', () => {
            expect(() => CoordinateMapper.getRelativePoint(null, 100, 100))
                .toThrow('getRelativePoint requires a valid container element');
        });
    });

    describe('getCanvasOffset', () => {
        test('calculates canvas offset relative to viewer', () => {
            const viewer = container;
            const canvas = document.getElementById('canvas');

            // Mock getBoundingClientRect
            viewer.getBoundingClientRect = jest.fn(() => ({
                left: 100, top: 50, width: 400, height: 300
            }));
            canvas.getBoundingClientRect = jest.fn(() => ({
                left: 120, top: 60, width: 200, height: 150
            }));

            const result = CoordinateMapper.getCanvasOffset(viewer, canvas);

            expect(result).toEqual({ left: 20, top: 10 });
        });

        test('returns zero offset for missing elements', () => {
            expect(CoordinateMapper.getCanvasOffset(null, null)).toEqual({ left: 0, top: 0 });
            expect(CoordinateMapper.getCanvasOffset(container, null)).toEqual({ left: 0, top: 0 });
        });

        test('handles getBoundingClientRect errors gracefully', () => {
            const viewer = { getBoundingClientRect: () => { throw new Error('test error'); } };
            const canvas = document.getElementById('canvas');

            expect(CoordinateMapper.getCanvasOffset(viewer, canvas)).toEqual({ left: 0, top: 0 });
        });
    });

    describe('normalizeToCanvas', () => {
        test('constrains rectangle to canvas bounds', () => {
            const rect = { left: -10, top: 5, width: 250, height: 200 };
            const canvasRect = { width: 200, height: 150 };
            const canvasOffset = { left: 20, top: 10 };

            const result = CoordinateMapper.normalizeToCanvas(rect, canvasRect, canvasOffset);

            expect(result).toEqual({
                left: 0,    // max(0, min(-10 - 20, 200)) = max(0, min(-30, 200)) = 0
                top: 0,     // max(0, min(5 - 10, 150)) = max(0, min(-5, 150)) = 0
                width: 200, // max(0, min(250, 200)) = 200
                height: 150 // max(0, min(200, 150)) = 150
            });
        });

        test('throws error for invalid inputs', () => {
            expect(() => CoordinateMapper.normalizeToCanvas(null, {}))
                .toThrow('normalizeToCanvas requires valid rect and canvasRect');
            expect(() => CoordinateMapper.normalizeToCanvas({}, null))
                .toThrow('normalizeToCanvas requires valid rect and canvasRect');
        });
    });

    describe('toPercentages', () => {
        test('converts absolute coordinates to percentages', () => {
            const rect = { left: 50, top: 30, width: 100, height: 60 };
            const containerRect = { width: 500, height: 300 };

            const result = CoordinateMapper.toPercentages(rect, containerRect);

            expect(result).toEqual({
                xPct: 0.1,  // 50/500
                yPct: 0.1,  // 30/300
                wPct: 0.2,  // 100/500
                hPct: 0.2   // 60/300
            });
        });

        test('handles zero container dimensions', () => {
            const rect = { left: 50, top: 30, width: 100, height: 60 };
            const containerRect = { width: 0, height: 0 };

            const result = CoordinateMapper.toPercentages(rect, containerRect);

            expect(result).toEqual({
                xPct: 0, yPct: 0, wPct: 0, hPct: 0
            });
        });

        test('throws error for invalid inputs', () => {
            expect(() => CoordinateMapper.toPercentages(null, {}))
                .toThrow('toPercentages requires valid rect and containerRect');
        });
    });

    describe('fromPercentages', () => {
        test('converts percentages to absolute coordinates', () => {
            const percentages = { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4 };
            const containerRect = { width: 500, height: 300 };
            const offset = { left: 10, top: 20 };

            const result = CoordinateMapper.fromPercentages(percentages, containerRect, offset);

            expect(result).toEqual({
                left: 60,   // 10 + 0.1 * 500
                top: 80,    // 20 + 0.2 * 300
                width: 150, // 0.3 * 500
                height: 120 // 0.4 * 300
            });
        });

        test('uses zero offset by default', () => {
            const percentages = { xPct: 0.2, yPct: 0.1, wPct: 0.3, hPct: 0.2 };
            const containerRect = { width: 200, height: 100 };

            const result = CoordinateMapper.fromPercentages(percentages, containerRect);

            expect(result).toEqual({
                left: 40,   // 0 + 0.2 * 200
                top: 10,    // 0 + 0.1 * 100
                width: 60,  // 0.3 * 200
                height: 20  // 0.2 * 100
            });
        });

        test('throws error for invalid inputs', () => {
            expect(() => CoordinateMapper.fromPercentages(null, {}))
                .toThrow('fromPercentages requires valid percentages and containerRect');
        });
    });

    describe('rectFromPoints', () => {
        test('creates rectangle from two points', () => {
            const startPoint = { x: 50, y: 100 };
            const endPoint = { x: 150, y: 200 };

            const result = CoordinateMapper.rectFromPoints(startPoint, endPoint);

            expect(result).toEqual({
                left: 50,
                top: 100,
                width: 100,
                height: 100
            });
        });

        test('handles reversed points correctly', () => {
            const startPoint = { x: 150, y: 200 };
            const endPoint = { x: 50, y: 100 };

            const result = CoordinateMapper.rectFromPoints(startPoint, endPoint);

            expect(result).toEqual({
                left: 50,   // min(150, 50)
                top: 100,   // min(200, 100)
                width: 100, // abs(50 - 150)
                height: 100 // abs(100 - 200)
            });
        });

        test('throws error for invalid points', () => {
            expect(() => CoordinateMapper.rectFromPoints(null, {}))
                .toThrow('rectFromPoints requires valid start and end points');
        });
    });

    describe('utility methods', () => {
        test('isSignificantSize checks rectangle dimensions', () => {
            expect(CoordinateMapper.isSignificantSize({ width: 5, height: 5 })).toBe(true);
            expect(CoordinateMapper.isSignificantSize({ width: 1, height: 1 })).toBe(false);
            expect(CoordinateMapper.isSignificantSize({ width: 10, height: 1 }, 5, 5)).toBe(false);
            expect(CoordinateMapper.isSignificantSize(null)).toBe(false);
        });

        test('safeBoundingRect handles errors gracefully', () => {
            const validElement = {
                getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
            };
            const invalidElement = {
                getBoundingClientRect: () => { throw new Error('test error'); }
            };

            expect(CoordinateMapper.safeBoundingRect(validElement)).toEqual({
                left: 0, top: 0, width: 100, height: 100
            });
            expect(CoordinateMapper.safeBoundingRect(invalidElement)).toBe(null);
            expect(CoordinateMapper.safeBoundingRect(null)).toBe(null);
        });
    });
});
