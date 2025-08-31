/**
 * Practice Plan Persistence Service
 * Handles saving and loading practice plans with their associated highlights
 */
class PracticePlanPersistenceService {
    constructor(database = null, logger = null) {
        this.database = database;
        this.logger = logger || console;
    }

    /**
     * Set or update the database instance
     */
    setDatabase(database) {
        this.database = database;
        return this;
    }

    /**
     * Save a practice plan to persistent storage
     * @param {Object} practicePlan - The practice plan data
     * @param {string} practicePlan.name - Session name
     * @param {string} practicePlan.focus - Session focus (accuracy, tempo, etc.)
     * @param {number} practicePlan.duration - Total session duration in minutes
     * @param {number} practicePlan.scoreId - Reference to the score
     * @param {Array} practicePlan.sections - Array of practice sections
     * @returns {Promise<number>} The ID of the saved practice plan
     */
    async savePracticePlan(practicePlan) {
        if (!this.database || typeof this.database.savePracticePlan !== 'function') {
            throw new Error('Database not available or does not support savePracticePlan');
        }

        if (!practicePlan) {
            throw new Error('Practice plan data is required');
        }

        if (!practicePlan.scoreId) {
            throw new Error('Score ID is required for practice plan');
        }

        try {
            this.logger.info('Saving practice plan:', {
                name: practicePlan.name,
                scoreId: practicePlan.scoreId,
                sectionsCount: practicePlan.sections?.length || 0
            });

            // Save the practice plan record
            const planId = await this.database.savePracticePlan({
                name: practicePlan.name,
                focus: practicePlan.focus,
                duration: practicePlan.duration,
                scoreId: practicePlan.scoreId,
                totalSections: practicePlan.sections?.length || 0,
                estimatedTime: practicePlan.estimatedTime || 0,
                createdAt: new Date().toISOString()
            });

            // Save the associated practice plan highlights
            if (practicePlan.sections && practicePlan.sections.length > 0) {
                await this.savePracticePlanHighlights(planId, practicePlan.sections);
            }

            this.logger.info('Practice plan saved successfully with ID:', planId);
            return planId;

        } catch (error) {
            this.logger.error('Failed to save practice plan:', error);
            throw new Error(`Failed to save practice plan: ${error.message}`);
        }
    }

    /**
     * Save practice plan highlights (many-to-many relationship)
     * @param {number} planId - The practice plan ID
     * @param {Array} sections - Array of practice sections
     * @returns {Promise<void>}
     */
    async savePracticePlanHighlights(planId, sections) {
        if (!this.database || typeof this.database.savePracticePlanHighlight !== 'function') {
            throw new Error('Database not available or does not support savePracticePlanHighlight');
        }

        try {
            // Save each section as a practice plan highlight with sort order
            const savePromises = sections.map((section, index) => {
                return this.database.savePracticePlanHighlight({
                    practicePlanId: planId,
                    highlightId: section.highlightId,
                    sortOrder: index + 1,
                    practiceMethod: section.practiceMethod,
                    targetTime: section.targetTime,
                    notes: section.notes || '',
                    createdAt: new Date().toISOString()
                });
            });

            await Promise.all(savePromises);
            this.logger.info(`Saved ${sections.length} practice plan highlights for plan ID:`, planId);

        } catch (error) {
            this.logger.error('Failed to save practice plan highlights:', error);
            throw new Error(`Failed to save practice plan highlights: ${error.message}`);
        }
    }

    /**
     * Load a practice plan by ID with its highlights
     * @param {number} planId - The practice plan ID
     * @returns {Promise<Object|null>} The practice plan with highlights, or null if not found
     */
    async loadPracticePlan(planId) {
        if (!this.database || typeof this.database.getPracticePlan !== 'function') {
            throw new Error('Database not available or does not support getPracticePlan');
        }

        try {
            const plan = await this.database.getPracticePlan(planId);
            if (!plan) {
                return null;
            }

            // Load associated highlights
            const highlights = await this.loadPracticePlanHighlights(planId);
            
            return {
                ...plan,
                sections: highlights
            };

        } catch (error) {
            this.logger.error('Failed to load practice plan:', error);
            throw new Error(`Failed to load practice plan: ${error.message}`);
        }
    }

    /**
     * Load practice plan highlights for a specific plan
     * @param {number} planId - The practice plan ID
     * @returns {Promise<Array>} Array of practice plan highlights ordered by sortOrder
     */
    async loadPracticePlanHighlights(planId) {
        if (!this.database || typeof this.database.getPracticePlanHighlights !== 'function') {
            return [];
        }

        try {
            const highlights = await this.database.getPracticePlanHighlights(planId);
            
            // Sort by sortOrder to maintain the correct sequence
            return highlights.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        } catch (error) {
            this.logger.error('Failed to load practice plan highlights:', error);
            throw new Error(`Failed to load practice plan highlights: ${error.message}`);
        }
    }

    /**
     * Load all practice plans for a specific score
     * @param {number} scoreId - The score ID
     * @returns {Promise<Array>} Array of practice plans for the score
     */
    async loadPracticePlansForScore(scoreId) {
        if (!this.database || typeof this.database.getPracticePlansForScore !== 'function') {
            return [];
        }

        try {
            const plans = await this.database.getPracticePlansForScore(scoreId);
            return plans || [];

        } catch (error) {
            this.logger.error('Failed to load practice plans for score:', error);
            throw new Error(`Failed to load practice plans for score: ${error.message}`);
        }
    }

    /**
     * Delete a practice plan and its associated highlights
     * @param {number} planId - The practice plan ID
     * @returns {Promise<void>}
     */
    async deletePracticePlan(planId) {
        if (!this.database || typeof this.database.deletePracticePlan !== 'function') {
            throw new Error('Database not available or does not support deletePracticePlan');
        }

        try {
            // Delete practice plan highlights first (foreign key constraint)
            if (typeof this.database.deletePracticePlanHighlights === 'function') {
                await this.database.deletePracticePlanHighlights(planId);
            }

            // Delete the practice plan
            await this.database.deletePracticePlan(planId);
            
            this.logger.info('Practice plan deleted successfully:', planId);

        } catch (error) {
            this.logger.error('Failed to delete practice plan:', error);
            throw new Error(`Failed to delete practice plan: ${error.message}`);
        }
    }
}

// Factory function for creating practice plan persistence service
function createPracticePlanPersistenceService(database, logger) {
    return new PracticePlanPersistenceService(database, logger);
}

// Export for both Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PracticePlanPersistenceService, createPracticePlanPersistenceService };
} else {
    window.PracticePlanPersistenceService = PracticePlanPersistenceService;
    window.createPracticePlanPersistenceService = createPracticePlanPersistenceService;
}
