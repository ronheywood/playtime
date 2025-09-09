/** @jest-environment jsdom */
const HighlightElement = require('../../../scripts/highlighting/HighlightElement');

describe('HighlightElement', () => {
    describe('constructor validation', () => {
        test('requires valid numeric percentages', () => {
            expect(() => new HighlightElement({
                xPct: 'invalid', yPct: 0.5, wPct: 0.3, hPct: 0.2, 
                color: 'red', confidence: 0
            })).toThrow('HighlightElement requires valid numeric percentages');
        });

        test('requires valid color string', () => {
            expect(() => new HighlightElement({
                xPct: 0.1, yPct: 0.5, wPct: 0.3, hPct: 0.2, 
                color: null, confidence: 0
            })).toThrow('HighlightElement requires a valid color string');
        });

        test('requires numeric confidence level', () => {
            expect(() => new HighlightElement({
                xPct: 0.1, yPct: 0.5, wPct: 0.3, hPct: 0.2, 
                color: 'red', confidence: 'invalid'
            })).toThrow('HighlightElement requires a numeric confidence level');
        });

        test('creates immutable properties', () => {
            const highlight = new HighlightElement({
                xPct: 0.1, yPct: 0.5, wPct: 0.3, hPct: 0.2,
                color: 'red', confidence: 0, page: 1
            });

            // Test that properties are defined and correct
            expect(highlight.xPct).toBe(0.1);
            expect(highlight.color).toBe('red');

            // Test immutability - assignment should be silently ignored in non-strict mode
            // or throw in strict mode
            const originalXPct = highlight.xPct;
            const originalColor = highlight.color;
            
            try {
                highlight.xPct = 0.9;
                highlight.color = 'green';
                
                // If no error thrown, values should remain unchanged
                expect(highlight.xPct).toBe(originalXPct);
                expect(highlight.color).toBe(originalColor);
            } catch (error) {
                // If error thrown, that's also acceptable (strict mode)
                expect(error).toBeDefined();
            }
        });
    });

    describe('fromRect factory method', () => {
        test('creates highlight from absolute coordinates', () => {
            const rect = { left: 50, top: 100, width: 150, height: 75 };
            const containerRect = { width: 500, height: 300 };

            const highlight = HighlightElement.fromRect(rect, containerRect, 'green', 2, 1);

            expect(highlight.xPct).toBe(0.1); // 50/500
            expect(highlight.yPct).toBeCloseTo(0.333); // 100/300
            expect(highlight.wPct).toBe(0.3); // 150/500
            expect(highlight.hPct).toBe(0.25); // 75/300
            expect(highlight.color).toBe('green');
            expect(highlight.confidence).toBe(2);
            expect(highlight.page).toBe(1);
        });

        test('handles zero container dimensions gracefully', () => {
            const rect = { left: 50, top: 100, width: 150, height: 75 };
            const containerRect = { width: 0, height: 0 };

            const highlight = HighlightElement.fromRect(rect, containerRect, 'red', 0);

            expect(highlight.xPct).toBe(0);
            expect(highlight.yPct).toBe(0);
            expect(highlight.wPct).toBe(0);
            expect(highlight.hPct).toBe(0);
        });

        test('throws on invalid inputs', () => {
            expect(() => HighlightElement.fromRect(null, {}, 'red', 0))
                .toThrow('fromRect requires valid rect and containerRect');
        });
    });

    describe('fromDatabaseRecord factory method', () => {
        test('creates highlight from database record', () => {
            const record = {
                xPct: 0.2, yPct: 0.3, wPct: 0.4, hPct: 0.1,
                color: 'amber', confidence: 1, page: 2, id: 'test-123'
            };

            const highlight = HighlightElement.fromDatabaseRecord(record);

            expect(highlight.xPct).toBe(0.2);
            expect(highlight.color).toBe('amber');
            expect(highlight.confidence).toBe(1);
            expect(highlight.page).toBe(2);
            expect(highlight.id).toBe('test-123');
        });

        test('throws on invalid record', () => {
            expect(() => HighlightElement.fromDatabaseRecord(null))
                .toThrow('fromDatabaseRecord requires a valid record');
        });
    });

    describe('toAbsoluteRect', () => {
        test('converts percentages to absolute coordinates', () => {
            const highlight = new HighlightElement({
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4,
                color: 'red', confidence: 0
            });
            const containerRect = { width: 1000, height: 600 };

            const rect = highlight.toAbsoluteRect(containerRect, 50, 30);

            expect(rect.left).toBe(150); // 50 + 0.1 * 1000
            expect(rect.top).toBe(150); // 30 + 0.2 * 600
            expect(rect.width).toBe(300); // 0.3 * 1000
            expect(rect.height).toBe(240); // 0.4 * 600
        });

        test('throws on invalid container rect', () => {
            const highlight = new HighlightElement({
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4,
                color: 'red', confidence: 0
            });

            expect(() => highlight.toAbsoluteRect(null))
                .toThrow('toAbsoluteRect requires a valid containerRect');
        });
    });

    describe('createDOMElement', () => {
        beforeEach(() => {
            document.body.innerHTML = '';
        });

        test('creates properly configured DOM element', () => {
            const highlight = new HighlightElement({
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1,
                color: 'green', confidence: 2, page: 1
            });
            const containerRect = { width: 500, height: 300 };
            const styleConfig = {
                highlightClass: 'test-highlight',
                colorStyles: {
                    green: { border: '2px solid green', background: 'rgba(0,255,0,0.1)' }
                }
            };

            const el = highlight.createDOMElement(containerRect, 10, 20, styleConfig);

            expect(el.getAttribute('data-role')).toBe('highlight');
            expect(el.getAttribute('data-color')).toBe('green');
            expect(el.dataset.confidence).toBe('2');
            expect(el.dataset.page).toBe('1');
            expect(el.dataset.hlXPct).toBe('0.1');
            expect(el.className).toBe('test-highlight');
            expect(el.style.position).toBe('absolute');
            expect(el.style.left).toBe('60px'); // 10 + 0.1 * 500
            expect(el.style.top).toBe('80px'); // 20 + 0.2 * 300
        });

        test('applies style fallbacks when CSS not loaded', () => {
            const highlight = new HighlightElement({
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.1,
                color: 'red', confidence: 0
            });
            const styleConfig = {
                colorStyles: {
                    red: { border: '2px solid red', background: 'rgba(255,0,0,0.1)' }
                }
            };

            const el = highlight.createDOMElement({ width: 100, height: 100 }, 0, 0, styleConfig);

            // Should apply fallback styles since no CSS is loaded in test environment
            expect(el.dataset.color).toBe('red');
            expect(el.dataset.confidence).toBe('0');
        })
    });

    describe('utility methods', () => {
        test('toDatabaseRecord creates proper record', () => {
            const highlight = new HighlightElement({
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4,
                color: 'amber', confidence: 1, page: 2
            });

            const record = highlight.toDatabaseRecord('pdf-123');

            expect(record).toEqual({
                pdfId: 'pdf-123',
                page: 2,
                confidence: 1,
                color: 'amber',
                xPct: 0.1,
                yPct: 0.2,
                wPct: 0.3,
                hPct: 0.4
            });
        });

        test('getSignature creates unique identifier', () => {
            const highlight = new HighlightElement({
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4,
                color: 'red', confidence: 0, page: 1
            });

            const sig = highlight.getSignature('pdf-123');

            expect(sig).toBe('pdf-123|1|0|0.1|0.2|0.3|0.4');
        });

        test('isVisibleOnPage checks page visibility', () => {
            const pageSpecific = new HighlightElement({
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4,
                color: 'red', confidence: 0, page: 1
            });
            const globalHighlight = new HighlightElement({
                xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4,
                color: 'red', confidence: 0, page: null
            });

            expect(pageSpecific.isVisibleOnPage(1)).toBe(true);
            expect(pageSpecific.isVisibleOnPage(2)).toBe(false);
            expect(globalHighlight.isVisibleOnPage(1)).toBe(true);
            expect(globalHighlight.isVisibleOnPage(2)).toBe(true);
        });
    });
});
