// PlayTime Highlighting module (Outside-In)
// Data-role driven selectors and minimal functionality to support selection overlay and basic highlights

(function initHighlightingModule(global) {
    const CONST = (global && global.PlayTimeConstants) ? global.PlayTimeConstants : (function(){ try { return require('./constants'); } catch(_) { return { EVENTS: { CONFIDENCE_CHANGED: 'playtime:confidence-changed' }, SELECTORS: {} }; } })();
    const DEFAULT_CONFIG = {
        SELECTORS: {
            VIEWER: '[data-role="pdf-viewer"]',
            CANVAS: '[data-role="pdf-canvas"]',
            SELECTION_OVERLAY: '[data-role="selection-overlay"]',
            HIGHLIGHT: '[data-role="highlight"]',
            COLOR_GREEN: '[data-role="color-green"]',
            COLOR_AMBER: '[data-role="color-amber"]',
            COLOR_RED: '[data-role="color-red"]'
        },
        CSS: {
            OVERLAY_CLASS: 'selection-overlay', // keep class for legacy tests/UX
            HIGHLIGHT_CLASS: 'highlight'
        }
    };

    function createOrGetOverlay(viewer, config) {
        // Ensure the viewer is a positioned container so absolute children align correctly
        try {
            const pos = (viewer && viewer.ownerDocument && viewer.ownerDocument.defaultView)
                ? viewer.ownerDocument.defaultView.getComputedStyle(viewer).position
                : (viewer && viewer.style && viewer.style.position) || 'static';
            if (pos === 'static') {
                viewer.style.position = 'relative';
            }
        } catch (_) { /* noop */ }
        let overlay = viewer.querySelector(config.SELECTORS.SELECTION_OVERLAY);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.setAttribute('data-role', 'selection-overlay');
            overlay.className = DEFAULT_CONFIG.CSS.OVERLAY_CLASS;
            viewer.appendChild(overlay);
        }
        // Normalize required styles whether newly created or pre-existing in DOM
        overlay.style.display = overlay.style.display || 'none';
        overlay.style.position = 'absolute';
        overlay.style.zIndex = '10'; // ensure it renders above the canvas
        overlay.style.visibility = overlay.style.display === 'none' ? 'hidden' : 'visible';
        overlay.style.opacity = overlay.style.display === 'none' ? '0' : '1';
        overlay.style.boxSizing = 'border-box';
        overlay.style.border = overlay.style.border || '2px dashed rgba(0,0,0,0.4)';
        overlay.style.background = overlay.style.background || 'rgba(0,0,0,0.08)';
        overlay.style.pointerEvents = 'none';
        return overlay;
    }

    function createHighlight(viewer, rect, color, config) {
        const el = document.createElement('div');
        el.setAttribute('data-role', 'highlight');
        el.setAttribute('data-color', color || 'red');
        el.className = DEFAULT_CONFIG.CSS.HIGHLIGHT_CLASS;
        el.style.position = 'absolute';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        el.style.border = '2px solid rgba(255,0,0,0.6)';
        el.style.background = 'rgba(255,0,0,0.15)';
        el.tabIndex = 0;
        viewer.appendChild(el);
        return el;
    }

    function getRelativePoint(container, clientX, clientY) {
        const rect = container.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    const PlayTimeHighlighting = {
        CONFIG: DEFAULT_CONFIG,
        _state: {
            selecting: false,
            start: { x: 0, y: 0 },
            current: { x: 0, y: 0 },
            activeColor: null,
            overlay: null,
            viewer: null,
            canvas: null,
            logger: console
        },

        setActiveColor(color) {
            try { this._state.logger && this._state.logger.debug && this._state.logger.debug('Setting active color', color); } catch (_) {}
            this._state.activeColor = color || null;
        },

        async init(config = {}, logger = console) {
            this._state.logger = logger || console;
            const cfg = this.CONFIG = {
                ...DEFAULT_CONFIG,
                SELECTORS: { ...DEFAULT_CONFIG.SELECTORS, ...(config.SELECTORS || {}) }
            };
            const viewer = document.querySelector(cfg.SELECTORS.VIEWER) || document.querySelector('.pdf-viewer-container');
            const canvas = document.querySelector(cfg.SELECTORS.CANVAS) || document.getElementById('pdf-canvas');
            if (!viewer || !canvas) return;
            this._state.viewer = viewer;
            this._state.canvas = canvas;
            this._state.overlay = createOrGetOverlay(viewer, cfg);

            // Subscribe to pub/sub event for confidence color changes
            const onConfidenceChanged = (e) => {
                try {
                    const color = e && e.detail ? e.detail.color : null;
                    this.setActiveColor(color);
                } catch (_) { /* noop */ }
            };
            if (typeof window !== 'undefined' && window.addEventListener) {
                window.addEventListener(CONST.EVENTS.CONFIDENCE_CHANGED, onConfidenceChanged);
            } else if (typeof document !== 'undefined' && document.addEventListener) {
                document.addEventListener(CONST.EVENTS.CONFIDENCE_CHANGED, onConfidenceChanged);
            }

            // Mouse interactions on the canvas
            const updateOverlayFromPoint = (point) => {
                const overlay = this._state.overlay;
                if (!overlay) return;
                const left = Math.min(this._state.start.x, point.x);
                const top = Math.min(this._state.start.y, point.y);
                const width = Math.abs(point.x - this._state.start.x);
                const height = Math.abs(point.y - this._state.start.y);
                overlay.style.display = 'block';
                overlay.style.visibility = 'visible';
                overlay.style.opacity = '1';
                overlay.style.left = left + 'px';
                overlay.style.top = top + 'px';
                overlay.style.width = width + 'px';
                overlay.style.height = height + 'px';
            };

            const onMouseMoveDoc = (e) => {
                if (!this._state.selecting) return;
                const p = getRelativePoint(viewer, e.clientX, e.clientY);
                this._state.current = p;
                updateOverlayFromPoint(p);
            };

            const finish = (e) => {
                if (!this._state.selecting) return;
                this._state.selecting = false;
                document.removeEventListener('mousemove', onMouseMoveDoc, true);
                document.removeEventListener('mouseup', finish, true);
                const p = getRelativePoint(viewer, e.clientX, e.clientY);
                const left = Math.min(this._state.start.x, p.x);
                const top = Math.min(this._state.start.y, p.y);
                const width = Math.abs(p.x - this._state.start.x);
                const height = Math.abs(p.y - this._state.start.y);
                
                const overlay = this._state.overlay;
                if (width > 2 && height > 2) {
                    if (this._state.activeColor) {
                        createHighlight(viewer, { left, top, width, height }, this._state.activeColor, this.CONFIG);
                    }
                    if (overlay) {
                        overlay.style.display = 'none';
                        overlay.style.visibility = 'hidden';
                        overlay.style.opacity = '0';
                    }
                } else {
                    if (overlay) {
                        overlay.style.display = 'none';
                        overlay.style.visibility = 'hidden';
                        overlay.style.opacity = '0';
                    }
                }
            };

            canvas.addEventListener('mousedown', (e) => {
                this._state.selecting = true;
                const p = getRelativePoint(viewer, e.clientX, e.clientY);
                this._state.start = p;
                this._state.current = p;
                // Reveal overlay when selection starts (thin rectangle at 0 size)
                const overlay = this._state.overlay;
                if (overlay) {
                    overlay.style.left = p.x + 'px';
                    overlay.style.top = p.y + 'px';
                    // Use a minimal size so users see immediate feedback even before moving
                    overlay.style.width = '1px';
                    overlay.style.height = '1px';
                    overlay.style.display = 'block';
                    overlay.style.visibility = 'visible';
                    overlay.style.opacity = '1';
                }
                // Listen on the document for reliable dragging even if cursor leaves canvas
                document.addEventListener('mousemove', onMouseMoveDoc, true);
                document.addEventListener('mouseup', finish, true);
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!this._state.selecting) return;
                const p = getRelativePoint(viewer, e.clientX, e.clientY);
                this._state.current = p;
                updateOverlayFromPoint(p);
            });
            canvas.addEventListener('mouseup', finish);
            canvas.addEventListener('mouseleave', (e) => { if (this._state.selecting) finish(e); });

            return Promise.resolve();
        },

        enableSelection() { /* selection always enabled after init for now */ },
        disableSelection() { /* future: toggle off event listeners */ },
        highlightSection() { /* created automatically on mouseup when activeColor set */ },
        getHighlights() {
            const sel = this.CONFIG.SELECTORS.HIGHLIGHT;
            return Array.from((this._state.viewer || document).querySelectorAll(sel));
        },
        focusOnSection() { return Promise.resolve(); }
    };

    global.PlayTimeHighlighting = PlayTimeHighlighting;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayTimeHighlighting;
    }
})(typeof window !== 'undefined' ? window : globalThis);

