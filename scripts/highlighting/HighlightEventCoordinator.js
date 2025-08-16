/**
 * Manages event subscriptions and coordination for highlighting system
 * Handles complex event sequences like score selection → page change → rehydration
 */
class HighlightEventCoordinator {
    constructor(config = {}) {
        this.config = {
            events: {
                CONFIDENCE_CHANGED: 'playtime:confidence-changed',
                SCORE_SELECTED: 'playtime:score-selected',
                PAGE_CHANGED: 'playtime:page-changed',
                LAYOUT_CHANGED: 'playtime:layout-changed',
                ...config.events
            },
            rehydrationDelay: 10,
            ...config
        };

        this.state = {
            currentPdfId: null,
            pendingRehydratePdfId: null,
            lastRehydratedPdfId: null,
            lastClearedPdfId: null,
            rehydrateScheduledFor: null,
            rehydratingFor: null
        };

        this.listeners = new Map(); // Track listeners for cleanup
        this.callbacks = {
            onConfidenceChanged: null,
            onScoreSelected: null,
            onPageChanged: null,
            onLayoutChanged: null
        };
    }

    /**
     * Initialize event coordinator with event system
     */
    init(eventTarget = window) {
        this.eventTarget = eventTarget;
        this.setupEventListeners();
        this.checkForBufferedEvents();
        return this;
    }

    /**
     * Set callback for confidence change events
     */
    onConfidenceChanged(callback) {
        this.callbacks.onConfidenceChanged = callback;
        return this;
    }

    /**
     * Set callback for score selection events
     */
    onScoreSelected(callback) {
        this.callbacks.onScoreSelected = callback;
        return this;
    }

    /**
     * Set callback for page change events
     */
    onPageChanged(callback) {
        this.callbacks.onPageChanged = callback;
        return this;
    }

    /**
     * Set callback for layout change events
     */
    onLayoutChanged(callback) {
        this.callbacks.onLayoutChanged = callback;
        return this;
    }

    /**
     * Trigger rehydration for specific PDF ID
     */
    async triggerRehydration(pdfId, attempt = 0) {
        if (pdfId == null) return;

        // Ignore stale requests
        if (this.state.currentPdfId != null && pdfId !== this.state.currentPdfId) {
            return;
        }

        // Avoid duplicate rehydration chains
        if (attempt === 0 && this.state.rehydratingFor === pdfId) {
            return;
        }

        // Check if already rehydrated
        if (pdfId === this.state.lastRehydratedPdfId) {
            return;
        }

        try {
            // Mark ownership of rehydration chain
            if (attempt === 0 && this.state.rehydratingFor == null) {
                this.state.rehydratingFor = pdfId;
            }

            // Trigger rehydration callback if available
            if (this.callbacks.onScoreSelected) {
                await this.callbacks.onScoreSelected({ pdfId, attempt });
                this.state.lastRehydratedPdfId = pdfId;
                this.state.pendingRehydratePdfId = null;
                this.state.rehydratingFor = null;
                this.state.rehydrateScheduledFor = null;
            }
        } catch (error) {
            // Clear in-progress flag on failure
            this.state.rehydratingFor = null;
            this.state.rehydrateScheduledFor = null;
            throw error;
        }
    }

    /**
     * Schedule delayed rehydration
     */
    scheduleRehydration(pdfId, delay = this.config.rehydrationDelay) {
        if (this.state.rehydrateScheduledFor !== pdfId) {
            this.state.rehydrateScheduledFor = pdfId;
            setTimeout(() => this.triggerRehydration(pdfId), delay);
        }
    }

    /**
     * Clean up event listeners and state
     */
    destroy() {
        // Remove all event listeners
        for (const [event, listener] of this.listeners) {
            if (this.eventTarget && this.eventTarget.removeEventListener) {
                this.eventTarget.removeEventListener(event, listener);
            }
        }
        this.listeners.clear();
        
        // Reset state
        this.state = {
            currentPdfId: null,
            pendingRehydratePdfId: null,
            lastRehydratedPdfId: null,
            lastClearedPdfId: null,
            rehydrateScheduledFor: null,
            rehydratingFor: null
        };
    }

    // Private methods

    setupEventListeners() {
        if (!this.eventTarget || !this.eventTarget.addEventListener) return;

        this.addEventListenerTracked(
            this.config.events.CONFIDENCE_CHANGED,
            (e) => this.handleConfidenceChanged(e)
        );

        this.addEventListenerTracked(
            this.config.events.SCORE_SELECTED,
            (e) => this.handleScoreSelected(e)
        );

        this.addEventListenerTracked(
            this.config.events.PAGE_CHANGED,
            (e) => this.handlePageChanged(e)
        );

        this.addEventListenerTracked(
            this.config.events.LAYOUT_CHANGED,
            (e) => this.handleLayoutChanged(e)
        );
    }

    addEventListenerTracked(eventName, handler) {
        this.eventTarget.addEventListener(eventName, handler);
        this.listeners.set(eventName, handler);
    }

    handleConfidenceChanged(event) {
        if (this.callbacks.onConfidenceChanged) {
            const color = event && event.detail ? event.detail.color : null;
            this.callbacks.onConfidenceChanged({ color });
        }
    }

    handleScoreSelected(event) {
        const pdfId = event && event.detail && event.detail.pdfId;
        if (pdfId == null) return;

        this.state.currentPdfId = pdfId;
        this.state.pendingRehydratePdfId = pdfId;

        // Buffer the event for late subscribers
        try {
            if (window.__playTimeLastScoreSelectedDetail !== undefined) {
                window.__playTimeLastScoreSelectedDetail = event.detail;
            }
        } catch (_) {}

        // Clear existing highlights for new PDF
        if (this.state.lastClearedPdfId !== pdfId) {
            this.state.lastClearedPdfId = pdfId;
        }

        // Schedule rehydration
        this.scheduleRehydration(pdfId);
    }

    handlePageChanged(event) {
        if (this.callbacks.onPageChanged) {
            const page = event && event.detail && event.detail.page;
            this.callbacks.onPageChanged({ page });
        }

        // Trigger pending rehydration
        const pending = this.state.pendingRehydratePdfId;
        if (pending != null && pending !== this.state.lastRehydratedPdfId) {
            this.triggerRehydration(pending);
        }
    }

    handleLayoutChanged(event) {
        if (this.callbacks.onLayoutChanged) {
            this.callbacks.onLayoutChanged(event.detail || {});
        }
    }

    checkForBufferedEvents() {
        try {
            let buffered = null;
            
            // Check for event buffer system
            if (window.PlayTimeEventBuffer && typeof window.PlayTimeEventBuffer.getLast === 'function') {
                buffered = window.PlayTimeEventBuffer.getLast(this.config.events.SCORE_SELECTED);
            } else if (window.__playTimeLastScoreSelectedDetail) {
                buffered = window.__playTimeLastScoreSelectedDetail;
            }

            if (buffered && this.state.pendingRehydratePdfId == null) {
                this.state.pendingRehydratePdfId = buffered.pdfId;
                this.scheduleRehydration(buffered.pdfId);
            }
        } catch (_) {
            // Ignore buffered event errors
        }
    }
}

module.exports = HighlightEventCoordinator;
