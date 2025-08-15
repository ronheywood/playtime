/**
 * Centralized logging utility for PlayTime application
 * Provides consistent logging with emoji prefixes and environment-aware configuration
 */

class Logger {
    constructor() {
        this.isTestEnvironment = (
            typeof jest !== 'undefined' ||
            (typeof global !== 'undefined' && global.isTestEnvironment) ||
            (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')
        );
    this.isSilent = false; // Ensure logger is non-silent in tests
    }

    /**
     * Enable or disable logging output
     * @param {boolean} silent - Whether to suppress all logging
     */
    setSilent(silent) {
        this.isSilent = silent;
    }

    /**
     * Log informational messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    info(message, ...args) {
        if (!this.isSilent) {
            console.log('✅', message, ...args);
        }
    }

    /**
     * Log loading/processing messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    loading(message, ...args) {
        if (!this.isSilent) {
            console.log('🔄', message, ...args);
        }
    }

    /**
     * Log warning messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    warn(message, ...args) {
        if (!this.isSilent) {
            console.warn('❌', message, ...args);
        }
    }

    /**
     * Log error messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    error(message, ...args) {
        if (!this.isSilent) {
            console.error('❌', message, ...args);
        }
    }

    /**
     * Log debug messages (only in development)
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    debug(message, ...args) {
        if (
            !this.isSilent &&
            typeof process !== 'undefined' &&
            process.env &&
            process.env.NODE_ENV === 'development'
        ) {
            console.log('🐛', message, ...args);
        }
        // Always log debug messages in tests
        if (this.isTestEnvironment) {
            console.log('🐛', message, ...args);
        }
    }
}

// Create and export singleton instance
const logger = new Logger();

// For Node.js/CommonJS environments (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = logger;
}

// For browser environments
if (typeof window !== 'undefined') {
    window.logger = logger;
}

// Also export as global for tests
if (typeof global !== 'undefined') {
    global.logger = logger;
}
