// PlayTime Main Application Entry Point
// Clean bootstrap using dependency injection

import { getApplication } from './Core/PlayTimeApplication.js';

/**
 * Main application bootstrap
 * Handles DOM ready event and initializes the application
 */
async function bootstrap() {
    try {
        console.log('🚀 Starting PlayTime Application...');

        // Get the application instance (singleton)
        const app = getApplication();

        // Initialize with dependency injection
        await app.initialize();

        // Enable development mode if in dev environment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            app.enableDevMode();
        }

        console.log('✅ PlayTime Application started successfully');

    } catch (error) {
        console.error('❌ Failed to start PlayTime Application:', error);

        // Show user-friendly error message
        showApplicationError(error);
    }
}

/**
 * Display application error to user
 * @param {Error} error - The error that occurred
 */
function showApplicationError(error) {
    const errorContainer = document.querySelector('.error-container') || document.body;

    if (errorContainer) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'application-error';
        errorMessage.style.cssText = `
            background: #ffebee;
            color: #c62828;
            padding: 12px;
            margin: 8px;
            border-radius: 4px;
            border: 1px solid #e57373;
            font-family: monospace;
        `;
        errorMessage.innerHTML = `
            <strong>Application failed to start:</strong><br>
            ${error.message}<br><br>
            <small>Please refresh the page or check the console for details.</small>
        `;
        errorContainer.appendChild(errorMessage);
    }
}

// Bootstrap when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    // DOM already loaded
    bootstrap();
}

// Export for testing (minimal exports only)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        bootstrap
    };
}
