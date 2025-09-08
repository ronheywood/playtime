/**
 * Score Management Service
 * Pure business logic for managing musical scores
 * No DOM dependencies - fully testable
 */
class ScoreManagementService {
    constructor(database, logger) {
        this.database = database;
        this.logger = logger;
    }

    /**
     * Load a score by ID
     * @param {string} scoreId - Score identifier
     * @returns {Promise<Object>} Score data
     */
    async loadScore(scoreId) {
        this.logger.info('Loading score', { scoreId });

        try {
            const score = await this.database.getScore(scoreId);
            if (!score) {
                throw new Error(`Score not found: ${scoreId}`);
            }

            this.logger.info('Score loaded successfully', { scoreId, title: score.title });
            return score;

        } catch (error) {
            this.logger.error('Failed to load score', error);
            throw error;
        }
    }

    /**
     * Save score data
     * @param {Object} scoreData - Score data to save
     * @returns {Promise<Object>} Saved score data
     */
    async saveScore(scoreData) {
        this.logger.info('Saving score', { scoreId: scoreData.id, title: scoreData.title });

        // Validate score data
        if (!this.isValidScoreData(scoreData)) {
            throw new Error('Invalid score data provided');
        }

        try {
            // Add metadata
            const scoreToSave = {
                ...scoreData,
                updatedAt: new Date().toISOString(),
                version: (scoreData.version || 0) + 1
            };

            // If this is a new score, add creation timestamp
            if (!scoreData.id) {
                scoreToSave.id = `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                scoreToSave.createdAt = new Date().toISOString();
            }

            await this.database.saveScore(scoreToSave);

            this.logger.info('Score saved successfully', { scoreId: scoreToSave.id });
            return scoreToSave;

        } catch (error) {
            this.logger.error('Failed to save score', error);
            throw error;
        }
    }

    /**
     * Get all scores
     * @param {Object} options - Query options
     * @param {number} options.limit - Maximum number of scores to return
     * @param {number} options.offset - Number of scores to skip
     * @param {string} options.sortBy - Field to sort by
     * @param {string} options.sortOrder - 'asc' or 'desc'
     * @returns {Promise<Array>} Array of score objects
     */
    async getAllScores(options = {}) {
        this.logger.info('Getting all scores', options);

        try {
            const scores = await this.database.getAllScores(options);
            
            this.logger.info('Scores retrieved successfully', { count: scores.length });
            return scores;

        } catch (error) {
            this.logger.error('Failed to get scores', error);
            throw error;
        }
    }

    /**
     * Search scores by title or other criteria
     * @param {string} searchTerm - Search term
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of matching scores
     */
    async searchScores(searchTerm, options = {}) {
        this.logger.info('Searching scores', { searchTerm, options });

        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        try {
            const results = await this.database.searchScores(searchTerm, options);
            
            this.logger.info('Score search completed', { 
                searchTerm, 
                resultCount: results.length 
            });
            
            return results;

        } catch (error) {
            this.logger.error('Failed to search scores', error);
            throw error;
        }
    }

    /**
     * Delete a score
     * @param {string} scoreId - Score ID to delete
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteScore(scoreId) {
        this.logger.info('Deleting score', { scoreId });

        try {
            const score = await this.database.getScore(scoreId);
            if (!score) {
                this.logger.warn('Score not found for deletion', { scoreId });
                return false;
            }

            // Delete associated data first
            await this.deleteScoreAssociatedData(scoreId);

            // Delete the score itself
            await this.database.deleteScore(scoreId);

            this.logger.info('Score deleted successfully', { scoreId });
            return true;

        } catch (error) {
            this.logger.error('Failed to delete score', error);
            throw error;
        }
    }

    /**
     * Get score metadata (without full content)
     * @param {string} scoreId - Score ID
     * @returns {Promise<Object>} Score metadata
     */
    async getScoreMetadata(scoreId) {
        this.logger.info('Getting score metadata', { scoreId });

        try {
            const metadata = await this.database.getScoreMetadata(scoreId);
            if (!metadata) {
                throw new Error(`Score metadata not found: ${scoreId}`);
            }

            return metadata;

        } catch (error) {
            this.logger.error('Failed to get score metadata', error);
            throw error;
        }
    }

    /**
     * Update score metadata
     * @param {string} scoreId - Score ID
     * @param {Object} metadata - Metadata to update
     * @returns {Promise<Object>} Updated score metadata
     */
    async updateScoreMetadata(scoreId, metadata) {
        this.logger.info('Updating score metadata', { scoreId, metadata });

        try {
            const score = await this.database.getScore(scoreId);
            if (!score) {
                throw new Error(`Score not found: ${scoreId}`);
            }

            // Update metadata fields
            const updatedScore = {
                ...score,
                ...metadata,
                updatedAt: new Date().toISOString(),
                version: (score.version || 0) + 1
            };

            await this.database.saveScore(updatedScore);

            this.logger.info('Score metadata updated successfully', { scoreId });
            return updatedScore;

        } catch (error) {
            this.logger.error('Failed to update score metadata', error);
            throw error;
        }
    }

    /**
     * Get score statistics
     * @param {string} scoreId - Score ID
     * @returns {Promise<Object>} Score statistics
     */
    async getScoreStatistics(scoreId) {
        this.logger.info('Getting score statistics', { scoreId });

        try {
            const score = await this.database.getScore(scoreId);
            if (!score) {
                throw new Error(`Score not found: ${scoreId}`);
            }

            // Get related data
            const highlights = await this.database.getHighlightsByScore(scoreId);
            const practiceSessions = await this.database.getPracticeSessionsByScore(scoreId);

            // Calculate statistics
            const stats = {
                score: {
                    id: scoreId,
                    title: score.title,
                    createdAt: score.createdAt,
                    updatedAt: score.updatedAt,
                    version: score.version || 1
                },
                highlights: {
                    total: highlights.length,
                    byConfidence: {
                        low: highlights.filter(h => h.confidence === 'low').length,
                        medium: highlights.filter(h => h.confidence === 'medium').length,
                        high: highlights.filter(h => h.confidence === 'high').length
                    }
                },
                practice: {
                    totalSessions: practiceSessions.length,
                    completedSessions: practiceSessions.filter(s => s.completed).length,
                    totalPracticeTime: this.calculateTotalPracticeTime(practiceSessions),
                    averageSessionDuration: this.calculateAverageSessionDuration(practiceSessions)
                }
            };

            return stats;

        } catch (error) {
            this.logger.error('Failed to get score statistics', error);
            throw error;
        }
    }

    /**
     * Create a copy of a score
     * @param {string} scoreId - Source score ID
     * @param {string} newTitle - Title for the copy
     * @returns {Promise<Object>} New score data
     */
    async duplicateScore(scoreId, newTitle) {
        this.logger.info('Duplicating score', { sourceId: scoreId, newTitle });

        try {
            const sourceScore = await this.database.getScore(scoreId);
            if (!sourceScore) {
                throw new Error(`Source score not found: ${scoreId}`);
            }

            // Create copy with new ID and title
            const copiedScore = {
                ...sourceScore,
                id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: newTitle || `${sourceScore.title} (Copy)`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1
            };

            await this.database.saveScore(copiedScore);

            this.logger.info('Score duplicated successfully', { 
                sourceId: scoreId, 
                newId: copiedScore.id 
            });

            return copiedScore;

        } catch (error) {
            this.logger.error('Failed to duplicate score', error);
            throw error;
        }
    }

    /**
     * Delete all data associated with a score
     * @param {string} scoreId - Score ID
     * @returns {Promise<void>}
     */
    async deleteScoreAssociatedData(scoreId) {
        try {
            // Delete highlights
            const highlights = await this.database.getHighlightsByScore(scoreId);
            for (const highlight of highlights) {
                await this.database.deleteHighlight(highlight.id);
            }

            // Delete practice sessions
            const sessions = await this.database.getPracticeSessionsByScore(scoreId);
            for (const session of sessions) {
                await this.database.deletePracticeSession(session.id);
            }

            this.logger.info('Score associated data deleted', { scoreId });

        } catch (error) {
            this.logger.error('Failed to delete score associated data', error);
            // Don't throw - this is cleanup
        }
    }

    /**
     * Calculate total practice time from sessions
     * @param {Array} sessions - Array of practice sessions
     * @returns {number} Total practice time in milliseconds
     */
    calculateTotalPracticeTime(sessions) {
        return sessions.reduce((total, session) => {
            if (session.completedAt && session.startTime) {
                const duration = new Date(session.completedAt) - new Date(session.startTime);
                return total + duration;
            }
            return total;
        }, 0);
    }

    /**
     * Calculate average session duration
     * @param {Array} sessions - Array of practice sessions
     * @returns {number} Average duration in milliseconds
     */
    calculateAverageSessionDuration(sessions) {
        const completedSessions = sessions.filter(s => s.completedAt && s.startTime);
        if (completedSessions.length === 0) return 0;

        const totalTime = this.calculateTotalPracticeTime(completedSessions);
        return totalTime / completedSessions.length;
    }

    /**
     * Validate score data structure
     * @param {Object} scoreData - Score data to validate
     * @returns {boolean} True if valid
     */
    isValidScoreData(scoreData) {
        return scoreData && 
               typeof scoreData === 'object' &&
               typeof scoreData.title === 'string' &&
               scoreData.title.trim().length > 0;
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScoreManagementService;
} else if (typeof window !== 'undefined') {
    window.ScoreManagementService = ScoreManagementService;
}
