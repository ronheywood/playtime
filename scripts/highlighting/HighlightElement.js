/**
 * Value object representing a highlight element with its geometry and styling
 * Encapsulates coordinate calculations and provides immutable operations
 */
class HighlightElement {
    constructor({ xPct, yPct, wPct, hPct, color, confidence, page = null, id = null }) {
        // Validate required properties
        if (!Number.isFinite(xPct) || !Number.isFinite(yPct) || !Number.isFinite(wPct) || !Number.isFinite(hPct)) {
            throw new Error('HighlightElement requires valid numeric percentages');
        }
        if (!color || typeof color !== 'string') {
            throw new Error('HighlightElement requires a valid color string');
        }
        if (!Number.isFinite(confidence)) {
            throw new Error('HighlightElement requires a numeric confidence level');
        }

        // Immutable properties
        Object.defineProperties(this, {
            xPct: { value: xPct, writable: false, enumerable: true, configurable: false },
            yPct: { value: yPct, writable: false, enumerable: true, configurable: false },
            wPct: { value: wPct, writable: false, enumerable: true, configurable: false },
            hPct: { value: hPct, writable: false, enumerable: true, configurable: false },
            color: { value: color, writable: false, enumerable: true, configurable: false },
            confidence: { value: confidence, writable: false, enumerable: true, configurable: false },
            page: { value: page, writable: false, enumerable: true, configurable: false },
            id: { value: id, writable: false, enumerable: true, configurable: false }
        });
    }

    /**
     * Create HighlightElement from absolute pixel coordinates relative to container
     */
    static fromRect(rect, containerRect, color, confidence, page = null) {
        if (!rect || !containerRect) {
            throw new Error('fromRect requires valid rect and containerRect');
        }

        const xPct = containerRect.width ? rect.left / containerRect.width : 0;
        const yPct = containerRect.height ? rect.top / containerRect.height : 0;
        const wPct = containerRect.width ? rect.width / containerRect.width : 0;
        const hPct = containerRect.height ? rect.height / containerRect.height : 0;

        return new HighlightElement({ xPct, yPct, wPct, hPct, color, confidence, page });
    }

    /**
     * Create HighlightElement from stored database record
     */
    static fromDatabaseRecord(record) {
        if (!record || typeof record !== 'object') {
            throw new Error('fromDatabaseRecord requires a valid record object');
        }

        // Import ConfidenceMapper for color conversion
        const ConfidenceMapper = (typeof require !== 'undefined') ? 
            require('./ConfidenceMapper') : window.ConfidenceMapper;
        
        let color = record.color;
        
        // If confidence exists, derive color from it (prioritize confidence over potentially stale color field)
        if (Number.isFinite(record.confidence)) {
            if (ConfidenceMapper) {
                try {
                    // Try to create mapper with confidence module if available
                    const confidenceModule = (typeof require !== 'undefined') ? 
                        require('../confidence') : window.PlayTimeConfidence;
                    const mapper = new ConfidenceMapper(confidenceModule);
                    color = mapper.confidenceToColor(record.confidence);
                } catch (e) {
                    // Fallback to basic enum-to-color mapping
                    const fallbackColors = { 0: 'red', 1: 'amber', 2: 'green' };
                    color = fallbackColors[record.confidence] || record.color || 'amber';
                }
            } else {
                // Fallback without ConfidenceMapper
                const fallbackColors = { 0: 'red', 1: 'amber', 2: 'green' };
                color = fallbackColors[record.confidence] || record.color || 'amber';
            }
        }
        
        // Ensure we have a valid color
        if (!color || !['red', 'amber', 'green'].includes(color)) {
            color = 'amber';
        }

        return new HighlightElement({
            xPct: record.xPct,
            yPct: record.yPct,
            wPct: record.wPct,
            hPct: record.hPct,
            color: color,
            confidence: record.confidence,
            page: record.page,
            id: record.id
        });
    }

    /**
     * Convert percentages to absolute pixel coordinates for given container
     */
    toAbsoluteRect(containerRect, canvasOffsetLeft = 0, canvasOffsetTop = 0) {
        if (!containerRect) {
            throw new Error('toAbsoluteRect requires a valid containerRect');
        }

        return {
            left: canvasOffsetLeft + this.xPct * containerRect.width,
            top: canvasOffsetTop + this.yPct * containerRect.height,
            width: this.wPct * containerRect.width,
            height: this.hPct * containerRect.height
        };
    }

    /**
     * Create database record for persistence
     */
    toDatabaseRecord(pdfId) {
        return {
            pdfId,
            page: this.page,
            confidence: this.confidence,
            color: this.color,
            xPct: this.xPct,
            yPct: this.yPct,
            wPct: this.wPct,
            hPct: this.hPct
        };
    }

    /**
     * Create DOM element with proper styling and data attributes
     */
    createDOMElement(containerRect, canvasOffsetLeft = 0, canvasOffsetTop = 0, styleConfig = {}) {
        const { enableFocus = true } = styleConfig;
        const el = document.createElement('div');
        
        // Set data attributes
        el.setAttribute('data-role', 'highlight');
        el.setAttribute('data-color', this.color);
        el.dataset.confidence = String(this.confidence);
        if (this.page !== null) {
            el.dataset.page = String(this.page);
        }
        
        // Store percentage data for repositioning
        el.dataset.hlXPct = String(this.xPct);
        el.dataset.hlYPct = String(this.yPct);
        el.dataset.hlWPct = String(this.wPct);
        el.dataset.hlHPct = String(this.hPct);

        // Add unique identifier for focus mode interactions
        if (this.id) {
            el.dataset.hlId = String(this.id);
        }

        // Apply positioning
        const rect = this.toAbsoluteRect(containerRect, canvasOffsetLeft, canvasOffsetTop);
        el.style.position = 'absolute';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';

        // Enable focus mode interactions
        if (enableFocus) {
            el.style.cursor = 'pointer';
            el.style.pointerEvents = 'auto';
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.setAttribute('aria-label', `Practice section (${this.color} confidence) - Click to focus`);
            el.title = `Double click to focus on this practice section`;
        }

        // Apply styling (class for CSS, fallback for tests)
        el.className = styleConfig.highlightClass || 'highlight';
        this._applyStyleFallbacks(el, styleConfig);

        return el;
    }

    /**
     * Apply inline style fallbacks if CSS not loaded (for tests)
     */
    _applyStyleFallbacks(el, styleConfig) {
        if (!styleConfig.colorStyles) return;

        try {
            const win = el.ownerDocument?.defaultView || window;
            const cs = win?.getComputedStyle?.(el);
            
            // In test environment, computed styles may not be available or may be default values
            const hasComputedStyles = cs && cs.borderStyle && cs.borderStyle !== 'none';
            const noBorder = !hasComputedStyles || cs.borderStyle === 'none' || cs.borderWidth === '0px';
            const noBg = !hasComputedStyles || ['rgba(0, 0, 0, 0)', 'transparent', ''].includes(cs.backgroundColor);
            
            if (noBorder || noBg) {
                const colorStyle = styleConfig.colorStyles[this.color] || styleConfig.colorStyles.red;
                if (colorStyle) {
                    if (noBorder && colorStyle.border) el.style.border = colorStyle.border;
                    if (noBg && colorStyle.background) el.style.background = colorStyle.background;
                }
            }
        } catch (_) {
            // Safe fallback if getComputedStyle unavailable - always apply in test environment
            const colorStyle = styleConfig.colorStyles?.[this.color] || styleConfig.colorStyles?.red;
            if (colorStyle) {
                if (colorStyle.border) el.style.border = colorStyle.border;
                if (colorStyle.background) el.style.background = colorStyle.background;
            }
        }
    }

    /**
     * Generate unique signature for deduplication
     */
    getSignature(pdfId) {
        return `${pdfId}|${this.page}|${this.confidence}|${this.xPct}|${this.yPct}|${this.wPct}|${this.hPct}`;
    }

    /**
     * Check if this highlight should be visible on the given page
     */
    isVisibleOnPage(currentPage) {
        return this.page === null || this.page === currentPage;
    }
}

// Dual-mode export for Node.js and browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighlightElement;
}
if (typeof window !== 'undefined') {
    window.HighlightElement = HighlightElement;
}
