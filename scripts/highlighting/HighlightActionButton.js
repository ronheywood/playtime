/**
 * HighlightActionButton - Floating call-to-action for highlight annotation and management
 * Appears when a highlight is active (newly created or clicked)
 * Supports multiple actions: annotate and delete
 */
class HighlightActionButton {
    constructor(config = {}) {
        this.config = {
            containerId: config.containerId || 'pdf-canvas',
            buttonClass: 'highlight-action-btn',
            iconSize: 'w-4 h-4',
            position: config.position || 'bottom-right', // top-left, top-right, bottom-left, bottom-right
            offset: config.offset || { x: 12, y: 12 },
            showDelete: config.showDelete !== false, // Show delete button by default
            ...config
        };
        
        this.buttonGroup = null;
        this.annotateButton = null;
        this.deleteButton = null;
        this.activeHighlight = null;
        this.isVisible = false;
        this.callbacks = {
            onAnnotate: null,
            onDelete: null
        };
    }

    /**
     * Initialize the floating action button group
     */
    init() {
        this.createButtonGroup();
        this.attachEventListeners();
        return this;
    }

    /**
     * Show the action button group for a specific highlight
     * @param {HTMLElement} highlightElement - The active highlight element
     */
    showForHighlight(highlightElement) {
        if (!highlightElement || !this.buttonGroup) return;

        this.activeHighlight = highlightElement;
        this.positionButtonGroup(highlightElement);
        this.buttonGroup.style.display = 'flex';
        this.buttonGroup.style.opacity = '1';
        this.buttonGroup.style.pointerEvents = 'auto';
        this.isVisible = true;

        // Update aria-labels with highlight info
        const confidence = highlightElement.dataset.hlConfidence;
        const color = highlightElement.dataset.hlColor;
        const page = highlightElement.dataset.page || '1';
        
        this.annotateButton.setAttribute('aria-label', 
            `Add title and notes to ${color} highlight on page ${page}`
        );
        
        if (this.deleteButton) {
            this.deleteButton.setAttribute('aria-label', 
                `Delete ${color} highlight on page ${page}`
            );
        }
    }

    /**
     * Hide the action button group
     */
    hide() {
        if (!this.buttonGroup) return;

        this.buttonGroup.style.opacity = '0';
        this.buttonGroup.style.pointerEvents = 'none';
        
        // Delay hiding to allow for smooth transition
        setTimeout(() => {
            if (this.buttonGroup && this.buttonGroup.style.opacity === '0') {
                this.buttonGroup.style.display = 'none';
            }
        }, 200);

        this.activeHighlight = null;
        this.isVisible = false;
    }

    /**
     * Set callback for annotation button click
     * @param {Function} callback - Function to call when annotate button is clicked
     */
    onAnnotate(callback) {
        this.callbacks.onAnnotate = callback;
        return this;
    }

    /**
     * Set callback for delete button click
     * @param {Function} callback - Function to call when delete button is clicked
     */
    onDelete(callback) {
        this.callbacks.onDelete = callback;
        return this;
    }

    /**
     * Set callback for button click (backward compatibility - maps to onAnnotate)
     * @param {Function} callback - Function to call when button is clicked
     */
    onClick(callback) {
        this.callbacks.onAnnotate = callback;
        return this;
    }

    /**
     * Check if button is currently visible
     */
    get visible() {
        return this.isVisible;
    }

    /**
     * Get the currently active highlight
     */
    get highlight() {
        return this.activeHighlight;
    }

    /**
     * Destroy the button group and clean up
     */
    destroy() {
        if (this.buttonGroup && this.buttonGroup.parentNode) {
            this.buttonGroup.parentNode.removeChild(this.buttonGroup);
        }
        this.buttonGroup = null;
        this.annotateButton = null;
        this.deleteButton = null;
        this.activeHighlight = null;
        this.isVisible = false;
        this.callbacks = {};
    }

    // Private methods

    /**
     * Create the floating action button group
     */
    createButtonGroup() {
        // Find the container - prefer the parent container over the canvas itself
        let container = document.getElementById(this.config.containerId);
        
        // If container is a canvas, use its parent instead
        if (container && container.tagName === 'CANVAS') {
            container = container.parentElement;
        }
        
        // Fallback to other selectors
        if (!container) {
            container = document.querySelector(`[data-role="${this.config.containerId}"]`) ||
                       document.querySelector('.pdf-viewer-container') ||
                       document.body;
        }

        // Ensure container has relative positioning
        if (container.style.position !== 'absolute' && container.style.position !== 'relative') {
            container.style.position = 'relative';
        }

        // Create button group container
        this.buttonGroup = document.createElement('div');
        this.buttonGroup.className = `${this.config.buttonClass}-group`;
        this.buttonGroup.style.cssText = `
            position: absolute;
            display: none;
            opacity: 0;
            pointer-events: none;
            z-index: 1010;
            gap: 8px;
            align-items: center;
            transition: all 0.2s ease;
        `;

        // Create annotate button
        this.annotateButton = this.createButton('annotate', 'notebook-pen', '#2563eb');
        this.buttonGroup.appendChild(this.annotateButton);

        // Create delete button if enabled
        if (this.config.showDelete) {
            this.deleteButton = this.createButton('delete', 'trash-2', '#dc2626');
            this.buttonGroup.appendChild(this.deleteButton);
        }

        // Add to container
        container.appendChild(this.buttonGroup);

        // Trigger Lucide icon rendering after DOM insertion
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    /**
     * Create a single action button
     * @param {string} action - The action type ('annotate' or 'delete')
     * @param {string} iconName - Lucide icon name
     * @param {string} bgColor - Background color
     */
    createButton(action, iconName, bgColor) {
        const button = document.createElement('button');
        button.className = `${this.config.buttonClass} ${this.config.buttonClass}-${action} btn btn-default btn-icon`;
        button.style.cssText = `
            background: ${bgColor};
            color: white;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.2s ease;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
        `;

        // Add hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });

        // Create icon
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', iconName);
        icon.className = this.config.iconSize;
        icon.style.color = 'white';
        button.appendChild(icon);

        return button;
    }

    /**
     * Position the button group relative to the highlight
     * @param {HTMLElement} highlightElement - The highlight to position relative to
     */
    positionButtonGroup(highlightElement) {
        if (!this.buttonGroup || !highlightElement) return;

        const highlightRect = highlightElement.getBoundingClientRect();
        const containerRect = this.buttonGroup.parentElement.getBoundingClientRect();

        // Calculate relative position within the container
        const relativeRect = {
            left: highlightRect.left - containerRect.left,
            top: highlightRect.top - containerRect.top,
            right: highlightRect.right - containerRect.left,
            bottom: highlightRect.bottom - containerRect.top,
            width: highlightRect.width,
            height: highlightRect.height
        };

        let left, top;
        const buttonGroupHeight = 40; // Single row of buttons
        const buttonGroupWidth = this.config.showDelete ? 88 : 40; // 40px button + 8px gap + 40px button OR just 40px

        // Position based on config
        switch (this.config.position) {
            case 'top-left':
                left = relativeRect.left - this.config.offset.x;
                top = relativeRect.top - this.config.offset.y - buttonGroupHeight;
                break;
            case 'top-right':
                left = relativeRect.right + this.config.offset.x;
                top = relativeRect.top - this.config.offset.y - buttonGroupHeight;
                break;
            case 'bottom-left':
                left = relativeRect.left - this.config.offset.x;
                top = relativeRect.bottom + this.config.offset.y;
                break;
            case 'bottom-right':
            default:
                left = relativeRect.right + this.config.offset.x;
                top = relativeRect.bottom + this.config.offset.y;
                break;
        }

        // Ensure button group stays within container bounds
        const containerWidth = this.buttonGroup.parentElement.offsetWidth;
        const containerHeight = this.buttonGroup.parentElement.offsetHeight;

        left = Math.max(0, Math.min(left, containerWidth - buttonGroupWidth));
        top = Math.max(0, Math.min(top, containerHeight - buttonGroupHeight));

        this.buttonGroup.style.left = left + 'px';
        this.buttonGroup.style.top = top + 'px';
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.buttonGroup) return;

        // Handle annotate button click
        if (this.annotateButton) {
            this.annotateButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                if (this.callbacks.onAnnotate && this.activeHighlight) {
                    this.callbacks.onAnnotate(this.activeHighlight, event);
                }
            });

            // Handle keyboard activation for annotate button
            this.annotateButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.annotateButton.click();
                }
            });
        }

        // Handle delete button click
        if (this.deleteButton) {
            this.deleteButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                if (this.callbacks.onDelete && this.activeHighlight) {
                    this.callbacks.onDelete(this.activeHighlight, event);
                }
            });

            // Handle keyboard activation for delete button
            this.deleteButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.deleteButton.click();
                }
            });
        }

        // Hide on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Hide when clicking outside highlight and button group
        document.addEventListener('click', (event) => {
            if (!this.isVisible) return;

            const clickedHighlight = event.target.closest('[data-role="highlight"]');
            const clickedButtonGroup = event.target.closest('.highlight-action-btn-group');
            
            if (!clickedHighlight && !clickedButtonGroup) {
                this.hide();
            }
        });
    }
}

// Export for both Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HighlightActionButton };
} else {
    window.HighlightActionButton = HighlightActionButton;
}
