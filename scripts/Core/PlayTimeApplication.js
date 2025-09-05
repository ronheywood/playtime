/**
 * PlayTime Application
 * Main application class using clean architecture with dependency injection
 * This replaces the legacy global window dependencies approach
 */
class PlayTimeApplication {
    constructor() {
        this.diContainer = null;
        this.componentFactory = null;
        this.stateManager = null;
        this.logger = null;
        this.initialized = false;
        this.components = {};
    }

    /**
     * Initialize the application
     * Sets up dependency injection and core services
     */
    async initialize() {
        if (this.initialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            console.log('Initializing PlayTime Application...');

            // Initialize dependency injection container
            this.diContainer = new window.DIContainer();
            this.diContainer.initialize();

            // Get core services
            this.logger = this.diContainer.get('logger');
            this.stateManager = this.diContainer.get('stateManager');
            this.componentFactory = this.diContainer.get('componentFactory');

            this.logger.info('PlayTime Application: Core services initialized');

            // Initialize components
            await this.initializeComponents();

            // Set up global error handling
            this.setupErrorHandling();

            // Mark as initialized
            this.initialized = true;

            this.logger.info('PlayTime Application: Initialization complete');

            // Dispatch initialization complete event
            document.dispatchEvent(new CustomEvent('playtime:initialized', {
                detail: { application: this }
            }));

        } catch (error) {
            console.error('Failed to initialize PlayTime Application:', error);
            throw error;
        }
    }

    /**
     * Initialize application components
     */
    async initializeComponents() {
        this.logger.info('Initializing application components');

        try {
            // Initialize core components using the component factory
            this.components = this.componentFactory.initializeApplicationComponents();

            this.logger.info('Application components initialized successfully');

        } catch (error) {
            this.logger.error('Failed to initialize components', error);
            throw error;
        }
    }

    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.logger.error('Uncaught error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logger.error('Unhandled promise rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });
    }

    /**
     * Get a service from the DI container
     * @param {string} serviceName - Name of the service
     * @returns {*} Service instance
     */
    getService(serviceName) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.diContainer.get(serviceName);
    }

    /**
     * Get a component instance
     * @param {string} componentId - Component identifier
     * @returns {*} Component instance
     */
    getComponent(componentId) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.componentFactory.getComponent(componentId);
    }

    /**
     * Create a new component
     * @param {string} componentName - Type of component to create
     * @param {string} componentId - Unique identifier
     * @param {Object} options - Configuration options
     * @returns {*} Component instance
     */
    createComponent(componentName, componentId, options) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.componentFactory.createComponent(componentName, componentId, options);
    }

    /**
     * Get current application state
     * @returns {Object} Application state snapshot
     */
    getState() {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.stateManager.getSnapshot();
    }

    /**
     * Subscribe to application state changes
     * @param {string} path - State path to watch
     * @param {Function} callback - Change callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.stateManager.subscribe(path, callback);
    }

    /**
     * Shutdown the application
     * Cleans up resources and components
     */
    async shutdown() {
        if (!this.initialized) {
            console.warn('Application not initialized, nothing to shutdown');
            return;
        }

        this.logger.info('Shutting down PlayTime Application');

        try {
            // Destroy all components
            this.componentFactory.destroyAllComponents();

            // Reset application state
            this.stateManager.reset();

            // Clear references
            this.components = {};
            this.initialized = false;

            this.logger.info('PlayTime Application shutdown complete');

            // Dispatch shutdown event
            document.dispatchEvent(new CustomEvent('playtime:shutdown'));

        } catch (error) {
            this.logger.error('Error during application shutdown', error);
        }
    }

    /**
     * Restart the application
     */
    async restart() {
        this.logger.info('Restarting PlayTime Application');
        
        await this.shutdown();
        await this.initialize();
        
        this.logger.info('PlayTime Application restart complete');
    }

    /**
     * Get application status information
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.initialized,
            components: this.componentFactory ? this.componentFactory.getActiveComponents() : [],
            state: this.initialized ? this.stateManager.getSnapshot() : null,
            timestamp: Date.now()
        };
    }

    /**
     * Enable development mode features
     * Provides additional debugging and development tools
     */
    enableDevMode() {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }

        this.logger.info('Enabling development mode');

        // Expose services globally for debugging
        window.PlayTime = {
            app: this,
            services: {
                stateManager: this.stateManager,
                componentFactory: this.componentFactory,
                logger: this.logger
            },
            getService: (name) => this.getService(name),
            getComponent: (id) => this.getComponent(id),
            getState: () => this.getState(),
            getStatus: () => this.getStatus()
        };

        // Add dev tools to state manager
        this.stateManager.actions.setDevMode = (enabled) => {
            this.stateManager.actions.updatePreferences({ devMode: enabled });
        };

        this.logger.info('Development mode enabled - window.PlayTime available');
    }
}

// Create singleton instance
let applicationInstance = null;

/**
 * Get or create the application instance
 * @returns {PlayTimeApplication} Application instance
 */
function getApplication() {
    if (!applicationInstance) {
        applicationInstance = new PlayTimeApplication();
    }
    return applicationInstance;
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayTimeApplication, getApplication };
} else if (typeof window !== 'undefined') {
    window.PlayTimeApplication = PlayTimeApplication;
    window.getPlayTimeApplication = getApplication;
}

export { PlayTimeApplication, getApplication };
