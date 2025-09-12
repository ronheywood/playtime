/**
 * Main.js Test Wrapper
 * 
 * This module provides a CommonJS-compatible way to bootstrap the PlayTime application
 * for integration tests, replacing direct require() calls to main.js which now uses ES6 imports.
 */

const { setupTestApplication, triggerDOMContentLoaded, bootstrapForTests } = require('./test-application-bootstrap');

// Export the test bootstrap functions for integration tests
module.exports = {
    setupTestApplication,
    triggerDOMContentLoaded,
    bootstrapForTests,
    
    // Legacy compatibility - some tests might expect a bootstrap function
    bootstrap: triggerDOMContentLoaded
};