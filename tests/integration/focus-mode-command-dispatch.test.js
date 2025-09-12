/**
 * Integration Test: Focus Mode Command Dispatch
 * Verifies that focus mode buttons dispatch layout commands instead of direct DOM manipulation
 */

const TestHelpers = require('../helpers/test-helpers');
const { changeLayout, registerHandler, executeCommand, registerCommand, clearCommands } = require('../../scripts/layout/layout-commands');
const createPlayTimeFocusModeCommands = require('../../scripts/layout/focus-mode-commands');

describe('Focus Mode Command Integration', () => {
    let mockElements, commandEvents, focusModeCommands, eventListener;

    beforeEach(() => {
        // Clean up from previous test first
        if (focusModeCommands && focusModeCommands.cleanupFocusModeCommands) {
            focusModeCommands.cleanupFocusModeCommands();
        }
        clearCommands();
        
        // Set up DOM environment
        TestHelpers.setupDOM();
        
        // Track command events - create fresh listener for each test
        commandEvents = [];
        
        // Create a real EventTarget for testing events instead of jest mocks
        const eventTarget = new EventTarget();
        global.window.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        global.window.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        global.window.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);
        
        // Create a named function for the event listener so we can remove it
        eventListener = (event) => {
            commandEvents.push(event.detail);
        };
        
        global.window.addEventListener('playtime:layout-command', eventListener);

        // Create focus mode buttons and elements
        mockElements = TestHelpers.createFocusModeElements();
        
        // Initialize command-driven focus mode using factory
        focusModeCommands = createPlayTimeFocusModeCommands();
        focusModeCommands.initializeFocusModeCommands();
    });

    afterEach(() => {
        // Clean up the specific event listener we added
        if (eventListener && global.window.removeEventListener) {
            global.window.removeEventListener('playtime:layout-command', eventListener);
        }
        
        // Clean up focus mode command listeners
        if (focusModeCommands && focusModeCommands.cleanupFocusModeCommands) {
            focusModeCommands.cleanupFocusModeCommands();
        }
        
        // Clear command handlers registry
        clearCommands();
        
        // Clean up DOM
        TestHelpers.cleanup();
        commandEvents = [];
        eventListener = null;
    });

    describe('Focus Mode Button Command Dispatch', () => {
        test('should dispatch enter focus command when focus button clicked', () => {
            // Act: Click the focus button
            mockElements.focusBtn.click();
            
            // Assert: Command event was dispatched
            expect(commandEvents).toHaveLength(1);
            expect(commandEvents[0]).toMatchObject({
                type: 'focus-mode',
                options: { action: 'enter' }
            });
            expect(typeof commandEvents[0].timestamp).toBe('number');
        });

        test('should dispatch exit focus command when exit button clicked', () => {
            // Act: Click the exit button directly (no prior setup needed)
            mockElements.exitBtn.click();
            
            // Assert: Command event was dispatched
            expect(commandEvents).toHaveLength(1);
            expect(commandEvents[0]).toMatchObject({
                type: 'focus-mode',
                options: { action: 'exit' }
            });
            expect(typeof commandEvents[0].timestamp).toBe('number');
        });

        test('should dispatch toggle focus command when toggle button clicked', () => {
            // Act: Click the toggle button
            mockElements.toggleBtn.click();
            
            // Assert: Command event was dispatched
            expect(commandEvents).toHaveLength(1);
            expect(commandEvents[0]).toMatchObject({
                type: 'focus-mode',
                options: { action: 'toggle' }
            });
            expect(typeof commandEvents[0].timestamp).toBe('number');
        });

        test('should dispatch exit focus command when ESC key pressed in focus mode', () => {
            // Arrange: Manually set canvas to focus mode (DOM state, no command)
            mockElements.canvas.setAttribute('data-focus-mode', 'active');
            
            // Act: Press ESC key
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escEvent);
            
            // Assert: Command event was dispatched
            expect(commandEvents).toHaveLength(1);
            expect(commandEvents[0]).toMatchObject({
                type: 'focus-mode',
                options: { action: 'exit' }
            });
            expect(typeof commandEvents[0].timestamp).toBe('number');
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
