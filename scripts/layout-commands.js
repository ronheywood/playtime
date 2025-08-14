/**
 * Layout Command Interface
 * Provides command/event architecture for layout changes
 * 
 * Commands are fire-and-forget - they trigger actions
 * Events are fired after actions complete - they notify completion
 */

// Command handlers registry
const handlers = new Map();

/**
 * Register a handler for a specific layout command type
 * @param {string} type - Command type (e.g., 'focus-mode', 'zoom')
 * @param {function} handler - Handler function that receives (type, options)
 */
function registerHandler(type, handler) {
    if (typeof handler !== 'function') {
        throw new Error(`Handler for ${type} must be a function`);
    }
    handlers.set(type, handler);
}

/**
 * Clear all registered handlers (for testing)
 */
function clearHandlers() {
    handlers.clear();
}

/**
 * Execute a layout change command
 * Dispatches command event immediately, then invokes registered handler
 * @param {string} type - Command type (e.g., 'focus-mode', 'zoom')
 * @param {object} options - Command options (e.g., { action: 'enter' })
 */
function changeLayout(type, options = {}) {
    try {
        // Dispatch command event immediately
        const commandEvent = new CustomEvent('playtime:layout-command', {
            detail: { type, options }
        });
        
        // Use global.window in test environment, window in browser
        const eventTarget = (typeof window !== 'undefined') ? window : global.window;
        if (eventTarget && typeof eventTarget.dispatchEvent === 'function') {
            eventTarget.dispatchEvent(commandEvent);
        }
        
        // Execute registered handler
        const handler = handlers.get(type);
        if (handler) {
            handler(type, options);
        }
        // Gracefully handle unknown types - no error thrown
        
    } catch (error) {
        // Log error but don't throw - commands should be fire-and-forget
        const logger = (typeof window !== 'undefined' && window.logger) ? window.logger : console;
        logger.error(`Layout command ${type} failed:`, error);
    }
}

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        changeLayout,
        registerHandler,
        clearHandlers
    };
}

// Also expose functions directly on window for browser usage (not a factory)
if (typeof window !== 'undefined') {
    window.PlayTimeLayoutCommands = {
        changeLayout,
        registerHandler,
        clearHandlers
    };
}
