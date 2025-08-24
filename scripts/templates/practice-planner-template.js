/**
 * Practice Planner Component Template
 * Contains HTML templates for the practice session planning interface
 */

const PracticePlannerTemplates = {
    
    /**
     * Main practice planner card template
     */
    mainCard: () => `
        <div class="card shadow-lg" data-role="practice-planner" style="display: none;">
            <div class="p-0">
                <!-- Practice Planning Header -->
                <div class="practice-planner-toolbar flex items-center gap-2 p-4 border-b border-border">
                    <h3 class="font-medium text-foreground flex-1">Practice Session Planning</h3>
                    <button data-role="exit-practice-planning" class="btn btn-outline btn-icon" title="Exit practice planning" aria-label="Exit practice planning">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                
                <!-- Practice Planning Content -->
                <div class="practice-planner-content p-6">
                    ${PracticePlannerTemplates.noHighlightsMessage()}
                    ${PracticePlannerTemplates.practiceContent()}
                </div>
            </div>
        </div>
    `,

    /**
     * No highlights message template
     */
    noHighlightsMessage: () => `
        <div data-role="no-highlights-message" class="text-center py-8">
            <i data-lucide="target" class="w-12 h-12 mx-auto mb-4 text-muted-foreground"></i>
            <h4 class="text-lg font-medium mb-2 text-foreground">No highlighted sections yet</h4>
            <p class="text-muted-foreground mb-4">
                To create a practice plan, you'll need to mark some sections of your score first.
            </p>
            <button data-role="return-to-highlighting" class="btn btn-default">
                <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i>
                Return to highlighting
            </button>
        </div>
    `,

    /**
     * Practice content template (when highlights exist)
     */
    practiceContent: () => `
        <div data-role="practice-plan-content" style="display: none;">
            <div class="space-y-6">
                <!-- Session Configuration -->
                <div class="space-y-4">
                    <h4 class="text-lg font-semibold text-foreground">Session Configuration</h4>
                    
                    <!-- Session Name -->
                    <div>
                        <label for="session-name" class="block text-sm font-medium text-foreground mb-2">
                            Session Name
                        </label>
                        <input 
                            type="text" 
                            id="session-name" 
                            data-role="session-name"
                            class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter session name (e.g., Morning Practice)"
                        />
                    </div>

                    <!-- Session Duration -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="session-duration" class="block text-sm font-medium text-foreground mb-2">
                                Target Duration (minutes)
                            </label>
                            <input 
                                type="number" 
                                id="session-duration" 
                                data-role="session-duration"
                                class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="30"
                                min="5"
                                max="180"
                            />
                        </div>
                        <div>
                            <label for="session-focus" class="block text-sm font-medium text-foreground mb-2">
                                Session Focus
                            </label>
                            <select 
                                id="session-focus" 
                                data-role="session-focus"
                                class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="accuracy">Accuracy</option>
                                <option value="tempo">Tempo Building</option>
                                <option value="expression">Expression</option>
                                <option value="technique">Technique</option>
                                <option value="memorization">Memorization</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Practice Sections -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h4 class="text-lg font-semibold text-foreground">Practice Sections</h4>
                        <span class="text-sm text-muted-foreground" data-role="section-count">0 sections</span>
                    </div>
                    
                    <!-- Sections List -->
                    <div data-role="practice-sections-list" class="space-y-3">
                        <!-- Dynamic content: practice sections will be inserted here -->
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 pt-4 border-t border-border">
                    <button data-role="start-practice-session" class="btn btn-default flex-1">
                        <i data-lucide="play" class="w-4 h-4 mr-2"></i>
                        Start Practice Session
                    </button>
                    <button data-role="save-practice-plan" class="btn btn-outline">
                        <i data-lucide="save" class="w-4 h-4 mr-2"></i>
                        Save Plan
                    </button>
                </div>
            </div>
        </div>
    `,

    /**
     * Individual practice section template
     */
    practiceSection: (highlight, index) => `
        <div class="practice-section border border-border rounded-lg p-4 bg-card" data-highlight-id="${highlight.id}" data-section-index="${index}">
            <div class="flex items-start gap-3">
                <!-- Drag Handle -->
                <div class="drag-handle cursor-move mt-1 text-muted-foreground hover:text-foreground" title="Drag to reorder">
                    <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                </div>
                
                <!-- Section Content -->
                <div class="flex-1 space-y-3">
                    <!-- Section Header -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-medium text-foreground">Page ${highlight.page || 1}</span>
                            <span class="confidence-indicator badge ${PracticePlannerTemplates.getConfidenceBadgeClass(highlight.confidence)}">
                                ${PracticePlannerTemplates.getConfidenceLabel(highlight.confidence)}
                            </span>
                        </div>
                        <button class="remove-section btn btn-outline btn-icon btn-sm" title="Remove section">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </div>

                    <!-- Practice Method & Target Time -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1">Practice Method</label>
                            <select class="practice-method w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary">
                                <option value="slow-practice">Slow Practice</option>
                                <option value="chunking">Chunking</option>
                                <option value="repetition">Repetition</option>
                                <option value="hands-separate">Hands Separate</option>
                                <option value="mental-practice">Mental Practice</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1">Target Time (min)</label>
                            <input 
                                type="number" 
                                class="target-time w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="5"
                                min="1"
                                max="60"
                                value="${PracticePlannerTemplates.getDefaultTime(highlight.confidence)}"
                            />
                        </div>
                    </div>

                    <!-- Notes -->
                    <div>
                        <label class="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                        <textarea 
                            class="section-notes w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            rows="2"
                            placeholder="Add practice notes for this section..."
                        ></textarea>
                    </div>
                </div>
            </div>
        </div>
    `,

    /**
     * Helper functions for template data
     */
    getConfidenceBadgeClass: (confidence) => {
        switch (confidence) {
            case 'green': return 'badge-success';
            case 'amber': return 'badge-warning';
            case 'red': return 'badge-error';
            default: return 'badge-outline';
        }
    },

    getConfidenceLabel: (confidence) => {
        switch (confidence) {
            case 'green': return 'Confident';
            case 'amber': return 'Unsure';
            case 'red': return 'Needs Work';
            default: return 'Unknown';
        }
    },

    getDefaultTime: (confidence) => {
        switch (confidence) {
            case 'green': return '3';
            case 'amber': return '5';
            case 'red': return '8';
            default: return '5';
        }
    }
};

// Export for both Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PracticePlannerTemplates };
} else {
    window.PracticePlannerTemplates = PracticePlannerTemplates;
}
