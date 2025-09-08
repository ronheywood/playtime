/**
 * Highlighting Service
 * Pure business logic for managing PDF highlights
 * No DOM dependencies - fully testable
 */
class HighlightingService {
    constructor(database, logger, confidenceMapper, coordinateMapper) {
        this.database = database;
        this.logger = logger;
        this.confidenceMapper = confidenceMapper;
        this.coordinateMapper = coordinateMapper;
    }

    /**
     * Create a new highlight
     * @param {Object} coords - Highlight coordinates {x, y, width, height}
     * @param {string} confidence - Confidence level ('low', 'medium', 'high')
     * @param {number} pageNumber - PDF page number
     * @param {string} sectionId - Associated section ID (optional)
     * @returns {Promise<Object>} Created highlight data
     */
    async createHighlight(coords, confidence = 'medium', pageNumber, sectionId = null) {
        this.logger.info('Creating highlight', { coords, confidence, pageNumber, sectionId });

        // Validate inputs
        if (!this.isValidCoordinates(coords)) {
            throw new Error('Invalid coordinates provided');
        }
        
        if (!this.isValidConfidence(confidence)) {
            throw new Error(`Invalid confidence level: ${confidence}`);
        }

        if (!pageNumber || pageNumber < 1) {
            throw new Error('Invalid page number');
        }

        try {
            const highlight = {
                id: `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                coords: { ...coords },
                confidence,
                color: this.confidenceMapper.confidenceToColor(confidence),
                pageNumber,
                sectionId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                visible: true
            };

            // Save to database
            await this.database.saveHighlight(highlight);

            this.logger.info('Highlight created successfully', { highlightId: highlight.id });
            return highlight;

        } catch (error) {
            this.logger.error('Failed to create highlight', error);
            throw new Error('Could not create highlight');
        }
    }

    /**
     * Update highlight confidence
     * @param {string} highlightId - Highlight ID
     * @param {string} newConfidence - New confidence level
     * @returns {Promise<Object>} Updated highlight data
     */
    async updateHighlightConfidence(highlightId, newConfidence) {
        this.logger.info('Updating highlight confidence', { highlightId, newConfidence });

        if (!this.isValidConfidence(newConfidence)) {
            throw new Error(`Invalid confidence level: ${newConfidence}`);
        }

        try {
            // Get existing highlight
            const highlight = await this.database.getHighlight(highlightId);
            if (!highlight) {
                throw new Error(`Highlight not found: ${highlightId}`);
            }

            // Update confidence and color
            const oldConfidence = highlight.confidence;
            highlight.confidence = newConfidence;
            highlight.color = this.confidenceMapper.confidenceToColor(newConfidence);
            highlight.updatedAt = new Date().toISOString();

            // Save updated highlight
            await this.database.saveHighlight(highlight);

            this.logger.info('Highlight confidence updated successfully', { 
                highlightId, 
                oldConfidence, 
                newConfidence 
            });

            return highlight;

        } catch (error) {
            this.logger.error('Failed to update highlight confidence', error);
            throw error;
        }
    }

    /**
     * Delete a highlight
     * @param {string} highlightId - Highlight ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteHighlight(highlightId) {
        this.logger.info('Deleting highlight', { highlightId });

        try {
            const highlight = await this.database.getHighlight(highlightId);
            if (!highlight) {
                this.logger.warn('Highlight not found for deletion', { highlightId });
                return false;
            }

            await this.database.deleteHighlight(highlightId);
            
            this.logger.info('Highlight deleted successfully', { highlightId });
            return true;

        } catch (error) {
            this.logger.error('Failed to delete highlight', error);
            throw error;
        }
    }

    /**
     * Get highlights for a specific page
     * @param {number} pageNumber - PDF page number
     * @returns {Promise<Array>} Array of highlight objects
     */
    async getHighlightsForPage(pageNumber) {
        try {
            return await this.database.getHighlightsByPage(pageNumber);
        } catch (error) {
            this.logger.error('Failed to get highlights for page', error);
            throw error;
        }
    }

    /**
     * Get highlights for a specific section
     * @param {string} sectionId - Section ID
     * @returns {Promise<Array>} Array of highlight objects
     */
    async getHighlightsForSection(sectionId) {
        try {
            return await this.database.getHighlightsBySection(sectionId);
        } catch (error) {
            this.logger.error('Failed to get highlights for section', error);
            throw error;
        }
    }

    /**
     * Get all highlights for a score
     * @param {string} scoreId - Score ID
     * @returns {Promise<Array>} Array of highlight objects
     */
    async getHighlightsForScore(scoreId) {
        try {
            return await this.database.getHighlightsByScore(scoreId);
        } catch (error) {
            this.logger.error('Failed to get highlights for score', error);
            throw error;
        }
    }

    /**
     * Update highlight coordinates (for repositioning)
     * @param {string} highlightId - Highlight ID
     * @param {Object} newCoords - New coordinates {x, y, width, height}
     * @returns {Promise<Object>} Updated highlight data
     */
    async updateHighlightCoordinates(highlightId, newCoords) {
        this.logger.info('Updating highlight coordinates', { highlightId, newCoords });

        if (!this.isValidCoordinates(newCoords)) {
            throw new Error('Invalid coordinates provided');
        }

        try {
            const highlight = await this.database.getHighlight(highlightId);
            if (!highlight) {
                throw new Error(`Highlight not found: ${highlightId}`);
            }

            highlight.coords = { ...newCoords };
            highlight.updatedAt = new Date().toISOString();

            await this.database.saveHighlight(highlight);

            this.logger.info('Highlight coordinates updated successfully', { highlightId });
            return highlight;

        } catch (error) {
            this.logger.error('Failed to update highlight coordinates', error);
            throw error;
        }
    }

    /**
     * Batch update highlights confidence
     * @param {Array<string>} highlightIds - Array of highlight IDs
     * @param {string} confidence - New confidence level
     * @returns {Promise<Array>} Array of updated highlights
     */
    async batchUpdateConfidence(highlightIds, confidence) {
        this.logger.info('Batch updating highlight confidence', { count: highlightIds.length, confidence });

        if (!this.isValidConfidence(confidence)) {
            throw new Error(`Invalid confidence level: ${confidence}`);
        }

        const results = [];
        const errors = [];

        for (const highlightId of highlightIds) {
            try {
                const updated = await this.updateHighlightConfidence(highlightId, confidence);
                results.push(updated);
            } catch (error) {
                errors.push({ highlightId, error: error.message });
            }
        }

        if (errors.length > 0) {
            this.logger.warn('Some highlights failed to update', errors);
        }

        this.logger.info('Batch update completed', { 
            successful: results.length, 
            failed: errors.length 
        });

        return { successful: results, failed: errors };
    }

    /**
     * Get highlight statistics for a score
     * @param {string} scoreId - Score ID
     * @returns {Promise<Object>} Highlight statistics
     */
    async getHighlightStatistics(scoreId) {
        try {
            const highlights = await this.getHighlightsForScore(scoreId);
            
            const stats = {
                total: highlights.length,
                byConfidence: {
                    low: highlights.filter(h => h.confidence === 'low').length,
                    medium: highlights.filter(h => h.confidence === 'medium').length,
                    high: highlights.filter(h => h.confidence === 'high').length
                },
                byPage: {}
            };

            // Count highlights per page
            highlights.forEach(highlight => {
                const page = highlight.pageNumber;
                stats.byPage[page] = (stats.byPage[page] || 0) + 1;
            });

            return stats;

        } catch (error) {
            this.logger.error('Failed to get highlight statistics', error);
            throw error;
        }
    }

    /**
     * Convert coordinates between PDF and screen space
     * @param {Object} coords - Coordinates to convert
     * @param {string} direction - 'pdfToScreen' or 'screenToPdf'
     * @param {number} pageNumber - PDF page number
     * @returns {Object} Converted coordinates
     */
    convertCoordinates(coords, direction, pageNumber) {
        if (direction === 'pdfToScreen') {
            return this.coordinateMapper.pdfToScreen(coords, pageNumber);
        } else if (direction === 'screenToPdf') {
            return this.coordinateMapper.screenToPdf(coords, pageNumber);
        } else {
            throw new Error(`Invalid conversion direction: ${direction}`);
        }
    }

    /**
     * Validate coordinates object
     * @param {Object} coords - Coordinates to validate
     * @returns {boolean} True if valid
     */
    isValidCoordinates(coords) {
        return coords && 
               typeof coords.x === 'number' && 
               typeof coords.y === 'number' && 
               typeof coords.width === 'number' && 
               typeof coords.height === 'number' &&
               coords.width > 0 && 
               coords.height > 0;
    }

    /**
     * Validate confidence level
     * @param {string} confidence - Confidence level to validate
     * @returns {boolean} True if valid
     */
    isValidConfidence(confidence) {
        return ['low', 'medium', 'high'].includes(confidence);
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighlightingService;
} else if (typeof window !== 'undefined') {
    window.HighlightingService = HighlightingService;
}
