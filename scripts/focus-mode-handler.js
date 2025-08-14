/**
 * Focus Mode Handler - Extracted DOM manipulation logic
 * This class will eventually become a command handler that subscribes to layout commands
 * For now, it's a safe refactoring that preserves existing functionality
 */

class FocusModeHandler {
    constructor(elements) {
        this.canvas = elements.canvas;
        this.viewerContainer = elements.viewerContainer;
        this.sidebar = elements.sidebar;
        this.focusBtn = elements.focusBtn;
        this.exitBtn = elements.exitBtn;
        this.toggleBtn = elements.toggleBtn;
    }

    /**
     * Apply fallback focus when no highlight is selected
     * Scales canvas to fit within viewer container
     */
    applyFocusLayout() {
        const viewerRect = this.viewerContainer.getBoundingClientRect();
        const baseW = this.canvas.width || this.canvas.clientWidth || 800;
        const baseH = this.canvas.height || this.canvas.clientHeight || 600;
        const containerW = viewerRect.width || this.viewerContainer.clientWidth || baseW;
        const containerH = viewerRect.height || this.viewerContainer.clientHeight || baseH;
        const scale = Math.max(1, Math.min(containerW / baseW, containerH / baseH));
        
        if (!this.canvas.style.transform) this.canvas.style.transform = 'none';
        this.canvas.style.transformOrigin = 'center center';
        this.canvas.style.transform = `scale(${scale})`;
        this.canvas.style.transition = 'transform 0.15s ease';

    }

    /**
     * Enter focus mode - apply transforms and hide distractions
     * @param {object} options - Focus options (currently unused)
     */
    enterFocusMode(options = {}) {
        const selected = document.querySelector('.highlight.selected');
        this.canvas.setAttribute('data-focus-mode', 'active');
        
        // Distraction-free: hide sidebar and add body class
        if (this.sidebar) this.sidebar.style.display = 'none';
        if (document && document.body) document.body.classList.add('distraction-free');
        
        // Preserve original styles to restore later
        if (!this.canvas.dataset._origTransform) this.canvas.dataset._origTransform = this.canvas.style.transform || '';
        if (!this.canvas.dataset._origTransition) this.canvas.dataset._origTransition = this.canvas.style.transition || '';
        if (!this.viewerContainer.dataset._origOverflow) this.viewerContainer.dataset._origOverflow = this.viewerContainer.style.overflow || '';
        
        // Prevent scrollbars fighting the transform
        this.viewerContainer.style.overflow = 'hidden';
        
        this.applyFocusLayout();

        // Update button visibility
        this.focusBtn.style.display = 'none';
        this.exitBtn.style.display = '';
        if (this.toggleBtn) {
            this.toggleBtn.setAttribute('aria-pressed', 'true');
            this.toggleBtn.classList.add('active');
        }
    }

    /**
     * Exit focus mode - restore original state
     * @param {object} options - Exit options (currently unused)
     */
    exitFocusMode(options = {}) {
        this.canvas.removeAttribute('data-focus-mode');
        
        // Restore original transform/transition and container overflow
        this.canvas.style.transform = this.canvas.dataset._origTransform || '';
        this.canvas.style.transition = this.canvas.dataset._origTransition || '';
        this.viewerContainer.style.overflow = this.viewerContainer.dataset._origOverflow || '';
        
        // Restore sidebar visibility and remove body class
        if (this.sidebar) this.sidebar.style.display = '';
        if (document && document.body) document.body.classList.remove('distraction-free');
        
        // Update button visibility
        this.exitBtn.style.display = 'none';
        this.focusBtn.style.display = '';
        if (this.toggleBtn) {
            this.toggleBtn.setAttribute('aria-pressed', 'false');
            this.toggleBtn.classList.remove('active');
        }
    }

    /**
     * Toggle focus mode - enter if not active, exit if active
     * @param {object} options - Toggle options (currently unused)
     */
    toggleFocusMode(options = {}) {
        const active = this.canvas.getAttribute('data-focus-mode') === 'active';
        if (active) {
            this.exitFocusMode(options);
        } else {
            this.enterFocusMode(options);
        }
    }
}

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FocusModeHandler;
}

// Also expose class directly on window for browser usage (not a factory)
if (typeof window !== 'undefined') {
    window.PlayTimeFocusModeHandler = FocusModeHandler;
}
