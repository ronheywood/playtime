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
            HIGHLIGHT_CLASS: 'highlight',
            COLOR_STYLES: {
                green: { border: '2px solid rgba(0,128,0,0.6)', background: 'rgba(0,128,0,0.15)' },
                amber: { border: '2px solid rgba(255,165,0,0.6)', background: 'rgba(255,165,0,0.15)' },
                red: { border: '2px solid rgba(255,0,0,0.6)', background: 'rgba(255,0,0,0.15)' }
            }
        }
    };

    // ---- Overlay helpers (tidy/DRY only, no behavior change) ----
    function showOverlay(overlay) {
        if (!overlay) return;
        overlay.style.display = 'block';
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
    }

    function hideOverlay(overlay) {
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
    }

    function setOverlayRect(overlay, left, top, width, height) {
        if (!overlay) return;
        overlay.style.left = left + 'px';
        overlay.style.top = top + 'px';
        overlay.style.width = width + 'px';
        overlay.style.height = height + 'px';
    }

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
        // Visibility toggled via JS; presentation comes from CSS class
        overlay.style.position = 'absolute';
        overlay.style.zIndex = '10';
        overlay.style.visibility = overlay.style.display === 'none' ? 'hidden' : 'visible';
        overlay.style.opacity = overlay.style.display === 'none' ? '0' : '1';
        // Fallbacks if CSS not loaded (e.g., unit tests): only apply if computed styles are missing
        try {
            const win = (viewer && viewer.ownerDocument && viewer.ownerDocument.defaultView) || window;
            const cs = win && win.getComputedStyle ? win.getComputedStyle(overlay) : null;
            const noBorder = !cs || cs.borderStyle === 'none' || cs.borderWidth === '0px';
            const noBg = !cs || cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent' || cs.backgroundColor === '';
            if (noBorder) overlay.style.border = '2px dashed rgba(0,0,0,0.4)';
            if (noBg) overlay.style.background = 'rgba(0,0,0,0.08)';
        } catch (_) {
            // Safe fallback if getComputedStyle unavailable
            overlay.style.border = overlay.style.border || '2px dashed rgba(0,0,0,0.4)';
            overlay.style.background = overlay.style.background || 'rgba(0,0,0,0.08)';
        }
        overlay.style.boxSizing = overlay.style.boxSizing || 'border-box';
        overlay.style.pointerEvents = overlay.style.pointerEvents || 'none';
        return overlay;
    }

    function createHighlight(viewer, rect, color, config, canvas, pageNumber) {
        const el = document.createElement('div');
        el.setAttribute('data-role', 'highlight');
        const appliedColor = color || 'red';
        el.setAttribute('data-color', appliedColor);
        el.className = DEFAULT_CONFIG.CSS.HIGHLIGHT_CLASS;
        el.style.position = 'absolute';
        el.tabIndex = 0;
        viewer.appendChild(el);
        if (Number.isFinite(pageNumber)) {
            el.dataset.page = String(pageNumber);
        }

        // Normalize to canvas so we can reposition on resize/recenter
        try {
            const vRect = viewer.getBoundingClientRect();
            const c = canvas || viewer.querySelector(DEFAULT_CONFIG.SELECTORS.CANVAS);
            const cRect = c.getBoundingClientRect();
            const canvasOffsetLeft = cRect.left - vRect.left;
            const canvasOffsetTop = cRect.top - vRect.top;

            const localLeft = Math.max(0, Math.min(rect.left - canvasOffsetLeft, cRect.width));
            const localTop = Math.max(0, Math.min(rect.top - canvasOffsetTop, cRect.height));
            const localWidth = Math.max(0, Math.min(rect.width, cRect.width));
            const localHeight = Math.max(0, Math.min(rect.height, cRect.height));

            const xPct = cRect.width ? localLeft / cRect.width : 0;
            const yPct = cRect.height ? localTop / cRect.height : 0;
            const wPct = cRect.width ? localWidth / cRect.width : 0;
            const hPct = cRect.height ? localHeight / cRect.height : 0;

            el.dataset.hlXPct = String(xPct);
            el.dataset.hlYPct = String(yPct);
            el.dataset.hlWPct = String(wPct);
            el.dataset.hlHPct = String(hPct);

            // Apply absolute position relative to viewer for current layout
            el.style.left = (canvasOffsetLeft + xPct * cRect.width) + 'px';
            el.style.top = (canvasOffsetTop + yPct * cRect.height) + 'px';
            el.style.width = (wPct * cRect.width) + 'px';
            el.style.height = (hPct * cRect.height) + 'px';
        } catch (err) {
            // Fallback to the provided rect if geometry fails
            el.style.left = rect.left + 'px';
            el.style.top = rect.top + 'px';
            el.style.width = rect.width + 'px';
            el.style.height = rect.height + 'px';
        }
        // Presentation (border/background) provided by CSS via [data-color].
        // Apply color-aware fallback only if computed styles are missing.
        try {
            const win = (viewer && viewer.ownerDocument && viewer.ownerDocument.defaultView) || window;
            const cs = win && win.getComputedStyle ? win.getComputedStyle(el) : null;
            const noBorder = !cs || cs.borderStyle === 'none' || cs.borderWidth === '0px';
            const noBg = !cs || cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent' || cs.backgroundColor === '';
            if (noBorder || noBg) {
                const map = DEFAULT_CONFIG.CSS.COLOR_STYLES || {};
                const styleForColor = map[appliedColor] || map.red || { border: '2px solid rgba(255,0,0,0.6)', background: 'rgba(255,0,0,0.15)' };
                if (noBorder) el.style.border = styleForColor.border;
                if (noBg) el.style.background = styleForColor.background;
            }
        } catch (_) {
            const map = DEFAULT_CONFIG.CSS.COLOR_STYLES || {};
            const styleForColor = map[appliedColor] || map.red || { border: '2px solid rgba(255,0,0,0.6)', background: 'rgba(255,0,0,0.15)' };
            if (!el.style.border) el.style.border = styleForColor.border;
            if (!el.style.background) el.style.background = styleForColor.background;
        }
        return el;
    }

    function repositionHighlight(el, viewer, canvas, logger = console) {
        if (!el || !viewer || !canvas) return;
        const xPct = parseFloat(el.dataset.hlXPct || 'NaN');
        const yPct = parseFloat(el.dataset.hlYPct || 'NaN');
        const wPct = parseFloat(el.dataset.hlWPct || 'NaN');
        const hPct = parseFloat(el.dataset.hlHPct || 'NaN');
        
        if (!Number.isFinite(xPct) || !Number.isFinite(yPct) || !Number.isFinite(wPct) || !Number.isFinite(hPct)) {
            return;
        }
        try {
            const vRect = viewer.getBoundingClientRect();
            const cRect = canvas.getBoundingClientRect();
            const canvasOffsetLeft = cRect.left - vRect.left;
            const canvasOffsetTop = cRect.top - vRect.top;
            
            const newLeft = canvasOffsetLeft + xPct * cRect.width;
            const newTop = canvasOffsetTop + yPct * cRect.height;
            const newWidth = wPct * cRect.width;
            const newHeight = hPct * cRect.height;
            
            el.style.left = newLeft + 'px';
            el.style.top = newTop + 'px';
            el.style.width = newWidth + 'px';
            el.style.height = newHeight + 'px';
        } catch (err) { 
            logger.debug && logger.debug('repositionHighlight: error', err);
        }
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
            logger: console,
            scheduler: null
        },

        setActiveColor(color) {
            try { this._state.logger && this._state.logger.debug && this._state.logger.debug('Setting active color', color); } catch (_) {}
            this._state.activeColor = color || null;
        },

        //TODO: Using a property setter for a strategy could be improved
        setScheduler(scheduler) {
            this._state.scheduler = scheduler;
        },

        async init(config = {}, logger = console) {
            this._state.logger = logger || console;
            const cfg = this.CONFIG = {
                ...DEFAULT_CONFIG,
                SELECTORS: { ...DEFAULT_CONFIG.SELECTORS, ...(config.SELECTORS || {}) }
            };
            
            // Store scheduler for resize handling (allows test override)
            this._state.scheduler = config.scheduler || {
                schedule: (callback) => {
                    const raf = (cb) => (typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(cb) : setTimeout(cb, 0));
                    return setTimeout(() => raf(() => raf(callback)), 0);
                }
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
                showOverlay(overlay);
                setOverlayRect(overlay, left, top, width, height);
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
                        // Determine page number if PDF viewer exposes API
                        let pageNum = undefined;
                        try { pageNum = (window.PlayTimePDFViewer && window.PlayTimePDFViewer.getCurrentPage && window.PlayTimePDFViewer.getCurrentPage()) || undefined; } catch(_) {}
                        createHighlight(viewer, { left, top, width, height }, this._state.activeColor, this.CONFIG, canvas, pageNum);
                    }
                    hideOverlay(overlay);
                } else {
                    hideOverlay(overlay);
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
                    // Use a minimal size so users see immediate feedback even before moving
                    setOverlayRect(overlay, p.x, p.y, 1, 1);
                    showOverlay(overlay);
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

            // Reposition highlights when window resizes (canvas recenters/scales)
            let resizeTimer = null;
            const doReposition = () => {
                try {
                    const list = viewer.querySelectorAll(this.CONFIG.SELECTORS.HIGHLIGHT);
                    list.forEach((el) => repositionHighlight(el, viewer, canvas, this._state.logger));
                } catch (err) { 
                    this._state.logger.debug && this._state.logger.debug('doReposition: error', err);
                }
            };
            const onResize = () => {
                // Throttle bursts and ensure we run after layout settles
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = this._state.scheduler.schedule(doReposition);
            };
            if (typeof window !== 'undefined' && window.addEventListener) {
                window.addEventListener('resize', onResize);
                // App-driven layout changes (e.g., zoom) can fire this custom event
                try {
                    const evName = (CONST && CONST.EVENTS && CONST.EVENTS.LAYOUT_CHANGED) ? CONST.EVENTS.LAYOUT_CHANGED : 'playtime:layout-changed';
                    window.addEventListener(evName, onResize);
                } catch (_) { /* noop */ }
                // Page changed: update visibility of highlights
                try {
                    const pageEvName = (CONST && CONST.EVENTS && CONST.EVENTS.PAGE_CHANGED) ? CONST.EVENTS.PAGE_CHANGED : 'playtime:page-changed';
                    window.addEventListener(pageEvName, (e) => {
                        const page = e && e.detail && e.detail.page;
                        if (!Number.isFinite(page)) return;
                        const list = viewer.querySelectorAll(this.CONFIG.SELECTORS.HIGHLIGHT);
                        list.forEach(el => {
                            if (el.dataset.page) {
                                el.style.display = (Number(el.dataset.page) === page) ? 'block' : 'none';
                            }
                        });
                    });
                } catch(_) { /* noop */ }
            }

            return Promise.resolve();
        },

        enableSelection() { /* selection always enabled after init for now */ },
        disableSelection() { /* future: toggle off event listeners */ },
        highlightSection() { /* created automatically on mouseup when activeColor set */ },
        getHighlights() {
            const sel = this.CONFIG.SELECTORS.HIGHLIGHT;
            return Array.from((this._state.viewer || document).querySelectorAll(sel));
        },
        repositionAll() {
            const v = this._state.viewer;
            const c = this._state.canvas;
            if (!v || !c) return;
            this.getHighlights().forEach((el) => repositionHighlight(el, v, c, this._state.logger));
        },
        focusOnSection() { return Promise.resolve(); }
    };

    global.PlayTimeHighlighting = PlayTimeHighlighting;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayTimeHighlighting;
    }
})(typeof window !== 'undefined' ? window : globalThis);

