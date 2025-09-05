/**
 * PracticeSessionManagerAdapter
 * 
 * Lightweight compatibility adapter used during migration.
 * It constructs the legacy PracticeSessionManager and, when possible,
 * injects the new PracticePersistence facade in front of the raw database.
 * The adapter proxies all calls to the legacy instance so tests and legacy
 * callers can continue working while we incrementally migrate responsibilities.
 */

const path = require('path');

let LegacyPracticeSessionManager;
try {
    // Resolve the legacy manager path reliably using __dirname to avoid relative/case issues
    const legacyPath = path.resolve(__dirname, '..', 'practice-session-manager.js');
    LegacyPracticeSessionManager = require(legacyPath);
} catch (e) {
    // In browser incremental migration we expect the global to exist
    LegacyPracticeSessionManager = (typeof window !== 'undefined' && window.PracticeSessionManager) || null;
}

class PracticeSessionManagerAdapter {
    constructor(logger, highlighting, timer, practiceSessionStarter, practicePlanPersistenceService, database, options = {}) {
        if (!LegacyPracticeSessionManager) {
            throw new Error('Legacy PracticeSessionManager not available for adapter');
        }

        // Create the legacy manager instance
        const legacyInstance = new LegacyPracticeSessionManager(
            logger,
            highlighting,
            timer,
            practiceSessionStarter,
            practicePlanPersistenceService,
            database,
            options
        );

        // Try to inject the PracticePersistence facade when running in Node/test env
        try {
            const PracticePersistence = require('../Infrastructure/PracticePersistence');
            if (PracticePersistence && database) {
                // Replace the legacy manager's database with the facade wrapping the provided database
                legacyInstance.database = new PracticePersistence(database, logger);
            }
        } catch (err) {
            // Not fatal - continue with legacy database if facade not available
            // Keep silent to avoid noisy logs during browser runtime
        }

    // Return the legacy instance directly so tests can spy/mock its methods
    return legacyInstance;
    }
}

module.exports = PracticeSessionManagerAdapter;
