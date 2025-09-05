/**
 * Event System Manager
 * Handles cross-cutting concerns and global events
 * Replaces manual DOM event coordination with clean event patterns
 */
class EventSystemManager {
    constructor(logger) {
        this.logger = logger;
        this.eventBus = new Map();
        this.domEventHandlers = new Map();
        this.globalListeners = [];
        this.initialized = false;
    }

    /**
     * Initialize the event system
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        this.logger.info('Event System Manager: Initializing');

        // Set up global DOM event delegation
        this.setupGlobalEventDelegation();

        // Set up cross-cutting event handlers
        this.setupCrossCuttingEvents();

        this.initialized = true;
        this.logger.info('Event System Manager: Initialization complete');
    }

    /**
     * Set up global event delegation for common patterns
     */
    setupGlobalEventDelegation() {
        // Central click handler for data-action attributes
        const clickHandler = (event) => {
            const actionElement = event.target.closest('[data-action]');
            if (actionElement) {
                const action = actionElement.dataset.action;
                this.handleDataAction(action, actionElement, event);
            }
        };

        // Central keyboard handler for data-key attributes
        const keyHandler = (event) => {
            const keyElement = event.target.closest('[data-key]');
            if (keyElement && event.key === keyElement.dataset.key) {
                const action = keyElement.dataset.action;
                if (action) {
                    this.handleDataAction(action, keyElement, event);
                }
            }
        };

        // Central form handler for data-form attributes
        const formHandler = (event) => {
            const form = event.target.closest('[data-form]');
            if (form) {
                const formType = form.dataset.form;
                this.handleFormSubmission(formType, form, event);
            }
        };

        // Register global handlers
        document.addEventListener('click', clickHandler);
        document.addEventListener('keydown', keyHandler);
        document.addEventListener('submit', formHandler);

        // Store for cleanup
        this.globalListeners.push(
            { type: 'click', handler: clickHandler },
            { type: 'keydown', handler: keyHandler },
            { type: 'submit', handler: formHandler }
        );

        this.logger.info('Global event delegation established');
    }

    /**
     * Set up cross-cutting event handlers
     */
    setupCrossCuttingEvents() {
        // Application lifecycle events
        this.on('app:initialized', () => {
            this.logger.info('Application initialized event received');
        });

        this.on('app:shutdown', () => {
            this.logger.info('Application shutdown event received');
        });

        // Error handling events
        this.on('error:display', (error) => {
            this.displayErrorToUser(error);
        });

        // Navigation events
        this.on('navigation:page-change', (pageInfo) => {
            this.handlePageChange(pageInfo);
        });

        // Practice session events
        this.on('practice:timer-complete', (data) => {
            this.handleTimerComplete(data);
        });
    }

    /**
     * Handle data-action attribute clicks
     */
    handleDataAction(action, element, event) {
        this.logger.info('Handling data action', { action, element: element.tagName });

        // Prevent default for certain actions
        if (this.shouldPreventDefault(action)) {
            event.preventDefault();
        }

        // Emit standardized event
        this.emit(`action:${action}`, {
            action,
            element,
            event,
            data: { ...element.dataset }
        });
    }

    /**
     * Handle form submissions
     */
    handleFormSubmission(formType, form, event) {
        this.logger.info('Handling form submission', { formType, formId: form.id });

        // Always prevent default for data-form submissions
        event.preventDefault();

        // Collect form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Emit form event
        this.emit(`form:${formType}`, {
            formType,
            form,
            data,
            event
        });
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(eventName, handler) {
        if (!this.eventBus.has(eventName)) {
            this.eventBus.set(eventName, []);
        }

        const handlers = this.eventBus.get(eventName);
        handlers.push(handler);

        this.logger.info('Event handler registered', { eventName, handlerCount: handlers.length });

        // Return unsubscribe function
        return () => {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
                this.logger.info('Event handler unregistered', { eventName });
            }
        };
    }

    /**
     * Subscribe to an event only once
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} Unsubscribe function
     */
    once(eventName, handler) {
        const unsubscribe = this.on(eventName, (...args) => {
            unsubscribe();
            handler(...args);
        });
        return unsubscribe;
    }

    /**
     * Emit an event
     * @param {string} eventName - Event name
     * @param {*} data - Event data
     */
    emit(eventName, data) {
        this.logger.info('Emitting event', { eventName, data: typeof data });

        const handlers = this.eventBus.get(eventName);
        if (!handlers || handlers.length === 0) {
            this.logger.warn('No handlers for event', { eventName });
            return;
        }

        // Call all handlers
        for (const handler of handlers) {
            try {
                handler(data);
            } catch (error) {
                this.logger.error('Error in event handler', { eventName, error });
            }
        }
    }

    /**
     * Remove all handlers for an event
     * @param {string} eventName - Event name
     */
    off(eventName) {
        if (this.eventBus.has(eventName)) {
            this.eventBus.delete(eventName);
            this.logger.info('All handlers removed for event', { eventName });
        }
    }

    /**
     * Register a DOM event handler with automatic cleanup
     * @param {string|Element} target - Event target (selector or element)
     * @param {string} eventType - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event listener options
     * @returns {Function} Unsubscribe function
     */
    addDOMListener(target, eventType, handler, options = {}) {
        let element;
        
        if (typeof target === 'string') {
            element = document.querySelector(target);
            if (!element) {
                this.logger.warn('Target element not found', { target });
                return () => {}; // Return no-op unsubscribe
            }
        } else {
            element = target;
        }

        // Create wrapped handler for logging
        const wrappedHandler = (event) => {
            try {
                handler(event);
            } catch (error) {
                this.logger.error('Error in DOM event handler', { eventType, error });
            }
        };

        element.addEventListener(eventType, wrappedHandler, options);

        // Store for cleanup
        const key = `${eventType}-${Date.now()}`;
        this.domEventHandlers.set(key, {
            element,
            eventType,
            handler: wrappedHandler,
            options
        });

        this.logger.info('DOM event listener added', { target, eventType });

        // Return unsubscribe function
        return () => {
            element.removeEventListener(eventType, wrappedHandler, options);
            this.domEventHandlers.delete(key);
            this.logger.info('DOM event listener removed', { target, eventType });
        };
    }

    /**
     * Determine if an action should prevent default behavior
     */
    shouldPreventDefault(action) {
        const preventDefaultActions = [
            'start-practice',
            'complete-section',
            'end-practice',
            'toggle-focus-mode',
            'open-dialog',
            'close-dialog',
            'save-score',
            'load-score'
        ];

        return preventDefaultActions.includes(action);
    }

    /**
     * Handle cross-cutting concerns
     */

    displayErrorToUser(error) {
        // Display error message to user
        console.error('User Error:', error.message);
        
        // Could integrate with toast notifications, modal dialogs, etc.
        // For now, just log to console
    }

    handlePageChange(pageInfo) {
        this.logger.info('Page changed', pageInfo);
        
        // Could handle page transition animations, cleanup, etc.
    }

    handleTimerComplete(data) {
        this.logger.info('Timer completed', data);
        
        // Could handle sound notifications, vibrations, etc.
    }

    /**
     * Get event system statistics
     */
    getStatistics() {
        const eventCounts = {};
        for (const [eventName, handlers] of this.eventBus) {
            eventCounts[eventName] = handlers.length;
        }

        return {
            totalEvents: this.eventBus.size,
            totalDOMListeners: this.domEventHandlers.size,
            totalGlobalListeners: this.globalListeners.length,
            eventCounts,
            initialized: this.initialized
        };
    }

    /**
     * Clean up all event handlers
     */
    cleanup() {
        this.logger.info('Event System Manager: Cleaning up');

        // Remove global event listeners
        for (const listener of this.globalListeners) {
            document.removeEventListener(listener.type, listener.handler);
        }
        this.globalListeners = [];

        // Remove DOM event listeners
        for (const [key, listenerData] of this.domEventHandlers) {
            listenerData.element.removeEventListener(
                listenerData.eventType,
                listenerData.handler,
                listenerData.options
            );
        }
        this.domEventHandlers.clear();

        // Clear event bus
        this.eventBus.clear();

        this.initialized = false;
        this.logger.info('Event System Manager: Cleanup complete');
    }

    /**
     * Enable development mode features
     */
    enableDevMode() {
        this.logger.info('Event System Manager: Enabling dev mode');

        // Expose event system globally for debugging
        window.EventSystem = {
            emit: (event, data) => this.emit(event, data),
            on: (event, handler) => this.on(event, handler),
            off: (event) => this.off(event),
            getStats: () => this.getStatistics(),
            getEventBus: () => this.eventBus
        };

        // Log all events in dev mode
        const originalEmit = this.emit.bind(this);
        this.emit = (eventName, data) => {
            console.log(`[EVENT] ${eventName}:`, data);
            return originalEmit(eventName, data);
        };

        this.logger.info('Event System dev mode enabled - window.EventSystem available');
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventSystemManager;
} else if (typeof window !== 'undefined') {
    window.EventSystemManager = EventSystemManager;
}

export default EventSystemManager;
