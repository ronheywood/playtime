/**
 * Unit tests for Layout Change Command Interface
 * Tests the command/event architecture for layout changes
 */

const TestHelpers = require('../helpers/test-helpers');

describe('Layout Command Interface', () => {
    let LayoutCommands;

    beforeEach(() => {
        // Mock DOM and globals
        TestHelpers.setupMainJsMocks();
        global.PlayTimeConstants = {
            EVENTS: {
                LAYOUT_CHANGED: 'playtime:layout-changed'
            }
        };

        // Mock window for event handling in tests
        global.window = global.window || {};
        global.window.dispatchEvent = jest.fn();
        global.window.addEventListener = jest.fn();

        // Import the module we'll create
        try {
            LayoutCommands = require('../../scripts/layout-commands');
        } catch (e) {
            // Module doesn't exist yet - that's expected for TDD
            LayoutCommands = null;
        }
    });

    afterEach(() => {
        TestHelpers.cleanupLoggerMocks();
        delete global.PlayTimeConstants;
    });

    test('changeLayout command interface exists', () => {
        // Arrange & Act & Assert
        expect(LayoutCommands).toBeTruthy();
        expect(typeof LayoutCommands.changeLayout).toBe('function');
    });

    test('changeLayout accepts type and options parameters', () => {
        // Arrange
        const mockHandler = jest.fn();
        LayoutCommands.registerHandler('focus-mode', mockHandler);

        // Act
        LayoutCommands.changeLayout('focus-mode', { action: 'enter' });

        // Assert
        expect(mockHandler).toHaveBeenCalledWith('focus-mode', { action: 'enter' });
    });

    test('changeLayout dispatches command event immediately', () => {
        // Arrange
        const mockDispatchEvent = jest.fn();
        global.window.dispatchEvent = mockDispatchEvent;

        // Act
        LayoutCommands.changeLayout('focus-mode', { action: 'enter' });

        // Assert
        expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
        const dispatchedEvent = mockDispatchEvent.mock.calls[0][0];
        expect(dispatchedEvent.type).toBe('playtime:layout-command');
        expect(dispatchedEvent.detail).toEqual({
            type: 'focus-mode',
            options: { action: 'enter' }
        });
    });

    test('registerHandler allows command subscription', () => {
        // Arrange
        const focusModeHandler = jest.fn();
        const zoomHandler = jest.fn();

        // Act
        LayoutCommands.registerHandler('focus-mode', focusModeHandler);
        LayoutCommands.registerHandler('zoom', zoomHandler);

        LayoutCommands.changeLayout('focus-mode', { action: 'enter' });
        LayoutCommands.changeLayout('zoom', { level: 1.5 });

        // Assert
        expect(focusModeHandler).toHaveBeenCalledWith('focus-mode', { action: 'enter' });
        expect(zoomHandler).toHaveBeenCalledWith('zoom', { level: 1.5 });
    });

    test('unknown command types are handled gracefully', () => {
        // Arrange & Act & Assert - Should not throw
        expect(() => {
            LayoutCommands.changeLayout('unknown-type', {});
        }).not.toThrow();
    });
});
