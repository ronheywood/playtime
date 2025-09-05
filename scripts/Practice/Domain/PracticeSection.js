/**
 * Domain entity: PracticeSection
 * Represents a single section within a practice session
 */
class PracticeSection {
    constructor({ id, name, highlightId, pageNumber = 1, targetTime = 30000 } = {}) {
        this.id = id || `section_${Date.now()}`;
        this.name = name || 'Section';
        this.highlightId = highlightId || null;
        this.pageNumber = pageNumber;
        this.targetTime = targetTime;
        this.confidence = null; // 'low'|'medium'|'high'
        this.completed = false;
        this.startTime = null;
        this.completedAt = null;
        this.notes = '';
    }

    complete(confidence, actualTime = null, notes = '') {
        this.confidence = confidence;
        this.completed = true;
        this.completedAt = actualTime ? new Date(actualTime).toISOString() : new Date().toISOString();
        this.notes = notes || this.notes;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            highlightId: this.highlightId,
            pageNumber: this.pageNumber,
            targetTime: this.targetTime,
            confidence: this.confidence,
            completed: this.completed,
            startTime: this.startTime,
            completedAt: this.completedAt,
            notes: this.notes
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSection;
} else if (typeof window !== 'undefined') {
    window.PracticeSection = PracticeSection;
}

export default PracticeSection;
