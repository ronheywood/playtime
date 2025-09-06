/**
 * Service for highlighting persistence operations
 * Abstracts database interactions and provides testable interface
 */
class HighlightPersistenceService {
    constructor(database, logger = null, config = {}) {
        if (!database) {
            throw new Error('HighlightPersistenceService requires a database instance (constructor injection)');
        }
        this.database = database;
        this.logger = logger;
        this.config = {
            retryAttempts: 3,
            retryDelay: 100,
            ...config
        };
    }

    /**
     * Set or update the database instance
     */
    // Deprecated: prefer constructor injection. Kept for compatibility but will
    // throw to make misuse visible during migration.
    setDatabase(/* database */) {
        throw new Error('setDatabase is deprecated. Provide database via constructor injection to HighlightPersistenceService');
    }

    /**
     * Save a highlight to persistent storage
     */
    async saveHighlight(highlightElement, pdfId) {
        if (!this.database || typeof this.database.addHighlight !== 'function') {
            throw new Error('Database not available or does not support addHighlight');
        }

        const record = highlightElement.toDatabaseRecord(pdfId);
        
        try {
            return await this.database.addHighlight(record);
        } catch (error) {
            throw new Error(`Failed to save highlight: ${error.message}`);
        }
    }

    /**
     * Load highlights for a specific PDF with retry logic
     */
    async loadHighlights(pdfId, attempt = 0) {
        if (!this.database || typeof this.database.getHighlights !== 'function') {
            return [];
        }

        try {
            let sections = await this.database.getHighlights(pdfId);
            
            // Fallback: try numeric conversion if string pdfId failed
            if ((!sections || sections.length === 0) && /(\d+)/.test(String(pdfId))) {
                try {
                    sections = await this.database.getHighlights(Number(pdfId));
                } catch (_) {
                    // Ignore conversion error
                }
            }

            return sections || [];
        } catch (error) {
            // Retry logic for async database readiness
            if (attempt < this.config.retryAttempts) {
                await this.delay(this.config.retryDelay);
                return this.loadHighlights(pdfId, attempt + 1);
            }
            
            throw new Error(`Failed to load highlights after ${this.config.retryAttempts} attempts: ${error.message}`);
        }
    }

    /**
     * Get a single highlight by ID
     * @param {number} id - The highlight ID
     * @returns {Promise<Object|null>} The highlight record or null if not found
     */
    async getHighlight(id) {
        if (!this.database || typeof this.database.getHighlight !== 'function') {
            throw new Error('Database not available or does not support getHighlight');
        }

        try {
            return await this.database.getHighlight(id);
        } catch (error) {
            this.logger.error('Failed to get highlight:', error);
            throw error;
        }
    }

    /**
     * Update an existing highlight with new data
     * @param {number} id - The highlight ID to update
     * @param {Object} updates - The data to update (e.g., title, notes, annotatedAt)
     * @returns {Promise<Object>} The updated highlight record
     */
    async updateHighlight(id, updates) {
        if (!this.database || typeof this.database.updateHighlight !== 'function') {
            throw new Error('Database not available or does not support updateHighlight');
        }

        try {
            return await this.database.updateHighlight(id, updates);
        } catch (error) {
            this.logger.error('Failed to update highlight:', error);
            throw error;
        }
    }

    /**
     * Check if database is available and ready
     */
    isAvailable() {
        return !!(this.database && 
                  typeof this.database.getHighlights === 'function' && 
                  typeof this.database.addHighlight === 'function');
    }

    /**
     * Get database statistics or info
     */
    async getDatabaseInfo() {
        if (!this.database) return null;
        
        try {
            // If database supports info method, use it
            if (typeof this.database.getInfo === 'function') {
                return await this.database.getInfo();
            }
            
            // Otherwise return basic availability info
            return {
                available: this.isAvailable(),
                methods: Object.getOwnPropertyNames(this.database)
            };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }

    // Private helpers

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Dual-mode export for Node.js and browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighlightPersistenceService;
}
if (typeof window !== 'undefined') {
    window.HighlightPersistenceService = HighlightPersistenceService;
}
