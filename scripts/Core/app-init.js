/**
 * Application Initialization Script
 * Demonstrates the new clean architecture in action
 * This replaces the legacy global window dependencies approach
 */

/**
 * Initialize PlayTime application with new architecture
 */
async function initializePlayTime() {
    
        console.log('Starting PlayTime...');

        // Check if required classes are loaded
        const requiredClasses = [
            'ServiceContainer',
            'DIContainer', 
            'AppState',
            'StateManager',
            'PracticeSessionService',
            'HighlightingService',
            'ScoreManagementService',
            'ComponentFactory',
            'PracticeSessionComponent',
            'EventSystemManager',
            'PlayTimeApplication'
        ];

        const missingClasses = requiredClasses.filter(className => !window[className]);
        if (missingClasses.length > 0) {
            console.warn('Missing required classes:', missingClasses);
            console.log('Note: This is expected during incremental migration');
        }

        // Create and initialize application
        const app = window.getPlayTimeApplication();
        await app.initialize();

        // Enable development mode for debugging
        if (window.location.hash.includes('dev') || localStorage.getItem('playtime-dev-mode')) {
            app.enableDevMode();
            console.log('Development mode enabled');
        }
        

        console.log('PlayTime application initialized successfully!');
        return app;
}



    // Maintain backward compatibility for existing event patterns
    const eventSystem = app.getService('eventSystemManager');
    
    // Map legacy events to new event system
    eventSystem.on('action:start-practice', (data) => {
        console.log('Legacy start-practice action triggered via new event system');
    });

    eventSystem.on('action:complete-section', (data) => {
        console.log('Legacy complete-section action triggered via new event system');
    });

    console.log('Legacy compatibility layer established');
}

/**
 * Demonstration of the new architecture usage
 */
function demonstrateNewArchitecture(app) {
    console.log('=== New Architecture Demo ===');

    // 1. Using services directly
    const stateManager = app.getService('stateManager');
    const practiceService = app.getService('practiceSessionService');

    // 2. Setting application state
    stateManager.actions.setCurrentScore({
        id: 'demo-score',
        name: 'Demo Piano Piece',
        pages: 3
    });

    // 3. Subscribing to state changes
    const unsubscribe = stateManager.subscribe('currentScore', (score) => {
        console.log('Current score changed:', score);
    });

    // 4. Using business services
    practiceService.validatePracticeSession({
        scoreId: 'demo-score',
        sections: [
            { name: 'Introduction', page: 1 },
            { name: 'Main Theme', page: 2 }
        ]
    }).then(result => {
        console.log('Practice session validation:', result);
    });

    // 5. Creating components dynamically
    const highlightComponent = app.createComponent('HighlightingComponent', 'demo-highlighting');
    highlightComponent.init();

    // 6. Using event system
    const eventSystem = app.getService('eventSystemManager');
    eventSystem.emit('demo:test-event', { message: 'Hello from new architecture!' });

    // 7. Getting application status
    console.log('Application status:', app.getStatus());

    // Clean up
    setTimeout(() => {
        unsubscribe();
        app.componentFactory.destroyComponent('demo-highlighting');
        console.log('Demo cleanup complete');
    }, 5000);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const app = await initializePlayTime();
            
            // Run demo if in dev mode
            if (window.PlayTime) {
                demonstrateNewArchitecture(app);
            }
        } catch (error) {
            console.error('Auto-initialization failed:', error);
        }
    });
} else {
    // DOM already ready
    setTimeout(async () => {
        try {
            const app = await initializePlayTime();
            
            // Run demo if in dev mode
            if (window.PlayTime) {
                demonstrateNewArchitecture(app);
            }
        } catch (error) {
            console.error('Auto-initialization failed:', error);
        }
    }, 100);
}

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializePlayTime, setupLegacyCompatibility, demonstrateNewArchitecture };
} else if (typeof window !== 'undefined') {
    window.initializePlayTime = initializePlayTime;
    window.setupLegacyCompatibility = setupLegacyCompatibility;
    window.demonstrateNewArchitecture = demonstrateNewArchitecture;
}
