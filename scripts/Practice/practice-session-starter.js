/**
 * Practice Session Starter Module
 * Handles practice mode environment setup and cleanup
 * This module focuses only on configuring the UI state for practice mode
 */

class PracticeSessionStarter {
    constructor(logger, options = {}) {
        this.logger = logger;
        // Support constructor injection for unit tests and DI use.
        // Options may provide: highlighting, layoutCommands, pdfViewer
        // NOTE: Do not access window globals here — callers (factory/bootstrap) should
        // pass the platform services via the options object. This keeps the class
        // DI-first and testable.
        this.highlighting = options.highlighting || null;
        this.layoutCommands = options.layoutCommands || null;
        this.pdfViewer = options.pdfViewer || null;
    }

    /**
     * Setup practice mode environment (UI state, highlighting, layout)
     */
    async setupPracticeModeEnvironment() {
        // If highlighting is active, disable it fully before entering practice mode.
        // This prevents touch suppression (pinch/scroll) from being applied except when highlighting mode is active.
        const highlighting = this.highlighting || (typeof window !== 'undefined' && window.PlayTimeHighlighting);
        try {
            if (highlighting) {
                if (typeof highlighting.disableSelection === 'function') {
                    highlighting.disableSelection();
                    this.logger.info('Practice Session Starter: Highlight selection disabled');
                }
                // Also clear toggle UI if present
                const toggleBtn = document.getElementById('highlighting-toggle');
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-pressed', 'false');
                    toggleBtn.classList.remove('selected');
                }
                // Remove viewer-level highlighting class so CSS no longer forces touch-action:none
                const viewer = document.querySelector('.pdf-viewer-container') || document.querySelector('[data-role="pdf-viewer"]');
                if (viewer && viewer.classList) viewer.classList.remove('highlighting-active');

                // Show visual indicator that selection is disabled
                this._showSelectionDisabledIndicator();
            }
        } catch (e) {
            this.logger.warn('Practice Session Starter: Error disabling highlighting before practice mode', { error: e && e.message });
        }

        // Set practice mode layout
        const layoutCommands = this.layoutCommands;
        if (layoutCommands && typeof layoutCommands.execute === 'function') {
            layoutCommands.execute('practice-mode', { action: 'enter' });
            this.logger.info('Practice Session Starter: Entered practice mode layout');
        } else {
            // Fallback: Set the attribute directly if layout commands are not available
            const viewerSection = document.querySelector('#viewer-section');
            if (viewerSection) {
                viewerSection.setAttribute('data-practice-mode', 'active');
                this.logger.info('Practice Session Starter: Set practice mode attribute directly');
            }
        }
        
        // Return success
        return true;
    }

    /**
     * Cleanup practice mode environment
     */
    cleanupPracticeModeEnvironment() {
        // Re-enable highlight selection (DI-first)
        const highlighting = this.highlighting;
        if (highlighting && typeof highlighting.enableSelection === 'function') {
            highlighting.enableSelection();
            this.logger.info('Practice Session Starter: Highlight selection re-enabled');
            // Remove visual indicator
            this._hideSelectionDisabledIndicator();
        }

        // Exit focus mode if active
        this._exitFocusMode();

        // Hide the timer UI
        this._hideTimer();

        // Optimize DOM cleanup for better performance on iPad
        // Use requestAnimationFrame to defer heavy DOM operations
        const scheduleCleanup = (typeof requestAnimationFrame !== 'undefined') 
            ? requestAnimationFrame 
            : (callback) => setTimeout(callback, 0);
            
        scheduleCleanup(() => {
            this._performDOMCleanup();
        });
    }

    /**
     * Focus on a practice section by highlighting the area
     * This method handles page navigation if the highlight is on a different page
     * @param {string} highlightId - The ID of the highlight to focus on
     */
    async focusOnPracticeSection(highlightId) {
        try {
            this.logger.info('Practice Session Starter: Focusing on section', { highlightId });

            // Always check if we need to navigate to the correct page first
            // Don't rely on element existence since elements might exist in DOM but not be visible
            await this._navigateToHighlightPage(highlightId);
            
            // After potential navigation, wait for highlights to be rendered and find the element
            await this._waitForHighlightElement(highlightId);
            let highlightElement = document.querySelector(`[data-role="highlight"][data-hl-id="${highlightId}"]`);

            if (highlightElement) {
                // Remove current-practice-section class from all highlights first
                const allHighlights = document.querySelectorAll('[data-role="highlight"]');
                allHighlights.forEach(highlight => {
                    highlight.classList.remove('current-practice-section');
                });

                // Add current-practice-section class to the current highlight
                highlightElement.classList.add('current-practice-section');
                this.logger.info('Practice Session Starter: Applied current-practice-section class', { highlightId });

                // Use highlighting module's focus method if available (same as double-click behavior)
                const highlighting = this.highlighting;
                if (highlighting && typeof highlighting.focusOnHighlight === 'function') {
                    this.logger.info('Practice Session Starter: Triggering focus action on highlight', { highlightId });
                    highlighting.focusOnHighlight(highlightElement);
                } else {
                    // Fallback: scroll to the element
                    this.logger.info('Practice Session Starter: Using fallback scroll to highlight', { highlightId });
                    highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                this.logger.warn('Practice Session Starter: Highlight element not found after navigation', { highlightId });
            }
        } catch (error) {
            this.logger.error('Practice Session Starter: Error focusing on section', { highlightId, error });
        }
    }

    /**
     * Navigate to the page containing the specified highlight
     * @private
     * @param {string} highlightId - The ID of the highlight to navigate to
     */
    async _navigateToHighlightPage(highlightId) {
        try {
            // Get highlight data to determine which page it's on
            let highlightData = null;
            
            // Try to get from persistence service if available
            const highlighting = this.highlighting;
            if (highlighting && highlighting._components && highlighting._components.persistenceService) {
                try {
                    highlightData = await highlighting._components.persistenceService.getHighlight(highlightId);
                } catch (persistenceError) {
                    this.logger.warn('Practice Session Starter: Could not load highlight from persistence', { 
                        highlightId, 
                        error: persistenceError 
                    });
                }
            }

            // If we have page information and PDF viewer is available
            const pdfViewer = this.pdfViewer;
            if (highlightData && highlightData.page && pdfViewer) {
                const currentPage = pdfViewer.getCurrentPage();
                const targetPage = highlightData.page;
                if (currentPage !== targetPage) {
                    this.logger.info('Practice Session Starter: Navigating to highlight page', { 
                        highlightId, 
                        currentPage, 
                        targetPage 
                    });
                    await pdfViewer.renderPage(targetPage);
                    // Give the page time to render and highlights to be rehydrated
                    await this._waitForPageRender();
                } else {
                    this.logger.info('Practice Session Starter: Highlight already on current page', { 
                        highlightId, 
                        currentPage 
                    });
                }
            } else {
                this.logger.warn('Practice Session Starter: Could not determine highlight page or PDF viewer not available', { 
                    highlightId,
                    hasHighlightData: !!highlightData,
                    hasPageInfo: !!(highlightData && highlightData.page),
                    hasPDFViewer: !!pdfViewer
                });
            }
            
        } catch (error) {
            this.logger.error('Practice Session Starter: Error navigating to highlight page', { highlightId, error });
        }
    }

    /**
     * Wait for page rendering to complete
     * @private
     */
    async _waitForPageRender() {
        return new Promise(resolve => {
            // Wait for rendering and highlight rehydration
            setTimeout(resolve, 500).unref?.();
        });
    }

    /**
     * Wait for highlight element to be available in the DOM
     * @private
     * @param {string} highlightId - The ID of the highlight to wait for
     */
    async _waitForHighlightElement(highlightId) {
        return new Promise(resolve => {
            const maxAttempts = 10;
            let attempts = 0;
            
            const checkElement = () => {
                try {
                    const element = document.querySelector(`[data-role="highlight"][data-hl-id="${highlightId}"]`);
                    if (element || attempts >= maxAttempts) {
                        resolve();
                    } else {
                        attempts++;
                        setTimeout(checkElement, 100).unref?.();
                    }
                } catch (error) {
                    // If querySelector fails (e.g., in test environment), just resolve
                    this.logger.warn('Practice Session Starter: Error checking for highlight element', { 
                        highlightId, 
                        error: error.message 
                    });
                    resolve();
                }
            };
            
            checkElement();
        });
    }

    /**
     * Exit focus mode if currently active
     * @private
     */
    _exitFocusMode() {
        try {
            // Check if focus mode is currently active by looking at canvas attribute
            const canvas = document.querySelector('[data-role="pdf-canvas"]');
            const isInFocusMode = canvas && canvas.getAttribute('data-focus-mode') === 'active';
            
            const highlighting = this.highlighting || (typeof window !== 'undefined' && window.PlayTimeHighlighting);
            if (isInFocusMode && highlighting && typeof highlighting.exitFocusMode === 'function') {
                this.logger.info('Practice Session Starter: Exiting focus mode after session completion');
                highlighting.exitFocusMode();
            } else {
                this.logger.debug?.('Practice Session Starter: Focus mode not active or highlighting not available');
            }
        } catch (error) {
            this.logger.warn('Practice Session Starter: Error exiting focus mode', { error: error.message });
        }
    }

    /**
     * Hide the timer UI (same as exit button behavior)
     * @private
     */
    _hideTimer() {
        try {
            const timerContainer = document.querySelector('#practice-session-timer');
            if (timerContainer) {
                timerContainer.style.display = 'none';
                this.logger.info('Practice Session Starter: Timer UI hidden');
            } else {
                this.logger.debug?.('Practice Session Starter: Timer container not found');
            }
        } catch (error) {
            this.logger.warn('Practice Session Starter: Error hiding timer', { error: error.message });
        }
    }

    /**
     * Perform DOM cleanup operations with performance optimizations
     * @private
     */
    _performDOMCleanup() {
        // Batch DOM operations to minimize reflows
        const viewerSection = document.querySelector('#viewer-section');
        
        if (viewerSection && typeof viewerSection.removeAttribute === 'function') {
            // Use a single style change to disable CSS rules efficiently (browser only)
            if (viewerSection.style && typeof viewerSection.style.setProperty === 'function') {
                viewerSection.style.setProperty('--practice-mode-exit', 'true');
            }
            
            // Remove practice mode attribute (triggers CSS recalculation)
            viewerSection.removeAttribute('data-practice-mode');
            
            // Clean up current-practice-section class only from elements that have it
            if (typeof viewerSection.querySelectorAll === 'function') {
                const currentSectionHighlights = viewerSection.querySelectorAll('[data-role="highlight"].current-practice-section');
                currentSectionHighlights.forEach(highlight => {
                    if (highlight && highlight.classList && typeof highlight.classList.remove === 'function') {
                        highlight.classList.remove('current-practice-section');
                    }
                });
            }
            
            // Remove the temporary style property (browser only)
            if (viewerSection.style && typeof viewerSection.style.removeProperty === 'function') {
                const scheduleStyleCleanup = (typeof requestAnimationFrame !== 'undefined') 
                    ? requestAnimationFrame 
                    : (callback) => setTimeout(callback, 0);
                    
                scheduleStyleCleanup(() => {
                    if (viewerSection.style && typeof viewerSection.style.removeProperty === 'function') {
                        viewerSection.style.removeProperty('--practice-mode-exit');
                    }
                });
            }
            
            this.logger.info('Practice Session Starter: DOM cleanup completed');
        }
        
        // Exit practice mode layout after DOM operations
        const layoutCommands = this.layoutCommands;
        if (layoutCommands && typeof layoutCommands.execute === 'function') {
            layoutCommands.execute('practice-mode', { action: 'exit' });
            this.logger.info('Practice Session Starter: Exited practice mode layout');
        }
    }

    /**
     * Show visual indicator that selection is disabled
     * @private
     */
    _showSelectionDisabledIndicator() {
        try {
            const viewerContainer = document.querySelector('[data-role="pdf-viewer"]') || document.body;
            viewerContainer.classList.add('practice-mode-selection-disabled');
            
            // Show indicator temporarily
            viewerContainer.classList.add('show-indicator');
            setTimeout(() => {
                viewerContainer.classList.remove('show-indicator');
            }, 3000).unref?.(); // Hide after 3 seconds
            
            this.logger.debug?.('Practice Session Starter: Selection disabled indicator shown');
        } catch (error) {
            this.logger.warn('Practice Session Starter: Error showing selection disabled indicator', { error: error.message });
        }
    }

    /**
     * Hide visual indicator that selection is disabled
     * @private
     */
    _hideSelectionDisabledIndicator() {
        try {
            const viewerContainer = document.querySelector('[data-role="pdf-viewer"]') || document.body;
            viewerContainer.classList.remove('practice-mode-selection-disabled', 'show-indicator');
            
            this.logger.debug?.('Practice Session Starter: Selection disabled indicator hidden');
        } catch (error) {
            this.logger.warn('Practice Session Starter: Error hiding selection disabled indicator', { error: error.message });
        }
    }
}

// Factory function for creating practice session starter instances (browser only)
if (typeof window !== 'undefined') {
    // Browser factory: resolve platform services from the window and pass them
    // into the constructor so the class itself remains DI-first.
    window.createPracticeSessionStarter = function(logger, options = {}) {
        const resolved = Object.assign({}, {
            highlighting: window.PlayTimeHighlighting,
            layoutCommands: window.PlayTimeLayoutCommands,
            pdfViewer: window.PlayTimePDFViewer
        }, options);
        return new PracticeSessionStarter(logger, resolved);
    };
}

// Export for Node.js/CommonJS (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSessionStarter;
}
