/**
 * Manages the selection overlay for highlighting interactions
 * Handles display, positioning, and user feedback during selection
 */
class SelectionOverlay {
    constructor(config = {}) {
        this.config = {
            overlayClass: 'selection-overlay',
            fallbackStyles: {
                border: '2px dashed rgba(0,0,0,0.4)',
                background: 'rgba(0,0,0,0.08)',
                boxSizing: 'border-box',
                pointerEvents: 'none'
            },
            ...config
        };
        this.overlay = null;
        this.isVisible = false;
    }

    /**
     * Initialize overlay in the specified container
     */
    init(container) {
        if (!container) {
            throw new Error('SelectionOverlay requires a valid container element');
        }

        this.container = container;
        this._ensureContainerPositioned();
        this.overlay = this._createOrGetOverlay();
        return this;
    }

    /**
     * Show overlay at specified coordinates with minimal size
     */
    show(x = 0, y = 0, width = 1, height = 1) {
        if (!this.overlay) return this;

        this.overlay.style.left = x + 'px';
        this.overlay.style.top = y + 'px';
        this.overlay.style.width = width + 'px';
        this.overlay.style.height = height + 'px';
        this.overlay.style.display = 'block';
        this.overlay.style.visibility = 'visible';
        this.overlay.style.opacity = '1';
        
        this.isVisible = true;
        return this;
    }

    /**
     * Hide the overlay
     */
    hide() {
        if (!this.overlay) return this;

        this.overlay.style.display = 'none';
        this.overlay.style.visibility = 'hidden';
        this.overlay.style.opacity = '0';
        
        this.isVisible = false;
        return this;
    }

    /**
     * Update overlay to span between two points
     */
    updateFromPoints(startPoint, currentPoint) {
        if (!this.overlay || !startPoint || !currentPoint) return this;

        const left = Math.min(startPoint.x, currentPoint.x);
        const top = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);

        return this.show(left, top, width, height);
    }

    /**
     * Get current overlay rectangle
     */
    getRect() {
        if (!this.overlay || !this.isVisible) return null;

        return {
            left: parseFloat(this.overlay.style.left) || 0,
            top: parseFloat(this.overlay.style.top) || 0,
            width: parseFloat(this.overlay.style.width) || 0,
            height: parseFloat(this.overlay.style.height) || 0
        };
    }

    /**
     * Check if overlay dimensions are significant enough for highlight creation
     */
    isSignificantSize(minWidth = 2, minHeight = 2) {
        const rect = this.getRect();
        return rect && rect.width > minWidth && rect.height > minHeight;
    }

    /**
     * Clean up overlay (remove from DOM)
     */
    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.container = null;
        this.isVisible = false;
    }

    // Private methods

    _ensureContainerPositioned() {
        try {
            const pos = this.container.ownerDocument?.defaultView
                ?.getComputedStyle(this.container).position
                || this.container.style?.position 
                || 'static';
            
            if (pos === 'static') {
                this.container.style.position = 'relative';
            }
        } catch (_) {
            // Safe fallback
        }
    }

    _createOrGetOverlay() {
        // Try to find existing overlay first
        let overlay = this.container.querySelector('[data-role="selection-overlay"]');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.setAttribute('data-role', 'selection-overlay');
            overlay.className = this.config.overlayClass;
            this.container.appendChild(overlay);
        }

        this._normalizeOverlayStyles(overlay);
        return overlay;
    }

    _normalizeOverlayStyles(overlay) {
        // Set required positioning styles
        overlay.style.position = 'absolute';
        overlay.style.zIndex = '10';
        overlay.style.display = overlay.style.display || 'none';
        overlay.style.visibility = overlay.style.display === 'none' ? 'hidden' : 'visible';
        overlay.style.opacity = overlay.style.display === 'none' ? '0' : '1';

        // Apply fallback styles if CSS not loaded
        this._applyStyleFallbacks(overlay);
    }

    _applyStyleFallbacks(overlay) {
        try {
            const win = overlay.ownerDocument?.defaultView || window;
            const cs = win?.getComputedStyle?.(overlay);
            
            // In test environment, computed styles may not be available or may be default values
            const hasComputedStyles = cs && cs.borderStyle && cs.borderStyle !== 'none';
            const noBorder = !hasComputedStyles || cs.borderStyle === 'none' || cs.borderWidth === '0px';
            const noBg = !hasComputedStyles || ['rgba(0, 0, 0, 0)', 'transparent', ''].includes(cs.backgroundColor);
            
            if (noBorder && this.config.fallbackStyles.border) {
                overlay.style.border = this.config.fallbackStyles.border;
            }
            if (noBg && this.config.fallbackStyles.background) {
                overlay.style.background = this.config.fallbackStyles.background;
            }
            if (this.config.fallbackStyles.boxSizing) {
                overlay.style.boxSizing = this.config.fallbackStyles.boxSizing;
            }
            if (this.config.fallbackStyles.pointerEvents) {
                overlay.style.pointerEvents = this.config.fallbackStyles.pointerEvents;
            }
        } catch (_) {
            // Safe fallback if getComputedStyle unavailable - always apply in test environment
            Object.assign(overlay.style, this.config.fallbackStyles);
        }
    }
}

module.exports = SelectionOverlay;
