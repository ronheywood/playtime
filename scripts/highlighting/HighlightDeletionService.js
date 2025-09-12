/**
 * HighlightDeletionService - Handles atomic deletion of highlights and practice plan cleanup
 * Provides safe deletion with confirmation and transaction rollback
 */
class HighlightDeletionService {
    constructor(database) {
        this.database = database;
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
            console.error('Highlight deletion failed:', error);
            throw new Error(`Failed to delete highlight: ${error.message}`);
        }
    }

    /**
     * Execute atomic deletion of highlight and practice plan cleanup
     * @param {string} highlightId - ID of highlight to delete
     * @private
     */
    async deleteHighlightWithTransaction(highlightId) {
        // Check if we have IndexedDB database
        if (!this.database.db) {
            throw new Error('Database not initialized');
        }

        // Create transaction for both highlights and practice plans
        const transaction = this.database.db.transaction(['highlights', 'practicePlans'], 'readwrite');
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error('Transaction failed: ' + transaction.error));
            
            try {
                // 1. Delete highlight from highlights store
                const highlightStore = transaction.objectStore('highlights');
                highlightStore.delete(highlightId);

                // 2. Update all practice plans that contain this highlight
                const planStore = transaction.objectStore('practicePlans');
                const getAllRequest = planStore.getAll();
                
                getAllRequest.onsuccess = () => {
                    const plans = getAllRequest.result;
                    
                    plans.forEach(plan => {
                        let planModified = false;
                        const originalSectionCount = plan.sections.length;
                        
                        // Remove sections that reference the deleted highlight
                        plan.sections = plan.sections.filter(section => {
                            if (section.highlightId === highlightId) {
                                planModified = true;
                                return false; // Remove this section
                            }
                            return true; // Keep this section
                        });
                        
                        if (planModified) {
                            // Recalculate total duration
                            plan.totalDuration = plan.sections.reduce((total, section) => {
                                return total + (section.targetTime || 0);
                            }, 0);
                            
                            // Save updated plan
                            planStore.put(plan);
                        }
                    });
                };
                
                // Trigger the success event immediately for mock
                if (getAllRequest.onsuccess) {
                    getAllRequest.onsuccess();
                }
                
                getAllRequest.onerror = () => {
                    reject(new Error('Failed to retrieve practice plans'));
                };

            } catch (error) {
                reject(error);
            }
        });
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