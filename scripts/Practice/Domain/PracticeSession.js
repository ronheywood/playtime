/**
 * Domain entity: PracticeSession
 * Pure domain object representing a running or stored practice session
 */
class PracticeSession {
    constructor({ id, planId, scoreId, sections = [], startTime = null, options = {} } = {}) {
        this.id = id || `session_${Date.now()}`;
        this.planId = planId || null;
        this.scoreId = scoreId || null;
        this.sections = sections; // array of PracticeSection instances or plain objects
        this.currentSectionIndex = 0;
        this.startTime = startTime || new Date().toISOString();
        this.completed = false;
        this.completedAt = null;
        this.options = options;
        this.statistics = null;
    }

    getCurrentSection() {
        return this.sections && this.sections[this.currentSectionIndex];
    }

    moveToNextSection() {
        if (!this.sections) return false;
        if (this.currentSectionIndex < this.sections.length - 1) {
            this.currentSectionIndex += 1;
            return true;
        }
        this.completed = true;
        this.completedAt = new Date().toISOString();
        return false;
    }

    isComplete() {
        return this.completed === true;
    }

    toJSON() {
        return {
            id: this.id,
            planId: this.planId,
            scoreId: this.scoreId,
            sections: this.sections,
            currentSectionIndex: this.currentSectionIndex,
            startTime: this.startTime,
            completed: this.completed,
            completedAt: this.completedAt,
            options: this.options,
            statistics: this.statistics
        };
    }
}

// Export for CommonJS and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSession;
} else if (typeof window !== 'undefined') {
    window.PracticeSession = PracticeSession;
}

export default PracticeSession;
