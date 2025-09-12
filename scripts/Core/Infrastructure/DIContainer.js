class DIContainer {
    constructor() {
        this.container = new window.ServiceContainer();
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
            return new Logger();
        });

        this.container.singleton('confidence', () => PlayTimeConfidence);

        // Database - singleton for data persistence
        // Note: do NOT depend on 'database' here (self-dependency causes a cycle).
        this.container.singleton('database', (logger) => {
            if (window.PlayTimeDB) {
                return window.PlayTimeDB;
            }
            
            // Create database instance if it doesn't exist
            if (window.IndexedDBDatabase && window.AbstractDatabase) {
                try {
                    logger.info('Creating database instance...');
                    window.PlayTimeDB = new window.IndexedDBDatabase(logger);
                    return window.PlayTimeDB;
                } catch (error) {
                    logger.error('Failed to create database instance:', error);
                    throw new Error('Failed to create database instance: ' + error.message);
                }
            }
            
            // Provide a clearer message and allow logger to record the issue
            if (logger && typeof logger.error === 'function') {
                try { logger.error('Database classes not loaded or database service requested before initialization'); } catch (_) {}
            }
            throw new Error('Database not initialized - database classes not available');
        }, ['logger']);
        
        this.container.singleton('highlightPersistenceService', (database, logger) => {
            // Try to use a global implementation first (browser bundles may expose it)
            let HighlightPersistenceServiceImpl = (typeof window !== 'undefined' && window.HighlightPersistenceService) ? window.HighlightPersistenceService : null;
            if (!HighlightPersistenceServiceImpl) {
                try {
                    // Fallback to requiring the module in CommonJS environments (Node/tests)
                    // eslint-disable-next-line global-require
                    const mod = require('../../highlighting/HighlightPersistenceService');
                    HighlightPersistenceServiceImpl = mod && (mod.default || mod);
                } catch (e) {
                    throw new Error('HighlightPersistenceService implementation not available');
                }
            }

            const service = new HighlightPersistenceServiceImpl(database, logger);
            logger.info('HighlightPersistenceService initialized', service);
            return service;
        }, ['database', 'logger']);

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
        // Practice Persistence - wraps raw database with a persistence facade
        this.container.singleton('practicePersistence', (database, logger) => {
            const PracticePersistence = window.PracticePersistence;
            if (!PracticePersistence) {
                // Fallback to requiring the module in environments that use CommonJS
                // Note: require is available in Node/test environments
                // eslint-disable-next-line global-require
                const Module = require('../../Practice/Infrastructure/PracticePersistence');
                return new Module(database, logger);
            }
            return new PracticePersistence(database, logger);
        }, ['database', 'logger']);

        // Practice Session Service - manages practice session business logic
        // Inject PracticePersistence instead of raw database so the service
        // always receives the persistence facade.
        this.container.singleton('practiceSessionService', (practicePersistence, logger, confidenceMapper) => {
            const PracticeSessionService = window.PracticeSessionService;
            if (!PracticeSessionService) {
                throw new Error('PracticeSessionService class not loaded');
            }
            return new PracticeSessionService(practicePersistence, logger, confidenceMapper);
        }, ['practicePersistence', 'logger', 'confidenceMapper']);
        

        this.container.singleton('practiceSessionComponent', (stateManager, practiceSessionService, highlightingService, logger) => {
            return new PracticeSessionComponent(stateManager, practiceSessionService, highlightingService, logger);
        }, ['stateManager', 'practiceSessionService', 'highlightingService', 'logger']);


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

        // Practice Plan Persistence Service - manages practice plan storage
        this.container.singleton('practicePlanPersistenceService', (database, logger) => {
            const PracticePlanPersistenceService = window.PracticePlanPersistenceService;
            if (!PracticePlanPersistenceService) {
                throw new Error('PracticePlanPersistenceService class not loaded');
            }
            return new PracticePlanPersistenceService(database, logger);
        }, ['database', 'logger']);

        // Practice Planner - manages practice session setup UI
        this.container.singleton('practicePlanner', (logger, database, highlightPersistenceService, practicePlanPersistenceService) => {
            if (typeof window.createPlayTimePracticePlanner !== 'function') {
                throw new Error('createPlayTimePracticePlanner factory not loaded');
            }
            return window.createPlayTimePracticePlanner(logger, database, highlightPersistenceService, practicePlanPersistenceService);
        }, ['logger', 'database', 'highlightPersistenceService', 'practicePlanPersistenceService']);
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

        // UI Highlighting - expose the PlayTimeHighlighting UI module via DI
        // Resolve the module directly from source in CommonJS/test environments.
        // Note: removing reliance on globals makes the service resolution explicit.
        this.container.singleton('playTimeHighlighting', (logger, database) => {
            // Resolve the PlayTimeHighlighting implementation lazily so this
            // DI container can be used both in browser bundles (where the
            // module may be loaded as a global) and in CommonJS test runs.
            let HighlightingImpl = (typeof window !== 'undefined' && window.PlayTimeHighlighting) ? window.PlayTimeHighlighting : null;
            if (!HighlightingImpl) {
                try {
                    // eslint-disable-next-line global-require
                    const mod = require('../../highlighting/highlighting');
                    HighlightingImpl = mod && (mod.default || mod);
                } catch (e) {
                    throw new Error('PlayTimeHighlighting implementation not available');
                }
            }

            // Support multiple shapes:
            // - constructor function / class (new HighlightingImpl())
            // - factory function (HighlightingImpl() returns instance)
            // - plain object instance (use as-is)
            let highlightingInstance = null;
            try {
                if (typeof HighlightingImpl === 'function') {
                    // Try to construct; if constructing throws, try calling as factory
                    try {
                        highlightingInstance = new HighlightingImpl();
                    } catch (ctorErr) {
                        // Try factory invocation
                        try {
                            highlightingInstance = HighlightingImpl();
                        } catch (factoryErr) {
                            // Both construction and factory invocation failed
                            throw ctorErr;
                        }
                    }
                } else if (HighlightingImpl && typeof HighlightingImpl === 'object') {
                    highlightingInstance = HighlightingImpl;
                }
            } catch (err) {
                throw new Error('Failed to create PlayTimeHighlighting instance: ' + (err && err.message));
            }

            if (!highlightingInstance) {
                throw new Error('PlayTimeHighlighting implementation not available');
            }

            const config = {};
            // If a database was provided (DI resolved 'database'), perform a
            // best-effort initialization here so consumers who request the
            // highlighting instance from the container get an initialized module.
            // If database is not yet available, leave initialization to the
            // application bootstrap which will call init() explicitly.
            if (database) {
                try {
                    const initResult = highlightingInstance.init(config, logger, confidence, PT_CONSTANTS, { database });
                    // If init returns a promise, attach a noop catch so unhandled
                    // rejections don't bubble up synchronously.
                    if (initResult && typeof initResult.then === 'function') {
                        initResult.catch(() => {});
                    }
                } catch (initErr) {
                    // Swallow - bootstrap will handle initialization failures if needed
                }
            }
            // Do NOT write globals here; leave bootstrap to surface instances if needed
            return highlightingInstance;
            }, ['logger','confidence']);

        // PDF Viewer - provide the PlayTime PDF viewer via DI
        // Prefer a browser global factory `createPlayTimePDFViewer` if present,
        // otherwise fall back to requiring the local implementation in CommonJS/test envs.
        this.container.singleton('playTimePDFViewer', (logger) => {
            let createFn = null;
            if (typeof createPlayTimePDFViewer === 'function') {
                createFn = createPlayTimePDFViewer;
            } else {
                try {
                    // eslint-disable-next-line global-require
                    const mod = require('../../pdf-viewer');
                    createFn = mod && (mod.createPlayTimePDFViewer || mod.default || mod);
                } catch (e) {
                    throw new Error('PlayTimePDFViewer factory not available');
                }
            }

            const instance = createFn(logger, PT_CONSTANTS);
            // Do not assign to window here; bootstrap will decide whether to expose globals.
            return instance;
        }, ['logger']);

            // Score List - create and provide the PlayTime score list via DI
            // Keep this simple: require the local score-list factory in CommonJS/tests,
            // or use the global factory in browser bundles if present.
            this.container.singleton('playTimeScoreList', (database, logger) => {
                let createFn = null;
                if (typeof window !== 'undefined' && typeof window.createPlayTimeScoreList === 'function') {
                    createFn = window.createPlayTimeScoreList;
                } else {
                    try {
                        // eslint-disable-next-line global-require
                        const mod = require('../../score-list');
                        createFn = mod && (mod.createPlayTimeScoreList || mod.default || mod);
                    } catch (e) {
                        throw new Error('PlayTimeScoreList factory not available');
                    }
                }

                const instance = createFn(database, logger);
                return instance;
            }, ['database', 'logger']);
        // Note: 'database' intentionally omitted from dependency list here to
        // avoid forcing resolution of the database during container initialization.
        // Consumers can request the 'playTimeHighlighting' service after the
        // database exists and DI will pass it when resolving.
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

    register(serviceName, factory, dependencies = []) {
        this.container.singleton(serviceName, factory, dependencies);
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
}

function createDiContainer() {
    return new DIContainer();
}

// Make createDiContainer available globally
if (typeof window !== 'undefined') {
    window.createDiContainer = createDiContainer;
}