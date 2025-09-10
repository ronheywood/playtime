/**
 * Centralized logging utility for PlayTime application
 * Provides consistent logging with emoji prefixes and environment-aware configuration
 */

class Logger {
    constructor() {
        // Determine test/dev environment safely:
        // Prefer runtime PlayTimeConfig when present (browser-friendly), fall back to Node process checks when available
        const runtimeCfg = (typeof window !== 'undefined' && window.PlayTimeConfig) ? window.PlayTimeConfig : null;
        this.isTestEnvironment = (
            (typeof jest !== 'undefined') ||
            (typeof global !== 'undefined' && global.isTestEnvironment) ||
            (runtimeCfg && runtimeCfg.isTest === true) ||
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
        // Only debug in dev mode. Prefer PlayTimeConfig.env in browser, fall back to process.env when available.
        const runtimeCfg = (typeof window !== 'undefined' && window.PlayTimeConfig) ? window.PlayTimeConfig : null;
        const isDev = (runtimeCfg && runtimeCfg.env === 'development') || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development');
        if (!this.isSilent && !this.isTestEnvironment && isDev) {
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
