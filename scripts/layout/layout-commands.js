/**
 * Layout Command Service - Contract-based command execution
 * Provides command/event architecture for layout changes with clear contracts
 * 
 * Commands are fire-and-forget - they trigger actions
 * Events are fired after actions complete - they notify completion
 */

// Command implementations registry (not just handlers)
const commands = new Map();

// Contract constants (inlined to avoid import issues)
const LAYOUT_COMMAND_CONTRACT = {
    COMMAND_TYPES: {
        FOCUS_MODE: 'focus-mode',
        ZOOM: 'zoom', 
        SIDEBAR: 'sidebar',
        PANEL: 'panel',
        THEME: 'theme',
        PRACTICE_PLAN: 'practice-plan'
    },
    ACTIONS: {
        ENTER: 'enter',
        EXIT: 'exit', 
        TOGGLE: 'toggle',
        SHOW: 'show',
        HIDE: 'hide',
        SET: 'set'
    },
    EVENTS: {
        COMMAND_DISPATCHED: 'playtime:layout-command',
        LAYOUT_CHANGED: 'playtime:layout-changed',
        COMMAND_FAILED: 'playtime:layout-command-failed'
    }
};

/**
 * Register a command implementation
 * @param {string} type - Command type from LAYOUT_COMMAND_CONTRACT.COMMAND_TYPES
 * @param {Object} command - Command implementation with execute() method
 */
function registerCommand(type, command) {
    if (!command || typeof command.execute !== 'function') {
        throw new Error(`Command for ${type} must have execute() method`);
    }
    commands.set(type, command);
}

/**
 * Legacy: Register a simple handler function (for backward compatibility)
 * @param {string} type - Command type
 * @param {function} handler - Handler function
 */
function registerHandler(type, handler) {
    if (typeof handler !== 'function') {
        throw new Error(`Handler for ${type} must be a function`);
    }
    
    // Wrap handler in a command-like object for backward compatibility
    const wrappedCommand = {
        type,
        canExecute: () => true,
        execute: async (options) => {
            handler(type, options);
            return { type, success: true, timestamp: Date.now() };
        }
    };
    
    commands.set(type, wrappedCommand);
}

/**
 * Get list of available commands (for debugging/discovery)
 * @returns {Array<string>} - List of registered command types
 */
function getAvailableCommands() {
    return Array.from(commands.keys());
}

/**
 * Clear all registered commands (for testing)
 */
function clearCommands() {
    commands.clear();
}

/**
 * Execute a layout change command (async with validation)
 * @param {string} type - Command type
 * @param {object} options - Command options
 * @returns {Promise<object>} - Command result
 */
async function executeCommand(type, options = {}) {
    try {
        // Dispatch command event immediately
        const commandEvent = new CustomEvent(LAYOUT_COMMAND_CONTRACT.EVENTS.COMMAND_DISPATCHED, {
            detail: { type, options, timestamp: Date.now() }
        });
        
        const eventTarget = (typeof window !== 'undefined') ? window : global.window;
        if (eventTarget?.dispatchEvent) {
            eventTarget.dispatchEvent(commandEvent);
        }
        
        // Get and validate command
        const command = commands.get(type);
        if (!command) {
            throw new Error(`Unknown layout command: ${type}. Available: ${getAvailableCommands().join(', ')}`);
        }
        
        if (command.canExecute && !command.canExecute(options)) {
            throw new Error(`Layout command ${type} validation failed`);
        }
        
        // Execute command
        const result = await command.execute(options);
        
        // Dispatch success event
        const successEvent = new CustomEvent(LAYOUT_COMMAND_CONTRACT.EVENTS.LAYOUT_CHANGED, {
            detail: { ...result, source: 'layout-command' }
        });
        
        if (eventTarget?.dispatchEvent) {
            eventTarget.dispatchEvent(successEvent);
        }
        
        return result;
        
    } catch (error) {
        // Dispatch failure event
        const failureEvent = new CustomEvent(LAYOUT_COMMAND_CONTRACT.EVENTS.COMMAND_FAILED, {
            detail: { type, options, error: error.message, timestamp: Date.now() }
        });
        
        const eventTarget = (typeof window !== 'undefined') ? window : global.window;
        if (eventTarget?.dispatchEvent) {
            eventTarget.dispatchEvent(failureEvent);
        }
        
        // Log error but don't throw - commands should be fire-and-forget
        const logger = (typeof window !== 'undefined' && window.logger) ? window.logger : 
                       (typeof global !== 'undefined' && global.logger) ? global.logger :
                       console;
        logger.error(`Layout command ${type} failed:`, error);
        
        return { type, success: false, error: error.message, timestamp: Date.now() };
    }
}

/**
 * Legacy: Execute a layout change command (fire-and-forget, no validation)
 * @param {string} type - Command type
 * @param {object} options - Command options
 */
function changeLayout(type, options = {}) {
    // Delegate to async version but don't wait for result
    executeCommand(type, options).catch(() => {
        // Error already logged in executeCommand
    });
}

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        changeLayout,
        executeCommand,
        registerCommand,
        registerHandler,
        getAvailableCommands,
        clearCommands,
        // Contract constants
        LAYOUT_COMMAND_CONTRACT,
        // Legacy exports
        clearHandlers: clearCommands
    };
}

// Also expose functions directly on window for browser usage (not a factory)
if (typeof window !== 'undefined') {
    window.PlayTimeLayoutCommands = {
        changeLayout,
        executeCommand,
        registerCommand,
        registerHandler,
        getAvailableCommands,
        clearCommands,
        // Contract constants
        LAYOUT_COMMAND_CONTRACT,
        // Legacy exports
        clearHandlers: clearCommands
    };
}
