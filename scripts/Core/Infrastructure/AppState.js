/**
 * Application State Manager
 * Centralized state management with change notifications
 * Provides single source of truth for application state
 */
class AppState {
    constructor(logger) {
        this.logger = logger;
        
        // Initialize application state
        this.state = {
            // Current loaded score
            currentScore: null,
            
            // Active practice session
            practiceSession: null,
            
            // PDF viewer state
            pdfViewer: {
                currentPage: 1,
                totalPages: 0,
                zoom: 1.0,
                loading: false
            },
            
            // Highlights data
            highlights: [],
            selectedHighlight: null,
            
            // UI state
            ui: {
                focusMode: false,
                sidebarVisible: true,
                dialogsOpen: [],
                theme: 'light'
            },
            
            // User preferences
            preferences: {
                timerDuration: 180000, // 3 minutes (180 seconds)
                showConfidenceDialog: true,
                autoSave: true
            }
        };

        // Change listeners organized by state path
        this.listeners = new Map();
        
        // History for undo/redo functionality
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
    }

    /**
     * Set state value at a specific path
     * @param {string} path - Dot-separated path (e.g., 'ui.focusMode')
     * @param {*} value - New value
     * @param {boolean} trackHistory - Whether to track this change for undo/redo
     */
    setState(path, value, trackHistory = true) {
        const oldValue = this.getState(path);
        
        // Don't update if value hasn't changed
        if (oldValue === value) {
            return;
        }

        this.logger.info('Setting state', { path, value, oldValue });

        // Track history for undo/redo
        if (trackHistory) {
            this.addToHistory(path, oldValue, value);
        }

        // Set the new value
        this.setStateValue(path, value);

        // Notify listeners
        this.notifyListeners(path, value, oldValue);
    }

    /**
     * Get state value at a specific path
     * @param {string} path - Dot-separated path
     * @returns {*} State value
     */
    getState(path) {
        if (!path) {
            return this.state;
        }

        const keys = path.split('.');
        let current = this.state;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Subscribe to state changes at a specific path
     * @param {string} path - State path to watch
     * @param {Function} callback - Callback function (newValue, oldValue, path)
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        // Initialize listeners array for this path
        if (!this.listeners.has(path)) {
            this.listeners.set(path, []);
        }

        // Add callback to listeners
        const listeners = this.listeners.get(path);
        listeners.push(callback);

        this.logger.info('Subscribed to state path', { path, listenerCount: listeners.length });

        // Return unsubscribe function
        return () => {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
                this.logger.info('Unsubscribed from state path', { path });
            }
        };
    }

    /**
     * Update multiple state values atomically
     * @param {Object} updates - Object with path -> value mappings
     * @param {boolean} trackHistory - Whether to track for undo/redo
     */
    batchUpdate(updates, trackHistory = true) {
        this.logger.info('Batch updating state', { updateCount: Object.keys(updates).length });

        const changes = [];

        // Collect all changes first
        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.getState(path);
            if (oldValue !== value) {
                changes.push({ path, oldValue, newValue: value });
            }
        }

        // Track history as a single operation
        if (trackHistory && changes.length > 0) {
            this.addBatchToHistory(changes);
        }

        // Apply all changes
        for (const change of changes) {
            this.setStateValue(change.path, change.newValue);
        }

        // Notify all listeners
        for (const change of changes) {
            this.notifyListeners(change.path, change.newValue, change.oldValue);
        }
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.logger.info('Resetting application state');

        const oldState = { ...this.state };
        
        // Reset to initial state
        this.state = {
            currentScore: null,
            practiceSession: null,
            pdfViewer: {
                currentPage: 1,
                totalPages: 0,
                zoom: 1.0,
                loading: false
            },
            highlights: [],
            selectedHighlight: null,
            ui: {
                focusMode: false,
                sidebarVisible: true,
                dialogsOpen: [],
                theme: 'light'
            },
            preferences: {
                timerDuration: 180000, // 3 minutes (180 seconds)
                showConfidenceDialog: true,
                autoSave: true
            }
        };

        // Clear history
        this.history = [];
        this.historyIndex = -1;

        // Notify all listeners of the reset
        this.notifyAllListeners(oldState);
    }

    /**
     * Undo the last state change
     * @returns {boolean} True if undo was performed
     */
    undo() {
        if (this.historyIndex <= 0) {
            this.logger.info('No more changes to undo');
            return false;
        }

        this.historyIndex--;
        const historyEntry = this.history[this.historyIndex];

        this.logger.info('Undoing state change', { historyIndex: this.historyIndex });

        // Apply the undo
        this.applyHistoryEntry(historyEntry, true);
        return true;
    }

    /**
     * Redo the next state change
     * @returns {boolean} True if redo was performed
     */
    redo() {
        if (this.historyIndex >= this.history.length - 1) {
            this.logger.info('No more changes to redo');
            return false;
        }

        this.historyIndex++;
        const historyEntry = this.history[this.historyIndex];

        this.logger.info('Redoing state change', { historyIndex: this.historyIndex });

        // Apply the redo
        this.applyHistoryEntry(historyEntry, false);
        return true;
    }

    /**
     * Get current state as serializable object
     * @returns {Object} Current state
     */
    getSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Load state from a snapshot
     * @param {Object} snapshot - State snapshot
     */
    loadSnapshot(snapshot) {
        this.logger.info('Loading state snapshot');

        const oldState = { ...this.state };
        this.state = { ...snapshot };

        // Clear history when loading snapshot
        this.history = [];
        this.historyIndex = -1;

        // Notify all listeners
        this.notifyAllListeners(oldState);
    }

    // Private methods

    /**
     * Set state value using dot-separated path
     */
    setStateValue(path, value) {
        const keys = path.split('.');
        let current = this.state;

        // Navigate to parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        // Set the final value
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Notify listeners for a specific path
     */
    notifyListeners(path, newValue, oldValue) {
        // Notify exact path listeners
        if (this.listeners.has(path)) {
            const listeners = this.listeners.get(path);
            for (const callback of listeners) {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    this.logger.error('Error in state listener', error);
                }
            }
        }

        // Notify parent path listeners (for nested updates)
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.listeners.has(parentPath)) {
                const parentValue = this.getState(parentPath);
                const listeners = this.listeners.get(parentPath);
                for (const callback of listeners) {
                    try {
                        callback(parentValue, undefined, parentPath);
                    } catch (error) {
                        this.logger.error('Error in parent state listener', error);
                    }
                }
            }
        }
    }

    /**
     * Notify all listeners (used for reset/load operations)
     */
    notifyAllListeners(oldState) {
        for (const [path, listeners] of this.listeners) {
            const newValue = this.getState(path);
            const oldValue = this.getStateFromObject(oldState, path);
            
            for (const callback of listeners) {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    this.logger.error('Error in state listener during reset', error);
                }
            }
        }
    }

    /**
     * Get state value from a specific object
     */
    getStateFromObject(obj, path) {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Add a change to history
     */
    addToHistory(path, oldValue, newValue) {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add new history entry
        this.history.push({
            type: 'single',
            path,
            oldValue,
            newValue,
            timestamp: Date.now()
        });

        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    /**
     * Add a batch of changes to history
     */
    addBatchToHistory(changes) {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add batch history entry
        this.history.push({
            type: 'batch',
            changes,
            timestamp: Date.now()
        });

        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    /**
     * Apply a history entry (for undo/redo)
     */
    applyHistoryEntry(entry, isUndo) {
        if (entry.type === 'single') {
            const value = isUndo ? entry.oldValue : entry.newValue;
            this.setStateValue(entry.path, value);
            this.notifyListeners(entry.path, value, isUndo ? entry.newValue : entry.oldValue);
        } else if (entry.type === 'batch') {
            for (const change of entry.changes) {
                const value = isUndo ? change.oldValue : change.newValue;
                this.setStateValue(change.path, value);
                this.notifyListeners(change.path, value, isUndo ? change.newValue : change.oldValue);
            }
        }
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
} else if (typeof window !== 'undefined') {
    window.AppState = AppState;
}
