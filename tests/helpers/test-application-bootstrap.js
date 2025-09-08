/**
 * Test Application Bootstrap
 * 
 * This is a CommonJS-compatible test harness that bootstraps the PlayTime application
 * for integration tests. It provides the same functionality as main.js but without
 * ES6 imports that can't be used in Jest's CommonJS environment.
 */

// Test-compatible bootstrap function
async function bootstrapForTests() {
    try {
        console.log('🧪 Starting PlayTime Application (Test Mode)...');

        // Import the application factory using dynamic import for ES6 compatibility
        const { getApplication } = await import('../scripts/Core/PlayTimeApplication.js');

        // Get the application instance (singleton)
        const app = getApplication();

        // Initialize with dependency injection
        await app.initialize();

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
