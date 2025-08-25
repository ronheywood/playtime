/**
 * HighlightAnnotationForm - Modal form for adding titles and notes to highlights
 * Appears when user clicks the action button on a highlight
 */
class HighlightAnnotationForm {
    constructor(config = {}) {
        this.config = {
            containerId: config.containerId || 'pdf-canvas',
            overlayClass: 'highlight-annotation-overlay',
            formClass: 'highlight-annotation-form',
            maxTitleLength: config.maxTitleLength || 100,
            maxNotesLength: config.maxNotesLength || 1000,
            ...config
        };
        
        this.overlay = null;
        this.form = null;
        this.currentHighlight = null;
        this.isVisible = false;
        this.callbacks = {
            onSave: null,
            onCancel: null
        };
    }

    /**
     * Initialize the annotation form
     */
    init() {
        this.createForm();
        this.attachEventListeners();
        return this;
    }

    /**
     * Show the annotation form for a specific highlight
     * @param {Object} highlightData - Data about the highlight to annotate
     */
    showForHighlight(highlightData) {
        if (!highlightData || !this.overlay) return;

        this.currentHighlight = highlightData;
        this.populateForm(highlightData);
        this.overlay.style.display = 'flex';
        this.isVisible = true;

        // Focus on the title input
        const titleInput = this.form.querySelector('[data-field="title"]');
        if (titleInput) {
            setTimeout(() => titleInput.focus(), 100);
        }

        // Add ESC key listener
        document.addEventListener('keydown', this.handleEscapeKey);
    }

    /**
     * Hide the annotation form
     */
    hide() {
        if (!this.overlay) return;

        this.overlay.style.display = 'none';
        this.isVisible = false;
        this.currentHighlight = null;

        // Remove ESC key listener
        document.removeEventListener('keydown', this.handleEscapeKey);

        // Clear form
        this.clearForm();
    }

    /**
     * Set callback for save events
     * @param {Function} callback - Function to call when annotation is saved
     */
    onSave(callback) {
        this.callbacks.onSave = callback;
        return this;
    }

    /**
     * Set callback for cancel events
     * @param {Function} callback - Function to call when annotation is cancelled
     */
    onCancel(callback) {
        this.callbacks.onCancel = callback;
        return this;
    }

    /**
     * Check if form is currently visible
     */
    get visible() {
        return this.isVisible;
    }

    /**
     * Get the current highlight data
     */
    get highlight() {
        return this.currentHighlight;
    }

    /**
     * Create the form overlay and structure
     */
    createForm() {
        // Get container
        const container = this.getContainer();
        if (!container) {
            console.error('Could not find container for annotation form');
            return;
        }

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = this.config.overlayClass;
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        `;

        // Create form container
        this.form = document.createElement('div');
        this.form.className = this.config.formClass;
        this.form.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            width: 90%;
            max-width: 480px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            position: relative;
            max-height: 80vh;
            overflow-y: auto;
        `;

        // Create form content
        this.form.innerHTML = this.getFormHTML();

        // Add form to overlay
        this.overlay.appendChild(this.form);

        // Add overlay to container
        container.appendChild(this.overlay);

        // Prevent overlay clicks from closing (only explicit close buttons)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.handleCancel();
            }
        });
    }

    /**
     * Get the HTML structure for the form
     */
    getFormHTML() {
        return `
            <div class="annotation-form-header" style="margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">Add Annotation</h3>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;" data-highlight-info>
                    Adding annotation to highlight
                </p>
            </div>

            <div class="annotation-form-body">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label for="annotation-title" style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">
                        Title
                    </label>
                    <input 
                        type="text" 
                        id="annotation-title"
                        data-field="title"
                        placeholder="Give this highlight a descriptive title..."
                        maxlength="${this.config.maxTitleLength}"
                        style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                    />
                    <div class="char-count" style="text-align: right; font-size: 12px; color: #9ca3af; margin-top: 4px;">
                        <span data-title-count>0</span>/${this.config.maxTitleLength}
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 24px;">
                    <label for="annotation-notes" style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">
                        Notes
                    </label>
                    <textarea 
                        id="annotation-notes"
                        data-field="notes"
                        placeholder="Add detailed notes about this highlight..."
                        rows="4"
                        maxlength="${this.config.maxNotesLength}"
                        style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;"
                    ></textarea>
                    <div class="char-count" style="text-align: right; font-size: 12px; color: #9ca3af; margin-top: 4px;">
                        <span data-notes-count>0</span>/${this.config.maxNotesLength}
                    </div>
                </div>
            </div>

            <div class="annotation-form-footer" style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <button 
                    type="button" 
                    data-action="cancel"
                    style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-size: 14px; cursor: pointer;"
                >
                    Cancel
                </button>
                <button 
                    type="button" 
                    data-action="save"
                    style="padding: 8px 16px; border: none; background: #3b82f6; color: white; border-radius: 6px; font-size: 14px; cursor: pointer;"
                >
                    Save Annotation
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners to form elements
     */
    attachEventListeners() {
        if (!this.form) return;

        // Character counting for title
        const titleInput = this.form.querySelector('[data-field="title"]');
        const titleCounter = this.form.querySelector('[data-title-count]');
        if (titleInput && titleCounter) {
            titleInput.addEventListener('input', () => {
                titleCounter.textContent = titleInput.value.length;
            });
        }

        // Character counting for notes
        const notesInput = this.form.querySelector('[data-field="notes"]');
        const notesCounter = this.form.querySelector('[data-notes-count]');
        if (notesInput && notesCounter) {
            notesInput.addEventListener('input', () => {
                notesCounter.textContent = notesInput.value.length;
            });
        }

        // Button handlers
        const saveButton = this.form.querySelector('[data-action="save"]');
        const cancelButton = this.form.querySelector('[data-action="cancel"]');

        if (saveButton) {
            saveButton.addEventListener('click', () => this.handleSave());
        }

        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.handleCancel());
        }

        // Form submission on Enter (when not in textarea)
        this.form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.handleSave();
            }
        });
    }

    /**
     * Get the container element for the form
     */
    getContainer() {
        let container = document.getElementById(this.config.containerId);
        
        // If container is a canvas, use its parent
        if (container && container.tagName === 'CANVAS') {
            container = container.parentElement;
        }
        
        // Fallback to body
        if (!container) {
            container = document.body;
        }
        
        return container;
    }

    /**
     * Populate form with highlight data
     */
    populateForm(highlightData) {
        // Update info text
        const infoElement = this.form.querySelector('[data-highlight-info]');
        if (infoElement) {
            const color = highlightData.color || 'unknown';
            const page = highlightData.page ? ` on page ${highlightData.page}` : '';
            infoElement.textContent = `Adding annotation to ${color} highlight${page}`;
        }

        // Clear any existing values
        this.clearForm();

        // If highlight already has annotation data, populate it
        if (highlightData.annotation) {
            const titleInput = this.form.querySelector('[data-field="title"]');
            const notesInput = this.form.querySelector('[data-field="notes"]');
            
            if (titleInput && highlightData.annotation.title) {
                titleInput.value = highlightData.annotation.title;
                this.updateCharacterCount(titleInput, '[data-title-count]');
            }
            
            if (notesInput && highlightData.annotation.notes) {
                notesInput.value = highlightData.annotation.notes;
                this.updateCharacterCount(notesInput, '[data-notes-count]');
            }
        }
    }

    /**
     * Clear form data
     */
    clearForm() {
        const titleInput = this.form.querySelector('[data-field="title"]');
        const notesInput = this.form.querySelector('[data-field="notes"]');
        const titleCounter = this.form.querySelector('[data-title-count]');
        const notesCounter = this.form.querySelector('[data-notes-count]');

        if (titleInput) titleInput.value = '';
        if (notesInput) notesInput.value = '';
        if (titleCounter) titleCounter.textContent = '0';
        if (notesCounter) notesCounter.textContent = '0';
    }

    /**
     * Update character count display
     */
    updateCharacterCount(input, counterSelector) {
        const counter = this.form.querySelector(counterSelector);
        if (counter) {
            counter.textContent = input.value.length;
        }
    }

    /**
     * Handle save button click
     */
    handleSave() {
        const titleInput = this.form.querySelector('[data-field="title"]');
        const notesInput = this.form.querySelector('[data-field="notes"]');

        const title = titleInput ? titleInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        // Create annotation data
        const annotationData = {
            title,
            notes,
            timestamp: Date.now(),
            highlightData: this.currentHighlight
        };

        // Call save callback
        if (this.callbacks.onSave) {
            this.callbacks.onSave(annotationData);
        }

        this.hide();
    }

    /**
     * Handle cancel button click
     */
    handleCancel() {
        // Call cancel callback
        if (this.callbacks.onCancel) {
            this.callbacks.onCancel(this.currentHighlight);
        }

        this.hide();
    }

    /**
     * Handle ESC key press
     */
    handleEscapeKey = (e) => {
        if (e.key === 'Escape' && this.isVisible) {
            this.handleCancel();
        }
    };

    /**
     * Destroy the form and clean up
     */
    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        this.overlay = null;
        this.form = null;
        this.currentHighlight = null;
        this.isVisible = false;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighlightAnnotationForm;
} else if (typeof window !== 'undefined') {
    window.HighlightAnnotationForm = HighlightAnnotationForm;
}
