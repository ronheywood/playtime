/**
 * HighlightDeletionService - Handles atomic deletion of highlights and practice plan cleanup
 * Provides safe deletion with confirmation and transaction rollback
 * 
 * Usage in application:
 * - Registered as singleton in DI container as 'highlightDeletionService'
 * - Access via: app.diContainer.get('highlightDeletionService')
 * - Dependencies: database, logger (automatically injected)
 */
class HighlightDeletionService {
    constructor(database, logger = console) {
        this.database = database;
        this.logger = logger;
    }

    /**
     * Delete a highlight with atomic cleanup of practice plans
     * @param {string} highlightId - ID of highlight to delete
     * @returns {Promise<boolean>} - True if deleted, false if cancelled or not found
     */
    async deleteHighlight(highlightId) {
        try {
            // 1. Check if highlight exists
            const highlight = await this.database.getHighlight(highlightId);
            if (!highlight) {
                return false; // Highlight doesn't exist
            }

            // 2. Show confirmation dialog
            const confirmed = confirm('Are you sure you want to delete this highlight?');
            if (!confirmed) {
                return false; // User cancelled
            }

            // 3. Execute atomic deletion
            await this.deleteHighlightWithTransaction(highlightId);
            return true;

        } catch (error) {
            // Log error and re-throw with user-friendly message
            this.logger.error('Highlight deletion failed:', error);
            throw new Error(`Failed to delete highlight: ${error.message}`);
        }
    }

    /**
     * Execute atomic deletion of highlight and practice plan cleanup
     * @param {string} highlightId - ID of highlight to delete
     * @private
     */
    async deleteHighlightWithTransaction(highlightId) {
        // Use the database abstraction layer instead of raw IndexedDB
        const operations = [
            { type: 'deleteHighlight', highlightId: highlightId },
            { type: 'deletePracticePlanHighlightsByHighlightId', highlightId: highlightId }, // Clean up practice plan references by highlight ID
            { type: 'deleteEmptyPracticePlans', highlightId: highlightId } // Delete practice plans that become empty
        ];

        const result = await this.database.deleteWithTransaction(operations);
        
        if (!result.success) {
            throw new Error('Failed to delete highlight atomically');
        }
        
        return result;
    }
}

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighlightDeletionService;
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.HighlightDeletionService = HighlightDeletionService;
}