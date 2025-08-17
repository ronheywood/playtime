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

    // Internal: resolve the custom layout-changed event name
    _layoutChangedEventName(win) {
        return (win && win.PlayTimeConstants && win.PlayTimeConstants.EVENTS && win.PlayTimeConstants.EVENTS.LAYOUT_CHANGED)
            ? win.PlayTimeConstants.EVENTS.LAYOUT_CHANGED
            : 'playtime:layout-changed';
    }

    // Internal: safe creation + dispatch of layout changed (with fallback to resize)
    _dispatchLayoutChanged(detail = {}) {
        try {
            const win = typeof window !== 'undefined' ? window : null;
            if (!win || !win.dispatchEvent) return;
            const evName = this._layoutChangedEventName(win);
            let ev;
            try { ev = new Event(evName); } catch(_) {
                try { ev = document.createEvent('Event'); ev.initEvent(evName, true, true); } catch(__) { ev = null; }
            }
            if (ev) {
                ev.detail = Object.assign({ source: 'focus-mode' }, detail);
                win.dispatchEvent(ev);
            } else {
                try { win.dispatchEvent(new Event('resize')); } catch(___) { /* noop */ }
            }
        } catch(_) { /* non-fatal */ }
    }

    // Internal: schedule a dispatch after either a transition end (if provided) or next frame
    _scheduleLayoutDispatch({ waitForTransition = false, transitionTarget = null, timeoutMs = 200, detail = {} } = {}) {
        const win = (typeof window !== 'undefined') ? window : null;
        if (!win) return;
        let fired = false;
        const fire = () => { if (!fired) { fired = true; this._dispatchLayoutChanged(detail); } };
        if (waitForTransition && transitionTarget && transitionTarget.addEventListener) {
            const onEnd = (e) => {
                if (!e || e.propertyName === 'transform') {
                    transitionTarget.removeEventListener('transitionend', onEnd);
                    fire();
                }
            };
            transitionTarget.addEventListener('transitionend', onEnd, { once: true });
            setTimeout(fire, timeoutMs); // fallback
        } else {
            // schedule after paint so style mutations settle
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => setTimeout(fire, 0));
            } else {
                setTimeout(fire, 0);
            }
        }
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

    // Schedule layout changed dispatch (will fire after transform transition)
    this._scheduleLayoutDispatch({ waitForTransition: true, transitionTarget: this.canvas, timeoutMs: 200, detail: { scale } });

    }

    /**
     * Enter focus mode - apply transforms and hide distractions
     * @param {object} options - Focus options (currently unused)
     */
    enterFocusMode(options = {}) {
        this.canvas.setAttribute('data-focus-mode', 'active');
        if (this.sidebar) this.sidebar.style.display = 'none';
        // Add focus-mode class to viewer container (was previously done in highlighting module)
        try {
            if (this.viewerContainer && this.viewerContainer.classList && !this.viewerContainer.classList.contains('focus-mode')) {
                this.viewerContainer.classList.add('focus-mode');
            }
        } catch(_) { /* non-fatal for tests providing stub objects */ }
        if (document && document.body) document.body.classList.add('distraction-free');
        if (!this.canvas.dataset._origTransform) this.canvas.dataset._origTransform = this.canvas.style.transform || '';
        if (!this.canvas.dataset._origTransition) this.canvas.dataset._origTransition = this.canvas.style.transition || '';
        if (!this.viewerContainer.dataset._origOverflow) this.viewerContainer.dataset._origOverflow = this.viewerContainer.style.overflow || '';
        this.viewerContainer.style.overflow = 'hidden';

        // NEW PATH: if highlight coordinates provided and pdf viewer API available, delegate zooming/centering to viewer
        if (options.highlight && window.PlayTimePDFViewer && typeof window.PlayTimePDFViewer.focusOnRectPercent === 'function') {
            try {
                const p = window.PlayTimePDFViewer.focusOnRectPercent(options.highlight, { paddingPx: options.padding || 20 });
                Promise.resolve(p).then(() => {
                    // Dispatch layout changed so any zoom UI (if present) can refresh
                    this._scheduleLayoutDispatch({ waitForTransition: false, detail: { phase: 'enter-highlight' } });
                });
            } catch(e) { /* non-fatal */ }
        } else {
            // Legacy fallback behavior (no specific highlight)
            this.applyFocusLayout();
        }

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
        this.canvas.style.transform = this.canvas.dataset._origTransform || '';
        this.canvas.style.transition = this.canvas.dataset._origTransition || '';
        this.viewerContainer.style.overflow = this.viewerContainer.dataset._origOverflow || '';
    if (this.sidebar) this.sidebar.style.display = '';
    try { if (this.viewerContainer && this.viewerContainer.classList) this.viewerContainer.classList.remove('focus-mode'); } catch(_) {}
        if (document && document.body) document.body.classList.remove('distraction-free');
        this.exitBtn.style.display = 'none';
        this.focusBtn.style.display = '';
        if (this.toggleBtn) {
            this.toggleBtn.setAttribute('aria-pressed', 'false');
            this.toggleBtn.classList.remove('active');
        }
        this._scheduleLayoutDispatch({ waitForTransition: false, detail: { phase: 'exit', scale: 1 } });
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
