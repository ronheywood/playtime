/** @jest-environment jsdom */

/**
 * Unit tests for HighlightActionButton
 */

describe('HighlightActionButton', () => {
    let actionButton;
    let mockContainer;
    let mockHighlight;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '<div id="pdf-canvas"></div>';
        mockContainer = document.getElementById('pdf-canvas');
        
        // Create mock highlight element
        mockHighlight = document.createElement('div');
        mockHighlight.dataset.hlId = 'test-highlight-1';
        mockHighlight.dataset.hlColor = 'green';
        mockHighlight.dataset.hlConfidence = '2';
        mockHighlight.dataset.page = '1';
        mockHighlight.dataset.hlXPct = '0.1';
        mockHighlight.dataset.hlYPct = '0.2';
        mockHighlight.dataset.hlWPct = '0.3';
        mockHighlight.dataset.hlHPct = '0.4';
        mockHighlight.getBoundingClientRect = jest.fn(() => ({
            left: 100,
            top: 100,
            right: 200,
            bottom: 150,
            width: 100,
            height: 50
        }));
        mockContainer.appendChild(mockHighlight);

        // Mock lucide
        global.window = global.window || {};
        window.lucide = {
            createIcons: jest.fn()
        };

        // Create action button instance
        const { HighlightActionButton } = require('../../../scripts/highlighting/HighlightActionButton');
        actionButton = new HighlightActionButton({
            containerId: 'pdf-canvas',
            position: 'bottom-right'
        });
    });

    afterEach(() => {
        if (actionButton) {
            actionButton.destroy();
        }
        document.body.innerHTML = '';
        delete global.window;
    });

    test('creates button with correct attributes', () => {
        actionButton.init();
        
        const button = mockContainer.querySelector('.highlight-action-btn');
        expect(button).toBeTruthy();
        expect(button.tagName).toBe('BUTTON');
        expect(button.classList.contains('btn')).toBe(true);
        expect(button.classList.contains('btn-default')).toBe(true);
        expect(button.classList.contains('btn-icon')).toBe(true);

        // Check for notebook icon
        const icon = button.querySelector('[data-lucide="notebook-pen"]');
        expect(icon).toBeTruthy();
    });

    test('button is initially hidden', () => {
        actionButton.init();
        
        const button = mockContainer.querySelector('.highlight-action-btn');
        expect(button.style.display).toBe('none');
        expect(actionButton.visible).toBe(false);
    });

    test('showForHighlight makes button visible and positions it', () => {
        // Mock container bounding rect
        mockContainer.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            right: 800,
            bottom: 600,
            width: 800,
            height: 600
        }));
        
        // Set offsetWidth and offsetHeight for container
        Object.defineProperty(mockContainer, 'offsetWidth', {
            value: 800,
            writable: true
        });
        Object.defineProperty(mockContainer, 'offsetHeight', {
            value: 600,
            writable: true
        });

        actionButton.init();
        actionButton.showForHighlight(mockHighlight);
        
        const button = mockContainer.querySelector('.highlight-action-btn');
        expect(button.style.display).toBe('flex');
        expect(button.style.opacity).toBe('1');
        expect(button.style.pointerEvents).toBe('auto');
        expect(actionButton.visible).toBe(true);
        expect(actionButton.highlight).toBe(mockHighlight);

        // Check positioning (bottom-right of highlight)
        expect(button.style.left).toBe('212px'); // 200 + 12 (offset)
        expect(button.style.top).toBe('162px');  // 150 + 12 (offset)
    });

    test('hide makes button invisible', () => {
        actionButton.init();
        actionButton.showForHighlight(mockHighlight);
        actionButton.hide();
        
        const button = mockContainer.querySelector('.highlight-action-btn');
        expect(button.style.opacity).toBe('0');
        expect(button.style.pointerEvents).toBe('none');
        expect(actionButton.visible).toBe(false);
        expect(actionButton.highlight).toBe(null);
    });

    test('onClick callback is called when button is clicked', () => {
        const mockCallback = jest.fn();
        
        actionButton.init().onClick(mockCallback);
        actionButton.showForHighlight(mockHighlight);
        
        const button = mockContainer.querySelector('.highlight-action-btn');
        button.click();
        
        expect(mockCallback).toHaveBeenCalledWith(mockHighlight, expect.any(Event));
    });

    test('button updates aria-label based on highlight', () => {
        actionButton.init();
        actionButton.showForHighlight(mockHighlight);
        
        const button = mockContainer.querySelector('.highlight-action-btn');
        expect(button.getAttribute('aria-label')).toBe(
            'Add title and notes to green highlight on page 1'
        );
    });

    test('destroy removes button from DOM', () => {
        actionButton.init();
        
        let button = mockContainer.querySelector('.highlight-action-btn');
        expect(button).toBeTruthy();
        
        actionButton.destroy();
        
        button = mockContainer.querySelector('.highlight-action-btn');
        expect(button).toBe(null);
        expect(actionButton.visible).toBe(false);
        expect(actionButton.highlight).toBe(null);
    });

    test('button respects container bounds when positioning', () => {
        // Mock small container
        mockContainer.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            right: 150,
            bottom: 100,
            width: 150,
            height: 100
        }));
        
        // Set offsetWidth and offsetHeight for small container
        Object.defineProperty(mockContainer, 'offsetWidth', {
            value: 150,
            writable: true
        });
        Object.defineProperty(mockContainer, 'offsetHeight', {
            value: 100,
            writable: true
        });

        // Mock highlight near bottom-right edge
        mockHighlight.getBoundingClientRect = jest.fn(() => ({
            left: 120,
            top: 80,
            right: 140,
            bottom: 95,
            width: 20,
            height: 15
        }));

        actionButton.init();
        actionButton.showForHighlight(mockHighlight);
        
        const button = mockContainer.querySelector('.highlight-action-btn');
        
        // Button should be constrained within container bounds
        const left = parseInt(button.style.left);
        const top = parseInt(button.style.top);
        
        expect(left).toBeLessThanOrEqual(110); // 150 - 40 (button width)
        expect(top).toBeLessThanOrEqual(60);   // 100 - 40 (button height)
    });
});
