/**
 * Practice Persistence Facade
 * Abstracts database operations for the Practice domain
 * Provides a simple API that higher-level services use
 */
class PracticePersistence {
    constructor(database, logger) {
        this.database = database;
        this.logger = logger;
    }

    async savePracticeSession(session) {
        if (!this.database || typeof this.database.savePracticeSession !== 'function') {
            throw new Error('Database savePracticeSession API not available');
        }
        return await this.database.savePracticeSession(session);
    }

    async getPracticeSession(sessionId) {
        if (!this.database || typeof this.database.getPracticeSession !== 'function') {
            throw new Error('Database getPracticeSession API not available');
        }
        return await this.database.getPracticeSession(sessionId);
    }

    async getHighlightsBySection(sectionId) {
        if (!this.database || typeof this.database.getHighlightsBySection !== 'function') {
            return [];
        }
        return await this.database.getHighlightsBySection(sectionId);
    }

    async saveHighlight(highlight) {
        if (!this.database || typeof this.database.saveHighlight !== 'function') {
            throw new Error('Database saveHighlight API not available');
        }
        return await this.database.saveHighlight(highlight);
    }

    async updateHighlight(id, updates) {
        if (!this.database || typeof this.database.updateHighlight !== 'function') {
            throw new Error('Database updateHighlight API not available');
        }
        return await this.database.updateHighlight(id, updates);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticePersistence;
} else if (typeof window !== 'undefined') {
    window.PracticePersistence = PracticePersistence;
}
