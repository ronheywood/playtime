/**
 * Application Dependency Injection Container
 * Configures and provides all application services
 */
import ServiceContainer from './ServiceContainer.js';

class DIContainer {
    constructor() {
        this.container = new ServiceContainer();
        this.initialized = false;
    }

    /**
     * Initialize all application services
     * Call this once during application startup
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        this.registerCoreServices();
        this.registerBusinessServices();
        this.registerUIServices();
        
        this.initialized = true;
    }

    /**
     * Register core infrastructure services
     */
    registerCoreServices() {
        // Self-registration for dependency injection
        this.container.singleton('container', () => this.container);

        // Logger - singleton for consistent logging
        this.container.singleton('logger', () => {
            return window.Logger || console;
        });

        // Database - singleton for data persistence
        this.container.singleton('database', () => {
            if (window.db) {
                return window.db;
            }
            throw new Error('Database not initialized');
        }, ['logger']);

        // Event coordinator - singleton for event management
        this.container.singleton('eventCoordinator', () => {
            return window.HighlightEventCoordinator || {
                subscribe: () => {},
                publish: () => {}
            };
        }, ['logger']);

        // Confidence mapper - singleton utility
        this.container.singleton('confidenceMapper', () => {
            return window.ConfidenceMapper || {
                confidenceToColor: () => 'yellow',
                colorToConfidence: () => 'medium'
            };
        });

        // Coordinate mapper - singleton utility  
        this.container.singleton('coordinateMapper', () => {
            return window.CoordinateMapper || {
                pdfToScreen: () => ({x: 0, y: 0}),
                screenToPdf: () => ({x: 0, y: 0})
            };
        });

        // Event System Manager - centralized event handling
        this.container.singleton('eventSystemManager', (logger) => {
            const EventSystemManager = window.EventSystemManager;
            if (!EventSystemManager) {
                throw new Error('EventSystemManager class not loaded');
            }
            const manager = new EventSystemManager(logger);
            manager.initialize();
            return manager;
        }, ['logger']);
    }

    /**
     * Register business logic services
     */
    registerBusinessServices() {
        // Practice Session Service - manages practice session business logic
        this.container.singleton('practiceSessionService', (database, logger, confidenceMapper) => {
            const PracticeSessionService = window.PracticeSessionService;
            if (!PracticeSessionService) {
                throw new Error('PracticeSessionService class not loaded');
            }
            return new PracticeSessionService(database, logger, confidenceMapper);
        }, ['database', 'logger', 'confidenceMapper']);

        // Highlighting Service - manages highlight business logic
        this.container.singleton('highlightingService', (database, logger, confidenceMapper, coordinateMapper) => {
            const HighlightingService = window.HighlightingService;
            if (!HighlightingService) {
                throw new Error('HighlightingService class not loaded');
            }
            return new HighlightingService(database, logger, confidenceMapper, coordinateMapper);
        }, ['database', 'logger', 'confidenceMapper', 'coordinateMapper']);

        // Score Management Service - manages score-related business logic
        this.container.singleton('scoreManagementService', (database, logger) => {
            const ScoreManagementService = window.ScoreManagementService;
            if (!ScoreManagementService) {
                throw new Error('ScoreManagementService class not loaded');
            }
            return new ScoreManagementService(database, logger);
        }, ['database', 'logger']);
    }

    /**
     * Register UI/Presentation services
     */
    registerUIServices() {
        // App State - core state container
        this.container.singleton('appState', (logger) => {
            const AppState = window.AppState;
            if (!AppState) {
                throw new Error('AppState class not loaded');
            }
            return new AppState(logger);
        }, ['logger']);

        // State Manager - high-level state management facade
        this.container.singleton('stateManager', (appState, logger) => {
            const StateManager = window.StateManager;
            if (!StateManager) {
                throw new Error('StateManager class not loaded');
            }
            return new StateManager(appState, logger);
        }, ['appState', 'logger']);

        // Component Factory - creates components with proper DI
        this.container.singleton('componentFactory', (container, logger) => {
            const ComponentFactory = window.ComponentFactory;
            if (!ComponentFactory) {
                throw new Error('ComponentFactory class not loaded');
            }
            return new ComponentFactory(container, logger);
        }, ['container', 'logger']);
    }

    /**
     * Get a service instance
     * @param {string} serviceName - Name of the service
     * @returns {*} Service instance
     */
    get(serviceName) {
        if (!this.initialized) {
            this.initialize();
        }
        return this.container.get(serviceName);
    }

    /**
     * Check if a service is available
     * @param {string} serviceName - Name of the service
     * @returns {boolean}
     */
    has(serviceName) {
        return this.container.has(serviceName);
    }

    /**
     * Create a scoped container for testing
     * @returns {ServiceContainer}
     */
    createTestScope() {
        return this.container.createScope();
    }

    /**
     * Get all registered service names (useful for debugging)
     * @returns {Array<string>}
     */
    getRegisteredServices() {
        return this.container.getRegisteredServices();
    }
}

// Create and export the global DI container instance
const diContainer = new DIContainer();

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DIContainer, diContainer };
} else if (typeof window !== 'undefined') {
    window.DIContainer = DIContainer;
    window.diContainer = diContainer;
}

export { DIContainer, diContainer };
