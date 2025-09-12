/**
 * Example: Focus Mode Command Implementation
 * Shows how to implement the ILayoutCommand contract
 */

/**
 * Focus Mode Command - implements contract-based layout command
 */
class FocusModeCommand {
    constructor() {
        this.type = 'focus-mode';
        this.validation = {
            optional: ['action', 'highlight', 'padding']
        };
        // Logger resolved lazily to avoid temporal coupling
    }

    /**
     * Get logger instance (same pattern as layout-commands.js)
     * @returns {Object} - Logger instance
     */
    _getLogger() {
        return window?.logger || global?.logger || console;
    }

    /**
     * Check if command can be executed
     * @param {Object} options - Command options
     * @returns {boolean} - True if can execute
     */
    canExecute(options = {}) {
        // Focus mode command can always execute
        return true;
    }

    /**
     * Execute the focus mode command
     * @param {Object} options - Command options
     * @returns {Promise<Object>} - Command result
     */
    async execute(options = {}) {
        const { LAYOUT_COMMAND_CONTRACT } = window.PlayTimeLayoutCommands;
        const action = options.action || LAYOUT_COMMAND_CONTRACT.ACTIONS.TOGGLE;
        
        // Get the focus mode handler (bridge to existing implementation)
        const handler = this.getFocusHandler();
        if (!handler) {
            throw new Error('Focus mode handler not available');
        }

        try {
            switch (action) {
                case LAYOUT_COMMAND_CONTRACT.ACTIONS.ENTER:
                    handler.enterFocusMode(options);
                    break;
                case LAYOUT_COMMAND_CONTRACT.ACTIONS.EXIT:
                    handler.exitFocusMode(options);
                    break;
                case LAYOUT_COMMAND_CONTRACT.ACTIONS.TOGGLE:
                    handler.toggleFocusMode(options);
                    break;
                default:
                    throw new Error(`Unknown focus mode action: ${action}`);
            }

            return { 
                type: this.type, 
                action, 
                success: true,
                timestamp: Date.now()
            };
        } catch (error) {
            this._getLogger().error(`Focus mode ${action} failed:`, error);
            throw new Error(`Focus mode ${action} failed: ${error.message}`);
        }
    }

    /**
     * Get focus mode handler (bridge to existing implementation)
     * @returns {Object|null} - Focus mode handler or null
     */
    getFocusHandler() {
        // In a real implementation with DI, we'd get this from container
        // For now, bridge to existing global pattern
        if (typeof window !== 'undefined' && window.focusModeHandler) {
            return window.focusModeHandler;
        }
        return null;
    }
}

/**
 * Initialize layout commands with contract-based implementations
 * Call this after layout components are loaded
 */
function initializeLayoutCommands() {
    const logger = window?.logger || global?.logger || console;

    if (typeof window === 'undefined' || !window.PlayTimeLayoutCommands) {
        logger.warn('Layout commands not available');
        return;
    }

    const commands = window.PlayTimeLayoutCommands;
    
    // Register contract-based commands
    commands.registerCommand('focus-mode', new FocusModeCommand());
    
    logger.info('✅ Layout commands initialized with contracts');
    logger.info('Available commands:', commands.getAvailableCommands());
}

// Usage examples:
function demonstrateLayoutCommands() {
    const commands = window.PlayTimeLayoutCommands;
    const logger = window?.logger || global?.logger || console;
    
    // Example 1: Fire-and-forget (legacy style)
    commands.changeLayout('focus-mode', { action: 'enter' });
    
    // Example 2: Async with result (new contract style)
    commands.executeCommand('focus-mode', { action: 'toggle' })
        .then(result => {
            logger.log('Focus mode result:', result);
            // { type: 'focus-mode', action: 'toggle', success: true, timestamp: 1234567890 }
        })
        .catch(error => {
            logger.error('Focus mode failed:', error);
        });
    
    // Example 3: Using contract constants
    const { LAYOUT_COMMAND_CONTRACT } = commands;
    commands.executeCommand(
        LAYOUT_COMMAND_CONTRACT.COMMAND_TYPES.FOCUS_MODE, 
        { action: LAYOUT_COMMAND_CONTRACT.ACTIONS.ENTER }
    );
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.initializeLayoutCommands = initializeLayoutCommands;
    window.demonstrateLayoutCommands = demonstrateLayoutCommands;
    window.FocusModeCommand = FocusModeCommand;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FocusModeCommand,
        initializeLayoutCommands,
        demonstrateLayoutCommands
    };
}