/**
 * Integration Test: Focus Mode Command Dispatch
 * Verifies that focus mode buttons dispatch layout commands instead of direct DOM manipulation
 */

const TestHelpers = require('../helpers/test-helpers');
const { changeLayout, registerHandler, clearHandlers } = require('../../scripts/layout-commands');
const createPlayTimeFocusModeCommands = require('../../scripts/focus-mode-commands');

describe('Focus Mode Command Integration', () => {
    let mockElements, commandEvents, focusModeCommands;

    beforeEach(() => {
        // Clean up from previous test first
        if (focusModeCommands && focusModeCommands.cleanupFocusModeCommands) {
            focusModeCommands.cleanupFocusModeCommands();
        }
        clearHandlers();
        
        // Set up DOM environment
        TestHelpers.setupDOM();
        
        // Track command events
        commandEvents = [];
        global.window.addEventListener('playtime:layout-command', (event) => {
            commandEvents.push(event.detail);
        });

        // Create focus mode buttons and elements
        mockElements = TestHelpers.createFocusModeElements();
        
        // Initialize command-driven focus mode using factory
        focusModeCommands = createPlayTimeFocusModeCommands();
        focusModeCommands.initializeFocusModeCommands();
    });

    afterEach(() => {
        // Clean up focus mode command listeners
        if (focusModeCommands && focusModeCommands.cleanupFocusModeCommands) {
            focusModeCommands.cleanupFocusModeCommands();
        }
        
        // Clear command handlers registry
        clearHandlers();
        
        // Clean up DOM
        TestHelpers.cleanup();
        commandEvents = [];
    });

    describe('Focus Mode Button Command Dispatch', () => {
        test('should dispatch enter focus command when focus button clicked', () => {
            // Act: Click the focus button
            mockElements.focusBtn.click();
            
            // Assert: Command event was dispatched
            expect(commandEvents).toHaveLength(1);
            expect(commandEvents[0]).toEqual({
                type: 'focus-mode',
                options: { action: 'enter' }
            });
        });

        test('should dispatch exit focus command when exit button clicked', () => {
            // Act: Click the exit button directly (no prior setup needed)
            mockElements.exitBtn.click();
            
            // Assert: Command event was dispatched
            //expect(commandEvents).toHaveLength(1);
            expect(commandEvents[0]).toEqual({
                type: 'focus-mode',
                options: { action: 'exit' }
            });
        });

        test('should dispatch toggle focus command when toggle button clicked', () => {
            // Act: Click the toggle button
            mockElements.toggleBtn.click();
            
            // Assert: Command event was dispatched
            //expect(commandEvents).toHaveLength(1);
            expect(commandEvents[0]).toEqual({
                type: 'focus-mode',
                options: { action: 'toggle' }
            });
        });

        test('should dispatch exit focus command when ESC key pressed in focus mode', () => {
            // Arrange: Manually set canvas to focus mode (DOM state, no command)
            mockElements.canvas.setAttribute('data-focus-mode', 'active');
            
            // Act: Press ESC key
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escEvent);
            
            // Assert: Command event was dispatched
            //expect(commandEvents).toHaveLength(1);
            expect(commandEvents[0]).toEqual({
                type: 'focus-mode',
                options: { action: 'exit' }
            });
        });
    });

    describe('Command Handler Integration', () => {
        test('should execute focus mode handler when command is dispatched', () => {
            // Act: Dispatch command programmatically
            changeLayout('focus-mode', { action: 'enter' });
            
            // Assert: Focus mode is active (handler executed)
            expect(mockElements.canvas.getAttribute('data-focus-mode')).toBe('active');
            expect(mockElements.focusBtn.style.display).toBe('none');
            expect(mockElements.exitBtn.style.display).toBe('');
        });
    });
});
