/**
 * Unit tests for Focus Mode Handler
 * Tests the extracted DOM manipulation logic
 */

const FocusModeHandler = require('../../scripts/focus-mode-handler');

describe('Focus Mode Handler', () => {
    let mockElements, focusHandler;

    beforeEach(() => {
        // Mock DOM elements
        const mockElement = (tag = 'div') => ({
            tagName: tag.toUpperCase(),
            style: {},
            dataset: {},
            setAttribute: jest.fn(),
            removeAttribute: jest.fn(),
            getAttribute: jest.fn(() => null),
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            },
            getBoundingClientRect: jest.fn(() => ({
                left: 100, top: 50, width: 800, height: 600,
                right: 900, bottom: 650
            })),
            clientWidth: 800,
            clientHeight: 600,
            width: 800,
            height: 600
        });

        mockElements = {
            canvas: mockElement('canvas'),
            viewerContainer: mockElement('div'),
            sidebar: mockElement('div'),
            focusBtn: mockElement('button'),
            exitBtn: mockElement('button'),
            toggleBtn: mockElement('button')
        };

        // Mock document.body
        global.document = {
            body: {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            },
            querySelector: jest.fn(() => null) // No selected highlight by default
        };

        focusHandler = new FocusModeHandler(mockElements);
    });

    afterEach(() => {
        delete global.document;
    });

    test('constructor stores element references', () => {
        expect(focusHandler.canvas).toBe(mockElements.canvas);
        expect(focusHandler.viewerContainer).toBe(mockElements.viewerContainer);
        expect(focusHandler.sidebar).toBe(mockElements.sidebar);
        expect(focusHandler.focusBtn).toBe(mockElements.focusBtn);
        expect(focusHandler.exitBtn).toBe(mockElements.exitBtn);
        expect(focusHandler.toggleBtn).toBe(mockElements.toggleBtn);
    });

    test('enterFocusMode sets focus mode active', () => {
        // Act
        focusHandler.enterFocusMode();

        // Assert
        expect(mockElements.canvas.setAttribute).toHaveBeenCalledWith('data-focus-mode', 'active');
    });

    test('enterFocusMode hides sidebar and shows distraction-free mode', () => {
        // Act
        focusHandler.enterFocusMode();

        // Assert
        expect(mockElements.sidebar.style.display).toBe('none');
        expect(document.body.classList.add).toHaveBeenCalledWith('distraction-free');
    });

    test('enterFocusMode updates button visibility', () => {
        // Act
        focusHandler.enterFocusMode();

        // Assert
        expect(mockElements.focusBtn.style.display).toBe('none');
        expect(mockElements.exitBtn.style.display).toBe('');
        expect(mockElements.toggleBtn.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');
        expect(mockElements.toggleBtn.classList.add).toHaveBeenCalledWith('active');
    });

    test('exitFocusMode removes focus mode', () => {
        // Arrange - Enter focus mode first
        focusHandler.enterFocusMode();
        
        // Act
        focusHandler.exitFocusMode();

        // Assert
        expect(mockElements.canvas.removeAttribute).toHaveBeenCalledWith('data-focus-mode');
    });

    test('exitFocusMode restores sidebar and removes distraction-free mode', () => {
        // Arrange
        focusHandler.enterFocusMode();
        
        // Act
        focusHandler.exitFocusMode();

        // Assert
        expect(mockElements.sidebar.style.display).toBe('');
        expect(document.body.classList.remove).toHaveBeenCalledWith('distraction-free');
    });

    test('exitFocusMode restores button visibility', () => {
        // Arrange
        focusHandler.enterFocusMode();
        
        // Act
        focusHandler.exitFocusMode();

        // Assert
        expect(mockElements.exitBtn.style.display).toBe('none');
        expect(mockElements.focusBtn.style.display).toBe('');
        expect(mockElements.toggleBtn.setAttribute).toHaveBeenCalledWith('aria-pressed', 'false');
        expect(mockElements.toggleBtn.classList.remove).toHaveBeenCalledWith('active');
    });

    test('toggleFocusMode enters focus mode when not active', () => {
        // Arrange
        mockElements.canvas.getAttribute.mockReturnValue(null);
        
        // Act
        focusHandler.toggleFocusMode();

        // Assert
        expect(mockElements.canvas.setAttribute).toHaveBeenCalledWith('data-focus-mode', 'active');
    });

    test('toggleFocusMode exits focus mode when active', () => {
        // Arrange
        mockElements.canvas.getAttribute.mockReturnValue('active');
        
        // Act
        focusHandler.toggleFocusMode();

        // Assert
        expect(mockElements.canvas.removeAttribute).toHaveBeenCalledWith('data-focus-mode');
    });
});
