/**
 * Layout Command Contract - Clear API for layout behavior
 * 
 * This contract defines what layout commands look like and what they can do.
 * Team can scan this to see where new layout behavior should live.
 */

/**
 * @typedef {Object} ILayoutCommand
 * @property {string} type - Command type (e.g., 'focus-mode', 'zoom', 'sidebar')
 * @property {Object} options - Command-specific options
 * @property {function} execute - Execute the command
 * @property {function} canExecute - Check if command can be executed
 * @property {Object} validation - Validation rules for options
 */

/**
 * Layout Command Registry Contract
 * Defines the API for registering and executing layout commands
 */
export const ILayoutCommandContract = {
    
    // Core command types that the system supports
    COMMAND_TYPES: {
        FOCUS_MODE: 'focus-mode',
        ZOOM: 'zoom', 
        SIDEBAR: 'sidebar',
        PANEL: 'panel',
        THEME: 'theme'
    },

    // Standard command actions
    ACTIONS: {
        ENTER: 'enter',
        EXIT: 'exit', 
        TOGGLE: 'toggle',
        SHOW: 'show',
        HIDE: 'hide',
        SET: 'set',
        ZOOM_IN: 'in',
        ZOOM_OUT: 'out'
    },

    // Events this module publishes
    EVENTS: {
        COMMAND_DISPATCHED: 'playtime:layout-command',
        LAYOUT_CHANGED: 'playtime:layout-changed',
        COMMAND_FAILED: 'playtime:layout-command-failed'
    },

    /**
     * Register a command handler
     * @param {string} type - Command type from COMMAND_TYPES
     * @param {ILayoutCommand} command - Command implementation
     */
    register(type, command) {
        // Implementation in layout-commands.js
    },

    /**
     * Execute a layout command
     * @param {string} type - Command type
     * @param {Object} options - Command options
     * @returns {Promise<Object>} - Command result
     */
    async execute(type, options = {}) {
        // Implementation in layout-commands.js  
    },

    /**
     * Get available commands (for debugging/discovery)
     * @returns {Array<string>} - List of registered command types
     */
    getAvailableCommands() {
        // Implementation in layout-commands.js
    }
};

/**
 * Base Layout Command Interface
 * All layout commands should implement this structure
 */
export class LayoutCommandBase {
    constructor(type, validation = {}) {
        this.type = type;
        this.validation = validation;
    }

    /**
     * Check if command can be executed with given options
     * @param {Object} options - Command options to validate
     * @returns {boolean} - True if command can execute
     */
    canExecute(options = {}) {
        return this.validateOptions(options);
    }

    /**
     * Validate command options against schema
     * @param {Object} options - Options to validate
     * @returns {boolean} - True if valid
     */
    validateOptions(options) {
        if (!this.validation.required) return true;
        
        for (const field of this.validation.required) {
            if (!(field in options)) {
                console.warn(`Layout command ${this.type} missing required field: ${field}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Execute the command (must be implemented by subclasses)
     * @param {Object} options - Command options
     * @returns {Promise<Object>} - Command result
     */
    async execute(options = {}) {
        throw new Error(`Command ${this.type} must implement execute()`);
    }
}

/**
 * Focus Mode Command Implementation
 * Example of how to implement the contract
 */
export class FocusModeCommand extends LayoutCommandBase {
    constructor() {
        super(ILayoutCommandContract.COMMAND_TYPES.FOCUS_MODE, {
            required: [], // No required fields for focus mode
            optional: ['action', 'highlight', 'padding']
        });
    }

    async execute(options = {}) {
        const action = options.action || ILayoutCommandContract.ACTIONS.TOGGLE;
        
        // Get the focus mode handler (current implementation)
        const handler = this.getFocusHandler();
        if (!handler) {
            throw new Error('Focus mode handler not available');
        }

        switch (action) {
            case ILayoutCommandContract.ACTIONS.ENTER:
                handler.enterFocusMode(options);
                break;
            case ILayoutCommandContract.ACTIONS.EXIT:
                handler.exitFocusMode(options);
                break;
            case ILayoutCommandContract.ACTIONS.TOGGLE:
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
    }

    getFocusHandler() {
        // Bridge to existing implementation
        if (typeof window !== 'undefined' && window.focusModeHandler) {
            // In a real implementation, we'd get this from DI container
            // For now, bridge to existing global
            return window.focusModeHandler;
        }
        return null;
    }
}

/**
 * Zoom Command Implementation
 * Example of command with validation
 */
export class ZoomCommand extends LayoutCommandBase {
    constructor() {
        super(ILayoutCommandContract.COMMAND_TYPES.ZOOM, {
            required: ['action'],
            optional: ['value', 'target']
        });
    }

    validateOptions(options) {
        if (!super.validateOptions(options)) return false;
        
        const { action, value } = options;
        
        if (action === ILayoutCommandContract.ACTIONS.SET && !value) {
            console.warn('Zoom SET action requires value');
            return false;
        }
        
        if (value && (typeof value !== 'number' || value <= 0)) {
            console.warn('Zoom value must be positive number');
            return false;
        }
        
        return true;
    }

    async execute(options = {}) {
        const { action, value } = options;
        
        // Get PDF viewer (bridge to existing implementation)
        const viewer = this.getPDFViewer();
        if (!viewer) {
            throw new Error('PDF viewer not available');
        }

        switch (action) {
            case ILayoutCommandContract.ACTIONS.ZOOM_IN:
                viewer.zoomIn();
                break;
            case ILayoutCommandContract.ACTIONS.ZOOM_OUT:
                viewer.zoomOut();
                break;
            case ILayoutCommandContract.ACTIONS.SET:
                viewer.setZoom(value);
                break;
            default:
                throw new Error(`Unknown zoom action: ${action}`);
        }

        return {
            type: this.type,
            action,
            value: viewer.getZoom(),
            success: true,
            timestamp: Date.now()
        };
    }

    getPDFViewer() {
        return (typeof window !== 'undefined') ? window.PlayTimePDFViewer : null;
    }
}
