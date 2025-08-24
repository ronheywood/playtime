/**
 * HighlightActionButton - Floating call-to-action for highlight annotation
 * Appears when a highlight is active (newly created or clicked)
 */
class HighlightActionButton {
    constructor(config = {}) {
        this.config = {
            containerId: config.containerId || 'pdf-canvas',
            buttonClass: 'highlight-action-btn',
            iconSize: 'w-4 h-4',
            position: config.position || 'bottom-right', // top-left, top-right, bottom-left, bottom-right
            offset: config.offset || { x: 12, y: 12 },
            ...config
        };
        
        this.button = null;
        this.activeHighlight = null;
        this.isVisible = false;
        this.callbacks = {
            onClick: null
        };
    }

    /**
     * Initialize the floating action button
     */
    init() {
        this.createButton();
        this.attachEventListeners();
        return this;
    }

    /**
     * Show the action button for a specific highlight
     * @param {HTMLElement} highlightElement - The active highlight element
     */
    showForHighlight(highlightElement) {
        if (!highlightElement || !this.button) return;

        this.activeHighlight = highlightElement;
        this.positionButton(highlightElement);
        this.button.style.display = 'flex';
        this.button.style.opacity = '1';
        this.button.style.pointerEvents = 'auto';
        this.isVisible = true;

        // Update aria-label with highlight info
        const confidence = highlightElement.dataset.hlConfidence;
        const color = highlightElement.dataset.hlColor;
        const page = highlightElement.dataset.page || '1';
        
        this.button.setAttribute('aria-label', 
            `Add title and notes to ${color} highlight on page ${page}`
        );
    }

    /**
     * Hide the action button
     */
    hide() {
        if (!this.button) return;

        this.button.style.opacity = '0';
        this.button.style.pointerEvents = 'none';
        
        // Delay hiding to allow for smooth transition
        setTimeout(() => {
            if (this.button && this.button.style.opacity === '0') {
                this.button.style.display = 'none';
            }
        }, 200);

        this.activeHighlight = null;
        this.isVisible = false;
    }

    /**
     * Set callback for button click
     * @param {Function} callback - Function to call when button is clicked
     */
    onClick(callback) {
        this.callbacks.onClick = callback;
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
     * Destroy the button and clean up
     */
    destroy() {
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }
        this.button = null;
        this.activeHighlight = null;
        this.isVisible = false;
        this.callbacks = {};
    }

    // Private methods

    /**
     * Create the floating action button element
     */
    createButton() {
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

        // Create button element
        this.button = document.createElement('button');
        this.button.className = `${this.config.buttonClass} btn btn-default btn-icon`;
        this.button.style.cssText = `
            position: absolute;
            display: none;
            opacity: 0;
            pointer-events: none;
            z-index: 1010;
            background: #2563eb;
            color: white;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.2s ease;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
        `;

        // Add hover effects via CSS
        this.button.addEventListener('mouseenter', () => {
            this.button.style.transform = 'scale(1.1)';
            this.button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        });

        this.button.addEventListener('mouseleave', () => {
            this.button.style.transform = 'scale(1)';
            this.button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });

        // Create icon using Lucide notebook-pen icon
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'notebook-pen');
        icon.className = this.config.iconSize;
        icon.style.color = 'white'; // Ensure icon is visible on blue background
        this.button.appendChild(icon);

        // Add to container
        container.appendChild(this.button);

        // Trigger Lucide icon rendering after DOM insertion
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    /**
     * Position the button relative to the highlight
     * @param {HTMLElement} highlightElement - The highlight to position relative to
     */
    positionButton(highlightElement) {
        if (!this.button || !highlightElement) return;

        const highlightRect = highlightElement.getBoundingClientRect();
        const containerRect = this.button.parentElement.getBoundingClientRect();

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

        // Position based on config
        switch (this.config.position) {
            case 'top-left':
                left = relativeRect.left - this.config.offset.x;
                top = relativeRect.top - this.config.offset.y;
                break;
            case 'top-right':
                left = relativeRect.right + this.config.offset.x;
                top = relativeRect.top - this.config.offset.y;
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

        // Ensure button stays within container bounds
        const buttonSize = 40; // button width/height
        const containerWidth = this.button.parentElement.offsetWidth;
        const containerHeight = this.button.parentElement.offsetHeight;

        left = Math.max(0, Math.min(left, containerWidth - buttonSize));
        top = Math.max(0, Math.min(top, containerHeight - buttonSize));

        this.button.style.left = left + 'px';
        this.button.style.top = top + 'px';
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.button) return;

        // Handle button click
        this.button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (this.callbacks.onClick && this.activeHighlight) {
                this.callbacks.onClick(this.activeHighlight, event);
            }
        });

        // Handle keyboard activation
        this.button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.button.click();
            }
        });

        // Hide on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Hide when clicking outside highlight and button
        document.addEventListener('click', (event) => {
            if (!this.isVisible) return;

            const clickedHighlight = event.target.closest('[data-role="highlight"]');
            const clickedButton = event.target.closest('.highlight-action-btn');
            
            if (!clickedHighlight && !clickedButton) {
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
