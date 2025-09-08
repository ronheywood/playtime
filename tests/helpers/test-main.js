/**
 * Test Application Entry Point (CommonJS)
 * 
 * This is a CommonJS-compatible version of the main application bootstrap
 * specifically designed for integration tests. It mirrors the functionality
 * of main.js but without ES6 imports that aren't supported in Jest.
 */

// Use CommonJS require for test compatibility
const path = require('path');
const fs = require('fs');

/**
 * Test-compatible bootstrap function
 * This replicates the core bootstrap logic from main.js using require()
 */
async function bootstrapForTests() {
    try {
        console.log('🧪 Starting PlayTime Application (Test Mode)...');

        // Manually bootstrap the application using require() instead of ES6 imports
        // We need to manually replicate what getApplication() does
        
        // Load dependencies first - ServiceContainer must be loaded before DIContainer
        const ServiceContainer = require('../../scripts/Core/Infrastructure/ServiceContainer.js');
        global.window.ServiceContainer = ServiceContainer;
        
        // Load the DIContainer using the factory function
        const { DIContainer } = require('../../scripts/Core/Infrastructure/DIContainer.js');
        const container = new DIContainer();
        
        // Load application class
        const { PlayTimeApplication } = require('../../scripts/Core/PlayTimeApplication.js');
        
        // Create application instance
        let appInstance = null;
        function getApplication() {
            if (!appInstance) {
                appInstance = new PlayTimeApplication(container);
            }
            return appInstance;
        }
        
        // Get the application instance (singleton)
        const app = getApplication();

        // Initialize with dependency injection
        await app.init();

        // Always enable development mode in tests
        app.enableDevMode();

        console.log('✅ PlayTime Application started successfully (Test Mode)');

        return app;

    } catch (error) {
        console.error('❌ Failed to start PlayTime Application (Test Mode):', error);
        throw error;
    }
}

/**
 * Setup DOM and bootstrap the application for tests
 * This replaces the direct require() calls in integration tests
 */
async function setupTestApplication() {
    // Bootstrap when DOM is ready (or immediately if already loaded)
    if (document.readyState === 'loading') {
        return new Promise((resolve) => {
            document.addEventListener('DOMContentLoaded', async () => {
                const app = await bootstrapForTests();
                resolve(app);
            });
        });
    } else {
        // DOM already loaded
        return await bootstrapForTests();
    }
}

/**
 * Manual bootstrap trigger for tests that need explicit control
 */
async function triggerDOMContentLoaded() {
    const app = await bootstrapForTests();
    
    // Dispatch DOMContentLoaded if not already done
    if (document.readyState !== 'loading') {
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }
    
    return app;
}

module.exports = {
    bootstrapForTests,
    setupTestApplication,
    triggerDOMContentLoaded
};
