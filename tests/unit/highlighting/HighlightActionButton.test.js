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

    test('creates button group with correct attributes', () => {
        actionButton.init();
        
        const buttonGroup = mockContainer.querySelector('.highlight-action-btn-group');
        expect(buttonGroup).toBeTruthy();
        expect(buttonGroup.tagName).toBe('DIV');
        expect(buttonGroup.classList.contains('highlight-action-btn-group')).toBe(true);

        // Check for annotate button
        const annotateButton = buttonGroup.querySelector('.highlight-action-btn-annotate');
        expect(annotateButton).toBeTruthy();
        expect(annotateButton.tagName).toBe('BUTTON');
        
        // Check for delete button if enabled
        if (actionButton.config.showDelete) {
            const deleteButton = buttonGroup.querySelector('.highlight-action-btn-delete');
            expect(deleteButton).toBeTruthy();
            expect(deleteButton.tagName).toBe('BUTTON');
        }
    });

    test('button group is initially hidden', () => {
        actionButton.init();
        
        const buttonGroup = mockContainer.querySelector('.highlight-action-btn-group');
        expect(buttonGroup.style.display).toBe('none');
        expect(actionButton.isVisible).toBe(false);
    });

    test('showForHighlight makes button group visible and positions it', () => {
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
        
        const buttonGroup = mockContainer.querySelector('.highlight-action-btn-group');
        expect(buttonGroup.style.display).toBe('flex');
        expect(buttonGroup.style.opacity).toBe('1');
        expect(buttonGroup.style.pointerEvents).toBe('auto');
        expect(actionButton.isVisible).toBe(true);
        expect(actionButton.activeHighlight).toBe(mockHighlight);

        // Check positioning (bottom-right of highlight)
        expect(buttonGroup.style.left).toBe('212px'); // 200 + 12 (offset)
        expect(buttonGroup.style.top).toBe('162px');  // 150 + 12 (offset)
    });

    test('hide makes button group invisible', () => {
        actionButton.init();
        actionButton.showForHighlight(mockHighlight);
        actionButton.hide();
        
        const buttonGroup = mockContainer.querySelector('.highlight-action-btn-group');
        expect(buttonGroup.style.opacity).toBe('0');
        expect(buttonGroup.style.pointerEvents).toBe('none');
        expect(actionButton.isVisible).toBe(false);
        expect(actionButton.activeHighlight).toBe(null);
    });

    test('onAnnotate callback is called when annotate button is clicked', () => {
        const mockCallback = jest.fn();
        
        actionButton.init().onAnnotate(mockCallback);
        actionButton.showForHighlight(mockHighlight);
        
        const annotateButton = mockContainer.querySelector('.highlight-action-btn-annotate');
        annotateButton.click();
        
        expect(mockCallback).toHaveBeenCalledWith(mockHighlight, expect.any(Event));
    });

    test('onDelete callback is called when delete button is clicked', () => {
        const mockCallback = jest.fn();
        
        actionButton.init().onDelete(mockCallback);
        actionButton.showForHighlight(mockHighlight);
        
        const deleteButton = mockContainer.querySelector('.highlight-action-btn-delete');
        deleteButton.click();
        
        expect(mockCallback).toHaveBeenCalledWith(mockHighlight, expect.any(Event));
    });

    test('backward compatibility: onClick callback is called when annotate button is clicked', () => {
        const mockCallback = jest.fn();
        
        actionButton.init().onClick(mockCallback);
        actionButton.showForHighlight(mockHighlight);
        
        const annotateButton = mockContainer.querySelector('.highlight-action-btn-annotate');
        annotateButton.click();
        
        expect(mockCallback).toHaveBeenCalledWith(mockHighlight, expect.any(Event));
    });

    test('button group updates aria-label based on highlight', () => {
        actionButton.init();
        actionButton.showForHighlight(mockHighlight);
        
        const annotateButton = mockContainer.querySelector('.highlight-action-btn-annotate');
        expect(annotateButton.getAttribute('aria-label')).toBe(
            'Add title and notes to green highlight on page 1'
        );
        
        const deleteButton = mockContainer.querySelector('.highlight-action-btn-delete');
        expect(deleteButton.getAttribute('aria-label')).toBe(
            'Delete green highlight on page 1'
        );
    });

    test('destroy removes button group from DOM', () => {
        actionButton.init();
        
        let buttonGroup = mockContainer.querySelector('.highlight-action-btn-group');
        expect(buttonGroup).toBeTruthy();
        
        actionButton.destroy();
        
        buttonGroup = mockContainer.querySelector('.highlight-action-btn-group');
        expect(buttonGroup).toBe(null);
        expect(actionButton.isVisible).toBe(false);
        expect(actionButton.activeHighlight).toBe(null);
    });

    test('button group respects container bounds when positioning', () => {
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
        
        const buttonGroup = mockContainer.querySelector('.highlight-action-btn-group');
        
        // Button group should be constrained within container bounds
        const left = parseInt(buttonGroup.style.left) || 0;
        const top = parseInt(buttonGroup.style.top) || 0;
        
        expect(left).toBeLessThanOrEqual(110); // 150 - 40 (button width)
        expect(top).toBeLessThanOrEqual(60);   // 100 - 40 (button height)
    });
});
