/**
 * Practice Session Service
 * Pure business logic for managing practice sessions
 * No DOM dependencies - fully testable
 */
const PracticeSession = (typeof window !== 'undefined' && window.PracticeSession) || require('../Domain/PracticeSession');
const PracticeSection = (typeof window !== 'undefined' && window.PracticeSection) || require('../Domain/PracticeSection');
const PracticePersistence = (typeof window !== 'undefined' && window.PracticePersistence) || require('../Infrastructure/PracticePersistence');

class PracticeSessionService {
    constructor(persistence, logger, confidenceMapper) {
        // persistence should implement savePracticeSession, getPracticeSession, getHighlightsBySection, saveHighlight, updateHighlight
        this.persistence = persistence instanceof PracticePersistence ? persistence : new PracticePersistence(persistence, logger);
        this.logger = logger;
        this.confidenceMapper = confidenceMapper;
    }

    /**
     * Start a new practice session
     * @param {Object} scoreData - The score to practice
     * @param {Object} options - Practice session options
     * @returns {Promise<Object>} Practice session data
     */
    async startPracticeSession(scoreData, options = {}) {
        this.logger.info('Starting practice session', { scoreId: scoreData.id, options });

        const sections = this.initializeSections(scoreData).map(s => new PracticeSection(s));

        const session = new PracticeSession({
            scoreId: scoreData.id,
            sections,
            options: {
                timerDuration: options.timerDuration || 30000,
                showConfidenceDialog: options.showConfidenceDialog !== false,
                ...options
            }
        });

        try {
            await this.persistence.savePracticeSession(session.toJSON ? session.toJSON() : session);
            this.logger.info('Practice session started successfully', { sessionId: session.id });
            return session;
        } catch (error) {
            this.logger.error('Failed to start practice session', error);
            throw new Error('Could not start practice session');
        }
    }

    /**
     * Complete a practice section
     * @param {string} sessionId - Practice session ID
     * @param {string} sectionId - Section ID
     * @param {string} confidence - Confidence level ('low', 'medium', 'high')
     * @returns {Promise<Object>} Updated section data
     */
    async completePracticeSection(sessionId, sectionId, confidence) {
        this.logger.info('Completing practice section', { sessionId, sectionId, confidence });

        // Validate confidence level
        if (!this.isValidConfidence(confidence)) {
            throw new Error(`Invalid confidence level: ${confidence}`);
        }

        try {
            // Get current session
            const raw = await this.persistence.getPracticeSession(sessionId);
            const session = raw ? new PracticeSession(raw) : null;
            if (!session) {
                throw new Error(`Practice session not found: ${sessionId}`);
            }

            // Find and update the section
            const section = session.sections.find(s => s.id === sectionId);
            if (!section) {
                throw new Error(`Section not found: ${sectionId}`);
            }

            // Update section with completion data
            section.confidence = confidence;
            section.completedAt = new Date().toISOString();
            section.completed = true;

            // Update session
            await this.persistence.savePracticeSession(session.toJSON ? session.toJSON() : session);

            // Update any highlights for this section
            await this.updateSectionHighlights(sectionId, confidence);

            this.logger.info('Practice section completed successfully', { sectionId, confidence });
            return section;

        } catch (error) {
            this.logger.error('Failed to complete practice section', error);
            throw error;
        }
    }

    /**
     * Update confidence for a specific section
     * @param {string} sectionId - Section identifier
     * @param {string} confidence - New confidence level
     * @returns {Promise<Object>} Updated section data
     */
    async updateSectionConfidence(sectionId, confidence) {
        this.logger.info('Updating section confidence', { sectionId, confidence });

        if (!this.isValidConfidence(confidence)) {
            throw new Error(`Invalid confidence level: ${confidence}`);
        }

        try {
            // Update highlights associated with this section
            await this.updateSectionHighlights(sectionId, confidence);

            this.logger.info('Section confidence updated successfully', { sectionId, confidence });
            return { sectionId, confidence, updatedAt: new Date().toISOString() };

        } catch (error) {
            this.logger.error('Failed to update section confidence', error);
            throw error;
        }
    }

    /**
     * Complete a practice session
     * @param {string} sessionId - Practice session ID
     * @returns {Promise<Object>} Completed session data with statistics
     */
    async completePracticeSession(sessionId) {
        this.logger.info('Completing practice session', { sessionId });

        try {
            const session = await this.database.getPracticeSession(sessionId);
            if (!session) {
                throw new Error(`Practice session not found: ${sessionId}`);
            }

            // Calculate session statistics
            const stats = this.calculateSessionStatistics(session);

            // Mark session as completed
            session.completed = true;
            session.completedAt = new Date().toISOString();
            session.statistics = stats;

            // Save completed session
            await this.database.savePracticeSession(session);

            this.logger.info('Practice session completed successfully', { sessionId, stats });
            return session;

        } catch (error) {
            this.logger.error('Failed to complete practice session', error);
            throw error;
        }
    }

    /**
     * Get practice session by ID
     * @param {string} sessionId - Practice session ID
     * @returns {Promise<Object>} Practice session data
     */
    async getPracticeSession(sessionId) {
        try {
            return await this.database.getPracticeSession(sessionId);
        } catch (error) {
            this.logger.error('Failed to get practice session', error);
            throw error;
        }
    }

    /**
     * Initialize sections for a new practice session
     * @param {Object} scoreData - Score data
     * @returns {Array} Array of section objects
     */
    initializeSections(scoreData) {
        // For now, create a simple section structure
        // This will be enhanced when we have actual score parsing
        return [
            {
                id: `section_${Date.now()}_1`,
                name: 'Section 1',
                pageNumber: 1,
                confidence: null,
                completed: false,
                startTime: null,
                completedAt: null
            }
        ];
    }

    /**
     * Update highlights associated with a section
     * @param {string} sectionId - Section ID
     * @param {string} confidence - New confidence level
     * @returns {Promise<void>}
     */
    async updateSectionHighlights(sectionId, confidence) {
        try {
            // Get highlights for this section
            const highlights = await this.persistence.getHighlightsBySection(sectionId);
            
            // Update each highlight's confidence
            for (const highlight of highlights) {
                highlight.confidence = confidence;
                highlight.color = this.confidenceMapper.confidenceToColor(confidence);
                await this.persistence.saveHighlight(highlight);
            }

            this.logger.info(`Updated ${highlights.length} highlights for section ${sectionId}`);

        } catch (error) {
            this.logger.error('Failed to update section highlights', error);
            // Don't throw - this is a secondary operation
        }
    }

    /**
     * Calculate statistics for a completed practice session
     * @param {Object} session - Practice session data
     * @returns {Object} Session statistics
     */
    calculateSessionStatistics(session) {
        const completedSections = session.sections.filter(s => s.completed);
        const totalSections = session.sections.length;

        const confidenceCounts = {
            low: completedSections.filter(s => s.confidence === 'low').length,
            medium: completedSections.filter(s => s.confidence === 'medium').length,
            high: completedSections.filter(s => s.confidence === 'high').length
        };

        const duration = session.completedAt && session.startTime 
            ? new Date(session.completedAt) - new Date(session.startTime)
            : null;

        return {
            totalSections,
            completedSections: completedSections.length,
            completionRate: totalSections > 0 ? (completedSections.length / totalSections) * 100 : 0,
            confidenceCounts,
            duration,
            averageConfidence: this.calculateAverageConfidence(completedSections)
        };
    }

    /**
     * Calculate average confidence level
     * @param {Array} sections - Array of completed sections
     * @returns {string} Average confidence level
     */
    calculateAverageConfidence(sections) {
        if (sections.length === 0) return 'medium';

        const confidenceValues = { low: 1, medium: 2, high: 3 };
        const total = sections.reduce((sum, section) => {
            return sum + (confidenceValues[section.confidence] || 2);
        }, 0);

        const average = total / sections.length;
        
        if (average <= 1.5) return 'low';
        if (average <= 2.5) return 'medium';
        return 'high';
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
    module.exports = PracticeSessionService;
} else if (typeof window !== 'undefined') {
    window.PracticeSessionService = PracticeSessionService;
}

export default PracticeSessionService;
